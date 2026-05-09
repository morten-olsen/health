import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';
import { Kysely, PostgresDialect, SqliteDialect } from 'kysely';
import { FileMigrationProvider, Migrator } from 'kysely/migration';
import pg from 'pg';

import { ConfigService } from '../config/config.ts';
import type { Dialect } from '../config/config.ts';
import { destroySymbol, Services } from '../services/services.ts';

import type { DatabaseSchema } from './database.types.ts';

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

const buildSqlite = (filename: string): { kysely: Kysely<DatabaseSchema>; close: () => void } => {
  const sqlite = new Database(filename);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const kysely = new Kysely<DatabaseSchema>({ dialect: new SqliteDialect({ database: sqlite }) });
  return { kysely, close: () => sqlite.close() };
};

const buildPostgres = (url: string | undefined): { kysely: Kysely<DatabaseSchema>; close: () => Promise<void> } => {
  if (!url) {
    throw new Error('HEALTH_DB_URL is required when HEALTH_DB_DIALECT=postgres');
  }
  const pool = new pg.Pool({ connectionString: url });
  const kysely = new Kysely<DatabaseSchema>({ dialect: new PostgresDialect({ pool }) });
  return { kysely, close: () => pool.end() };
};

class DatabaseService {
  #services: Services;
  #instance: Promise<Kysely<DatabaseSchema>> | null = null;
  #dialect: Dialect = 'sqlite';
  #close: (() => void) | (() => Promise<void>) | null = null;

  constructor(services: Services) {
    this.#services = services;
  }

  getInstance = (): Promise<Kysely<DatabaseSchema>> => {
    if (!this.#instance) {
      this.#instance = this.#setup();
    }
    return this.#instance;
  };

  getDialect = (): Dialect => this.#dialect;

  #setup = async (): Promise<Kysely<DatabaseSchema>> => {
    const { database } = this.#services.get(ConfigService).config;
    this.#dialect = database.dialect;

    const built = database.dialect === 'sqlite' ? buildSqlite(database.filename) : buildPostgres(database.url);
    this.#close = built.close;
    const db = built.kysely;

    const migrator = new Migrator({
      db,
      provider: new FileMigrationProvider({ fs, path, migrationFolder: migrationsFolder }),
    });

    const { error, results } = await migrator.migrateToLatest();
    for (const result of results ?? []) {
      if (result.status === 'Error') {
        console.error(`Migration "${result.migrationName}" failed`);
      }
    }
    if (error) {
      throw error;
    }

    return db;
  };

  [destroySymbol] = async (): Promise<void> => {
    if (this.#instance) {
      const db = await this.#instance;
      await db.destroy();
    }
    if (this.#close) {
      await this.#close();
    }
  };
}

export { DatabaseService };
