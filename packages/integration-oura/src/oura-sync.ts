import type { MetricSampleInput, SessionInput, RawRecordInput } from "@morten-olsen/health-contracts";

import { createOuraClient } from "./oura-client.js";
import type { OuraClientConfig } from "./oura-client.js";
import {
  mapHeartRate,
  mapSleepPeriods,
  mapDailySleep,
  mapDailyActivity,
  mapDailyReadiness,
  mapDailySpo2,
  mapWorkouts,
  wrapAsRawRecord,
} from "./oura-mapper.js";

type SyncConfig = {
  oura: OuraClientConfig;
  healthApiUrl: string;
};

type SyncResult = {
  rawRecords: number;
  metrics: number;
  sessions: number;
};

const postToHealthApi = async (baseUrl: string, path: string, body: unknown): Promise<void> => {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Health API ${path} returned ${response.status}: ${text}`);
  }
};

const sendRawRecords = async (baseUrl: string, records: RawRecordInput[]): Promise<number> => {
  for (const record of records) {
    await postToHealthApi(baseUrl, "/ingest/raw", record);
  }
  return records.length;
};

const sendMetrics = async (baseUrl: string, metrics: MetricSampleInput[]): Promise<number> => {
  if (metrics.length === 0) return 0;

  // Batch in chunks of 5000 (API limit is 10000)
  const chunkSize = 5000;
  for (let i = 0; i < metrics.length; i += chunkSize) {
    const chunk = metrics.slice(i, i + chunkSize);
    await postToHealthApi(baseUrl, "/ingest/metrics", { samples: chunk });
  }
  return metrics.length;
};

const sendSessions = async (baseUrl: string, sessions: SessionInput[]): Promise<number> => {
  for (const session of sessions) {
    await postToHealthApi(baseUrl, "/ingest/sessions", session);
  }
  return sessions.length;
};

/**
 * Pull data from Oura for the given date range and push to the Health API.
 * Idempotent — safe to re-run for the same range.
 */
const syncDateRange = async (config: SyncConfig, startDate: string, endDate: string): Promise<SyncResult> => {
  const oura = createOuraClient(config.oura);
  const apiUrl = config.healthApiUrl;

  const result: SyncResult = { rawRecords: 0, metrics: 0, sessions: 0 };
  const allMetrics: MetricSampleInput[] = [];
  const allSessions: SessionInput[] = [];
  const allRawRecords: RawRecordInput[] = [];

  // Fetch all data types in parallel
  const [heartRate, sleep, dailySleep, dailyActivity, dailyReadiness, dailySpo2, workouts] =
    await Promise.all([
      oura.getHeartRate({
        startDatetime: `${startDate}T00:00:00Z`,
        endDatetime: `${endDate}T23:59:59Z`,
      }),
      oura.getSleep({ startDate, endDate }),
      oura.getDailySleep({ startDate, endDate }),
      oura.getDailyActivity({ startDate, endDate }),
      oura.getDailyReadiness({ startDate, endDate }),
      oura.getDailySpo2({ startDate, endDate }),
      oura.getWorkouts({ startDate, endDate }),
    ]);

  // Store raw records
  allRawRecords.push(...wrapAsRawRecord("heartrate", heartRate as Array<{ id?: string }>));
  allRawRecords.push(...wrapAsRawRecord("sleep", sleep));
  allRawRecords.push(...wrapAsRawRecord("daily_sleep", dailySleep));
  allRawRecords.push(...wrapAsRawRecord("daily_activity", dailyActivity));
  allRawRecords.push(...wrapAsRawRecord("daily_readiness", dailyReadiness));
  allRawRecords.push(...wrapAsRawRecord("daily_spo2", dailySpo2));
  allRawRecords.push(...wrapAsRawRecord("workout", workouts));

  // Map to canonical
  allMetrics.push(...mapHeartRate(heartRate));

  const sleepData = mapSleepPeriods(sleep);
  allSessions.push(...sleepData.sessions);
  allMetrics.push(...sleepData.metrics);

  allMetrics.push(...mapDailySleep(dailySleep));
  allMetrics.push(...mapDailyActivity(dailyActivity));
  allMetrics.push(...mapDailyReadiness(dailyReadiness));
  allMetrics.push(...mapDailySpo2(dailySpo2));
  allSessions.push(...mapWorkouts(workouts));

  // Send to Health API
  result.rawRecords = await sendRawRecords(apiUrl, allRawRecords);
  result.metrics = await sendMetrics(apiUrl, allMetrics);
  result.sessions = await sendSessions(apiUrl, allSessions);

  return result;
};

export type { SyncConfig, SyncResult };
export { syncDateRange };
