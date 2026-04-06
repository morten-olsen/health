import type { MetricSampleInput, SessionInput, RawRecordInput } from "@morten-olsen/health-contracts";

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

export { postToHealthApi, sendRawRecords, sendMetrics, sendSessions };
