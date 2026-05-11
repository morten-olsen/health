import Database from 'better-sqlite3';

type GbDevice = {
  id: number;
  name: string;
  identifier: string;
  alias: string | null;
};

type Timestamped = { TIMESTAMP: number; DEVICE_ID: number };

type RestingHrRow = Timestamped & { HEART_RATE: number };
type ActivityRow = Timestamped & {
  RAW_INTENSITY: number;
  STEPS: number;
  RAW_KIND: number;
  HEART_RATE: number;
  DISTANCE_CM: number;
  ACTIVE_CALORIES: number;
};
type RespiratoryRow = Timestamped & { RESPIRATORY_RATE: number };
type StressRow = Timestamped & { STRESS: number };
type BodyEnergyRow = Timestamped & { ENERGY: number };
type SleepStageRow = Timestamped & { STAGE: number };
type SleepStatsRow = Timestamped & { SLEEP_SCORE: number };
type BmrRow = Timestamped & { RESTING_METABOLIC_RATE: number };
type IntensityMinutesRow = Timestamped & { MODERATE: number | null; VIGOROUS: number | null };

const openDb = (path: string): Database.Database => new Database(path, { readonly: true });

const loadDevices = (db: Database.Database): GbDevice[] =>
  db
    .prepare('SELECT _id as id, NAME as name, IDENTIFIER as identifier, ALIAS as alias FROM DEVICE')
    .all() as GbDevice[];

const loadRestingHr = (db: Database.Database): RestingHrRow[] =>
  db.prepare('SELECT TIMESTAMP, DEVICE_ID, HEART_RATE FROM GARMIN_HEART_RATE_RESTING_SAMPLE').all() as RestingHrRow[];

// RAW_KIND=8 in Gadgetbridge ActivityKind is NOT_WORN — sensor was off the
// wrist. Filtering at the source so per-metric mappers don't have to repeat
// the same exclusion.
//
// GARMIN_ACTIVITY_SAMPLE.TIMESTAMP is stored in Unix *seconds* — unlike every
// other GARMIN_* sample table in the schema, which uses milliseconds.
// Normalising to ms in SQL keeps the mapper layer uniform.
const loadActivity = (db: Database.Database): ActivityRow[] =>
  db
    .prepare(
      'SELECT TIMESTAMP * 1000 AS TIMESTAMP, DEVICE_ID, RAW_INTENSITY, STEPS, RAW_KIND, HEART_RATE, DISTANCE_CM, ACTIVE_CALORIES FROM GARMIN_ACTIVITY_SAMPLE WHERE RAW_KIND != 8',
    )
    .all() as ActivityRow[];

const loadRespiratory = (db: Database.Database): RespiratoryRow[] =>
  db
    .prepare('SELECT TIMESTAMP, DEVICE_ID, RESPIRATORY_RATE FROM GARMIN_RESPIRATORY_RATE_SAMPLE')
    .all() as RespiratoryRow[];

const loadStress = (db: Database.Database): StressRow[] =>
  db.prepare('SELECT TIMESTAMP, DEVICE_ID, STRESS FROM GARMIN_STRESS_SAMPLE').all() as StressRow[];

const loadBodyEnergy = (db: Database.Database): BodyEnergyRow[] =>
  db.prepare('SELECT TIMESTAMP, DEVICE_ID, ENERGY FROM GARMIN_BODY_ENERGY_SAMPLE').all() as BodyEnergyRow[];

const loadSleepStages = (db: Database.Database): SleepStageRow[] =>
  db.prepare('SELECT TIMESTAMP, DEVICE_ID, STAGE FROM GARMIN_SLEEP_STAGE_SAMPLE').all() as SleepStageRow[];

const loadSleepStats = (db: Database.Database): SleepStatsRow[] =>
  db.prepare('SELECT TIMESTAMP, DEVICE_ID, SLEEP_SCORE FROM GARMIN_SLEEP_STATS_SAMPLE').all() as SleepStatsRow[];

const loadBmr = (db: Database.Database): BmrRow[] =>
  db
    .prepare('SELECT TIMESTAMP, DEVICE_ID, RESTING_METABOLIC_RATE FROM GARMIN_RESTING_METABOLIC_RATE_SAMPLE')
    .all() as BmrRow[];

const loadIntensityMinutes = (db: Database.Database): IntensityMinutesRow[] =>
  db
    .prepare('SELECT TIMESTAMP, DEVICE_ID, MODERATE, VIGOROUS FROM GARMIN_INTENSITY_MINUTES_SAMPLE')
    .all() as IntensityMinutesRow[];

export type {
  ActivityRow,
  BmrRow,
  BodyEnergyRow,
  GbDevice,
  IntensityMinutesRow,
  RespiratoryRow,
  RestingHrRow,
  SleepStageRow,
  SleepStatsRow,
  StressRow,
  Timestamped,
};
export {
  loadActivity,
  loadBmr,
  loadBodyEnergy,
  loadDevices,
  loadIntensityMinutes,
  loadRespiratory,
  loadRestingHr,
  loadSleepStages,
  loadSleepStats,
  loadStress,
  openDb,
};
