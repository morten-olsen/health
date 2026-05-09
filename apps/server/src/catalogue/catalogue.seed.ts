// Canonical catalogue entries shipped with the platform. Seeded by migration
// 002. New entries added here ship in a follow-up migration that inserts
// the diff (do NOT mutate this list to "fix" something that's already shipped —
// existing data was validated against the prior version).

type SeedShape = Record<string, unknown>;

type SeedEntry = {
  id: string;
  kind: 'numeric' | 'categorical' | 'geo' | 'composite' | 'session' | 'event';
  unit?: string;
  description: string;
  shape: SeedShape;
};

const numeric = (id: string, unit: string, range: [number, number], description: string): SeedEntry => ({
  id,
  kind: 'numeric',
  unit,
  description,
  shape: { range: { min: range[0], max: range[1] } },
});

const categorical = (id: string, values: string[], description: string): SeedEntry => ({
  id,
  kind: 'categorical',
  description,
  shape: { values },
});

const geo = (id: string, description: string): SeedEntry => ({
  id,
  kind: 'geo',
  description,
  shape: {},
});

const composite = (id: string, components: Record<string, string>, description: string): SeedEntry => ({
  id,
  kind: 'composite',
  description,
  shape: { components },
});

const session = (id: string, description: string): SeedEntry => ({
  id,
  kind: 'session',
  description,
  shape: {},
});

const event = (id: string, description: string): SeedEntry => ({
  id,
  kind: 'event',
  description,
  shape: {},
});

const canonicalSeed: SeedEntry[] = [
  // Cardiovascular
  numeric('heart_rate', 'bpm', [20, 250], 'Heart rate in beats per minute'),
  numeric('resting_heart_rate', 'bpm', [30, 150], 'Resting heart rate'),
  numeric('heart_rate_variability', 'ms', [0, 300], 'Heart rate variability (RMSSD)'),
  numeric('respiratory_rate', 'breaths/min', [4, 60], 'Respiratory rate'),
  numeric('spo2', '%', [0, 100], 'Blood oxygen saturation'),
  composite('blood_pressure', { systolic: 'mmHg', diastolic: 'mmHg' }, 'Blood pressure (systolic / diastolic)'),

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
  numeric('cadence', 'spm', [0, 300], 'Cadence (steps or revolutions per minute)'),
  numeric('power', 'W', [0, 2000], 'Mechanical power output'),
  numeric('pace', 's/km', [0, 3600], 'Pace in seconds per kilometre'),
  numeric('vo2_max', 'ml/kg/min', [10, 100], 'Maximal oxygen uptake'),

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
  session('yoga', 'Yoga session'),
  session('meditation', 'Meditation session'),
  session('sleep', 'Sleep session'),
  session('drive', 'Driving session'),

  // Events (discrete happenings; payload is opaque structured JSON)
  event('medication_taken', 'Medication taken — payload describes what and how much'),
  event('meal', 'Meal logged — payload describes contents and nutrition'),
  event('note', 'Free-form annotation'),
];

export type { SeedEntry };
export { canonicalSeed };
