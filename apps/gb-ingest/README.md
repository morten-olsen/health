# @health/gb-ingest

One-shot ingester that reads a [Gadgetbridge](https://gadgetbridge.org/) SQLite export and pushes every recognised metric into a Health server.

This is a **library + CLI**, not a daemon — it runs once, ingests what it finds, and exits. Continuous sync (high-water-mark, scheduling, retries) is a separate concern that will live in its own package (`apps/gb-sync`, planned). The mapping logic here is the substrate both will share.

## What it does

Input is a **Gadgetbridge full-export `.zip`** (Settings → Data management → Export *full*). The CLI extracts to a temp dir, ingests, and cleans up.

On each run:

1. Authenticate (token or username/password).
2. Register Garmin custom catalogue entries if missing (`garmin.body_battery`, `garmin.aerobic_training_effect`, `garmin.anaerobic_training_effect`). 409 is treated as a no-op.
3. List the user's devices and `POST /api/devices` for any not yet registered. The default name is `DEVICE.ALIAS` (the user's Gadgetbridge alias) falling back to `DEVICE.NAME` (model name). A user-set name in the Health server is never overwritten.
4. Ingest from **two sources** inside the export:
   - The Gadgetbridge SQLite DB — continuous monitoring metrics (HR resting, stress, respiratory rate, body battery, BMR, intensity minutes, sleep stages/score, plus per-minute HR/steps/distance from activity samples).
   - The **ACTIVITY FIT files** under `files/<MAC>/ACTIVITY/<year>/*.fit` — high-fidelity workout recordings. Each FIT produces a session plus per-record samples (heart rate, cadence, speed, altitude, GPS) carrying that session's `session_idempotency_key`, plus session-level derived samples (distance total, active energy, elevation gain/loss, training effect).
5. Posts are chunked into batches of 5000 to stay under the `/api/ingest` 10k cap.

Idempotency keys are stable per `(integration, device, table, source_pk)` so re-runs are no-ops at the publish layer.

## Setup

```sh
pnpm install
```

The package uses [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) wrapping types generated from the server's OpenAPI spec. Regenerate after server contract changes:

```sh
task gb-ingest:gen
```

This (re)dumps `apps/server/openapi.json` and emits `src/gb-ingest.api-types.ts`. The generated file is committed so the package compiles without a live server.

## Usage

```sh
HEALTH_USERNAME=morten HEALTH_PASSWORD=*** \
  task gb-ingest:run -- ~/Downloads/GadgetBridge.zip
```

Equivalent direct invocation:

```sh
HEALTH_USERNAME=morten HEALTH_PASSWORD=*** \
  node --experimental-strip-types apps/gb-ingest/src/gb-ingest.ts ~/Downloads/GadgetBridge.zip
```

### Environment

| Variable              | Purpose                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `HEALTH_API`          | Server base URL (default `http://localhost:3000`)                        |
| `ADMIN_TOKEN`         | Bearer token. Takes precedence over username/password if set             |
| `HEALTH_USERNAME`     | Login username (used if `ADMIN_TOKEN` is absent)                         |
| `HEALTH_PASSWORD`     | Login password (used if `ADMIN_TOKEN` is absent)                         |
| `GADGETBRIDGE_EXPORT` | Path to the Gadgetbridge full-export `.zip`. Falls back to the first CLI arg |

## Mappings

### From the SQLite DB (continuous data)

| Source                                        | Target metric                  | Kind        | Filter / conversion                       |
| --------------------------------------------- | ------------------------------ | ----------- | ----------------------------------------- |
| `GARMIN_HEART_RATE_RESTING_SAMPLE.HEART_RATE` | `resting_heart_rate`           | numeric     | none                                      |
| `GARMIN_ACTIVITY_SAMPLE.HEART_RATE`           | `heart_rate`                   | numeric     | skip rows with HR=0 (sensor off)          |
| `GARMIN_ACTIVITY_SAMPLE.STEPS`                | `steps`                        | numeric     | skip rows with STEPS=0                    |
| `GARMIN_ACTIVITY_SAMPLE.DISTANCE_CM`          | `distance`                     | numeric     | cm → m (`/100`), skip zeros               |
| `GARMIN_RESPIRATORY_RATE_SAMPLE`              | `respiratory_rate`             | numeric     | skip rows ≤ 0                             |
| `GARMIN_STRESS_SAMPLE`                        | `stress_level`                 | numeric     | skip rows < 0                             |
| `GARMIN_BODY_ENERGY_SAMPLE`                   | `garmin.body_battery` (custom) | numeric     | skip rows < 0                             |
| `GARMIN_RESTING_METABOLIC_RATE_SAMPLE`        | `basal_metabolic_rate`         | numeric     | skip rows ≤ 0                             |
| `GARMIN_SLEEP_STATS_SAMPLE.SLEEP_SCORE`       | `sleep_score`                  | numeric     | skip rows ≤ 0                             |
| `GARMIN_SLEEP_STAGE_SAMPLE.STAGE`             | `sleep_stage`                  | categorical | FIT enum: 1=awake, 2=light, 3=deep, 4=rem |
| `GARMIN_INTENSITY_MINUTES_SAMPLE`             | `intensity_minutes`            | composite   | `{ moderate, vigorous }` (nulls → 0)      |

