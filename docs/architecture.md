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

|                    | Canonical                                  | Custom                                                                   |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------ |
| Namespace          | flat (`heart_rate`, `sleep_stage`)         | vendor-prefixed (`garmin.stress_score`)                                  |
| Owner              | platform — shipped, versioned via releases | per-user — each user owns their own custom entries                       |
| Visibility         | all authenticated users                    | only the owning user                                                     |
| Mutability via API | none                                       | the owning user can register entries; entries are invisible across users |
| Promotion path     | none — never auto-promoted from custom     | n/a                                                                      |

The Garmin-vs-Oura `stress_score` problem is solved by namespacing: they're separate entries (`garmin.stress_score`, `oura.stress_score`) that never silently unify. Two users can also independently register the same `garmin.stress_score` with different shapes — they're separate per-user entries that don't collide. A consumer asking for "stress" must consciously pick a vendor (or user, or write a cross-vendor mapper). Pretending otherwise is the actively harmful failure mode.

**Aliases are per-user.** A user declares `apple.heart_rate → heart_rate` once and the platform resolves their submissions through that alias. Other users aren't affected.

Resolve precedence for `(metric_id, user_id)`:

1. user's own aliases (`apple.heart_rate` → `heart_rate`)
2. user's custom entries with that id
3. canonical entries with that id

Custom entries can shadow canonical names? No — `createCustomEntry` checks both the user's own customs and the canonical set; collision against either is a 409.

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

Per-item processing, per-item results in the response. Idempotency keys are required and scoped per `(user_id, integration, device, instance)` — two users may legitimately use the same key for unrelated data. **First-write-wins**: same key always returns the prior result, regardless of whether the payload matches. When a payload differs from the original, a warning is logged server-side — it's almost always an integration bug, and there's no actionable runtime mitigation either way, so we don't surface it as a distinct API status. Integrations that want to record genuinely different data must use a different key.

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

## Authentication & user model

- **Schema is multi-user-native.** Every published table (`ingest_log`, `samples`, `events`, `sessions`, `annotations`) carries a `user_id` FK. Custom catalogue entries and aliases are per-user. Idempotency uniqueness is `(user_id, source, idempotency_key)`, so two users can use the same key for unrelated data.
- **Auth scheme: scrypt-hashed passwords + JOSE JWT (HS256), Bearer tokens.** No expiration on tokens in v1. `JWT_SECRET` set via env; if absent, an ephemeral secret is generated per process.
- **`users` table fields are optional where they need to be:** `username` is nullable (OIDC-only users may not have one); `password_hash` is nullable (OIDC users authenticate via the IdP). The schema is shaped for OIDC and API tokens to slot in later without migration.
- **Roles:** `admin` and `user`. Admins can replay across users; everything else is identical.
- **No registration endpoint in v1.** The only way to create a user is the `ADMIN_USERNAME` + `ADMIN_PASSWORD` env vars, which create exactly one user (the admin). On every startup, the bootstrap reconciles: ensures the user exists, forces `role=admin`, updates the password if the env value differs from the stored hash. This makes the env vars a deliberate "I forgot the password" recovery path.
- **Without admin env vars, the server still starts** — but no users exist, so every authenticated endpoint returns 401 and login can't succeed. This is fail-on-first-request rather than fail-to-start; the operator sees the problem the moment they try to use anything.

## Out of scope (for v1)

- Aggregation / cross-source dedup priority engine — the foundation supports it, build later as another derivation
- Registration endpoint, OIDC, admin-driven user management — schema is shaped for it; integration is the next pass
- API tokens (long-lived, machine-friendly) and refresh tokens — current JWTs don't expire, so retry stories work
- High-frequency raw signals (ECG waveforms), images, audio — blob-storage problems, not time-series
- FHIR clinical record import — separate concern
