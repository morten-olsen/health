import { DatabaseService } from '../database/database.ts';
import type {
  CatalogueAliasesTable,
  CatalogueEntriesTable,
  CatalogueKind,
  CatalogueNamespace,
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

type AliasEntry = {
  alias: string;
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
  canonical_id: row.canonical_id,
  created_at: row.created_at,
});

const toResponse = (entry: CatalogueEntry): CatalogueEntryResponse => entry;

const toAliasResponse = (alias: AliasEntry): CatalogueAliasResponse => alias;

class CatalogueService {
  #services: Services;
  #cache: Map<string, CatalogueEntry> | null = null;
  #aliases: Map<string, string> | null = null;

  constructor(services: Services) {
    this.#services = services;
  }

  // Resolve a metric ID through the alias table to its canonical entry.
  // Hot path on every ingest item — uses an in-memory cache.
  resolve = async (metricId: string): Promise<CatalogueEntry | null> => {
    await this.#ensureCache();
    const aliasTarget = this.#aliases?.get(metricId);
    const id = aliasTarget ?? metricId;
    return this.#cache?.get(id) ?? null;
  };

  list = async (
    filter: { namespace?: CatalogueNamespace; kind?: CatalogueKind } = {},
  ): Promise<CatalogueEntryResponse[]> => {
    await this.#ensureCache();
    const all = Array.from(this.#cache?.values() ?? []);
    return all
      .filter((e) => (filter.namespace ? e.namespace === filter.namespace : true))
      .filter((e) => (filter.kind ? e.kind === filter.kind : true))
      .map(toResponse);
  };

  get = async (id: string): Promise<CatalogueEntryResponse | null> => {
    await this.#ensureCache();
    const entry = this.#cache?.get(id);
    return entry ? toResponse(entry) : null;
  };

  listAliases = async (): Promise<CatalogueAliasResponse[]> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const rows = await db.selectFrom('catalogue_aliases').selectAll().execute();
    return rows.map(rowToAlias).map(toAliasResponse);
  };

  createCustomEntry = async (input: CreateCustomEntryInput): Promise<CatalogueEntryResponse> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    await this.#ensureCache();
    if (this.#cache?.has(input.id)) {
      throw new CatalogueDuplicateError(`Catalogue entry "${input.id}" already exists`);
    }
    if (this.#aliases?.has(input.id)) {
      throw new CatalogueDuplicateError(`Alias "${input.id}" already exists`);
    }

    const now = new Date().toISOString();
    const shape = 'shape' in input && input.shape ? input.shape : {};
    const unit = 'unit' in input ? (input.unit ?? null) : null;
    const row: CatalogueEntriesTable = {
      id: input.id,
      kind: input.kind,
      namespace: 'custom',
      version: 1,
      unit,
      description: input.description ?? null,
      shape: JSON.stringify(shape),
      deprecated: 0,
      created_at: now,
      updated_at: now,
    };
    await db.insertInto('catalogue_entries').values(row).execute();
    this.#invalidate();
    return toResponse(rowToEntry(row));
  };

  createAlias = async (input: CreateAliasInput): Promise<CatalogueAliasResponse> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    await this.#ensureCache();
    if (!this.#cache?.has(input.canonical_id)) {
      throw new CatalogueAliasTargetError(`Catalogue entry "${input.canonical_id}" not found`);
    }
    if (this.#cache.has(input.alias) || this.#aliases?.has(input.alias)) {
      throw new CatalogueDuplicateError(`Alias or entry "${input.alias}" already exists`);
    }
    const now = new Date().toISOString();
    const row: CatalogueAliasesTable = {
      alias: input.alias,
      canonical_id: input.canonical_id,
      created_at: now,
    };
    await db.insertInto('catalogue_aliases').values(row).execute();
    this.#invalidate();
    return toAliasResponse(rowToAlias(row));
  };

  invalidate = (): void => {
    this.#invalidate();
  };

  #invalidate = (): void => {
    this.#cache = null;
    this.#aliases = null;
  };

  #ensureCache = async (): Promise<void> => {
    if (this.#cache && this.#aliases) {
      return;
    }
    const db = await this.#services.get(DatabaseService).getInstance();
    const [entries, aliases] = await Promise.all([
      db.selectFrom('catalogue_entries').selectAll().execute(),
      db.selectFrom('catalogue_aliases').selectAll().execute(),
    ]);
    const entryCache = new Map<string, CatalogueEntry>();
    for (const row of entries) {
      entryCache.set(row.id, rowToEntry(row));
    }
    const aliasCache = new Map<string, string>();
    for (const row of aliases) {
      aliasCache.set(row.alias, row.canonical_id);
    }
    this.#cache = entryCache;
    this.#aliases = aliasCache;
  };
}

export type { CatalogueEntry };
export { CatalogueAliasTargetError, CatalogueDuplicateError, CatalogueService };
