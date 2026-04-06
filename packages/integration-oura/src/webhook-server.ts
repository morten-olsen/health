import Fastify from "fastify";

import { handleWebhookEvent } from "./oura-webhook.js";
import type { WebhookHandlerConfig } from "./oura-webhook.js";

type WebhookServerConfig = WebhookHandlerConfig & {
  port: number;
  host: string;
};

const createWebhookServer = (config: WebhookServerConfig) => {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ status: "ok" }));

  // Oura sends a verification GET request when registering a webhook
  app.get("/webhooks/oura", async (request) => {
    const query = request.query as Record<string, string>;
    // Oura sends a verification_token that must be echoed back
    if (query["verification_token"]) {
      return query["verification_token"];
    }
    return { status: "ok" };
  });

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
      // We don't delete data from our store
      return reply.status(200).send({ status: "ignored", reason: "delete events not processed" });
    }

    try {
      const result = await handleWebhookEvent(config, {
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
