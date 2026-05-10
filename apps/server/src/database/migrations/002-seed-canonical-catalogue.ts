import type { Kysely } from 'kysely';

import { canonicalSeed } from '../../catalogue/catalogue.seed.ts';

type CatalogueRow = {
  id: string;
  kind: string;
  namespace: string;
  version: number;
  description: string | null;
  config: string;
  deprecated: number;
  created_at: string;
  updated_at: string;
};

const up = async (db: Kysely<unknown>): Promise<void> => {
  const now = new Date().toISOString();
  const rows: CatalogueRow[] = canonicalSeed.map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    namespace: 'canonical',
    version: 1,
    description: entry.description,
    config: JSON.stringify(entry.config),
    deprecated: 0,
    created_at: now,
    updated_at: now,
  }));

  await (db as Kysely<{ catalogue_entries: CatalogueRow }>).insertInto('catalogue_entries').values(rows).execute();
};

const down = async (db: Kysely<unknown>): Promise<void> => {
  const ids = canonicalSeed.map((entry) => entry.id);
  await (db as Kysely<{ catalogue_entries: { id: string; namespace: string } }>)
    .deleteFrom('catalogue_entries')
    .where('id', 'in', ids)
    .where('namespace', '=', 'canonical')
    .execute();
};

export { up, down };
