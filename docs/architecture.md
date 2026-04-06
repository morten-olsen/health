# Architecture

## Overview

A personal health data aggregation platform that collects data from multiple sources (Oura, Garmin, Fitbit, etc.), stores raw data in TimescaleDB, and resolves it into a unified view.

## Monorepo Structure

```
health/
  packages/
    contracts/           # Shared Zod schemas — the API contract
    api/                 # Core API server (Fastify + Kysely + TimescaleDB)
    integration-oura/    # Oura Ring integration (pull + push)
  apps/                  # Future frontend apps
  docs/                  # Living documentation
```

**`@morten-olsen/health-contracts`** — Defines the ingest and query API shapes as Zod schemas. External integrations depend on this package (or its generated OpenAPI spec) to know how to talk to the API. This is the only coupling between integrations and the core.

**`@morten-olsen/health-api`** — The core server. Receives data, stores it, resolves duplicates, serves queries. Runs migrations and seeds the metric catalog on startup — single Docker image deployment.

**`@morten-olsen/health-integration-oura`** — Pulls data from the Oura Ring API and POSTs to the Health API. Uses `openapi-typescript` for type generation from Oura's OpenAPI spec and `openapi-fetch` for a type-safe client. Demonstrates the integration pattern: external process, HTTP-only communication.

## Data Flow

```
External Integration          Core API                    Database
─────────────────────         ────────                    ────────

  Oura worker ──POST /ingest/raw──► Raw storage ────────► raw_records
  Garmin worker ─────────────────►
  Manual script ─────────────────►
                                    │
                              Canonical mapper
                                    │
                              POST /ingest/metrics──────► metric_samples
                              POST /ingest/sessions─────► sessions
                              POST /events──────────────► events

                              Resolution engine
                                    │
                              GET /query/* ◄──── resolved_metrics (view)
```

Integrations can POST raw data (the API maps it), or POST pre-mapped canonical data directly. Both paths store the raw payload for reprocessing.

## Deduplication / Idempotent Ingest

All ingest paths are idempotent via `ON CONFLICT ... DO UPDATE`:

- **Metric samples**: unique on `(metric_slug, source, time)` — re-pulling the same data updates values in place
- **Raw records**: unique on `(source, source_id)` when `source_id` is provided
- **Sessions**: unique on `(source, source_id)` when `source_id` is provided

This means integrations can safely re-sync overlapping date ranges without creating duplicates.

## Three-Layer Data Model

### Raw Layer — `raw_records`
Verbatim API responses. Append-only (upserts on source_id). Enables reprocessing when mapping logic changes.

### Canonical Layer — `metric_samples`, `sessions`, `events`
Normalized data in a unified schema. Every data point references the metric catalog for semantics.

### Resolved Layer — `resolved_metrics` (materialized view, not yet implemented)
Deduplicated, merged data applying resolution rules. This is the "single pane of glass."

## Metric Catalog

Metrics are generic labeled time-series. The catalog gives them meaning:

| Field | Example |
|-------|---------|
| `slug` | `heart_rate` |
| `name` | Heart Rate |
| `unit` | bpm |
| `value_type` | numeric |
| `valid_range` | [20, 250] |
| `aggregations` | avg, min, max |
| `category` | cardiovascular |

New metrics are added by inserting a catalog entry — no schema migration needed. Ingest validates against the catalog and rejects unknown slugs. A default set of 13 metrics is seeded on startup (HR, HRV, SpO2, sleep, steps, etc.).

## Resolution Engine

Resolves overlapping data from multiple sources into a single canonical record:

- **Priority rules per metric** — e.g., sleep data prefers Oura, exercise HR prefers Garmin
- **Time-window matching** — aligns overlapping data within configurable windows
- **Pluggable strategies** — priority-based (default), weighted average, or custom per metric type
- **Rules stored as data** — in `resolution_rules` table, changeable without redeployment

## Dependency Injection

Simple service container (no framework). Services receive the container, resolve dependencies lazily in methods:

```typescript
class MetricService {
  #services: Services;
  constructor(services: Services) { this.#services = services; }

  getLatest = async (slug: string): Promise<MetricSample | null> => {
    const db = this.#services.get(DatabaseService);
    // ...
  };
}
```

Benefits: zero deps, lazy loading, trivial mocking via `services.set()`, graceful cleanup via `destroy()`.

## Integration Pattern

Integrations are **external processes** that communicate with the core via HTTP only:

1. Pull data from source API (e.g., Oura)
2. Store raw payloads via `POST /ingest/raw`
3. Map to canonical format and send via `POST /ingest/metrics` and `POST /ingest/sessions`

For typed integrations in TypeScript, depend on `@morten-olsen/health-contracts` for Zod schemas. For other languages, use the OpenAPI spec served at `/docs`.

For source APIs with an OpenAPI spec, use `openapi-typescript` + `openapi-fetch` to generate a type-safe client (as demonstrated in `integration-oura`).

## API Contract

Defined as Zod schemas in `@morten-olsen/health-contracts`, transformed to OpenAPI via `@fastify/swagger` + `fastify-type-provider-zod`, and served as interactive docs via Scalar at `/docs`.

## Startup Sequence

On API startup:
1. Run Kysely migrations (import-based, bundleable)
2. Seed metric catalog (skips existing entries)
3. Start Fastify server

No separate migration or seed commands needed — single process deployment.

## Tech Stack

| Concern | Choice |
|---------|--------|
| Runtime | Node.js >=22.6 |
| Language | TypeScript (tsc build, tsx dev) |
| API | Fastify + fastify-type-provider-zod |
| API Docs | @fastify/swagger + Scalar |
| Database | PostgreSQL + TimescaleDB |
| Query builder | Kysely |
| Validation | Zod |
| Monorepo | pnpm workspaces + Turborepo |
| Testing | Vitest (monorepo projects) |
| API client gen | openapi-typescript + openapi-fetch |
