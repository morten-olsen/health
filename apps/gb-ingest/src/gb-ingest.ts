import {
  createAuthedClient,
  ingest,
  listDevices,
  login,
  registerCustomEntry,
  registerDevice,
} from './gb-ingest.api.ts';
import type { ApiClient, IngestResponse } from './gb-ingest.api.ts';
import {
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
} from './gb-ingest.db.ts';
import type { GbDevice, Timestamped } from './gb-ingest.db.ts';
import { parseFit } from './gb-ingest.fit.ts';
import { extractExport } from './gb-ingest.input.ts';
import {
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
} from './gb-ingest.map.ts';
import type { SampleItem, SessionItem } from './gb-ingest.map.ts';

const HEALTH_API = process.env['HEALTH_API'] ?? 'http://localhost:3000';
const ADMIN_TOKEN = process.env['ADMIN_TOKEN'];
const HEALTH_USERNAME = process.env['HEALTH_USERNAME'];
const HEALTH_PASSWORD = process.env['HEALTH_PASSWORD'];
const EXPORT_PATH = process.env['GADGETBRIDGE_EXPORT'] ?? process.argv[2];
const BATCH_SIZE = 5000;

type Item = SampleItem | SessionItem;

const obtainToken = async (): Promise<string> => {
  if (ADMIN_TOKEN) {
    return ADMIN_TOKEN;
  }
  if (!HEALTH_USERNAME || !HEALTH_PASSWORD) {
    throw new Error('Set ADMIN_TOKEN, or HEALTH_USERNAME + HEALTH_PASSWORD');
  }
  return login(HEALTH_API, HEALTH_USERNAME, HEALTH_PASSWORD);
};

const ensureCustomCatalogue = async (client: ApiClient): Promise<void> => {
  const entries = [
    {
      id: 'garmin.body_battery',
      description: 'Garmin Body Battery — vendor-specific energy/readiness score',
      config: { unit: 'score', range: { min: 0, max: 100 } },
    },
    {
      id: 'garmin.aerobic_training_effect',
      description: 'Garmin Aerobic Training Effect (0–5)',
      config: { unit: 'score', range: { min: 0, max: 5 } },
    },
    {
      id: 'garmin.anaerobic_training_effect',
      description: 'Garmin Anaerobic Training Effect (0–5)',
      config: { unit: 'score', range: { min: 0, max: 5 } },
    },
  ];
  for (const entry of entries) {
    const { created } = await registerCustomEntry(client, { ...entry, kind: 'numeric' });
    if (created) {
      console.log(`  registered custom: ${entry.id}`);
    }
  }
};

const ensureDevicesRegistered = async (client: ApiClient, devices: Iterable<GbDevice>): Promise<void> => {
  const existing = await listDevices(client);
  const known = new Set(existing.filter((d) => d.integration === INTEGRATION).map((d) => d.device_id));
  for (const device of devices) {
    if (known.has(device.identifier)) {
      continue;
    }
    await registerDevice(client, {
      integration: INTEGRATION,
      device_id: device.identifier,
      name: device.alias ?? device.name,
    });
    console.log(`  registered device: ${device.alias ?? device.name} (${device.identifier})`);
  }
};

const summarize = (label: string, response: IngestResponse): void => {
  const accepted = response.results.filter((r) => r.status === 'accepted').length;
  const rejected = response.results.filter((r) => r.status === 'rejected');
  console.log(`  ${label}: ${accepted} accepted, ${rejected.length} rejected`);
  const reasons = new Map<string, number>();
  for (const r of rejected) {
    if (r.status === 'rejected') {
      reasons.set(r.reason, (reasons.get(r.reason) ?? 0) + 1);
    }
  }
  for (const [reason, count] of reasons) {
    console.log(`    ${reason}: ${count}`);
  }
};

const ingestItemsForDevice = async (
  client: ApiClient,
  device: GbDevice,
  label: string,
  items: Item[],
): Promise<void> => {
  if (items.length === 0) {
    return;
  }
  for (const slice of chunk(items, BATCH_SIZE)) {
    const response = await ingest(client, {
      source: { integration: INTEGRATION, device: device.identifier },
      items: slice,
    });
    summarize(`${label} / ${device.name}`, response);
  }
};

