import type {
  MetricSampleInput,
  SessionInput,
  RawRecordInput,
} from "@morten-olsen/health-contracts";

import type { components } from "./oura-api.js";

type HeartRateModel = components["schemas"]["HeartRateModel"];
type SleepModel = components["schemas"]["SleepModel"];
type DailySleepModel = components["schemas"]["DailySleepModel"];
type DailyActivityModel = components["schemas"]["DailyActivityModel"];
type DailyReadinessModel = components["schemas"]["DailyReadinessModel"];
type DailySpO2Model = components["schemas"]["DailySpO2Model"];
type PublicWorkout = components["schemas"]["PublicWorkout"];

const SOURCE = "oura";

const mapHeartRate = (items: HeartRateModel[]): MetricSampleInput[] =>
  items.map((item) => ({
    time: new Date(item.timestamp).toISOString(),
    metricSlug: "heart_rate",
    source: SOURCE,
    valueNumeric: item.bpm,
    metadata: { ouraSource: item.source },
  }));

const mapSleepPeriods = (periods: SleepModel[]): { sessions: SessionInput[]; metrics: MetricSampleInput[] } => {
  const sessions: SessionInput[] = [];
  const metrics: MetricSampleInput[] = [];

  for (const period of periods) {
    sessions.push({
      type: "sleep",
      source: SOURCE,
      sourceId: period.id,
      startTime: new Date(period.bedtime_start).toISOString(),
      endTime: new Date(period.bedtime_end).toISOString(),
      metadata: {
        efficiency: period.efficiency,
        type: period.type,
        period: period.period,
        lowestHeartRate: period.lowest_heart_rate,
      },
    });

    const time = new Date(period.bedtime_start).toISOString();

    if (period.average_heart_rate != null) {
      metrics.push({
        time,
        metricSlug: "resting_heart_rate",
        source: SOURCE,
        valueNumeric: period.average_heart_rate,
        metadata: { sleepPeriodId: period.id },
      });
    }

    if (period.average_hrv != null) {
      metrics.push({
        time,
        metricSlug: "hrv",
        source: SOURCE,
        valueNumeric: period.average_hrv,
        metadata: { sleepPeriodId: period.id },
      });
    }

    if (period.average_breath != null) {
      metrics.push({
        time,
        metricSlug: "respiratory_rate",
        source: SOURCE,
        valueNumeric: period.average_breath,
        metadata: { sleepPeriodId: period.id },
      });
    }

    if (period.total_sleep_duration != null) {
      metrics.push({
        time,
        metricSlug: "sleep_duration",
        source: SOURCE,
        valueNumeric: period.total_sleep_duration,
        metadata: { sleepPeriodId: period.id },
      });
    }

    if (period.deep_sleep_duration != null || period.rem_sleep_duration != null || period.light_sleep_duration != null) {
      metrics.push({
        time,
        metricSlug: "sleep_stages",
        source: SOURCE,
        valueJson: {
          deep: period.deep_sleep_duration,
          rem: period.rem_sleep_duration,
          light: period.light_sleep_duration,
          awake: period.awake_time,
        },
        metadata: { sleepPeriodId: period.id },
      });
    }
  }

  return { sessions, metrics };
};

const mapDailySleep = (items: DailySleepModel[]): MetricSampleInput[] =>
  items
    .filter((item) => item.score != null)
    .map((item) => ({
      time: new Date(item.timestamp).toISOString(),
      metricSlug: "sleep_score",
      source: SOURCE,
      valueNumeric: item.score!,
      metadata: { contributors: item.contributors, day: item.day },
    }));

const mapDailyActivity = (items: DailyActivityModel[]): MetricSampleInput[] => {
  const metrics: MetricSampleInput[] = [];

  for (const item of items) {
    if (item.steps != null) {
      metrics.push({
        time: new Date(item.timestamp).toISOString(),
        metricSlug: "steps",
        source: SOURCE,
        valueNumeric: item.steps,
        metadata: { day: item.day },
      });
    }

    if (item.active_calories != null) {
      metrics.push({
        time: new Date(item.timestamp).toISOString(),
        metricSlug: "active_calories",
        source: SOURCE,
        valueNumeric: item.active_calories,
        metadata: { day: item.day },
      });
    }
  }

  return metrics;
};

const mapDailyReadiness = (items: DailyReadinessModel[]): MetricSampleInput[] =>
  items
    .filter((item) => item.temperature_deviation != null)
    .map((item) => ({
      time: new Date(item.timestamp).toISOString(),
      metricSlug: "body_temperature",
      source: SOURCE,
      valueNumeric: item.temperature_deviation!,
      metadata: {
        day: item.day,
        readinessScore: item.score,
        contributors: item.contributors,
        isDeviation: true,
      },
    }));

const mapDailySpo2 = (items: DailySpO2Model[]): MetricSampleInput[] =>
  items
    .filter((item) => item.spo2_percentage?.average != null)
    .map((item) => ({
      time: `${item.day}T00:00:00Z`,
      metricSlug: "spo2",
      source: SOURCE,
      valueNumeric: item.spo2_percentage!.average!,
      metadata: { day: item.day },
    }));

const mapWorkouts = (workouts: PublicWorkout[]): SessionInput[] =>
  workouts.map((w) => ({
    type: "workout",
    source: SOURCE,
    sourceId: w.id,
    startTime: new Date(w.start_datetime).toISOString(),
    endTime: new Date(w.end_datetime).toISOString(),
    metadata: {
      activity: w.activity,
      calories: w.calories,
      distance: w.distance,
      intensity: w.intensity,
      ouraSource: w.source,
    },
  }));

const wrapAsRawRecord = (endpoint: string, data: Array<{ id?: string }>): RawRecordInput[] =>
  data.map((item, i) => ({
    source: SOURCE,
    sourceId: `${endpoint}-${item.id ?? i}`,
    endpoint,
    payload: item as unknown as Record<string, unknown>,
  }));

export {
  mapHeartRate,
  mapSleepPeriods,
  mapDailySleep,
  mapDailyActivity,
  mapDailyReadiness,
  mapDailySpo2,
  mapWorkouts,
  wrapAsRawRecord,
};
