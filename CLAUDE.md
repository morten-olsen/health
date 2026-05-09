# CLAUDE.md

This file is for AI agents. Keep entries short — link to `./docs` for detail.

Documentation in `./docs` are live documents. If you discover a discrepancy between docs and code, correct it. Changes to conventions should be reflected in the relevant doc.

This file is for **gotchas** — things that aren't obvious and required effort to figure out.

## Docs

- [docs/architecture.md](./docs/architecture.md) — lakehouse model, primitives, catalogue, submission contract, replay

<!--
Add more links as docs/ files appear:
- docs/coding-standards.md — TypeScript conventions, Zod patterns, file organization
- docs/database.md — schema, migrations, dialect portability
- docs/testing.md — vitest harness, in-memory SQLite, Fastify inject
-->

## Coding standards

The conventions are enforced by ESLint. Highlights:

- `type` over `interface` (one exception: module augmentation, where TypeScript requires `interface`)
- Arrow functions only — no `function` keyword
- Explicit return types on every function
- Exports consolidated at the end of the file: `export type { ... }; export { ... };`
- Import extensions required: `.ts` for app code (use the on-disk extension), `.js` for compiled libraries
- No `index.ts` files — module public API is `{module}/{module}.ts`, support files are `{module}/{module}.{area}.ts`
- Imports come from the main module file, never from support files
- `#` for private fields, not the `private` keyword
- `unknown` over `any`, always
- Zod schemas: `fooSchema` (camelCase) / `Foo` (PascalCase inferred type)
- Kebab-case file names
- Relative imports only — no path aliases (`@/...`)

## Architecture

Vendor-agnostic, self-hostable health-data platform. Backend exposes a strong OpenAPI surface; integrations push data; consumers query a clean canonical layer.

Core model is a **lakehouse** for health data:

```
ingest_log (raw, append-only)  →  validation (catalogue-driven)  →  samples / events / sessions (canonical, indexed)
```

- **Raw is the source of truth.** Validated data is a derivation. Burn it, rebuild from raw — same result.
- **Quarantine is a state, not a table.** Raw records whose validation failed sit with a reason; replay re-runs validation against the current catalogue.
- **Catalogue is the validation contract.** Two namespaces: canonical (platform-shipped, flat names like `heart_rate`) and custom (user-registered, vendor-prefixed like `garmin.stress_score`). Custom never auto-promotes to canonical — that's a platform-release decision.
- **Sample primitives:** `numeric | categorical | geo | composite`. Each catalogue entry declares its kind. Sessions are time-bounded annotations that do _not_ own samples — association is by time-overlap at query time.
- **Submission contract:** `POST /api/ingest` accepts a polymorphic batch of `sample | session | event` items. Per-item validation; per-item results in the response. Idempotency keys required, scoped per-source.

Server stack:

- Fastify + `fastify-type-provider-zod` for typed routes and OpenAPI generation
- Kysely for typed SQL — supports both SQLite (default, self-host friendly) and Postgres (scale-up). Dialect chosen by `HEALTH_DB_DIALECT` env var.
- Migrations are dialect-portable (Kysely schema builder; no raw SQL where avoidable).
- `Services` container for DI; services resolve dependencies lazily.
- Vitest + Fastify `inject()` for API-level tests; in-memory SQLite per test.

## CI/CD

Forgejo + Woodpecker on `code.olsen.cloud`. Workflows under `.woodpecker/`:

- `quality.yaml` — type-check + lint + tests on every push/PR (`task ci:quality`)
- `compliance.yaml` — license check + Trivy fs scan on every push/PR (`task ci:compliance`)
- `build.yaml` — kaniko-builds the Dockerfile, pushes `code.olsen.cloud/incubator/health:latest` and `:<short-sha>`, then Trivy-scans the image. Gated on quality + compliance.
- `renovate.yaml` — cron-triggered self-hosted Renovate; also covers `mise.toml` and the Dockerfile base image.

The Dockerfile is multi-stage: builder stage installs with full node-gyp toolchain (python + build-essential) so `better-sqlite3` compiles; runtime stage is `node:24-bookworm-slim` running `node --experimental-strip-types apps/server/src/server.ts`. SQLite DB lives at `/data/health.db` by default; mount a volume there to persist.

Required org-level Woodpecker secrets (image-filtered to the named plugins): `forgejo_registry_auth` (for `kaniko-build`), `renovate_forgejo_token` (for `renovate`).

## Gotchas

- `import { z } from 'zod/v4'` — `fastify-type-provider-zod@5+` requires the v4 API.
- Module augmentation (`declare module 'fastify' { interface FastifyRequest { ... } }`) requires `interface`, not `type`. Use an inline ESLint disable.
- SQLite has no `boolean` (use `integer` 0/1) or `datetime` (use `text` with ISO 8601 + `datetime('now')` defaults). All IDs are text UUIDs.
- Postgres has `boolean` and `timestamptz` — Kysely's schema builder maps these reasonably across dialects, but `DatabaseService` adapts where they diverge (e.g. `JSON` columns: `text` on SQLite, `jsonb` on Postgres).
- Vitest workspace mode does not reliably apply per-project `env` config — set `process.env` directly in test helpers, before any imports that read config.
- `noUncheckedIndexedAccess` is on — `array[0]` is `T | undefined`. Don't disable it; narrow with explicit checks.
- Catalogue resolves are scoped per-user with precedence: user's aliases → user's custom entries → canonical. Two users can independently register the same `vendor.metric` id; they don't collide.
- Idempotency keys are scoped per `(user_id, source, idempotency_key)` — two users may legitimately use the same key for unrelated data, and so may the same user from two different devices.
- Admin bootstrap is reconciliatory on every startup. If `ADMIN_USERNAME` + `ADMIN_PASSWORD` are set, the user is created if missing, role is forced to `admin`, and the password is reset if it diverges from the stored hash. To "reset" the admin password, change the env var and restart.
- No registration endpoint in v1. The bootstrap admin is the only path to a user account. Test harness seeds non-admin users by inserting directly into the `users` table via the DI container.
- `users.username` and `users.password_hash` are nullable to keep the schema OIDC-ready (no platform username, no platform password). The `users.username` unique index is unique-when-present (NULL is treated as distinct in unique indexes by both SQLite and Postgres).
- Module augmentation in `auth/auth.middleware.ts` (`declare module 'fastify' { interface FastifyRequest { user: TokenPayload } }`) requires `interface`, not `type`. The inline ESLint disable is required.
- Trivy's `node-pkg` analyzer reports the **lower bound** of declared dep ranges in each `node_modules/*/package.json`, not the lockfile-resolved version. Transitive deps will appear "vulnerable" while the actually-installed version is fine. Document false positives in `.trivyignore` with the verification (`pnpm why <pkg>` + lockfile grep) so the next person doesn't have to re-derive it.