type MetricRun<T extends Timestamped> = {
  client: ApiClient;
  byId: Map<number, GbDevice>;
  label: string;
  rows: T[];
  build: (device: GbDevice, rows: T[]) => SampleItem[];
};

const ingestPerDevice = async <T extends Timestamped>(run: MetricRun<T>): Promise<void> => {
  for (const [deviceId, deviceRows] of groupByDevice(run.rows)) {
    const device = run.byId.get(deviceId);
    if (!device) {
      console.log(`  Skipping unknown device_id=${deviceId} for ${run.label} (${deviceRows.length} rows)`);
      continue;
    }
    await ingestItemsForDevice(run.client, device, run.label, run.build(device, deviceRows));
  }
};

const runSqliteMetrics = async (
  client: ApiClient,
  byId: Map<number, GbDevice>,
  db: ReturnType<typeof openDb>,
): Promise<void> => {
  const activity = loadActivity(db);
  await ingestPerDevice({ client, byId, label: 'Resting HR', rows: loadRestingHr(db), build: restingHrItems });
  await ingestPerDevice({ client, byId, label: 'Heart rate', rows: activity, build: heartRateItems });
  await ingestPerDevice({ client, byId, label: 'Steps', rows: activity, build: stepsItems });
  await ingestPerDevice({ client, byId, label: 'Distance', rows: activity, build: distanceItems });
  await ingestPerDevice({
    client,
    byId,
    label: 'Respiratory rate',
    rows: loadRespiratory(db),
    build: respiratoryRateItems,
  });
  await ingestPerDevice({ client, byId, label: 'Stress', rows: loadStress(db), build: stressItems });
  await ingestPerDevice({ client, byId, label: 'Body Battery', rows: loadBodyEnergy(db), build: bodyBatteryItems });
  await ingestPerDevice({ client, byId, label: 'BMR', rows: loadBmr(db), build: bmrItems });
  await ingestPerDevice({ client, byId, label: 'Sleep stages', rows: loadSleepStages(db), build: sleepStageItems });
  await ingestPerDevice({ client, byId, label: 'Sleep score', rows: loadSleepStats(db), build: sleepScoreItems });
  await ingestPerDevice({
    client,
    byId,
    label: 'Intensity minutes',
    rows: loadIntensityMinutes(db),
    build: intensityMinutesItems,
  });
};

const runFitWorkouts = async (
  client: ApiClient,
  byMac: Map<string, GbDevice>,
  fits: { path: string; device: string }[],
): Promise<void> => {
  let skipped = 0;
  for (const ref of fits) {
    const device = byMac.get(ref.device);
    if (!device) {
      console.log(`  Skipping FIT for unknown device MAC=${ref.device} (${ref.path})`);
      continue;
    }
    const parsed = parseFit(ref.path);
    const { items, sessionType } = fitWorkoutItems(device, parsed);
    if (!sessionType) {
      skipped += 1;
      continue;
    }
    await ingestItemsForDevice(client, device, `FIT workout (${sessionType})`, items);
  }
  if (skipped > 0) {
    console.log(`  Skipped ${skipped} FIT workout(s) with unknown sport`);
  }
};

const main = async (): Promise<void> => {
  if (!EXPORT_PATH) {
    throw new Error('Path to Gadgetbridge export .zip required (env GADGETBRIDGE_EXPORT or first arg)');
  }
  console.log(`Reading ${EXPORT_PATH}`);
  console.log(`Posting to ${HEALTH_API}`);
  const exp = extractExport(EXPORT_PATH);
  try {
    const token = await obtainToken();
    const client = createAuthedClient(HEALTH_API, token);
    await ensureCustomCatalogue(client);
    const db = openDb(exp.dbPath);
    try {
      const devices = loadDevices(db);
      await ensureDevicesRegistered(client, devices);
      const byId = new Map(devices.map((d) => [d.id, d]));
      const byMac = new Map(devices.map((d) => [d.identifier, d]));
      console.log(`Devices: ${devices.length}; FIT workouts: ${exp.activityFits.length}`);
      await runSqliteMetrics(client, byId, db);
      await runFitWorkouts(client, byMac, exp.activityFits);
    } finally {
      db.close();
    }
  } finally {
    exp.cleanup();
  }
};

await main();
