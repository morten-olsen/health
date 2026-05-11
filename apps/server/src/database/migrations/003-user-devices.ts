import type { Kysely } from 'kysely';

// user_devices — registry of devices an integration has declared for a user.
// Each row pairs an (integration, device_id) with a user-editable name. The
// canonical identity in samples / events / sessions / annotations remains
// source_device (stable across renames); name is a display concern only and
// is not joined into the data path at write time.
//
// Population is explicit: integrations call POST /api/devices to register a
// device before (or alongside) ingesting from it. Ingest does NOT touch this
// table — separation of concerns between the data path and the device
// registry.

const up = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema
    .createTable('user_devices')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('user_id', 'text', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('integration', 'text', (col) => col.notNull())
    .addColumn('device_id', 'text', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull())
    .addColumn('updated_at', 'text', (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex('idx_user_devices_user_integration_device')
    .on('user_devices')
    .columns(['user_id', 'integration', 'device_id'])
    .unique()
    .execute();

  await db.schema.createIndex('idx_user_devices_user').on('user_devices').column('user_id').execute();
};

const down = async (db: Kysely<unknown>): Promise<void> => {
  await db.schema.dropTable('user_devices').execute();
};

export { up, down };
