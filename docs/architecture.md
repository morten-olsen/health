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

Samples have a **value-kind** declared by their catalogue entry. The wire shape is bare per kind — no `{value, unit}` envelope — because the catalogue is the single source of truth for unit. Integrations convert to the canonical unit at the seam; consumers trust whatever the catalogue declares.

| `kind`        | Wire `value`                         | Catalogue `config`                             | Example                                   |
| ------------- | ------------------------------------ | ---------------------------------------------- | ----------------------------------------- |
| `numeric`     | `number`                             | `{ unit, range? }`                             | `value: 142` → 142 bpm                    |
| `categorical` | `string` from a declared enum        | `{ values: [...] }`                            | `value: "deep"`                           |
| `geo`         | `{ lat, lng, altitude?, accuracy? }` | `{}` (fixed shape)                             | `value: { lat: 55.6761, lng: 12.5683 }`   |
| `composite`   | `{ <component>: number, ... }`       | `{ components: { <name>: { unit, range? } } }` | `value: { systolic: 120, diastolic: 80 }` |

Events carry a structured `payload` validated against a JSON Schema declared on the entry's `config.schema`. JSON Schema earns its keep here because event payloads are genuinely complex (variable shape, optional fields, arrays). For numeric leaves of an event schema, `x-unit` annotates the unit so consumers know what `weight: 100` means without having to handcraft a unit lookup. Unit _enforcement_ still happens at the integration seam — the platform doesn't compare units against data because there is no unit field in the data.

Where unit is genuinely _data_ — varies per record, e.g. medication dose can be mg or IU or tablets — keep an explicit `_unit` field with an `enum` constraint instead of using `x-unit`. Each canonical event schema makes that choice locally.

Sessions are catalogue-typed but in v1 carry only a `kind` + optional free-form `metadata`. A session metadata schema (mirroring events) may land in v2 if a real use case appears.

**Annotations bypass the catalogue entirely.** They're notes, not measurements — there's nothing to validate beyond timestamp ordering. Storing them goes through the same lakehouse pipeline (raw → published) so they participate in idempotency, replay, and source attribution like everything else.

**Sessions do not own samples.** A run session and the HR samples within its window are independent records. Aggregation/dedup is a _read-time_ concern, not a write-time one. The same applies to annotations: a "travelling in Japan" annotation overlaps a week of HR samples without any explicit linkage; consumers join by time at query time.

## Catalogue

The catalogue is the validation contract. Each entry is `{ id, kind, description, config }` where `config` is a tight per-kind shape:

```json
{ "id": "heart_rate", "kind": "numeric",
  "description": "Heart rate in beats per minute",
  "config": { "unit": "bpm", "range": { "min": 20, "max": 250 } } }

{ "id": "blood_pressure", "kind": "composite",
  "description": "Blood pressure (systolic / diastolic)",
  "config": { "components": {
      "systolic":  { "unit": "mmHg", "range": { "min": 50, "max": 260 } },
      "diastolic": { "unit": "mmHg", "range": { "min": 30, "max": 160 } } } } }

{ "id": "strength_set", "kind": "event",
  "description": "One set of a strength exercise",
  "config": { "schema": {
      "type": "object",
      "properties": {
        "exercise": { "type": "string", "minLength": 1 },
        "reps":     { "type": "integer", "minimum": 1, "maximum": 1000 },
        "weight":   { "type": "number", "minimum": 0, "maximum": 2000, "x-unit": "kg" },
        "rpe":      { "type": "number", "minimum": 1, "maximum": 10 }
      },
      "required": ["exercise", "reps"],
      "additionalProperties": false } } }
```

- **Per-kind config, not JSON-Schema-for-everything.** Numeric/categorical/geo/composite have small fixed shapes; the catalogue stores them as typed config and validates samples in tight hand-coded code. Events use JSON Schema (Ajv 2020-12) because their payloads are genuinely complex. One tool per problem.
- **Catalogue declares unit; data carries the value.** Numeric samples are bare numbers on the wire — `value: 142`, not `{value: 142, unit: 'bpm'}`. The catalogue says `unit: 'bpm'`. Integrations convert; consumers trust. This avoids the trap of every consumer having to handle every unit a vendor might ever submit.
- **`kind` is the routing discriminator.** It picks which canonical table the record lands in (`samples` / `events` / `sessions`) and which submission `type` may reference the entry. Explicit on the envelope, never inferred from config shape.
- **Strict-by-default event schemas.** Canonical event entries set `additionalProperties: false` so vendors sending unexpected fields get a clean `schema_mismatch` rather than silently mis-stored data. Custom entries can choose either.
- **`x-unit` for unit-as-metadata; explicit `_unit` field for unit-as-data.** When a unit is a fixed property of the metric (strength_set weight in kg), declare it with `x-unit` and drop it from the data — integrations convert. When unit is genuinely variable per-record (medication dose can be mg/IU/tablets), keep it as a regular field with an `enum` constraint. The schema author makes this choice per-field.
- **Meta-validation soft guards on event schemas.** Custom event entries' JSON Schemas are meta-validated against JSON Schema 2020-12 itself, plus: external `$ref` rejected (SSRF + reproducibility), schema size capped (32 KB), nesting depth capped (12), `format` restricted to a known whitelist. These run before Ajv compiles the schema, so abuse is cheap to reject.

Two namespaces, governed differently:

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
    { "type": "sample",     "idempotency_key": "...", "metric": "heart_rate",       "start": "...", "end": "...", "tz": "...", "value": 142 },
    { "type": "sample",     "idempotency_key": "...", "metric": "blood_pressure",   "start": "...", "end": "...",                "value": { "systolic": 120, "diastolic": 80 } },
    { "type": "session",    "idempotency_key": "...", "session_type": "run",        "start": "...", "end": "...",                "metadata": { ... } },
    { "type": "event",      "idempotency_key": "...", "metric": "strength_set",     "at": "...",                                 "payload": { "exercise": "back_squat", "reps": 5, "weight": 100 } },
    { "type": "annotation", "idempotency_key": "...",                               "start": "...", "end": "...",                "text": "...", "tags": ["..."] }
  ]
}
```

Per-item processing, per-item results in the response. Idempotency keys are required and scoped per `(user_id, integration, device, instance)` — two users may legitimately use the same key for unrelated data. **First-write-wins**: same key always returns the prior result, regardless of whether the payload matches. When a payload differs from the original, a warning is logged server-side — it's almost always an integration bug, and there's no actionable runtime mitigation either way, so we don't surface it as a distinct API status. Integrations that want to record genuinely different data must use a different key.

## Rejection reasons (closed enum)

Integrations can branch on these programmatically — never extend without bumping the API contract:

- `unknown_metric` — metric ID not in catalogue
- `invalid_value_kind` — known metric but wrong primitive type (e.g. session_type points to a numeric metric)
- `schema_mismatch` — wrong shape for the kind (sample wrong-typed value, event Ajv `type`/`enum`/`const`/`additionalProperties`/`pattern`/`minLength`/`maxLength`/`minItems`/`maxItems`/`format`, …)
- `out_of_range` — numeric value outside declared range (sample `numeric.range`/`composite.components[*].range`, geo lat/lng bounds, event Ajv `minimum`/`maximum`/`exclusiveMinimum`/`exclusiveMaximum`)
- `missing_field` — required field absent (composite missing component, event Ajv `required`)
- `invalid_timestamp` — semantic timestamp ordering (e.g. `end < start`)
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
