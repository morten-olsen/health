import type { CatalogueEntry, SampleCatalogueEntry } from '../catalogue/catalogue.ts';
import type { AnnotationsTable, EventsTable, SamplesTable, SessionsTable } from '../database/database.types.ts';

import type { AnnotationItem, EventItem, IngestSource, SampleItem, SessionItem } from './ingest.schemas.ts';

type ResolveCache = Map<string, CatalogueEntry | null>;
type SessionLinkCache = Map<string, string | null>;

type IngestContext = {
  source: IngestSource;
  receivedAt: string;
  userId: string;
  resolveCache: ResolveCache;
  sessionLinkCache: SessionLinkCache;
};

// Source instance is optional in the API contract but we normalize to an
// empty string internally so SQL equality and the per-source unique index
// behave consistently across SQLite and Postgres (both treat NULL as
// distinct in unique indexes and `= NULL` as "unknown", never matching).
const normalizedInstance = (instance: string | null | undefined): string => instance ?? '';

type SampleRowInput = {
  id: string;
  item: SampleItem;
  entry: SampleCatalogueEntry;
  ingestLogId: string;
  ctx: IngestContext;
  sessionId: string | null;
};

const buildSampleRow = ({ id, item, entry, ingestLogId, ctx, sessionId }: SampleRowInput): SamplesTable => ({
  id,
  user_id: ctx.userId,
  metric_id: entry.id,
  kind: entry.kind,
  start_at: item.start,
  end_at: item.end,
  tz: item.tz ?? null,
  value: JSON.stringify(item.value),
  source_integration: ctx.source.integration,
  source_device: ctx.source.device,
  source_instance: normalizedInstance(ctx.source.instance),
  ingest_log_id: ingestLogId,
  catalogue_version: entry.version,
  session_key: item.session_idempotency_key ?? null,
  session_id: sessionId,
  created_at: ctx.receivedAt,
});

type SessionRowInput = {
  id: string;
  item: SessionItem;
  entry: CatalogueEntry;
  ingestLogId: string;
  ctx: IngestContext;
};

const buildSessionRow = ({ id, item, entry, ingestLogId, ctx }: SessionRowInput): SessionsTable => ({
  id,
  user_id: ctx.userId,
  session_type: entry.id,
  start_at: item.start,
  end_at: item.end,
  tz: item.tz ?? null,
  metadata: item.metadata ? JSON.stringify(item.metadata) : null,
  source_integration: ctx.source.integration,
  source_device: ctx.source.device,
  source_instance: normalizedInstance(ctx.source.instance),
  ingest_log_id: ingestLogId,
  catalogue_version: entry.version,
  created_at: ctx.receivedAt,
});

type EventRowInput = {
  id: string;
  item: EventItem;
  entry: CatalogueEntry;
  ingestLogId: string;
  ctx: IngestContext;
  sessionId: string | null;
};

const buildEventRow = ({ id, item, entry, ingestLogId, ctx, sessionId }: EventRowInput): EventsTable => ({
  id,
  user_id: ctx.userId,
  metric_id: entry.id,
  at: item.at,
  tz: item.tz ?? null,
  payload: JSON.stringify(item.payload),
  source_integration: ctx.source.integration,
  source_device: ctx.source.device,
  source_instance: normalizedInstance(ctx.source.instance),
  ingest_log_id: ingestLogId,
  catalogue_version: entry.version,
  session_key: item.session_idempotency_key ?? null,
  session_id: sessionId,
  created_at: ctx.receivedAt,
});

type AnnotationRowInput = { id: string; item: AnnotationItem; ingestLogId: string; ctx: IngestContext };

const buildAnnotationRow = ({ id, item, ingestLogId, ctx }: AnnotationRowInput): AnnotationsTable => ({
  id,
  user_id: ctx.userId,
  text: item.text,
  start_at: item.start,
  end_at: item.end,
  tz: item.tz ?? null,
  tags: item.tags ? JSON.stringify(item.tags) : null,
  source_integration: ctx.source.integration,
  source_device: ctx.source.device,
  source_instance: normalizedInstance(ctx.source.instance),
  ingest_log_id: ingestLogId,
  created_at: ctx.receivedAt,
});

export type { IngestContext, ResolveCache, SessionLinkCache };
export { buildAnnotationRow, buildEventRow, buildSampleRow, buildSessionRow, normalizedInstance };
