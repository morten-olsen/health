# Architecture

Vendor-agnostic, self-hostable health-data platform. Backend exposes a strong OpenAPI surface; integrations push data; consumers query a clean canonical layer.

## Mental model: lakehouse for health data

```
   ingest_log (raw, append-only)
              │
              ▼
        validation
  (catalogue-driven for samples/events/sessions;
   timestamp-only for annotations)
              │
              ▼
   samples / events / sessions / annotations
        (canonical, indexed, queryable)
              │
              ▼
          consumers
```

Three properties hold:

1. **Raw is the source of truth.** Validated/canonical data is _derived_. Burn the validated layer and rebuild from raw — same result.
2. **Quarantine is a state, not a table.** Raw records whose validation failed sit with a reason; replay re-runs validation against the current catalogue.
3. **Validation is pure.** A function of `(raw_record, catalogue_at_version_N)`. No side effects. Re-runnable. Versioned inputs → reproducible outputs.

## Primitives

The platform models four kinds of data:

| Primitive      | Shape                                                                          | Examples                                                                |
| -------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Sample**     | catalogued value over `[start, end]` (instantaneous = `start == end`)          | heart rate, weight, location, sleep stage, blood pressure               |
| **Event**      | catalogued discrete happening with structured payload at a single instant      | medication taken, meal logged                                           |
| **Session**    | typed time-bounded activity (catalogue kind=`session`); does _not_ own samples | run, sleep period, meditation, drive                                    |
| **Annotation** | free-form contextual enrichment over `[start, end]`; **not** in the catalogue  | "Travelling in Japan — expect HR/sleep anomalies"; "Recalibrated scale" |

Samples have a **value-kind** declared by their catalogue entry:

- `numeric` — `{ value, unit }` (e.g. heart rate)
- `categorical` — `{ value }` from a declared enum (e.g. sleep stage)
- `geo` — `{ lat, lng, altitude?, accuracy? }`
- `composite` — `{ values, units }` for co-measured pairs (e.g. blood pressure)

Sessions and events are tracked as `kind: 'session'` and `kind: 'event'` in the catalogue but carry no value-shape validation rules — sessions just need to be a registered type, events accept opaque payloads.

**Annotations bypass the catalogue entirely.** They're notes, not measurements — there's nothing to validate beyond timestamp ordering. Storing them goes through the same lakehouse pipeline (raw → published) so they participate in idempotency, replay, and source attribution like everything else.

**Sessions do not own samples.** A run session and the HR samples within its window are independent records. Aggregation/dedup is a _read-time_ concern, not a write-time one. The same applies to annotations: a "travelling in Japan" annotation overlaps a week of HR samples without any explicit linkage; consumers join by time at query time.

## Catalogue

The catalogue is the validation contract. Two namespaces, governed differently:

|                    | Canonical                                  | Custom                                  |
| ------------------ | ------------------------------------------ | --------------------------------------- |
| Namespace          | flat (`heart_rate`, `sleep_stage`)         | vendor-prefixed (`garmin.stress_score`) |
| Owner              | platform — shipped, versioned via releases | user — registered through API           |
| Mutability via API | none                                       | full CRUD (within trust model)          |
| Promotion path     | none — never auto-promoted from custom     | n/a                                     |

The Garmin-vs-Oura `stress_score` problem is solved by namespacing: they're separate entries (`garmin.stress_score`, `oura.stress_score`) that never silently unify. A consumer asking for "stress" must consciously pick a vendor or write their own cross-vendor mapper. Pretending otherwise is the actively harmful failure mode.

Aliases let a vendor declare `apple.heart_rate → heart_rate` once at registration time; the platform resolves aliases on write so the canonical id lands in storage.

## Submission contract

`POST /api/ingest` accepts a polymorphic batch:

```json
{
  "source": { "integration": "gadgetbridge", "device": "garmin_fenix_7", "instance": "abc123" },
  "items": [
    { "type": "sample",     "idempotency_key": "...", "metric": "heart_rate", "start": "...", "end": "...", "tz": "...", "value": { "value": 142, "unit": "bpm" } },
    { "type": "session",    "idempotency_key": "...", "session_type": "run", "start": "...", "end": "...", "metadata": { ... } },
    { "type": "event",      "idempotency_key": "...", "metric": "medication_taken", "at": "...", "payload": { ... } },
    { "type": "annotation", "idempotency_key": "...", "start": "...", "end": "...", "text": "...", "tags": ["..."] }
  ]
}
```

Per-item processing, per-item results in the response. Idempotency keys are required and scoped per `(integration, device, instance)` triple. **First-write-wins**: same key always returns the prior result, regardless of whether the payload matches. When a payload differs from the original, a warning is logged server-side — it's almost always an integration bug, and there's no actionable runtime mitigation either way, so we don't surface it as a distinct API status. Integrations that want to record genuinely different data must use a different key.

## Rejection reasons (closed enum)

Integrations can branch on these programmatically — never extend without bumping the API contract:

- `unknown_metric` — metric ID not in catalogue
- `invalid_value_kind` — known metric but wrong primitive type (e.g. session_type points to a numeric metric)
- `schema_mismatch` — value shape wrong for the kind
- `out_of_range` — numeric value outside declared range
- `missing_field` / `invalid_timestamp` — semantic missingness
- `catalogue_deprecated` — the catalogue entry is deprecated

## Replay

`POST /api/replay` re-runs validation across raw records matching a filter (`metric`, `source_integration`, `rejection_reason`, `limit`). Drains the lake against the current catalogue. Idempotent.

The canonical use case: an integration submits `garmin.stress_score`, gets `unknown_metric`. The user registers the custom catalogue entry. Replay promotes the queued raw records.

## Storage choices

- **Both Postgres and SQLite** via Kysely's dialect abstraction. SQLite is the default for self-host; `HEALTH_DB_DIALECT=postgres` + `HEALTH_DB_URL=...` switches to Postgres.
- **Migrations are dialect-portable.** Timestamps and JSON columns are `text` on both; booleans are `integer` 0/1; IDs are `text` UUIDs (app-generated). No DB-side defaults — the application is the single source of truth for `created_at` / `id`.
- **Source instance normalized.** Optional in the contract, normalized to empty string internally. Both SQLite and Postgres treat NULL as distinct in unique indexes and `= NULL` as "unknown" — neither helps for dedup. Empty string sentinel makes the unique index and equality both work.

## Out of scope (for v1)

- Aggregation / cross-source dedup priority engine — the foundation supports it, build later as another derivation
- Authentication / multi-tenancy — trust-based per source declaration in v1
- High-frequency raw signals (ECG waveforms), images, audio — blob-storage problems, not time-series
- FHIR clinical record import — separate concern
