import type { Kysely } from "kysely";

const up = async (db: Kysely<unknown>): Promise<void> => {
  // Drop partial unique indexes — ON CONFLICT can't target them via Kysely
  await db.schema.dropIndex("uq_raw_records_source_source_id").ifExists().execute();
  await db.schema.dropIndex("uq_sessions_source_source_id").ifExists().execute();

  // Recreate as non-partial unique indexes
  await db.schema
    .createIndex("uq_raw_records_source_source_id")
    .on("raw_records")
    .columns(["source", "source_id"])
    .unique()
    .execute();

  await db.schema
    .createIndex("uq_sessions_source_source_id")
    .on("sessions")
    .columns(["source", "source_id"])
    .unique()
    .execute();
};

const down = async (db: Kysely<unknown>): Promise<void> => {
  // Revert not needed — original migration handles full teardown
};

export { up, down };
