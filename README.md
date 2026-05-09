# Health

A self-hostable, vendor-agnostic platform for your own health data. One backend that any tracker, ring, watch, phone, or custom integration can push into — and one canonical layer that consumers can query without caring where the data came from.

## What this is, and why

If you wear an Oura ring, run with Garmin, log meals on your phone, and let Home Assistant track your location, your data lives in five different walled gardens and none of them talk to each other. Apple Health and Google Fit solve this _if_ you commit to their ecosystem; this project solves it without committing to anyone's.

The platform is built around a few opinionated choices:

- **Lakehouse model.** Every submission lands in an append-only raw log first, then gets validated and promoted to a clean canonical layer. Raw is the source of truth; canonical is derived. You can rebuild the canonical layer from raw at any time.
- **Canonical-first metrics.** A core set of metrics (`heart_rate`, `body_weight`, `sleep_stage`, `location`, `blood_pressure`, …) is shipped, schematised, and shared across every integration. Querying "heart rate" works the same whether the source is an Apple Watch, a Garmin, or a Polar strap.
- **Extension without lock-in.** Vendors emit data the canonical set doesn't cover (Garmin's stress score, Oura's readiness)? Register a vendor-namespaced custom metric (`garmin.stress_score`) and start ingesting. No platform release required.
- **Replayable.** Submitted data that didn't validate (unknown metric, schema evolved, etc.) sits in raw with a reason. Add the missing catalogue entry, run `POST /api/replay`, and it promotes automatically.
- **SQLite or Postgres.** SQLite by default — small footprint, single file, perfect for a home server. Switch to Postgres with one env var when you outgrow it.

This v1 focuses on a rock-solid **ingest foundation**. Aggregation across sources (e.g. "during my run, prefer Garmin HR over Oura HR") is a layer that builds on top — easy to add when the data underneath is right.

## Quick start

### Docker (recommended)

```bash
docker build -t health:local .

docker run -d --name health \
  -p 3000:3000 \
  -v health-data:/data \
  health:local
```

The container persists its SQLite database to the named volume `health-data` (mounted at `/data`). Verify it's up:

```bash
curl http://localhost:3000/api/health
# {"status":"ok"}
```

Browse the live API docs at <http://localhost:3000/api/docs>.

### Docker Compose

```yaml
services:
  health:
    build: .
    # or: image: code.olsen.cloud/incubator/health:latest
    ports:
      - '3000:3000'
    volumes:
      - health-data:/data
    restart: unless-stopped
    environment:
      HEALTH_DB_DIALECT: sqlite
      HEALTH_DB_FILENAME: /data/health.db

volumes:
  health-data:
```

### From source

