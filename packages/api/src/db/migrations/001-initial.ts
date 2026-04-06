import type { Kysely } from "kysely";
import { sql } from "kysely";

const up = async (db: Kysely<unknown>): Promise<void> => {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`.execute(db);

  // ── Raw records (append-only) ───────────────────────────────────────────

  await db.schema
    .createTable("raw_records")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
    )
    .addColumn("source", "varchar(100)", (col) => col.notNull())
    .addColumn("source_id", "varchar(255)")
    .addColumn("endpoint", "varchar(500)")
    .addColumn("payload", "jsonb", (col) => col.notNull())
    .addColumn("fetched_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("idx_raw_records_source")
    .on("raw_records")
    .column("source")
    .execute();

  await db.schema
    .createIndex("idx_raw_records_fetched_at")
    .on("raw_records")
    .column("fetched_at")
    .execute();

  // ── Metric catalog ────────────────────────────────────────────────────

  await db.schema
    .createTable("metric_catalog")
    .addColumn("slug", "varchar(100)", (col) => col.primaryKey())
    .addColumn("name", "varchar(255)", (col) => col.notNull())
    .addColumn("unit", "varchar(50)", (col) => col.notNull())
    .addColumn("value_type", "varchar(20)", (col) => col.notNull())
    .addColumn("valid_range_min", "double precision")
    .addColumn("valid_range_max", "double precision")
    .addColumn("aggregations", sql`text[]`, (col) => col.notNull())
    .addColumn("category", "varchar(100)", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // ── Metric samples (hypertable) ───────────────────────────────────────

  await db.schema
    .createTable("metric_samples")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
    )
    .addColumn("time", "timestamptz", (col) => col.notNull())
    .addColumn("metric_slug", "varchar(100)", (col) =>
      col.notNull().references("metric_catalog.slug"),
    )
    .addColumn("source", "varchar(100)", (col) => col.notNull())
    .addColumn("value_numeric", "double precision")
    .addColumn("value_json", "jsonb")
    .addColumn("value_boolean", "boolean")
    .addColumn("metadata", "jsonb")
    .addColumn("raw_record_id", "uuid", (col) =>
      col.references("raw_records.id"),
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // Convert to TimescaleDB hypertable if extension is available
  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('metric_samples', 'time', migrate_data => true);
      END IF;
    END $$;
  `.execute(db);

  await db.schema
    .createIndex("idx_metric_samples_slug_time")
    .on("metric_samples")
    .columns(["metric_slug", "time"])
    .execute();

  await db.schema
    .createIndex("idx_metric_samples_source")
    .on("metric_samples")
    .column("source")
    .execute();

  // ── Sessions ──────────────────────────────────────────────────────────

  await db.schema
    .createTable("sessions")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
    )
    .addColumn("type", "varchar(100)", (col) => col.notNull())
    .addColumn("source", "varchar(100)", (col) => col.notNull())
    .addColumn("source_id", "varchar(255)")
    .addColumn("start_time", "timestamptz", (col) => col.notNull())
    .addColumn("end_time", "timestamptz", (col) => col.notNull())
    .addColumn("metadata", "jsonb")
    .addColumn("raw_record_id", "uuid", (col) =>
      col.references("raw_records.id"),
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createIndex("idx_sessions_type_time")
    .on("sessions")
    .columns(["type", "start_time"])
    .execute();

  // ── Events (hypertable) ───────────────────────────────────────────────

  await db.schema
    .createTable("events")
    .addColumn("id", "uuid", (col) =>
      col.primaryKey().defaultTo(sql`uuid_generate_v4()`),
    )
    .addColumn("time", "timestamptz", (col) => col.notNull())
    .addColumn("category", "varchar(100)", (col) => col.notNull())
    .addColumn("label", "varchar(255)", (col) => col.notNull())
    .addColumn("metadata", "jsonb")
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
        PERFORM create_hypertable('events', 'time', migrate_data => true);
      END IF;
    END $$;
  `.execute(db);

  await db.schema
    .createIndex("idx_events_category_time")
    .on("events")
    .columns(["category", "time"])
    .execute();

  // ── Resolution rules ──────────────────────────────────────────────────

  await db.schema
    .createTable("resolution_rules")
    .addColumn("metric_slug", "varchar(100)", (col) =>
      col.primaryKey().references("metric_catalog.slug"),
    )
    .addColumn("source_priority", sql`text[]`, (col) => col.notNull())
    .addColumn("merge_strategy", "varchar(20)", (col) =>
      col.notNull().defaultTo("priority"),
    )
    .addColumn("window_seconds", "integer", (col) =>
      col.notNull().defaultTo(60),
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn("updated_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();
};

const down = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema.dropTable("resolution_rules").ifExists().execute();
  await db.schema.dropTable("events").ifExists().execute();
  await db.schema.dropTable("sessions").ifExists().execute();
  await db.schema.dropTable("metric_samples").ifExists().execute();
  await db.schema.dropTable("metric_catalog").ifExists().execute();
  await db.schema.dropTable("raw_records").ifExists().execute();
};

export { up, down };
