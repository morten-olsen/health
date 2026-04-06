import { Migrator } from "kysely";
import type { Kysely } from "kysely";

import type { Database } from "./db.js";
import { migrations } from "./migrations/migrations.js";

const runMigrations = async (db: Kysely<Database>): Promise<void> => {
  const migrator = new Migrator({
    db,
    provider: {
      getMigrations: async () => migrations,
    },
  });

  const { error, results } = await migrator.migrateToLatest();

  for (const result of results ?? []) {
    if (result.status === "Success") {
      console.log(`Migration "${result.migrationName}" executed successfully`);
    } else if (result.status === "Error") {
      console.error(`Migration "${result.migrationName}" failed`);
    }
  }

  if (error) {
    throw error;
  }
};

export { runMigrations };
