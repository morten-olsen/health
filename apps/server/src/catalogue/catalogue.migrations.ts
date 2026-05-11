import type { Kysely } from 'kysely';

// Shared helpers for migrations that add canonical catalogue entries to
// already-deployed DBs. Each historical migration captures its own frozen
// snapshot of additions — never derive from catalogue.seed.ts at runtime,
// since that file evolves but a migration's effect must be reproducible.

type CatalogueRow = {
  id: string;
  user_id: string | null;
  kind: string;
  namespace: string;
  version: number;
  description: string | null;
  config: string;
  deprecated: number;
  created_at: string;
  updated_at: string;
};

type CanonicalAddition = { id: string; kind: string; description: string; config: unknown };

const applyCanonicalAdditions = async (db: Kysely<unknown>, additions: CanonicalAddition[]): Promise<void> => {
  const typed = db as Kysely<{ catalogue_entries: CatalogueRow }>;
  const existing = await typed.selectFrom('catalogue_entries').select('id').where('user_id', 'is', null).execute();
  const existingIds = new Set(existing.map((row) => row.id));
  const now = new Date().toISOString();
  const newRows: CatalogueRow[] = additions
    .filter((entry) => !existingIds.has(entry.id))
    .map((entry) => ({
      id: entry.id,
      user_id: null,
      kind: entry.kind,
      namespace: 'canonical',
      version: 1,
      description: entry.description,
      config: JSON.stringify(entry.config),
      deprecated: 0,
      created_at: now,
      updated_at: now,
    }));
  if (newRows.length === 0) {
    return;
  }
  await typed.insertInto('catalogue_entries').values(newRows).execute();
};

const revertCanonicalAdditions = async (db: Kysely<unknown>, additions: CanonicalAddition[]): Promise<void> => {
  const typed = db as Kysely<{ catalogue_entries: CatalogueRow }>;
  const ids = additions.map((entry) => entry.id);
  await typed.deleteFrom('catalogue_entries').where('id', 'in', ids).where('user_id', 'is', null).execute();
};

export type { CanonicalAddition };
export { applyCanonicalAdditions, revertCanonicalAdditions };
