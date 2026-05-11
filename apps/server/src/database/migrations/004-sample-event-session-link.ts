import type { Kysely } from 'kysely';

// Adds optional session linkage to samples and events. Two columns per table:
//   session_key — the raw idempotency_key the integration sent (durable; used
//                 for back-fill when the session is published after its samples)
//   session_id  — the resolved session UUID (set at publish time if the
//                 session was already published, or back-filled when the
//                 session arrives later)
//
// Both nullable. No FK constraint — samples are independent records that
// remain valid even if the referenced session is deleted, and they must be
// ingestable before the session is published (replay scenario).

const up = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema.alterTable('samples').addColumn('session_key', 'text').execute();
  await db.schema.alterTable('samples').addColumn('session_id', 'text').execute();
  await db.schema.alterTable('events').addColumn('session_key', 'text').execute();
  await db.schema.alterTable('events').addColumn('session_id', 'text').execute();

  await db.schema.createIndex('idx_samples_session_id').on('samples').column('session_id').execute();
  await db.schema.createIndex('idx_samples_session_key').on('samples').column('session_key').execute();
  await db.schema.createIndex('idx_events_session_id').on('events').column('session_id').execute();
  await db.schema.createIndex('idx_events_session_key').on('events').column('session_key').execute();
};

const down = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema.dropIndex('idx_events_session_key').execute();
  await db.schema.dropIndex('idx_events_session_id').execute();
  await db.schema.dropIndex('idx_samples_session_key').execute();
  await db.schema.dropIndex('idx_samples_session_id').execute();
  await db.schema.alterTable('events').dropColumn('session_id').execute();
  await db.schema.alterTable('events').dropColumn('session_key').execute();
  await db.schema.alterTable('samples').dropColumn('session_id').execute();
  await db.schema.alterTable('samples').dropColumn('session_key').execute();
};

export { up, down };
