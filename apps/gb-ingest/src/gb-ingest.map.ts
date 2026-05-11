import type { components } from './gb-ingest.api-types.ts';
import type {
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
} from './gb-ingest.db.ts';
import type { FitParsed, FitRecord } from './gb-ingest.fit.ts';

type IngestItem = components['schemas']['IngestRequestInput']['items'][number];
type SampleItem = Extract<IngestItem, { type: 'sample' }>;
type SessionItem = Extract<IngestItem, { type: 'session' }>;

const INTEGRATION = 'gadgetbridge';

const groupByDevice = <T extends { DEVICE_ID: number }>(rows: T[]): Map<number, T[]> => {
  const grouped = new Map<number, T[]>();
  for (const row of rows) {
    const arr = grouped.get(row.DEVICE_ID) ?? [];
    arr.push(row);
    grouped.set(row.DEVICE_ID, arr);
  }
  return grouped;
};

type SampleSpec<T extends Timestamped> = {
  metric: string;
  keyPrefix: string;
  extract: (row: T) => SampleItem['value'] | null;
};

// Generic builder for any per-timestamp metric. Extractor returns null to
// skip a row (sensor noise, zero readings where zero means "not measured").
const buildSamples = <T extends Timestamped>(device: GbDevice, rows: T[], spec: SampleSpec<T>): SampleItem[] =>
  rows.flatMap((row) => {
    const value = spec.extract(row);
    if (value === null) {
      return [];
    }
    const iso = new Date(row.TIMESTAMP).toISOString();
    return [
      {
        type: 'sample',
        idempotency_key: `gb:${spec.keyPrefix}:${device.identifier}:${row.TIMESTAMP}`,
        metric: spec.metric,
        start: iso,
        end: iso,
        value,
      } satisfies SampleItem,
    ];
  });

const restingHrItems = (device: GbDevice, rows: RestingHrRow[]): SampleItem[] =>
  buildSamples(device, rows, { metric: 'resting_heart_rate', keyPrefix: 'rhr', extract: (r) => r.HEART_RATE });

const heartRateItems = (device: GbDevice, rows: ActivityRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'heart_rate',
    keyPrefix: 'hr',
    extract: (r) => (r.HEART_RATE > 0 ? r.HEART_RATE : null),
  });

const stepsItems = (device: GbDevice, rows: ActivityRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'steps',
    keyPrefix: 'steps',
    extract: (r) => (r.STEPS > 0 ? r.STEPS : null),
  });

const distanceItems = (device: GbDevice, rows: ActivityRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'distance',
    keyPrefix: 'dist',
    extract: (r) => (r.DISTANCE_CM > 0 ? r.DISTANCE_CM / 100 : null),
  });

const respiratoryRateItems = (device: GbDevice, rows: RespiratoryRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'respiratory_rate',
    keyPrefix: 'rr',
    extract: (r) => (r.RESPIRATORY_RATE > 0 ? r.RESPIRATORY_RATE : null),
  });

const stressItems = (device: GbDevice, rows: StressRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'stress_level',
    keyPrefix: 'stress',
    extract: (r) => (r.STRESS >= 0 ? r.STRESS : null),
  });

const bodyBatteryItems = (device: GbDevice, rows: BodyEnergyRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'garmin.body_battery',
    keyPrefix: 'bb',
    extract: (r) => (r.ENERGY >= 0 ? r.ENERGY : null),
  });

const bmrItems = (device: GbDevice, rows: BmrRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'basal_metabolic_rate',
    keyPrefix: 'bmr',
    extract: (r) => (r.RESTING_METABOLIC_RATE > 0 ? r.RESTING_METABOLIC_RATE : null),
  });

const sleepScoreItems = (device: GbDevice, rows: SleepStatsRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'sleep_score',
    keyPrefix: 'ss',
    extract: (r) => (r.SLEEP_SCORE > 0 ? r.SLEEP_SCORE : null),
  });

