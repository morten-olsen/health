import { CatalogueService, isSampleEntry } from '../catalogue/catalogue.ts';
import type { CatalogueEntry, SampleCatalogueEntry } from '../catalogue/catalogue.ts';
import { DatabaseService } from '../database/database.ts';
import type {
  AnnotationsTable,
  EventsTable,
  IngestLogTable,
  RejectionReason,
  SamplesTable,
  SessionsTable,
} from '../database/database.types.ts';
import { Services } from '../services/services.ts';

import type {
  AnnotationItem,
  EventItem,
  IngestItem,
  IngestRequest,
  IngestSource,
  ItemResult,
  ReplayRequest,
  ReplayResponse,
  SampleItem,
  SessionItem,
} from './ingest.schemas.ts';
import { validateAnnotation, validateEvent, validateSample, validateSession } from './ingest.validate.ts';
import type { ValidationResult } from './ingest.validate.ts';

type ResolveCache = Map<string, CatalogueEntry | null>;

type IngestContext = {
  source: IngestSource;
  receivedAt: string;
  userId: string;
  resolveCache: ResolveCache;
};

const resolveCached = async (
  catalogue: CatalogueService,
  metricKey: string,
  userId: string,
  cache: ResolveCache,
): Promise<CatalogueEntry | null> => {
  // Cache keyed by user_id so a single map can serve admin replays that
  // span multiple users.
  const key = `${userId}::${metricKey}`;
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }
  const entry = await catalogue.resolve(metricKey, userId);
  cache.set(key, entry);
  return entry;
};

// Source instance is optional in the API contract but we normalize to an
// empty string internally so SQL equality and the per-source unique index
// behave consistently across SQLite and Postgres (both treat NULL as
// distinct in unique indexes and `= NULL` as "unknown", never matching).
const normalizedInstance = (instance: string | null | undefined): string => instance ?? '';

// Returns the catalogue lookup key for items that need one. Annotations are
// free-form and don't go through the catalogue, so they have no key.
const itemMetric = (item: IngestItem): string | null => {
  if (item.type === 'session') {
    return item.session_type;
  }
  if (item.type === 'annotation') {
    return null;
  }
  return item.metric;
};

const buildSampleRow = (
  item: SampleItem,
  entry: SampleCatalogueEntry,
  ingestLogId: string,
  ctx: IngestContext,
): SamplesTable => ({
  id: crypto.randomUUID(),
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
  created_at: ctx.receivedAt,
});

