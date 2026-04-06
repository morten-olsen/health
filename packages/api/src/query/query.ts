import { metricQuerySchema } from "@morten-olsen/health-contracts";
import type { MetricQuery } from "@morten-olsen/health-contracts";

import type { Services } from "../services/services.js";
import { DatabaseService } from "../db/db.js";

type MetricSampleResult = {
  time: string;
  metricSlug: string;
  source: string;
  valueNumeric: number | null;
  valueJson: unknown | null;
  valueBoolean: boolean | null;
  metadata: unknown | null;
};

type SessionResult = {
  id: string;
  type: string;
  source: string;
  startTime: string;
  endTime: string;
  metadata: unknown | null;
};

class QueryService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  queryMetrics = async (input: MetricQuery): Promise<MetricSampleResult[]> => {
    const validated = metricQuerySchema.parse(input);
    const db = this.#services.get(DatabaseService).get();

    let query = db
      .selectFrom("metric_samples")
      .select([
        "time",
        "metric_slug",
        "source",
        "value_numeric",
        "value_json",
        "value_boolean",
        "metadata",
      ])
      .where("metric_slug", "=", validated.metricSlug)
      .where("time", ">=", new Date(validated.from))
      .where("time", "<=", new Date(validated.to))
      .orderBy("time", "asc");

    if (validated.source) {
      query = query.where("source", "=", validated.source);
    }

    const rows = await query.execute();

    return rows.map((row) => ({
      time: row.time.toISOString(),
      metricSlug: row.metric_slug,
      source: row.source,
      valueNumeric: row.value_numeric,
      valueJson: row.value_json,
      valueBoolean: row.value_boolean,
      metadata: row.metadata,
    }));
  };

  querySessions = async (input: {
    type?: string;
    from: string;
    to: string;
  }): Promise<SessionResult[]> => {
    const db = this.#services.get(DatabaseService).get();

    let query = db
      .selectFrom("sessions")
      .select(["id", "type", "source", "start_time", "end_time", "metadata"])
      .where("start_time", ">=", new Date(input.from))
      .where("start_time", "<=", new Date(input.to))
      .orderBy("start_time", "asc");

    if (input.type) {
      query = query.where("type", "=", input.type);
    }

    const rows = await query.execute();

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      source: row.source,
      startTime: row.start_time.toISOString(),
      endTime: row.end_time.toISOString(),
      metadata: row.metadata,
    }));
  };
}

export type { MetricSampleResult, SessionResult };
export { QueryService };
