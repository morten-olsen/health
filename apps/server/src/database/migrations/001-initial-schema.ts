import type { Kysely } from 'kysely';

// All tables use portable column types so the same migration runs on both
// SQLite and Postgres:
//   - timestamps are `text` (ISO 8601 strings, app-generated)
//   - JSON columns are `text` (parsed/stringified at the boundary)
//   - booleans are `integer` (0 or 1)
//   - IDs are `text` UUIDs (app-generated via crypto.randomUUID())
// No DB-side defaults — the application is the single source of truth.

const up = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema
    .createTable('catalogue_entries')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('kind', 'text', (col) => col.notNull())
    .addColumn('namespace', 'text', (col) => col.notNull())
    .addColumn('version', 'integer', (col) => col.notNull())
    .addColumn('unit', 'text')
    .addColumn('description', 'text')
    .addColumn('shape', 'text', (col) => col.notNull())
    .addColumn('deprecated', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema.createIndex('idx_catalogue_entries_namespace').on('catalogue_entries').column('namespace').execute();

  await db.schema
    .createTable('catalogue_aliases')
    .addColumn('alias', 'text', (col) => col.primaryKey())
    .addColumn('canonical_id', 'text', (col) => col.notNull().references('catalogue_entries.id').onDelete('cascade'))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex('idx_catalogue_aliases_canonical_id')
    .on('catalogue_aliases')
    .column('canonical_id')
    .execute();

  await db.schema
    .createTable('ingest_log')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('received_at', 'text', (col) => col.notNull())
    .addColumn('source_integration', 'text', (col) => col.notNull())
    .addColumn('source_device', 'text', (col) => col.notNull())
    .addColumn('source_instance', 'text')
    .addColumn('idempotency_key', 'text', (col) => col.notNull())
    .addColumn('item_type', 'text', (col) => col.notNull())
    .addColumn('metric', 'text')
    .addColumn('payload', 'text', (col) => col.notNull())
    .addColumn('validation_status', 'text', (col) => col.notNull())
    .addColumn('rejection_reason', 'text')
    .addColumn('catalogue_version', 'integer')
    .addColumn('published_id', 'text')
    .execute();

  // Idempotency uniqueness scoped per-source. NULL-valued source_instance
  // is treated as a distinct value by SQLite and Postgres unique indexes —
  // we coalesce to an empty string for predictable behavior.
  await db.schema
    .createIndex('idx_ingest_log_idempotency')
    .on('ingest_log')
    .columns(['source_integration', 'source_device', 'source_instance', 'idempotency_key'])
    .unique()
    .execute();

  await db.schema
    .createIndex('idx_ingest_log_validation_status')
    .on('ingest_log')
    .column('validation_status')
    .execute();

  await db.schema.createIndex('idx_ingest_log_metric').on('ingest_log').column('metric').execute();

  await db.schema
    .createTable('samples')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('metric_id', 'text', (col) => col.notNull())
    .addColumn('kind', 'text', (col) => col.notNull())
    .addColumn('start_at', 'text', (col) => col.notNull())
    .addColumn('end_at', 'text', (col) => col.notNull())
    .addColumn('tz', 'text')
    .addColumn('value', 'text', (col) => col.notNull())
    .addColumn('source_integration', 'text', (col) => col.notNull())
    .addColumn('source_device', 'text', (col) => col.notNull())
    .addColumn('source_instance', 'text')
    .addColumn('ingest_log_id', 'text', (col) => col.notNull().references('ingest_log.id').onDelete('cascade'))
    .addColumn('catalogue_version', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema.createIndex('idx_samples_metric_start').on('samples').columns(['metric_id', 'start_at']).execute();

  await db.schema
    .createIndex('idx_samples_source')
    .on('samples')
    .columns(['source_integration', 'source_device'])
    .execute();

  await db.schema
    .createTable('events')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('metric_id', 'text', (col) => col.notNull())
    .addColumn('at', 'text', (col) => col.notNull())
    .addColumn('tz', 'text')
    .addColumn('payload', 'text', (col) => col.notNull())
    .addColumn('source_integration', 'text', (col) => col.notNull())
    .addColumn('source_device', 'text', (col) => col.notNull())
    .addColumn('source_instance', 'text')
    .addColumn('ingest_log_id', 'text', (col) => col.notNull().references('ingest_log.id').onDelete('cascade'))
    .addColumn('catalogue_version', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema.createIndex('idx_events_metric_at').on('events').columns(['metric_id', 'at']).execute();

  await db.schema
    .createTable('sessions')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('session_type', 'text', (col) => col.notNull())
    .addColumn('start_at', 'text', (col) => col.notNull())
    .addColumn('end_at', 'text', (col) => col.notNull())
    .addColumn('tz', 'text')
    .addColumn('metadata', 'text')
    .addColumn('source_integration', 'text', (col) => col.notNull())
    .addColumn('source_device', 'text', (col) => col.notNull())
    .addColumn('source_instance', 'text')
    .addColumn('ingest_log_id', 'text', (col) => col.notNull().references('ingest_log.id').onDelete('cascade'))
    .addColumn('catalogue_version', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema.createIndex('idx_sessions_type_start').on('sessions').columns(['session_type', 'start_at']).execute();
};

const down = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema.dropTable('sessions').execute();
  await db.schema.dropTable('events').execute();
  await db.schema.dropTable('samples').execute();
  await db.schema.dropTable('ingest_log').execute();
  await db.schema.dropTable('catalogue_aliases').execute();
  await db.schema.dropTable('catalogue_entries').execute();
};

export { up, down };
