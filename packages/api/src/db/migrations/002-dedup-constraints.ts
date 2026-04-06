import type { Kysely } from "kysely";
import { sql } from "kysely";

const up = async (db: Kysely<unknown>): Promise<void> => {
  // Unique constraint on raw records by source + source_id
  // Allows idempotent re-ingestion of the same source data
  await db.schema
    .createIndex("uq_raw_records_source_source_id")
    .on("raw_records")
    .columns(["source", "source_id"])
    .unique()
    .where(sql.ref("source_id"), "is not", null)
    .execute();

  // Unique constraint on metric samples by slug + source + time
  // Prevents duplicate data points from repeated pulls
  await db.schema
    .createIndex("uq_metric_samples_slug_source_time")
    .on("metric_samples")
    .columns(["metric_slug", "source", "time"])
    .unique()
    .execute();

  // Unique constraint on sessions by source + source_id
  // Prevents duplicate sessions from repeated pulls
  await db.schema
    .createIndex("uq_sessions_source_source_id")
    .on("sessions")
    .columns(["source", "source_id"])
    .unique()
    .where(sql.ref("source_id"), "is not", null)
    .execute();
};

const down = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema.dropIndex("uq_sessions_source_source_id").ifExists().execute();
  await db.schema.dropIndex("uq_metric_samples_slug_source_time").ifExists().execute();
  await db.schema.dropIndex("uq_raw_records_source_source_id").ifExists().execute();
};

export { up, down };
