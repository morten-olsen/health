import type { Kysely } from 'kysely';

import { applyCanonicalAdditions, revertCanonicalAdditions } from '../../catalogue/catalogue.migrations.ts';
import type { CanonicalAddition } from '../../catalogue/catalogue.migrations.ts';

const additions: CanonicalAddition[] = [
  {
    id: 'stress_level',
    kind: 'numeric',
    description: 'Stress level on a 0–100 scale (vendor-normalised)',
    config: { unit: 'score', range: { min: 0, max: 100 } },
  },
  {
    id: 'basal_metabolic_rate',
    kind: 'numeric',
    description: 'Estimated basal metabolic rate',
    config: { unit: 'kcal/day', range: { min: 500, max: 5000 } },
  },
  {
    id: 'sleep_score',
    kind: 'numeric',
    description: 'Vendor-computed daily sleep score (0–100)',
    config: { unit: 'score', range: { min: 0, max: 100 } },
  },
  {
    id: 'intensity_minutes',
    kind: 'composite',
    description: 'Moderate / vigorous activity minutes (WHO intensity-minutes framework)',
    config: {
      components: {
        moderate: { unit: 'min', range: { min: 0, max: 1440 } },
        vigorous: { unit: 'min', range: { min: 0, max: 1440 } },
      },
    },
  },
];

const up = (db: Kysely<unknown>): Promise<void> => applyCanonicalAdditions(db, additions);
const down = (db: Kysely<unknown>): Promise<void> => revertCanonicalAdditions(db, additions);

export { up, down };
