// Canonical catalogue entries shipped with the platform. Seeded by migration
// 002. Once the platform has shipped to anyone, new entries should land in
// follow-up migrations that insert the diff (do NOT mutate this list to
// "fix" something that's already shipped — existing data was validated
// against the prior version's config). Pre-deploy this constraint doesn't
// apply yet; mutate freely.

import type { CatalogueEntry, CompositeComponent, JsonSchema } from './catalogue.ts';

type SeedEntry = Pick<CatalogueEntry, 'id' | 'kind' | 'config'> & { description: string };

const numeric = (id: string, unit: string, range: [number, number], description: string): SeedEntry => ({
  id,
  kind: 'numeric',
  description,
  config: { unit, range: { min: range[0], max: range[1] } },
});

const categorical = (id: string, values: string[], description: string): SeedEntry => ({
  id,
  kind: 'categorical',
  description,
  config: { values },
});

const geo = (id: string, description: string): SeedEntry => ({ id, kind: 'geo', description, config: {} });

const composite = (id: string, components: Record<string, CompositeComponent>, description: string): SeedEntry => ({
  id,
  kind: 'composite',
  description,
  config: { components },
});

const session = (id: string, description: string): SeedEntry => ({ id, kind: 'session', description, config: {} });

const event = (id: string, description: string, schema: JsonSchema): SeedEntry => ({
  id,
  kind: 'event',
  description,
  config: { schema },
});

const objectSchema = (
  properties: Record<string, JsonSchema>,
  required: string[],
  extra: JsonSchema = {},
): JsonSchema => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
  ...extra,
});