Requires [mise](https://mise.jdx.dev/) for tool versioning. Tools (Node 24, Task, Python for native deps) are pinned in `mise.toml`.

```bash
git clone <repo-url> health && cd health
mise install        # install pinned tool versions
task install        # pnpm install (corepack enables pnpm automatically)
task dev            # start the server in watch mode on :3000
```

Or run the production command without watch:

```bash
task start
```

## Sending data

All data goes through one endpoint: `POST /api/ingest`. It accepts a polymorphic batch of four item types — **samples**, **sessions**, **events**, and **annotations**.

```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "source": {
      "integration": "gadgetbridge",
      "device": "garmin_fenix_7"
    },
    "items": [
      {
        "type": "sample",
        "idempotency_key": "hr-2026-05-09T17:02:00Z",
        "metric": "heart_rate",
        "start": "2026-05-09T17:02:00Z",
        "end":   "2026-05-09T17:02:00Z",
        "tz": "Europe/Copenhagen",
        "value": { "value": 142, "unit": "bpm" }
      },
      {
        "type": "session",
        "idempotency_key": "run-2026-05-09T17:02:00Z",
        "session_type": "run",
        "start": "2026-05-09T17:02:00Z",
        "end":   "2026-05-09T17:48:00Z",
        "tz": "Europe/Copenhagen",
        "metadata": { "perceived_exertion": 7 }
      },
      {
        "type": "event",
        "idempotency_key": "med-2026-05-09T08:00:00Z",
        "metric": "medication_taken",
        "at": "2026-05-09T08:00:00Z",
        "payload": { "name": "ibuprofen", "dose_mg": 400 }
      },
      {
        "type": "annotation",
        "idempotency_key": "trip-jp-2026-05",
        "start": "2026-05-15T00:00:00Z",
        "end":   "2026-05-22T00:00:00Z",
        "tz": "Asia/Tokyo",
        "text": "Travelling in Japan — expect HR/sleep anomalies",
        "tags": ["travel", "context"]
      }
    ]
  }'
```

The response is per-item:

```json
{
  "results": [
    { "idempotency_key": "hr-2026-05-09T17:02:00Z", "status": "accepted", "id": "smp_..." },
    { "idempotency_key": "run-2026-05-09T17:02:00Z", "status": "accepted", "id": "ses_..." },
    { "idempotency_key": "med-2026-05-09T08:00:00Z", "status": "accepted", "id": "evt_..." }
  ]
}
```

Notes worth knowing:

- **Idempotency keys are required**, scoped per `(integration, device, instance)`. Re-submitting with the same key is always safe — you get the previously-assigned `id` back. The platform is **first-write-wins**: if a retry reuses the key with a different payload, the original is retained and a warning is logged server-side (it's almost always an integration bug; if you genuinely want to record different data, use a different key).
- **Timestamps are RFC 3339 UTC instants.** `tz` is an optional IANA timezone name — strongly encouraged because some queries (sleep, time-of-day analysis) need _local_ time. Sources without timezone awareness can omit it.
- **Mixed batches are fine.** A single `POST /api/ingest` can include samples, sessions, events, and annotations together — natural for syncing an end-of-run upload.
- **Per-item failures don't fail the batch.** The HTTP request still succeeds (200); rejected items appear in the response with a closed-enum reason like `unknown_metric`, `out_of_range`, `schema_mismatch`, or `invalid_timestamp`.

The full request/response schema is browseable in the OpenAPI UI at `/api/docs`.

## Sample primitives

Every sample's value shape is determined by its catalogue entry's `kind`:

| `kind`        | value                                       | example                                        |
| ------------- | ------------------------------------------- | ---------------------------------------------- |
| `numeric`     | `{ value: number, unit: string }`           | `{ value: 142, unit: "bpm" }`                  |
| `categorical` | `{ value: string }` (one of declared enum)  | `{ value: "deep" }` (sleep stage)              |
| `geo`         | `{ lat, lng, altitude?, accuracy? }`        | `{ lat: 55.6761, lng: 12.5683, accuracy: 5 }`  |
| `composite`   | `{ values: { ... } }` for co-measured pairs | `{ values: { systolic: 120, diastolic: 80 } }` |

**Sessions** (run, sleep, meditation, drive, …) are typed time-bounded activities — they don't _own_ samples. A run session and the HR samples from your Garmin during that window are independent records, joined by time-overlap at query time. This is what lets a single Oura HR stream cover both the run _and_ the rest of the day without any session-attribution gymnastics.

**Events** (medication, meal, manual note) are catalogued discrete instants with a structured payload.

**Annotations** are free-form contextual enrichments to the timeline — _about_ the data rather than data itself. Travel notes, calibrations ("recalibrated the scale today"), illness windows ("food poisoning, disregard sleep"), hardware swaps. They span a range (instant = `start == end`), carry text and optional tags, and don't go through the catalogue — they're notes, not measurements.

## Adding custom metrics

The shipped canonical catalogue (~33 entries) covers the obvious staples. When a vendor exposes something more specific, register it as a custom catalogue entry — vendor-namespaced so it never collides with canonical or other vendors:

```bash
curl -X POST http://localhost:3000/api/catalogue/custom \
  -H "Content-Type: application/json" \
  -d '{
    "id": "garmin.stress_score",
    "kind": "numeric",
    "unit": "score",
    "description": "Garmin stress score (0–100)",
    "shape": { "range": { "min": 0, "max": 100 } }
  }'
```

If submissions arrived **before** you registered the type, they're sitting in the raw log with `rejection_reason: unknown_metric`. Drain them:

```bash
curl -X POST http://localhost:3000/api/replay \
  -H "Content-Type: application/json" \
  -d '{ "rejection_reason": "unknown_metric" }'
# { "attempted": 142, "promoted": 142, "still_rejected": 0 }
```

You can also register **aliases** so a vendor's native metric name resolves to a canonical id on write:

```bash
curl -X POST http://localhost:3000/api/catalogue/aliases \
  -H "Content-Type: application/json" \
  -d '{ "alias": "apple.heart_rate", "canonical_id": "heart_rate" }'
```

After this, samples submitted as `apple.heart_rate` are stored as canonical `heart_rate` — the integration doesn't have to know the canonical names if it declares aliases up front.

Browse the full catalogue at <http://localhost:3000/api/catalogue> or via `GET /api/catalogue/:id`.

## Configuration

All configuration is via environment variables.

| Variable             | Default                                             | Description                                                      |
| -------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| `HOST`               | `0.0.0.0`                                           | Bind address                                                     |
| `PORT`               | `3000`                                              | TCP port                                                         |
| `HEALTH_DB_DIALECT`  | `sqlite`                                            | `sqlite` or `postgres`                                           |
| `HEALTH_DB_FILENAME` | `./health.db` (source) / `/data/health.db` (Docker) | SQLite path. `:memory:` for ephemeral.                           |
| `HEALTH_DB_URL`      | —                                                   | Postgres connection string. Required when dialect is `postgres`. |

### SQLite vs Postgres

- **SQLite** is the default and the right choice for personal / family-scale self-hosting. The whole database is a single file; backup is `cp`. Concurrency is limited to a single writer, but for one person's lifetime of health data that's plenty.
- **Postgres** is there when you need it: multiple writers, replication, or you're already running Postgres for other things and want one backup target.

To run with Postgres:

```bash
docker run -d --name health \
  -p 3000:3000 \
  -e HEALTH_DB_DIALECT=postgres \
  -e HEALTH_DB_URL=postgres://user:pass@host:5432/health \
  health:local
```

Migrations are dialect-portable and run automatically on first connection.

## Backup and persistence

- **Docker:** the volume mounted at `/data` holds the SQLite database. `docker volume inspect health-data` shows the host path; back that file up regularly.
- **From source:** `./health.db` (and the WAL sidecars `*.db-wal`, `*.db-shm`) hold all state.
- **Postgres:** standard `pg_dump` flow.

Because raw is the source of truth and validation is deterministic, the canonical samples/events/sessions tables are _derivable_ from `ingest_log`. As long as you have raw, you can recover the rest.

## API surface

| Route                         | Purpose                                                           |
| ----------------------------- | ----------------------------------------------------------------- |
| `GET /api/health`             | Liveness probe                                                    |
| `GET /api/docs`               | Scalar-rendered live OpenAPI documentation                        |
| `POST /api/ingest`            | Submit a batch of samples / sessions / events                     |
| `POST /api/replay`            | Re-validate quarantined raw records against the current catalogue |
| `GET /api/catalogue`          | List catalogue entries (filterable by `namespace`, `kind`)        |
| `GET /api/catalogue/:id`      | Fetch a single entry                                              |
| `POST /api/catalogue/custom`  | Register a vendor-namespaced custom metric                        |
| `GET /api/catalogue/aliases`  | List aliases                                                      |
| `POST /api/catalogue/aliases` | Map a vendor metric name to a canonical id                        |

The full machine-readable spec is at `/api/docs/openapi.json`.

## What this _isn't_ (yet)

Things deliberately out of scope for v1, in rough priority order for later:

- **Cross-source aggregation / dedup.** "During this run, prefer Garmin HR over Oura HR." The data foundation supports it; the engine isn't built yet.
- **Authentication / multi-tenancy.** Trust-based per source declaration in v1. Run it behind a reverse proxy or VPN.
- **High-frequency raw waveforms** (ECG at 250 Hz, audio). Different storage problem.
- **Images, videos, attachments.** Same.
- **FHIR clinical record import.** Different problem.
- **A frontend.** The repo is structured as a monorepo (`apps/server`) so `apps/web` can be added later.

## Development

```bash
task dev            # start the server with watch
task test           # run the test suite (27 tests, ~1s)
task check          # type-check across the workspace
task lint           # type-check + ESLint
task ci:quality     # what CI runs on every PR
task test:smoke     # boot the server, hit /api/health, shut down
task docker:build   # build the Docker image locally
task docker:smoke   # build + run + probe + tear down
task --list         # see everything
```

The data model and design rationale are written up in [`docs/architecture.md`](./docs/architecture.md). Project conventions and gotchas are in [`CLAUDE.md`](./CLAUDE.md).

## License

TBD.
