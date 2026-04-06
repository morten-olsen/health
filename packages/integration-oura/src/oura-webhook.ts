import type { MetricSampleInput, SessionInput, RawRecordInput } from "@morten-olsen/health-contracts";

import { createOuraClient } from "./oura-client.js";
import type { OuraClientConfig } from "./oura-client.js";
import { sendRawRecords, sendMetrics, sendSessions } from "./health-api-client.js";
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

type WebhookEvent = {
  event_type: string;
  data_type: string;
  object_id?: string;
  event_time?: string;
};

type WebhookHandlerConfig = {
  oura: OuraClientConfig;
  healthApiUrl: string;
};

type WebhookResult = {
  dataType: string;
  rawRecords: number;
  metrics: number;
  sessions: number;
};

// Oura webhooks only notify that data changed — we need to fetch a window around the event
const getDateWindow = (eventTime?: string): { startDate: string; endDate: string } => {
  const eventDate = eventTime ? new Date(eventTime) : new Date();
  const start = new Date(eventDate);
  start.setDate(start.getDate() - 1);
  const end = new Date(eventDate);
  end.setDate(end.getDate() + 1);

  return {
    startDate: start.toISOString().split("T")[0]!,
    endDate: end.toISOString().split("T")[0]!,
  };
};

const handleWebhookEvent = async (config: WebhookHandlerConfig, event: WebhookEvent): Promise<WebhookResult> => {
  const oura = createOuraClient(config.oura);
  const apiUrl = config.healthApiUrl;
  const { startDate, endDate } = getDateWindow(event.event_time);

  const result: WebhookResult = {
    dataType: event.data_type,
    rawRecords: 0,
    metrics: 0,
    sessions: 0,
  };

  const allMetrics: MetricSampleInput[] = [];
  const allSessions: SessionInput[] = [];
  const allRawRecords: RawRecordInput[] = [];

  switch (event.data_type) {
    case "heartrate": {
      const data = await oura.getHeartRate({
        startDatetime: `${startDate}T00:00:00Z`,
        endDatetime: `${endDate}T23:59:59Z`,
      });
      allRawRecords.push(...wrapAsRawRecord("heartrate", data as Array<{ id?: string }>));
      allMetrics.push(...mapHeartRate(data));
      break;
    }

    case "sleep": {
      const data = await oura.getSleep({ startDate, endDate });
      allRawRecords.push(...wrapAsRawRecord("sleep", data));
      const mapped = mapSleepPeriods(data);
      allSessions.push(...mapped.sessions);
      allMetrics.push(...mapped.metrics);
      break;
    }

    case "daily_sleep": {
      const data = await oura.getDailySleep({ startDate, endDate });
      allRawRecords.push(...wrapAsRawRecord("daily_sleep", data));
      allMetrics.push(...mapDailySleep(data));
      break;
    }

    case "daily_activity": {
      const data = await oura.getDailyActivity({ startDate, endDate });
      allRawRecords.push(...wrapAsRawRecord("daily_activity", data));
      allMetrics.push(...mapDailyActivity(data));
      break;
    }

    case "daily_readiness": {
      const data = await oura.getDailyReadiness({ startDate, endDate });
      allRawRecords.push(...wrapAsRawRecord("daily_readiness", data));
      allMetrics.push(...mapDailyReadiness(data));
      break;
    }

    case "daily_spo2": {
      const data = await oura.getDailySpo2({ startDate, endDate });
      allRawRecords.push(...wrapAsRawRecord("daily_spo2", data));
      allMetrics.push(...mapDailySpo2(data));
      break;
    }

    case "workout": {
      const data = await oura.getWorkouts({ startDate, endDate });
      allRawRecords.push(...wrapAsRawRecord("workout", data));
      allSessions.push(...mapWorkouts(data));
      break;
    }

    default:
      console.log(`Ignoring unhandled webhook data_type: ${event.data_type}`);
      return result;
  }

  result.rawRecords = await sendRawRecords(apiUrl, allRawRecords);
  result.metrics = await sendMetrics(apiUrl, allMetrics);
  result.sessions = await sendSessions(apiUrl, allSessions);

  return result;
};

export type { WebhookEvent, WebhookHandlerConfig, WebhookResult };
export { handleWebhookEvent };