const canonicalSeed: SeedEntry[] = [
  // Cardiovascular
  numeric('heart_rate', 'bpm', [20, 250], 'Heart rate in beats per minute'),
  numeric('resting_heart_rate', 'bpm', [30, 150], 'Resting heart rate'),
  numeric('heart_rate_variability', 'ms', [0, 300], 'Heart rate variability (RMSSD)'),
  numeric('respiratory_rate', 'breaths/min', [4, 60], 'Respiratory rate'),
  numeric('spo2', '%', [0, 100], 'Blood oxygen saturation'),
  numeric('stress_level', 'score', [0, 100], 'Stress level on a 0–100 scale (vendor-normalised)'),
  composite(
    'blood_pressure',
    {
      systolic: { unit: 'mmHg', range: { min: 50, max: 260 } },
      diastolic: { unit: 'mmHg', range: { min: 30, max: 160 } },
    },
    'Blood pressure (systolic / diastolic)',
  ),

  // Body
  numeric('body_weight', 'kg', [10, 300], 'Body weight'),
  numeric('body_fat_percentage', '%', [1, 70], 'Body fat as percentage of total mass'),
  numeric('body_temperature', 'celsius', [30, 45], 'Body temperature'),
  numeric('blood_glucose', 'mmol/L', [0, 50], 'Blood glucose concentration'),

  // Activity
  numeric('steps', 'count', [0, 100000], 'Step count'),
  numeric('distance', 'm', [0, 1000000], 'Distance travelled'),
  numeric('active_energy', 'kcal', [0, 10000], 'Active energy expenditure'),
  numeric('basal_energy', 'kcal', [0, 10000], 'Basal energy expenditure'),
  numeric('basal_metabolic_rate', 'kcal/day', [500, 5000], 'Estimated basal metabolic rate'),
  composite(
    'intensity_minutes',
    {
      moderate: { unit: 'min', range: { min: 0, max: 1440 } },
      vigorous: { unit: 'min', range: { min: 0, max: 1440 } },
    },
    'Moderate / vigorous activity minutes (WHO intensity-minutes framework)',
  ),
  numeric('cadence', 'spm', [0, 300], 'Cadence (steps or revolutions per minute)'),
  numeric('power', 'W', [0, 2000], 'Mechanical power output'),
  numeric('pace', 's/km', [0, 3600], 'Pace in seconds per kilometre'),
  numeric('speed', 'm/s', [0, 100], 'Instantaneous speed'),
  numeric('vo2_max', 'ml/kg/min', [10, 100], 'Maximal oxygen uptake'),
  numeric('altitude', 'm', [-500, 10000], 'Altitude above mean sea level'),
  numeric('elevation_gain', 'm', [0, 20000], 'Cumulative elevation gain over the sample window'),
  numeric('elevation_loss', 'm', [0, 20000], 'Cumulative elevation loss over the sample window'),

  // Sleep
  numeric('sleep_score', 'score', [0, 100], 'Vendor-computed daily sleep score (0–100)'),

  // Categorical states
  categorical('sleep_stage', ['awake', 'light', 'deep', 'rem'], 'Sleep stage classification'),
  categorical('mood', ['terrible', 'bad', 'ok', 'good', 'great'], 'Subjective mood'),
  categorical(
    'activity_classification',
    ['sedentary', 'walking', 'running', 'cycling', 'swimming', 'other'],
    'Detected activity classification',
  ),

  // Geo
  geo('location', 'Geographic location fix'),

  // Sessions (typed time-bounded annotations)
  session('run', 'Running activity'),
  session('walk', 'Walking activity'),
  session('cycle', 'Cycling activity'),
  session('swim', 'Swimming activity'),
  session('strength_training', 'Strength training session'),
  session('hiit', 'High-intensity interval training session'),
  session('yoga', 'Yoga session'),
  session('meditation', 'Meditation session'),
  session('sleep', 'Sleep session'),
  session('drive', 'Driving session'),

  // Events with structured payloads. JSON Schema is the right tool here
  // (composite shapes); `x-unit` annotates fields whose unit is a fixed
  // property of the metric (integration converts before sending). Where a
  // unit is genuinely data — varies per record — keep an explicit `_unit`
  // field with an `enum` constraint instead (see medication_taken below).
  event(
    'medication_taken',
    'Medication taken — payload describes what and how much',
    objectSchema(
      {
        name: { type: 'string', minLength: 1 },
        dose_amount: { type: 'number', minimum: 0 },
        dose_unit: { type: 'string', minLength: 1 },
        notes: { type: 'string' },
      },
      ['name'],
    ),
  ),
  event(
    'meal',
    'Meal logged — payload describes contents',
    objectSchema(
      {
        meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack', 'other'] },
        items: {
          type: 'array',
          items: objectSchema(
            {
              name: { type: 'string', minLength: 1 },
              quantity: { type: 'number', minimum: 0 },
              quantity_unit: { type: 'string', minLength: 1 },
            },
            ['name'],
          ),
          maxItems: 100,
        },
        calories: { type: 'number', minimum: 0, 'x-unit': 'kcal' },
        notes: { type: 'string' },
      },
      [],
    ),
  ),
  event(
    'strength_set',
    'One set of a strength exercise — exercise, reps, and load',
    objectSchema(
      {
        exercise: { type: 'string', minLength: 1 },
        reps: { type: 'integer', minimum: 1, maximum: 1000 },
        weight: { type: 'number', minimum: 0, maximum: 2000, 'x-unit': 'kg' },
        rpe: { type: 'number', minimum: 1, maximum: 10 },
        notes: { type: 'string' },
      },
      ['exercise', 'reps'],
    ),
  ),
  event(
    'cardio_interval',
    'One interval of an interval workout — work / rest split',
    objectSchema(
      {
        work_seconds: { type: 'number', minimum: 0, 'x-unit': 's' },
        rest_seconds: { type: 'number', minimum: 0, 'x-unit': 's' },
        target: { type: 'string' },
        notes: { type: 'string' },
      },
      ['work_seconds'],
    ),
  ),
  event(
    'note',
    'Free-form text annotation attached at an instant',
    objectSchema(
      {
        text: { type: 'string', minLength: 1 },
      },
      ['text'],
    ),
  ),
];

export type { SeedEntry };
export { canonicalSeed };
