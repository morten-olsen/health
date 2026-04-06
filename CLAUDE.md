# Health Data Aggregation Platform

pnpm monorepo: `packages/contracts` (shared Zod schemas), `packages/api` (Fastify server), `apps/` (future frontends).

## Gotchas

- **`.js` extensions in all imports**: We use `tsc` for builds and `tsx` for dev. Write `.js` in import paths — TypeScript resolves them to `.ts` at compile time. Never use `.ts` extensions in imports.
- **No index files**: Module entry point is `{module}/{module}.ts`, never `index.ts`.
- **Zod is the source of truth for types**: Define `{name}Schema` first, infer `type Name = z.infer<typeof nameSchema>`. Never manually duplicate a type that can be inferred.
- **Exports at end of file only**: `export type { ... }; export { ... };` — never inline `export`.
- **Arrow functions only, `type` not `interface`**: See `docs/coding-standards.md`.
- **Services use lazy resolution**: Resolve deps in methods via `this.#services.get(X)`, never in constructors.
- **Integrations are external**: They communicate over HTTP only. Core never imports integration code.
- **Metric catalog gates ingest**: Unknown `metric_slug` values are rejected. New metrics require a catalog entry first.
- **Raw data is immutable**: `raw_records` is append-only (but upserts on `source + source_id`).
- **Ingest is idempotent**: Metric samples deduplicate on `(metric_slug, source, time)`. Raw records and sessions deduplicate on `(source, source_id)` when `source_id` is provided. All use `ON CONFLICT ... DO UPDATE`.
- **All docs are living documents**: Update `docs/` when assumptions change.

## Commands

```
pnpm install               # Install all workspace deps
pnpm dev                   # Start API dev server (tsx watch)
pnpm build                 # Build all packages (tsc)
pnpm test                  # Run all tests (vitest)
pnpm test:watch            # Run tests in watch mode
pnpm migrate               # Run DB migrations
pnpm seed                  # Seed metric catalog with defaults
docker compose up -d       # Start TimescaleDB
pnpm --filter @morten-olsen/health-api dev
pnpm --filter @morten-olsen/health-contracts build
```
