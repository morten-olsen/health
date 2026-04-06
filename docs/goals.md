# Goals

## Primary Goal

A single pane of glass for personal health data from multiple tracking devices and sources.

## Design Goals

- **Raw data preservation** — Store every piece of source data verbatim. Aggregation logic can change; raw data cannot be re-collected.
- **Source independence** — Integrations are external processes that communicate over HTTP. Adding a new source never requires changes to the core.
- **Generic metric model** — New health metrics (HR, HRV, SpO2, weight, etc.) are added via catalog entries, not schema changes.
- **Pluggable resolution** — Dedup and merge strategies are configurable per metric type and swappable without code changes.
- **Causation discovery** — Manual event tracking (coffee, meetings, stress) alongside health data to find correlations with outliers.
- **Incremental buildout** — Strong modular core first, then integrations and aggregation methods added over time.

## Non-Goals (for now)

- Real-time streaming / live dashboards
- Multi-user / auth (single-user personal tool)
- Mobile app
- ML-based insights (future possibility, but not driving architecture)