const buildSessionRow = (
  item: SessionItem,
  entry: CatalogueEntry,
  ingestLogId: string,
  ctx: IngestContext,
): SessionsTable => ({
  id: crypto.randomUUID(),
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

const buildEventRow = (
  item: EventItem,
  entry: CatalogueEntry,
  ingestLogId: string,
  ctx: IngestContext,
): EventsTable => ({
  id: crypto.randomUUID(),
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
  created_at: ctx.receivedAt,
});

const buildAnnotationRow = (item: AnnotationItem, ingestLogId: string, ctx: IngestContext): AnnotationsTable => ({
  id: crypto.randomUUID(),
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

class IngestService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  ingest = async (request: IngestRequest, userId: string): Promise<ItemResult[]> => {
    const ctx: IngestContext = {
      source: request.source,
      receivedAt: new Date().toISOString(),
      userId,
      resolveCache: new Map(),
    };
    const results: ItemResult[] = [];
    for (const item of request.items) {
      results.push(await this.#processItem(item, ctx));
    }
    return results;
  };

  // userId is undefined when an admin replays across all users; defined when
  // a regular user replays (scoped to their own data).
  replay = async (request: ReplayRequest, userId: string | undefined): Promise<ReplayResponse> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const catalogue = this.#services.get(CatalogueService);

    let query = db
      .selectFrom('ingest_log')
      .selectAll()
      .where('validation_status', '=', 'rejected')
      .limit(request.limit);
    if (userId) {
      query = query.where('user_id', '=', userId);
    }
    if (request.metric) {
      query = query.where('metric', '=', request.metric);
    }
    if (request.source_integration) {
      query = query.where('source_integration', '=', request.source_integration);
    }
    if (request.rejection_reason) {
      query = query.where('rejection_reason', '=', request.rejection_reason);
    }
    const rows = await query.execute();

    const replayCache: ResolveCache = new Map();
    let promoted = 0;
    let stillRejected = 0;
    for (const row of rows) {
      const item = JSON.parse(row.payload) as IngestItem;
      const metricKey = itemMetric(item);
      const entry = metricKey ? await resolveCached(catalogue, metricKey, row.user_id, replayCache) : null;
      const validation = this.#validate(item, entry);
      if (!validation.ok) {
        await db
          .updateTable('ingest_log')
          .where('id', '=', row.id)
          .set({ rejection_reason: validation.reason, catalogue_version: entry?.version ?? null })
          .execute();
        stillRejected += 1;
        continue;
      }
      const publishedId = await this.#publish(item, entry, row.id, {
        source: {
          integration: row.source_integration,
          device: row.source_device,
          instance: row.source_instance ?? undefined,
        },
        receivedAt: row.received_at,
        userId: row.user_id,
        resolveCache: replayCache,
      });
      await db
        .updateTable('ingest_log')
        .where('id', '=', row.id)
        .set({
          validation_status: 'accepted',
          rejection_reason: null,
          catalogue_version: entry?.version ?? null,
          published_id: publishedId,
        })
        .execute();
      promoted += 1;
    }
    return { attempted: rows.length, promoted, still_rejected: stillRejected };
  };

  #processItem = async (item: IngestItem, ctx: IngestContext): Promise<ItemResult> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const existing = await db
      .selectFrom('ingest_log')
      .select(['id', 'payload', 'validation_status', 'rejection_reason', 'published_id'])
      .where('user_id', '=', ctx.userId)
      .where('source_integration', '=', ctx.source.integration)
      .where('source_device', '=', ctx.source.device)
      .where('source_instance', '=', normalizedInstance(ctx.source.instance))
      .where('idempotency_key', '=', item.idempotency_key)
      .executeTakeFirst();
    if (existing) {
      // First-write-wins: divergent retries report the original outcome.
      // See docs/architecture.md for rationale.
      if (existing.payload !== JSON.stringify(item)) {
        console.warn(
          `[ingest] idempotency divergence for ${ctx.source.integration}/${ctx.source.device}` +
            ` key=${item.idempotency_key}: payload differs from original; original retained.`,
        );
      }
      return existing.validation_status === 'accepted' && existing.published_id
        ? { idempotency_key: item.idempotency_key, status: 'accepted', id: existing.published_id }
        : {
            idempotency_key: item.idempotency_key,
            status: 'rejected',
            reason: existing.rejection_reason ?? 'schema_mismatch',
          };
    }

    const catalogue = this.#services.get(CatalogueService);
    const metricKey = itemMetric(item);
    const entry = metricKey ? await resolveCached(catalogue, metricKey, ctx.userId, ctx.resolveCache) : null;
    const validation = this.#validate(item, entry);
    return validation.ok ? this.#writeAccepted(item, entry, ctx) : this.#writeRejected(item, entry, validation, ctx);
  };

  #validate = (item: IngestItem, entry: CatalogueEntry | null): ValidationResult => {
    switch (item.type) {
      case 'sample':
        return validateSample(item, entry);
      case 'session':
        return validateSession(item, entry);
      case 'event':
        return validateEvent(item, entry);
      case 'annotation':
        return validateAnnotation(item);
    }
  };

  #writeAccepted = async (item: IngestItem, entry: CatalogueEntry | null, ctx: IngestContext): Promise<ItemResult> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const ingestLogId = crypto.randomUUID();
    const logRow: IngestLogTable = {
      id: ingestLogId,
      user_id: ctx.userId,
      received_at: ctx.receivedAt,
      source_integration: ctx.source.integration,
      source_device: ctx.source.device,
      source_instance: normalizedInstance(ctx.source.instance),
      idempotency_key: item.idempotency_key,
      item_type: item.type,
      metric: itemMetric(item),
      payload: JSON.stringify(item),
      validation_status: 'accepted',
      rejection_reason: null,
      catalogue_version: entry?.version ?? null,
      published_id: null,
    };
    await db.insertInto('ingest_log').values(logRow).execute();
    const publishedId = await this.#publish(item, entry, ingestLogId, ctx);
    await db.updateTable('ingest_log').where('id', '=', ingestLogId).set({ published_id: publishedId }).execute();
    return { idempotency_key: item.idempotency_key, status: 'accepted', id: publishedId };
  };

  #writeRejected = async (
    item: IngestItem,
    entry: CatalogueEntry | null,
    failure: { reason: RejectionReason; detail?: string },
    ctx: IngestContext,
  ): Promise<ItemResult> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const logRow: IngestLogTable = {
      id: crypto.randomUUID(),
      user_id: ctx.userId,
      received_at: ctx.receivedAt,
      source_integration: ctx.source.integration,
      source_device: ctx.source.device,
      source_instance: normalizedInstance(ctx.source.instance),
      idempotency_key: item.idempotency_key,
      item_type: item.type,
      metric: itemMetric(item),
      payload: JSON.stringify(item),
      validation_status: 'rejected',
      rejection_reason: failure.reason,
      catalogue_version: entry?.version ?? null,
      published_id: null,
    };
    await db.insertInto('ingest_log').values(logRow).execute();
    return {
      idempotency_key: item.idempotency_key,
      status: 'rejected',
      reason: failure.reason,
      detail: failure.detail,
    };
  };

  #publish = async (
    item: IngestItem,
    entry: CatalogueEntry | null,
    ingestLogId: string,
    ctx: IngestContext,
  ): Promise<string> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    if (item.type === 'annotation') {
      const row = buildAnnotationRow(item, ingestLogId, ctx);
      await db.insertInto('annotations').values(row).execute();
      return row.id;
    }
    // Catalogued items (sample/session/event) all require an entry; validation
    // would have rejected without one, so this assertion is safe at runtime.
    if (!entry) {
      throw new Error(`Internal error: catalogued item type=${item.type} reached publish without entry`);
    }
    if (item.type === 'sample') {
      if (!isSampleEntry(entry)) {
        throw new Error(`Internal error: sample item resolved to non-sample entry kind=${entry.kind}`);
      }
      const row = buildSampleRow(item, entry, ingestLogId, ctx);
      await db.insertInto('samples').values(row).execute();
      return row.id;
    }
    if (item.type === 'session') {
      const row = buildSessionRow(item, entry, ingestLogId, ctx);
      await db.insertInto('sessions').values(row).execute();
      return row.id;
    }
    const row = buildEventRow(item, entry, ingestLogId, ctx);
    await db.insertInto('events').values(row).execute();
    return row.id;
  };
}

export { IngestService };
