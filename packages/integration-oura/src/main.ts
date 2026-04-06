import { parseArgs } from "node:util";

import { syncDateRange } from "./oura-sync.js";
import { createWebhookServer } from "./webhook-server.js";

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    console.error(`Error: ${name} environment variable is required`);
    process.exit(1);
  }
  return value;
};

const today = (): string => new Date().toISOString().split("T")[0]!;

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

const printUsage = (): void => {
  console.log(`Usage: oura-health <command> [options]

Commands:
  sync      Pull data from Oura and push to Health API (default: last 7 days)
  server    Start webhook server (also does initial sync on startup)
  help      Show this help message

Options:
  --from <date>       Start date (YYYY-MM-DD), default: 7 days ago
  --to <date>         End date (YYYY-MM-DD), default: today
  --api-url <url>     Health API URL, default: http://localhost:3007
  --port <port>       Webhook server port (server mode), default: 3008
  --host <host>       Webhook server host (server mode), default: 0.0.0.0

Environment:
  OURA_ACCESS_TOKEN   Oura API access token (required)
  HEALTH_API_URL      Health API URL (overridden by --api-url)

Examples:
  oura-health sync                          # Sync last 7 days
  oura-health sync --from 2024-01-01        # Backfill from date
  oura-health sync --from 2024-01-01 --to 2024-06-30
  oura-health server                        # Start webhook listener
  oura-health server --port 9000            # Custom port`);
};

const runSync = async (opts: { from: string; to: string; apiUrl: string }): Promise<void> => {
  const accessToken = getRequiredEnv("OURA_ACCESS_TOKEN");

  console.log(`Syncing Oura data from ${opts.from} to ${opts.to}`);
  console.log(`Health API: ${opts.apiUrl}`);

  const result = await syncDateRange(
    { oura: { accessToken }, healthApiUrl: opts.apiUrl },
    opts.from,
    opts.to,
  );

  console.log(`Done: ${result.rawRecords} raw records, ${result.metrics} metrics, ${result.sessions} sessions`);
};

const runServer = async (opts: { from: string; to: string; apiUrl: string; port: number; host: string }): Promise<void> => {
  const accessToken = getRequiredEnv("OURA_ACCESS_TOKEN");

  // Initial sync
  console.log(`Initial sync from ${opts.from} to ${opts.to}`);
  try {
    const result = await syncDateRange(
      { oura: { accessToken }, healthApiUrl: opts.apiUrl },
      opts.from,
      opts.to,
    );
    console.log(`Initial sync done: ${result.rawRecords} raw, ${result.metrics} metrics, ${result.sessions} sessions`);
  } catch (error) {
    console.error("Initial sync failed, continuing with webhook server:", error);
  }

  const server = createWebhookServer({
    oura: { accessToken },
    healthApiUrl: opts.apiUrl,
    port: opts.port,
    host: opts.host,
  });

  await server.start();
  console.log(`Webhook server listening on ${opts.host}:${opts.port}`);

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
      help: { type: "boolean", short: "h" },
    },
  });

  const command = positionals[0] ?? "sync";

  if (values.help || command === "help") {
    printUsage();
    return;
  }

  const from = values.from ?? process.env["SYNC_START_DATE"] ?? daysAgo(7);
  const to = values.to ?? today();
  const apiUrl = values["api-url"] ?? process.env["HEALTH_API_URL"] ?? "http://localhost:3007";

  switch (command) {
    case "sync":
      await runSync({ from, to, apiUrl });
      break;
    case "server":
      await runServer({
        from,
        to,
        apiUrl,
        port: Number(values.port ?? process.env["WEBHOOK_PORT"] ?? 3008),
        host: values.host ?? process.env["WEBHOOK_HOST"] ?? "0.0.0.0",
      });
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      printUsage();
      process.exit(1);
  }
};

main();
