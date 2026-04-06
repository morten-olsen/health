import { syncDateRange } from "./oura-sync.js";
import { createWebhookServer } from "./webhook-server.js";

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} environment variable is required`);
    process.exit(1);
  }
  return value;
};

const runPullMode = async (): Promise<void> => {
  const accessToken = getRequiredEnv("OURA_ACCESS_TOKEN");
  const healthApiUrl = process.env["HEALTH_API_URL"] ?? "http://localhost:3007";

  const endDate = new Date().toISOString().split("T")[0]!;
  const startDate = process.env["SYNC_START_DATE"] ??
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

  console.log(`Syncing Oura data from ${startDate} to ${endDate}`);

  const result = await syncDateRange(
    { oura: { accessToken }, healthApiUrl },
    startDate,
    endDate,
  );

  console.log(`Sync complete: ${result.rawRecords} raw, ${result.metrics} metrics, ${result.sessions} sessions`);
};

const runServerMode = async (): Promise<void> => {
  const accessToken = getRequiredEnv("OURA_ACCESS_TOKEN");
  const healthApiUrl = process.env["HEALTH_API_URL"] ?? "http://localhost:3007";
  const port = Number(process.env["WEBHOOK_PORT"] ?? 3008);
  const host = process.env["WEBHOOK_HOST"] ?? "0.0.0.0";

  // Initial pull sync on startup
  const endDate = new Date().toISOString().split("T")[0]!;
  const startDate = process.env["SYNC_START_DATE"] ??
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

  console.log(`Initial sync from ${startDate} to ${endDate}`);
  try {
    const result = await syncDateRange(
      { oura: { accessToken }, healthApiUrl },
      startDate,
      endDate,
    );
    console.log(`Initial sync complete: ${result.rawRecords} raw, ${result.metrics} metrics, ${result.sessions} sessions`);
  } catch (error) {
    console.error("Initial sync failed, continuing with webhook server:", error);
  }

  // Start webhook server
  const server = createWebhookServer({
    oura: { accessToken },
    healthApiUrl,
    port,
    host,
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
  const mode = process.env["MODE"] ?? "pull";

  switch (mode) {
    case "pull":
      await runPullMode();
      break;
    case "server":
      await runServerMode();
      break;
    default:
      console.error(`Unknown MODE: ${mode}. Use "pull" or "server".`);
      process.exit(1);
  }
};

main();
