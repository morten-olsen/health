import Fastify from "fastify";

import { handleWebhookEvent } from "./oura-webhook.js";
import { getAccessToken, loadTokens } from "./oura-auth.js";
import type { OuraOAuthConfig } from "./oura-auth.js";

type WebhookServerConfig = {
  healthApiUrl: string;
  port: number;
  host: string;
  oauth: OuraOAuthConfig;
};

const createWebhookServer = (config: WebhookServerConfig) => {
  const app = Fastify({ logger: true });

  app.get("/health", async () => {
    const tokens = loadTokens(config.oauth.tokenPath);
    return {
      status: "ok",
      authenticated: tokens !== null,
    };
  });

  // ── OAuth login flow (for deployed setup) ───────────────────────────────

  app.get("/login", async (_request, reply) => {
    const tokens = loadTokens(config.oauth.tokenPath);
    if (tokens) {
      const expiresAt = new Date(tokens.obtained_at + tokens.expires_in * 1000);
      return reply.type("text/html").send(
        `<h1>Already authenticated</h1>
         <p>Token expires: ${expiresAt.toISOString()}</p>
         <p><a href="/login/start">Re-authenticate</a></p>`,
      );
    }
    return reply.type("text/html").send(
      `<h1>Oura Health Integration</h1>
       <p>Not authenticated.</p>
       <p><a href="/login/start">Login with Oura</a></p>`,
    );
  });

  app.get("/login/start", async (_request, reply) => {
    const redirectUri = `http://localhost:${config.port}/login/callback`;
    const authUrl = `https://cloud.ouraring.com/oauth/authorize?${new URLSearchParams({
      response_type: "code",
      client_id: config.oauth.clientId,
      redirect_uri: redirectUri,
      scope: "email personal daily heartrate workout tag session spo2",
      state: crypto.randomUUID(),
    }).toString()}`;

    return reply.redirect(authUrl);
  });

  app.get("/login/callback", async (request, reply) => {
    const query = request.query as Record<string, string>;
    const code = query["code"];

    if (!code) {
      return reply.status(400).type("text/html").send(
        "<h1>Error</h1><p>Missing authorization code</p>",
      );
    }

    const redirectUri = `http://localhost:${config.port}/login/callback`;

    try {
      const response = await fetch("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: config.oauth.clientId,
          client_secret: config.oauth.clientSecret,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        return reply.status(500).type("text/html").send(
          `<h1>Token exchange failed</h1><pre>${text}</pre>`,
        );
      }

      const data = await response.json() as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
        token_type: string;
      };

      const { saveTokens } = await import("./oura-auth.js");
      saveTokens(config.oauth.tokenPath, {
        ...data,
        obtained_at: Date.now(),
      });

      request.log.info("OAuth tokens saved successfully");

      return reply.type("text/html").send(
        "<h1>Authenticated!</h1><p>Oura tokens saved. You can close this window.</p>",
      );
    } catch (error) {
      request.log.error(error, "OAuth callback failed");
      return reply.status(500).type("text/html").send(
        "<h1>Error</h1><p>Failed to exchange authorization code</p>",
      );
    }
  });

  // ── Oura webhook verification ───────────────────────────────────────────

  app.get("/webhooks/oura", async (request) => {
    const query = request.query as Record<string, string>;
    if (query["verification_token"]) {
      return query["verification_token"];
    }
    return { status: "ok" };
  });

  // ── Oura webhook handler ────────────────────────────────────────────────

  app.post("/webhooks/oura", async (request, reply) => {
    const event = request.body as {
      event_type?: string;
      data_type?: string;
      object_id?: string;
      event_time?: string;
    };

    if (!event.data_type || !event.event_type) {
      return reply.status(400).send({ error: "Missing data_type or event_type" });
    }

    if (event.event_type === "delete") {
      return reply.status(200).send({ status: "ignored", reason: "delete events not processed" });
    }

    try {
      const result = await handleWebhookEvent({
        getAccessToken: () => getAccessToken(config.oauth),
        healthApiUrl: config.healthApiUrl,
      }, {
        event_type: event.event_type,
        data_type: event.data_type,
        object_id: event.object_id,
        event_time: event.event_time,
      });

      return reply.status(200).send({
        status: "processed",
        dataType: result.dataType,
        rawRecords: result.rawRecords,
        metrics: result.metrics,
        sessions: result.sessions,
      });
    } catch (error) {
      request.log.error(error, "Failed to process webhook event");
      return reply.status(500).send({ error: "Failed to process webhook" });
    }
  });

  const start = async (): Promise<void> => {
    await app.listen({ port: config.port, host: config.host });
  };

  const stop = async (): Promise<void> => {
    await app.close();
  };

  return { app, start, stop };
};

export type { WebhookServerConfig };
export { createWebhookServer };
