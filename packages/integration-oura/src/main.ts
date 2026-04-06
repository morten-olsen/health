import "dotenv/config";

import * as path from "node:path";
import * as os from "node:os";
import { parseArgs } from "node:util";

import { syncDateRange } from "./oura-sync.js";
import { createWebhookServer } from "./webhook-server.js";
import { getAccessToken, login, loadTokens } from "./oura-auth.js";
import type { OuraOAuthConfig } from "./oura-auth.js";

const DEFAULT_TOKEN_PATH = path.join(os.homedir(), ".config", "oura-health", "tokens.json");

const today = (): string => new Date().toISOString().split("T")[0]!;

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

const printUsage = (): void => {
  console.log(`Usage: oura-health <command> [options]

Commands:
  sync      Pull data from Oura and push to Health API (default: last 7 days)
  server    Start webhook server (also does initial sync on startup)
  login     Authenticate with Oura via OAuth2 (opens browser)
  status    Show current authentication status
  help      Show this help message

Options:
  --from <date>       Start date (YYYY-MM-DD), default: 7 days ago
  --to <date>         End date (YYYY-MM-DD), default: today
  --api-url <url>     Health API URL, default: http://localhost:3007
  --port <port>       Webhook server port (server mode), default: 3008
  --host <host>       Webhook server host (server mode), default: 0.0.0.0
  --token-path <path> Token storage path, default: ~/.config/oura-health/tokens.json
  --redirect-uri <uri> OAuth2 redirect URI (must match Oura app settings)

Environment:
  OURA_CLIENT_ID      OAuth2 client ID (required)
  OURA_CLIENT_SECRET  OAuth2 client secret (required)
  OURA_REDIRECT_URI   OAuth2 redirect URI (must match Oura app settings)
  HEALTH_API_URL      Health API URL (overridden by --api-url)

Examples:
  oura-health login                         # Authenticate with Oura
  oura-health status                        # Check auth status
  oura-health sync                          # Sync last 7 days
  oura-health sync --from 2024-01-01        # Backfill from date
  oura-health server                        # Start webhook listener`);
};

const requireOAuthEnv = (): { clientId: string; clientSecret: string } => {
  const clientId = process.env["OURA_CLIENT_ID"];
  const clientSecret = process.env["OURA_CLIENT_SECRET"];

  if (!clientId || !clientSecret) {
    console.error("Error: OURA_CLIENT_ID and OURA_CLIENT_SECRET environment variables are required.");
    console.error("\nCreate an application at https://cloud.ouraring.com/ to get these credentials.");
    process.exit(1);
  }

  return { clientId, clientSecret };
};

const getOAuthConfig = (tokenPath: string, redirectUri?: string): OuraOAuthConfig => {
  const { clientId, clientSecret } = requireOAuthEnv();
  return { clientId, clientSecret, redirectUri, tokenPath };
};

const runLogin = async (tokenPath: string, redirectUri?: string): Promise<void> => {
  const config = getOAuthConfig(tokenPath, redirectUri);
  await login(config);
};

const runStatus = (tokenPath: string): void => {
  const tokens = loadTokens(tokenPath);
  if (!tokens) {
    console.log("Auth: Not authenticated");
    console.log(`Token file: ${tokenPath} (not found)`);
    console.log(`\nRun "oura-health login" to authenticate.`);
    return;
  }

  const expiresAt = new Date(tokens.obtained_at + tokens.expires_in * 1000);
  const isExpired = Date.now() > expiresAt.getTime();

  console.log("Auth: OAuth2 tokens");
  console.log(`Token file: ${tokenPath}`);
  console.log(`Expires: ${expiresAt.toISOString()}${isExpired ? " (EXPIRED — will refresh on next use)" : ""}`);
};

const runSync = async (opts: { from: string; to: string; apiUrl: string; tokenPath: string; redirectUri?: string }): Promise<void> => {
  const config = getOAuthConfig(opts.tokenPath, opts.redirectUri);
  const accessToken = await getAccessToken(config);

  console.log(`Syncing Oura data from ${opts.from} to ${opts.to}`);

  const result = await syncDateRange(
    { oura: { accessToken }, healthApiUrl: opts.apiUrl },
    opts.from,
    opts.to,
  );

  console.log(`Done: ${result.rawRecords} raw records, ${result.metrics} metrics, ${result.sessions} sessions`);
};

const runServer = async (opts: { from: string; to: string; apiUrl: string; port: number; host: string; tokenPath: string; redirectUri?: string }): Promise<void> => {
  const oauthConfig = getOAuthConfig(opts.tokenPath, opts.redirectUri);

  // Try initial sync if tokens are available
  try {
    const accessToken = await getAccessToken(oauthConfig);
    console.log(`Initial sync from ${opts.from} to ${opts.to}`);
    const result = await syncDateRange(
      { oura: { accessToken }, healthApiUrl: opts.apiUrl },
      opts.from,
      opts.to,
    );
    console.log(`Initial sync done: ${result.rawRecords} raw, ${result.metrics} metrics, ${result.sessions} sessions`);
  } catch (error) {
    console.log("Skipping initial sync (not authenticated yet — visit /login to set up)");
  }

  // Start server — works even without tokens (login available at /login)
  const server = createWebhookServer({
    healthApiUrl: opts.apiUrl,
    port: opts.port,
    host: opts.host,
    oauth: oauthConfig,
  });

  await server.start();

  const shutdown = async (): Promise<void> => {
    await server.stop();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

const main = async (): Promise<void> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      from: { type: "string" },
      to: { type: "string" },
      "api-url": { type: "string" },
      port: { type: "string" },
      host: { type: "string" },
      "token-path": { type: "string" },
      "redirect-uri": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  const command = positionals[0] ?? "sync";

  if (values.help || command === "help") {
    printUsage();
    return;
  }

  const tokenPath = values["token-path"] ?? process.env["OURA_TOKEN_PATH"] ?? DEFAULT_TOKEN_PATH;
  const redirectUri = values["redirect-uri"] ?? process.env["OURA_REDIRECT_URI"];
  const from = values.from ?? process.env["SYNC_START_DATE"] ?? daysAgo(7);
  const to = values.to ?? today();
  const apiUrl = values["api-url"] ?? process.env["HEALTH_API_URL"] ?? "http://localhost:3007";

  switch (command) {
    case "login":
      await runLogin(tokenPath, redirectUri);
      break;
    case "status":
      runStatus(tokenPath);
      break;
    case "sync":
      await runSync({ from, to, apiUrl, tokenPath, redirectUri });
      break;
    case "server":
      await runServer({
        from,
        to,
        apiUrl,
        port: Number(values.port ?? process.env["WEBHOOK_PORT"] ?? 3008),
        host: values.host ?? process.env["WEBHOOK_HOST"] ?? "0.0.0.0",
        tokenPath,
        redirectUri,
      });
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      printUsage();
      process.exit(1);
  }
};

main();
