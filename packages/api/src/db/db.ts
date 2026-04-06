import { Kysely, PostgresDialect } from "kysely";
import type { Generated } from "kysely";
import pg from "pg";

import type { Services } from "../services/services.js";
import { destroySymbol } from "../services/services.js";

// ── Database schema types ───────────────────────────────────────────────────

type RawRecordTable = {
  id: Generated<string>;
  source: string;
  source_id: string | null;
  endpoint: string | null;
  payload: unknown;
  fetched_at: Generated<Date>;
};

type MetricCatalogTable = {
  slug: string;
  name: string;
  unit: string;
  value_type: string;
  valid_range_min: number | null;
  valid_range_max: number | null;
  aggregations: string[];
  category: string;
  created_at: Generated<Date>;
};

type MetricSampleTable = {
  id: Generated<string>;
  time: Date;
  metric_slug: string;
  source: string;
  value_numeric: number | null;
  value_json: unknown | null;
  value_boolean: boolean | null;
  metadata: unknown | null;
  raw_record_id: string | null;
  created_at: Generated<Date>;
};

type SessionTable = {
  id: Generated<string>;
  type: string;
  source: string;
  source_id: string | null;
  start_time: Date;
  end_time: Date;
  metadata: unknown | null;
  raw_record_id: string | null;
  created_at: Generated<Date>;
};

type EventTable = {
  id: Generated<string>;
  time: Date;
  category: string;
  label: string;
  metadata: unknown | null;
  created_at: Generated<Date>;
};

type ResolutionRuleTable = {
  metric_slug: string;
  source_priority: string[];
  merge_strategy: string;
  window_seconds: number;
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
};

type Database = {
  raw_records: RawRecordTable;
  metric_catalog: MetricCatalogTable;
  metric_samples: MetricSampleTable;
  sessions: SessionTable;
  events: EventTable;
  resolution_rules: ResolutionRuleTable;
};

// ── Database Service ────────────────────────────────────────────────────────

class DatabaseService {
  #instance: Kysely<Database> | null;
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
    this.#instance = null;
  }

  get = (): Kysely<Database> => {
    if (!this.#instance) {
      const pool = new pg.Pool({
        connectionString:
          process.env["DATABASE_URL"] ?? "postgresql://localhost:5432/health",
      });

      this.#instance = new Kysely<Database>({
        dialect: new PostgresDialect({ pool }),
      });
    }
    return this.#instance;
  };

  [destroySymbol] = async (): Promise<void> => {
    if (this.#instance) {
      await this.#instance.destroy();
    }
  };
}

export type {
  Database,
  RawRecordTable,
  MetricCatalogTable,
  MetricSampleTable,
  SessionTable,
  EventTable,
  ResolutionRuleTable,
};
export { DatabaseService };
