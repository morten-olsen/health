import type { ExpressionBuilder } from 'kysely';

import { DatabaseService } from '../database/database.ts';
import type {
  CatalogueAliasesTable,
  CatalogueEntriesTable,
  CatalogueKind,
  CatalogueNamespace,
  DatabaseSchema,
  RejectionReason,
} from '../database/database.types.ts';
import { Services } from '../services/services.ts';

import { assertValidEventSchema, CatalogueSchemaError, validateEventPayload } from './catalogue.json-schema.ts';
import type {
  CatalogueAliasResponse,
  CatalogueEntryResponse,
  CategoricalConfig,
  CompositeConfig,
  CreateAliasInput,
  CreateCustomEntryInput,
  EventConfig,
  GeoConfig,
  NumericConfig,
  SessionConfig,
} from './catalogue.schemas.ts';
import {
  fail,
  validateCategorical,
  validateComposite,
  validateGeo,
  validateNumeric,
} from './catalogue.value-validate.ts';
import type { ValidationResult } from './catalogue.value-validate.ts';

type JsonSchema = Record<string, unknown>;

type CatalogueEntryBase = {
  id: string;
  user_id: string | null;
  namespace: CatalogueNamespace;
  version: number;
  description: string | null;
  deprecated: boolean;
  created_at: string;
  updated_at: string;
};

type NumericEntry = CatalogueEntryBase & { kind: 'numeric'; config: NumericConfig };
type CategoricalEntry = CatalogueEntryBase & { kind: 'categorical'; config: CategoricalConfig };
type GeoEntry = CatalogueEntryBase & { kind: 'geo'; config: GeoConfig };
type CompositeEntry = CatalogueEntryBase & { kind: 'composite'; config: CompositeConfig };
type EventEntry = CatalogueEntryBase & { kind: 'event'; config: EventConfig };
type SessionEntry = CatalogueEntryBase & { kind: 'session'; config: SessionConfig };

type CatalogueEntry = NumericEntry | CategoricalEntry | GeoEntry | CompositeEntry | EventEntry | SessionEntry;
type SampleCatalogueEntry = NumericEntry | CategoricalEntry | GeoEntry | CompositeEntry;

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

// The `as CatalogueEntry` is safe: row.kind is the typed discriminator and
// the only writers (seed + createCustomEntry) build config to match.
const rowToEntry = (row: CatalogueEntriesTable): CatalogueEntry =>
  ({
    id: row.id,
    user_id: row.user_id,
    kind: row.kind,
    namespace: row.namespace,
    version: row.version,
    description: row.description,
    config: JSON.parse(row.config),
    deprecated: row.deprecated === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }) as CatalogueEntry;

const rowToAlias = (row: CatalogueAliasesTable): AliasEntry => ({
  alias: row.alias,
  user_id: row.user_id,
  canonical_id: row.canonical_id,
  created_at: row.created_at,
});

// A catalogue entry is visible to a user if it's canonical (user_id IS NULL)
// or owned by that user. Used wherever we filter entries by viewer.
const visibleToUser = (userId: string) => (eb: ExpressionBuilder<DatabaseSchema, 'catalogue_entries'>) =>
  eb.or([eb('user_id', 'is', null), eb('user_id', '=', userId)]);

const validateSampleValue = (entry: SampleCatalogueEntry, value: unknown): ValidationResult => {
  switch (entry.kind) {
    case 'numeric':
      return validateNumeric(value, entry.config);
    case 'categorical':
      return validateCategorical(value, entry.config);
    case 'geo':
      return validateGeo(value);
    case 'composite':
      return validateComposite(value, entry.config);
  }
};

// Cache key folds in user_id so the same id can host different schemas
// across canonical and custom (or two users' customs) without collisions.
const validatorCacheKey = (entry: EventEntry): string =>
  `${entry.user_id ?? 'canonical'}::${entry.id}::${entry.version}`;

const validateEventPayloadAgainstEntry = (entry: EventEntry, payload: unknown): ValidationResult =>
  validateEventPayload(validatorCacheKey(entry), entry.config.schema, payload);

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
    return rows.map(rowToEntry);
  };

  get = async (id: string, userId: string): Promise<CatalogueEntryResponse | null> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const row = await db
      .selectFrom('catalogue_entries')
      .selectAll()
      .where('id', '=', id)
      .where(visibleToUser(userId))
      .executeTakeFirst();
    return row ? rowToEntry(row) : null;
  };

  listAliases = async (userId: string): Promise<CatalogueAliasResponse[]> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const rows = await db.selectFrom('catalogue_aliases').selectAll().where('user_id', '=', userId).execute();
    return rows.map(rowToAlias);
  };

  createCustomEntry = async (input: CreateCustomEntryInput, userId: string): Promise<CatalogueEntryResponse> => {
    // Throws CatalogueSchemaError, which the route maps to 400.
    if (input.kind === 'event') {
      assertValidEventSchema(input.config.schema);
    }
    const db = await this.#services.get(DatabaseService).getInstance();
    await this.#assertIdAvailable(input.id, userId);

    const now = new Date().toISOString();
    const row: CatalogueEntriesTable = {
      id: input.id,
      user_id: userId,
      kind: input.kind,
      namespace: 'custom',
      version: 1,
      description: input.description ?? null,
      config: JSON.stringify(input.config),
      deprecated: 0,
      created_at: now,
      updated_at: now,
    };
    await db.insertInto('catalogue_entries').values(row).execute();
    return rowToEntry(row);
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
    return rowToAlias(row);
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

export type { CatalogueEntry, EventEntry, JsonSchema, RejectionReason, SampleCatalogueEntry, ValidationResult };
export type {
  CategoricalConfig,
  CompositeComponent,
  CompositeConfig,
  EventConfig,
  GeoConfig,
  NumericConfig,
  Range,
  SessionConfig,
} from './catalogue.schemas.ts';
export {
  CatalogueAliasTargetError,
  CatalogueDuplicateError,
  CatalogueSchemaError,
  CatalogueService,
  fail,
  isSampleEntry,
  validateEventPayloadAgainstEntry,
  validateSampleValue,
};