// Gadgetbridge GarminSleepStageSample.STAGE follows FIT sleep_level:
// 1=awake, 2=light, 3=deep, 4=rem. Anything else falls outside the canonical
// enum — skip rather than guess.
const SLEEP_STAGE_BY_CODE: Record<number, string> = { 1: 'awake', 2: 'light', 3: 'deep', 4: 'rem' };

const sleepStageItems = (device: GbDevice, rows: SleepStageRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'sleep_stage',
    keyPrefix: 'stage',
    extract: (r) => SLEEP_STAGE_BY_CODE[r.STAGE] ?? null,
  });

// Composite { moderate, vigorous } — bare object on the wire.
const intensityMinutesItems = (device: GbDevice, rows: IntensityMinutesRow[]): SampleItem[] =>
  buildSamples(device, rows, {
    metric: 'intensity_minutes',
    keyPrefix: 'im',
    extract: (r) => ({ moderate: r.MODERATE ?? 0, vigorous: r.VIGOROUS ?? 0 }),
  });

// FIT sport string → canonical session_type. Subset; unknowns surface as
// skipped on the FIT mapper so they're visible rather than silently lost.
// @garmin/fitsdk normalises enum strings to camelCase (`strengthTraining`,
// not `strength_training`) — match that on the lookup side.
const SESSION_TYPE_BY_SPORT: Record<string, string> = {
  running: 'run',
  walking: 'walk',
  cycling: 'cycle',
  swimming: 'swim',
  strengthTraining: 'strength_training',
  cardioTraining: 'hiit',
  hiit: 'hiit',
  yoga: 'yoga',
};

const sessionTypeFromFit = (sport: string | undefined, subSport: string | undefined): string | null => {
  if (sport && SESSION_TYPE_BY_SPORT[sport]) {
    return SESSION_TYPE_BY_SPORT[sport];
  }
  if (sport === 'training' && subSport) {
    if (SESSION_TYPE_BY_SPORT[subSport]) {
      return SESSION_TYPE_BY_SPORT[subSport];
    }
  }
  return null;
};

type FitMapResult = { items: (SampleItem | SessionItem)[]; sessionKey: string; sessionType: string | null };

// Maps a single parsed FIT workout into a session item plus the time-series
// samples and session-level derived samples that reference it.
const fitWorkoutItems = (device: GbDevice, parsed: FitParsed): FitMapResult => {
  const { session, records } = parsed;
  const sport = typeof session.sport === 'string' ? session.sport : undefined;
  const subSport = typeof session.subSport === 'string' ? session.subSport : undefined;
  const sessionType = sessionTypeFromFit(sport, subSport);
  const startMs = session.startTime.getTime();
  const elapsedMs = (session.totalElapsedTime ?? 0) * 1000;
  const endMs = startMs + elapsedMs;
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(endMs).toISOString();
  const sessionKey = `gb:fit:session:${device.identifier}:${startMs}`;

  if (!sessionType) {
    return { items: [], sessionKey, sessionType: null };
  }

  const items: (SampleItem | SessionItem)[] = [];
  items.push({
    type: 'session',
    idempotency_key: sessionKey,
    session_type: sessionType,
    start: startIso,
    end: endIso,
  });
  items.push(...recordSamples(device, sessionKey, records));
  items.push(...sessionDerivedSamples({ device, sessionKey, session, startIso, endIso }));
  return { items, sessionKey, sessionType };
};

