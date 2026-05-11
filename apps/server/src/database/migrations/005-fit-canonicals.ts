import type { Kysely } from 'kysely';

import { applyCanonicalAdditions, revertCanonicalAdditions } from '../../catalogue/catalogue.migrations.ts';
import type { CanonicalAddition } from '../../catalogue/catalogue.migrations.ts';

const additions: CanonicalAddition[] = [
  {
    id: 'speed',
    kind: 'numeric',
    description: 'Instantaneous speed',
    config: { unit: 'm/s', range: { min: 0, max: 100 } },
  },
  {
    id: 'altitude',
    kind: 'numeric',
    description: 'Altitude above mean sea level',
    config: { unit: 'm', range: { min: -500, max: 10000 } },
  },
  {
    id: 'elevation_gain',
    kind: 'numeric',
    description: 'Cumulative elevation gain over the sample window',
    config: { unit: 'm', range: { min: 0, max: 20000 } },
  },
  {
    id: 'elevation_loss',
    kind: 'numeric',
    description: 'Cumulative elevation loss over the sample window',
    config: { unit: 'm', range: { min: 0, max: 20000 } },
  },
];

const up = (db: Kysely<unknown>): Promise<void> => applyCanonicalAdditions(db, additions);
const down = (db: Kysely<unknown>): Promise<void> => revertCanonicalAdditions(db, additions);

export { up, down };
