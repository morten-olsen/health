import type { ExpressionBuilder } from 'kysely';

import { DatabaseService } from '../database/database.ts';
import type {
  CatalogueAliasesTable,
  CatalogueEntriesTable,
  CatalogueKind,
  CatalogueNamespace,
  DatabaseSchema,
  SampleKind,
} from '../database/database.types.ts';
import { Services } from '../services/services.ts';

import type {
  CatalogueAliasResponse,
  CatalogueEntryResponse,
  CreateAliasInput,
  CreateCustomEntryInput,
} from './catalogue.schemas.ts';

type CatalogueEntry = {
  id: string;
  user_id: string | null;
  kind: CatalogueKind;
  namespace: CatalogueNamespace;
  version: number;
  unit: string | null;
  description: string | null;
  shape: Record<string, unknown>;
  deprecated: boolean;
  created_at: string;
  updated_at: string;
};

// A CatalogueEntry whose kind has been narrowed to the sample-compatible
// subset. validateSample() upstream rejects anything else, but the type
// system needs an explicit guard to prove it before assigning to a
// SamplesTable row.
type SampleCatalogueEntry = CatalogueEntry & { kind: SampleKind };

const SAMPLE_KINDS: ReadonlySet<CatalogueKind> = new Set(['numeric', 'categorical', 'geo', 'composite']);

const isSampleEntry = (entry: CatalogueEntry): entry is SampleCatalogueEntry => SAMPLE_KINDS.has(entry.kind);

type AliasEntry = {
  alias: string;
  user_id: string;
  canonical_id: string;
  created_at: string;
};

class CatalogueDuplicateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogueDuplicateError';
  }
}

class CatalogueAliasTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CatalogueAliasTargetError';
  }
}

const rowToEntry = (row: CatalogueEntriesTable): CatalogueEntry => ({
  id: row.id,
  user_id: row.user_id,
  kind: row.kind,
  namespace: row.namespace,
  version: row.version,
  unit: row.unit,
  description: row.description,
  shape: JSON.parse(row.shape) as Record<string, unknown>,
  deprecated: row.deprecated === 1,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const rowToAlias = (row: CatalogueAliasesTable): AliasEntry => ({
  alias: row.alias,
  user_id: row.user_id,
  canonical_id: row.canonical_id,
  created_at: row.created_at,
});

const toEntryResponse = (entry: CatalogueEntry): CatalogueEntryResponse => entry;
const toAliasResponse = (alias: AliasEntry): CatalogueAliasResponse => alias;

// A catalogue entry is visible to a user if it's canonical (user_id IS NULL)
// or owned by that user. Used wherever we filter entries by viewer.
const visibleToUser = (userId: string) => (eb: ExpressionBuilder<DatabaseSchema, 'catalogue_entries'>) =>
  eb.or([eb('user_id', 'is', null), eb('user_id', '=', userId)]);

class CatalogueService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  // Resolve a metric ID for a specific user. Lookup precedence:
  //   1. user's aliases (e.g. apple.heart_rate → heart_rate)
  //   2. user's custom entry with that id
  //   3. canonical entry with that id
  resolve = async (metricId: string, userId: string): Promise<CatalogueEntry | null> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const aliasRow = await db
      .selectFrom('catalogue_aliases')
      .select('canonical_id')
      .where('alias', '=', metricId)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    const targetId = aliasRow?.canonical_id ?? metricId;
    const entry = await db
      .selectFrom('catalogue_entries')
      .selectAll()
      .where('id', '=', targetId)
      .where(visibleToUser(userId))
      .executeTakeFirst();
    return entry ? rowToEntry(entry) : null;
  };

  list = async (
    filter: { namespace?: CatalogueNamespace; kind?: CatalogueKind },
    userId: string,
  ): Promise<CatalogueEntryResponse[]> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    let query = db.selectFrom('catalogue_entries').selectAll().where(visibleToUser(userId));
    if (filter.namespace) {
      query = query.where('namespace', '=', filter.namespace);
    }
    if (filter.kind) {
      query = query.where('kind', '=', filter.kind);
    }
    const rows = await query.execute();
    return rows.map(rowToEntry).map(toEntryResponse);
  };

  get = async (id: string, userId: string): Promise<CatalogueEntryResponse | null> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const row = await db
      .selectFrom('catalogue_entries')
      .selectAll()
      .where('id', '=', id)
      .where(visibleToUser(userId))
      .executeTakeFirst();
    return row ? toEntryResponse(rowToEntry(row)) : null;
  };

  listAliases = async (userId: string): Promise<CatalogueAliasResponse[]> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const rows = await db.selectFrom('catalogue_aliases').selectAll().where('user_id', '=', userId).execute();
    return rows.map(rowToAlias).map(toAliasResponse);
  };

  createCustomEntry = async (input: CreateCustomEntryInput, userId: string): Promise<CatalogueEntryResponse> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    await this.#assertIdAvailable(input.id, userId);

    const now = new Date().toISOString();
    const row: CatalogueEntriesTable = {
      id: input.id,
      user_id: userId,
      kind: input.kind,
      namespace: 'custom',
      version: 1,
      unit: input.kind === 'numeric' ? input.unit : null,
      description: input.description ?? null,
      shape: JSON.stringify(input.shape),
      deprecated: 0,
      created_at: now,
      updated_at: now,
    };
    await db.insertInto('catalogue_entries').values(row).execute();
    return toEntryResponse(rowToEntry(row));
  };

  createAlias = async (input: CreateAliasInput, userId: string): Promise<CatalogueAliasResponse> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const target = await this.resolve(input.canonical_id, userId);
    if (!target) {
      throw new CatalogueAliasTargetError(`Catalogue entry "${input.canonical_id}" not found`);
    }
    await this.#assertIdAvailable(input.alias, userId);
    const now = new Date().toISOString();
    const row: CatalogueAliasesTable = {
      alias: input.alias,
      user_id: userId,
      canonical_id: input.canonical_id,
      created_at: now,
    };
    await db.insertInto('catalogue_aliases').values(row).execute();
    return toAliasResponse(rowToAlias(row));
  };

  // Throws if `id` collides with a catalogue entry visible to the user, or
  // with one of the user's own aliases. Used by both createCustomEntry
  // (id is the new entry's id) and createAlias (id is the alias label).
  #assertIdAvailable = async (id: string, userId: string): Promise<void> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const entryConflict = await db
      .selectFrom('catalogue_entries')
      .select('id')
      .where('id', '=', id)
      .where(visibleToUser(userId))
      .executeTakeFirst();
    if (entryConflict) {
      throw new CatalogueDuplicateError(`"${id}" collides with an existing catalogue entry`);
    }
    const aliasConflict = await db
      .selectFrom('catalogue_aliases')
      .select('alias')
      .where('alias', '=', id)
      .where('user_id', '=', userId)
      .executeTakeFirst();
    if (aliasConflict) {
      throw new CatalogueDuplicateError(`"${id}" collides with an existing alias`);
    }
  };
}

export type { CatalogueEntry, SampleCatalogueEntry };
export { CatalogueAliasTargetError, CatalogueDuplicateError, CatalogueService, isSampleEntry };
