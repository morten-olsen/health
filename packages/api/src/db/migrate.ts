import { Migrator } from "kysely";

import { Services } from "../services/services.js";
import { DatabaseService } from "./db.js";
import { migrations } from "./migrations/migrations.js";

const run = async (): Promise<void> => {
  const services = new Services();
  const db = services.get(DatabaseService).get();

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
    console.error("Migration failed:", error);
    process.exitCode = 1;
  }

  await services.destroy();
};

run();
