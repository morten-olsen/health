import { syncDateRange } from "./oura-sync.js";

const main = async (): Promise<void> => {
  const accessToken = process.env["OURA_ACCESS_TOKEN"];
  if (!accessToken) {
    console.error("OURA_ACCESS_TOKEN environment variable is required");
    process.exit(1);
  }

  const healthApiUrl = process.env["HEALTH_API_URL"] ?? "http://localhost:3007";

  // Default: sync last 7 days
  const endDate = new Date().toISOString().split("T")[0]!;
  const startDate = process.env["SYNC_START_DATE"] ??
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

  console.log(`Syncing Oura data from ${startDate} to ${endDate}`);
  console.log(`Health API: ${healthApiUrl}`);

  const result = await syncDateRange(
    {
      oura: { accessToken },
      healthApiUrl,
    },
    startDate,
    endDate,
  );

  console.log(`Sync complete:
  Raw records: ${result.rawRecords}
  Metrics: ${result.metrics}
  Sessions: ${result.sessions}`);
};

main();
