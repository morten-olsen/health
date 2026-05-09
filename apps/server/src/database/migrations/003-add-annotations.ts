import type { Kysely } from 'kysely';

// Annotations are free-form contextual enrichments to the timeline — notes
// about the data rather than data itself. Distinct from events, which are
// catalogued discrete trackings with structured payloads.

const up = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema
    .createTable('annotations')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('text', 'text', (col) => col.notNull())
    .addColumn('start_at', 'text', (col) => col.notNull())
    .addColumn('end_at', 'text', (col) => col.notNull())
    .addColumn('tz', 'text')
    .addColumn('tags', 'text') // JSON array of strings
    .addColumn('source_integration', 'text', (col) => col.notNull())
    .addColumn('source_device', 'text', (col) => col.notNull())
    .addColumn('source_instance', 'text')
    .addColumn('ingest_log_id', 'text', (col) => col.notNull().references('ingest_log.id').onDelete('cascade'))
    .addColumn('created_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex('idx_annotations_user_start')
    .on('annotations')
    .columns(['user_id', 'start_at'])
    .execute();
};

const down = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema.dropTable('annotations').execute();
};

export { up, down };