`GARMIN_ACTIVITY_SAMPLE` rows with `RAW_KIND=8` (NOT_WORN) are filtered at the SQL level — they're sensor-off noise.

Sessions are **not** taken from `BASE_ACTIVITY_SUMMARY`; FIT files supersede that path for workouts.

### From ACTIVITY FIT files (workouts)

Each ACTIVITY FIT under `files/<MAC>/ACTIVITY/<year>/` produces:

| Source                                            | Target metric                              | Kind        | Notes                                                    |
| ------------------------------------------------- | ------------------------------------------ | ----------- | -------------------------------------------------------- |
| `session` (one per file)                          | session: `run`/`walk`/`strength_training`/...   | session     | Mapped from `sport` + `subSport`; unknowns are skipped   |
| `record.heartRate`                                | `heart_rate`                               | numeric     | linked via `session_idempotency_key`                     |
| `record.cadence` (+ `fractionalCadence`)          | `cadence`                                  | numeric     | linked                                                   |
| `record.enhancedSpeed`                            | `speed`                                    | numeric     | m/s; linked                                              |
| `record.enhancedAltitude`                         | `altitude`                                 | numeric     | linked                                                   |
| `record.positionLat` / `positionLong`             | `location`                                 | geo         | semicircles → degrees; linked                            |
| `session.totalDistance`                           | `distance`                                 | numeric     | one sample over session window; linked                   |
| `session.totalCalories`                           | `active_energy`                            | numeric     | one sample over session window; linked                   |
| `session.totalAscent` / `totalDescent`            | `elevation_gain` / `elevation_loss`        | numeric     | linked                                                   |
| `session.totalTrainingEffect`                     | `garmin.aerobic_training_effect` (custom)  | numeric     | linked                                                   |
| `session.totalAnaerobicTrainingEffect`            | `garmin.anaerobic_training_effect` (custom)| numeric     | linked                                                   |

FIT sport mapping (camelCase as emitted by `@garmin/fitsdk`):

| FIT sport                                          | session_type        |
| -------------------------------------------------- | ------------------- |
| `running`                                          | `run`               |
| `walking`                                          | `walk`              |
| `cycling`                                          | `cycle`             |
| `swimming`                                         | `swim`              |
| `training` + subSport `strengthTraining`           | `strength_training` |
| `training` + subSport `cardioTraining`             | `hiit`              |
| `hiit`                                             | `hiit`              |
| `yoga`                                             | `yoga`              |

Unknown sports are surfaced via a per-run skipped count rather than silently mapped.

### Not currently mapped

- `GARMIN_EVENT_SAMPLE` — opaque (`EVENT=74` with `DATA=int`); needs decoding before it's useful.
- `GARMIN_SLEEP_RESTLESS_MOMENTS_SAMPLE` — niche, low value for now.
- `GARMIN_ACTIVITY_SAMPLE.ACTIVE_CALORIES` — unit ambiguous; workout-level energy now comes from FIT.
- `MONITOR/*.fit`, `METRICS/*.fit`, `SLEEP/*.fit` — higher-resolution continuous data, deferred.
- `BATTERY_LEVEL` — device-state, not health data.

## Module layout

Following the project's `{module}/{module}.{area}.ts` convention:

```
src/
├── gb-ingest.ts            # CLI entry + orchestration
├── gb-ingest.api.ts        # typed client (openapi-fetch wrapper)
├── gb-ingest.api-types.ts  # GENERATED — do not edit; ESLint-ignored
├── gb-ingest.input.ts      # zip extraction + FIT file discovery
├── gb-ingest.db.ts         # Gadgetbridge SQLite readers
├── gb-ingest.fit.ts        # FIT decoding (@garmin/fitsdk)
└── gb-ingest.map.ts        # row/record → ingest-item mappers
```

`gb-ingest.map.ts` and `gb-ingest.db.ts` are the parts a future `gb-sync` daemon would import; the CLI orchestration in `gb-ingest.ts` would be replaced by a scheduling loop with state.

## Adding a new metric

1. Decide whether it's canonical (cross-vendor concept) or custom (`<vendor>.<name>`). For canonical, add a seed entry to `apps/server/src/catalogue/catalogue.seed.ts` plus a migration adding it to existing DBs. For custom, register it via `ensureCustomCatalogue` here on startup.
2. Add a loader to `gb-ingest.db.ts` (`load<Thing>` returning `Timestamped`-shaped rows).
3. Add an extractor in `gb-ingest.map.ts` using `buildSamples(device, rows, { metric, keyPrefix, extract })`. The `keyPrefix` is the short token used in the idempotency key — keep it stable forever.
4. Wire it into `runAllMetrics` in `gb-ingest.ts`.
5. Regenerate API types if the server contract changed: `task gb-ingest:gen`.
