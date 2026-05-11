import { CatalogueService, isSampleEntry } from '../catalogue/catalogue.ts';
import type { CatalogueEntry } from '../catalogue/catalogue.ts';
import { DatabaseService } from '../database/database.ts';
import type { IngestLogTable, RejectionReason } from '../database/database.types.ts';
import { Services } from '../services/services.ts';

import {
  buildAnnotationRow,
  buildEventRow,
  buildSampleRow,
  buildSessionRow,
  normalizedInstance,
} from './ingest.rows.ts';
import type { IngestContext, ResolveCache } from './ingest.rows.ts';
import type { IngestItem, IngestRequest, ItemResult, ReplayRequest, ReplayResponse } from './ingest.schemas.ts';
import { validateAnnotation, validateEvent, validateSample, validateSession } from './ingest.validate.ts';
import type { ValidationResult } from './ingest.validate.ts';

const resolveCached = async (
  catalogue: CatalogueService,
  metricKey: string,
  userId: string,
  cache: ResolveCache,
): Promise<CatalogueEntry | null> => {
  // Keyed by user_id so a single map can serve admin replays that span users.
  const key = `${userId}::${metricKey}`;
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }
  const entry = await catalogue.resolve(metricKey, userId);
  cache.set(key, entry);
  return entry;
};

// Annotations are free-form and don't hit the catalogue, so they have no key.
const itemMetric = (item: IngestItem): string | null => {
  if (item.type === 'session') {
    return item.session_type;
  }
  if (item.type === 'annotation') {
    return null;
  }
  return item.metric;
};

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
      sessionLinkCache: new Map(),
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
      const publishedId = crypto.randomUUID();
      await this.#publish({
        item,
        entry,
        ingestLogId: row.id,
        publishedId,
        ctx: {
          source: {
            integration: row.source_integration,
            device: row.source_device,
            instance: row.source_instance ?? undefined,
          },
          receivedAt: row.received_at,
          userId: row.user_id,
          resolveCache: replayCache,
          sessionLinkCache: new Map(),
        },
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
    const publishedId = crypto.randomUUID();
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
      published_id: publishedId,
    };
    await db.insertInto('ingest_log').values(logRow).execute();
    await this.#publish({ item, entry, ingestLogId, ctx, publishedId });
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

  #publish = async (publish: {
    item: IngestItem;
    entry: CatalogueEntry | null;
    ingestLogId: string;
    ctx: IngestContext;
    publishedId: string;
  }): Promise<void> => {
    const { item, entry, ingestLogId, ctx, publishedId: id } = publish;
    const db = await this.#services.get(DatabaseService).getInstance();
    if (item.type === 'annotation') {
      await db.insertInto('annotations').values(buildAnnotationRow({ id, item, ingestLogId, ctx })).execute();
      return;
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
      const sessionId = await this.#resolveSessionId(item.session_idempotency_key, ctx);
      await db.insertInto('samples').values(buildSampleRow({ id, item, entry, ingestLogId, ctx, sessionId })).execute();
      return;
    }
    if (item.type === 'session') {
      await db.insertInto('sessions').values(buildSessionRow({ id, item, entry, ingestLogId, ctx })).execute();
      await this.#backfillSessionLinks(item.idempotency_key, id, ctx);
      ctx.sessionLinkCache.set(item.idempotency_key, id);
      return;
    }
    const sessionId = await this.#resolveSessionId(item.session_idempotency_key, ctx);
    await db.insertInto('events').values(buildEventRow({ id, item, entry, ingestLogId, ctx, sessionId })).execute();
  };

  // Null is normal — the session may publish later, in which case
  // #backfillSessionLinks fixes it. Cached per batch so a thousand workout
  // records referencing one session don't trigger a thousand SELECTs.
  #resolveSessionId = async (key: string | undefined, ctx: IngestContext): Promise<string | null> => {
    if (!key) {
      return null;
    }
    if (ctx.sessionLinkCache.has(key)) {
      return ctx.sessionLinkCache.get(key) ?? null;
    }
    const db = await this.#services.get(DatabaseService).getInstance();
    const row = await db
      .selectFrom('ingest_log')
      .select('published_id')
      .where('user_id', '=', ctx.userId)
      .where('source_integration', '=', ctx.source.integration)
      .where('source_device', '=', ctx.source.device)
      .where('source_instance', '=', normalizedInstance(ctx.source.instance))
      .where('idempotency_key', '=', key)
      .where('item_type', '=', 'session')
      .where('validation_status', '=', 'accepted')
      .executeTakeFirst();
    const sessionId = row?.published_id ?? null;
    ctx.sessionLinkCache.set(key, sessionId);
    return sessionId;
  };

  #backfillSessionLinks = async (key: string, sessionId: string, ctx: IngestContext): Promise<void> => {
    const db = await this.#services.get(DatabaseService).getInstance();
    const instance = normalizedInstance(ctx.source.instance);
    await db
      .updateTable('samples')
      .set({ session_id: sessionId })
      .where('user_id', '=', ctx.userId)
      .where('source_integration', '=', ctx.source.integration)
      .where('source_device', '=', ctx.source.device)
      .where('source_instance', '=', instance)
      .where('session_key', '=', key)
      .where('session_id', 'is', null)
      .execute();
    await db
      .updateTable('events')
      .set({ session_id: sessionId })
      .where('user_id', '=', ctx.userId)
      .where('source_integration', '=', ctx.source.integration)
      .where('source_device', '=', ctx.source.device)
      .where('source_instance', '=', instance)
      .where('session_key', '=', key)
      .where('session_id', 'is', null)
      .execute();
  };
}

export { IngestService };