const recordSamples = (device: GbDevice, sessionKey: string, records: FitRecord[]): SampleItem[] => {
  const out: SampleItem[] = [];
  for (const r of records) {
    const ts = r.timestamp.getTime();
    const iso = r.timestamp.toISOString();
    const base = { device: device.identifier, sessionKey, iso, ts } as const;
    if (typeof r.heartRate === 'number' && r.heartRate > 0) {
      out.push(fitSample(base, 'heart_rate', 'hr', r.heartRate));
    }
    if (typeof r.cadence === 'number' && r.cadence > 0) {
      out.push(fitSample(base, 'cadence', 'cad', r.cadence + (r.fractionalCadence ?? 0)));
    }
    if (typeof r.enhancedSpeed === 'number' && r.enhancedSpeed > 0) {
      out.push(fitSample(base, 'speed', 'spd', r.enhancedSpeed));
    }
    if (typeof r.enhancedAltitude === 'number') {
      out.push(fitSample(base, 'altitude', 'alt', r.enhancedAltitude));
    }
    if (typeof r.positionLat === 'number' && typeof r.positionLong === 'number') {
      // FIT stores lat/lng as semicircles (uint32 raw); convert to degrees.
      // The @garmin/fitsdk leaves this as raw — applyScaleAndOffset doesn't
      // touch position fields.
      const lat = (r.positionLat * 180) / 2 ** 31;
      const lng = (r.positionLong * 180) / 2 ** 31;
      out.push(fitSample(base, 'location', 'geo', { lat, lng }));
    }
  }
  return out;
};

type FitSampleBase = { device: string; sessionKey: string; iso: string; ts: number };

const fitSample = (base: FitSampleBase, metric: string, prefix: string, value: SampleItem['value']): SampleItem => ({
  type: 'sample',
  idempotency_key: `gb:fit:${prefix}:${base.device}:${base.ts}`,
  metric,
  start: base.iso,
  end: base.iso,
  value,
  session_idempotency_key: base.sessionKey,
});

type SessionDerivedInput = {
  device: GbDevice;
  sessionKey: string;
  session: FitParsed['session'];
  startIso: string;
  endIso: string;
};

// Session-level derived samples — totals/aggregates the vendor reports for
// the workout window. Each spans the full session window so consumers know
// the value applies to that period (not a point-in-time).
const sessionDerivedSamples = ({
  device,
  sessionKey,
  session,
  startIso,
  endIso,
}: SessionDerivedInput): SampleItem[] => {
  const samples: SampleItem[] = [];
  const push = (metric: string, prefix: string, value: SampleItem['value']): void => {
    samples.push({
      type: 'sample',
      idempotency_key: `gb:fit:${prefix}:${device.identifier}:${startIso}`,
      metric,
      start: startIso,
      end: endIso,
      value,
      session_idempotency_key: sessionKey,
    });
  };
  if (typeof session.totalDistance === 'number' && session.totalDistance > 0) {
    push('distance', 'sess-dist', session.totalDistance);
  }
  if (typeof session.totalCalories === 'number' && session.totalCalories > 0) {
    push('active_energy', 'sess-act', session.totalCalories);
  }
  if (typeof session.totalAscent === 'number' && session.totalAscent > 0) {
    push('elevation_gain', 'sess-up', session.totalAscent);
  }
  if (typeof session.totalDescent === 'number' && session.totalDescent > 0) {
    push('elevation_loss', 'sess-dn', session.totalDescent);
  }
  if (typeof session.totalTrainingEffect === 'number' && session.totalTrainingEffect > 0) {
    push('garmin.aerobic_training_effect', 'sess-ate', session.totalTrainingEffect);
  }
  if (typeof session.totalAnaerobicTrainingEffect === 'number' && session.totalAnaerobicTrainingEffect > 0) {
    push('garmin.anaerobic_training_effect', 'sess-anate', session.totalAnaerobicTrainingEffect);
  }
  return samples;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  if (items.length <= size) {
    return items.length > 0 ? [items] : [];
  }
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

export type { FitMapResult, SampleItem, SessionItem };
export {
  bmrItems,
  bodyBatteryItems,
  chunk,
  distanceItems,
  fitWorkoutItems,
  groupByDevice,
  heartRateItems,
  INTEGRATION,
  intensityMinutesItems,
  respiratoryRateItems,
  restingHrItems,
  sleepScoreItems,
  sleepStageItems,
  stepsItems,
  stressItems,
};
