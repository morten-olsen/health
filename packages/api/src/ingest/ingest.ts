import {
  rawRecordInputSchema,
  metricSampleBatchInputSchema,
  sessionInputSchema,
} from "@morten-olsen/health-contracts";
import type { MetricSampleInput } from "@morten-olsen/health-contracts";

import type { Services } from "../services/services.js";
import { DatabaseService } from "../db/db.js";
import { CatalogService } from "../catalog/catalog.js";

class IngestService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  ingestRaw = async (input: {
    source: string;
    sourceId?: string;
    endpoint?: string;
    payload: Record<string, unknown>;
  }): Promise<{ id: string }> => {
    const validated = rawRecordInputSchema.parse(input);
    const db = this.#services.get(DatabaseService).get();

    const query = db
      .insertInto("raw_records")
      .values({
        source: validated.source,
        source_id: validated.sourceId ?? null,
        endpoint: validated.endpoint ?? null,
        payload: JSON.stringify(validated.payload),
      });

    // If source_id is provided, upsert (update payload on conflict)
    const result = validated.sourceId
      ? await query
          .onConflict((oc) =>
            oc.columns(["source", "source_id"]).doUpdateSet({
              payload: JSON.stringify(validated.payload),
              endpoint: validated.endpoint ?? null,
            }),
          )
          .returning("id")
          .execute()
      : await query.returning("id").execute();

    return { id: result[0]!.id };
  };

  ingestMetrics = async (input: {
    samples: MetricSampleInput[];
  }): Promise<{ count: number }> => {
    const validated = metricSampleBatchInputSchema.parse(input);
    const catalog = this.#services.get(CatalogService);
    const db = this.#services.get(DatabaseService).get();

    const slugs = [...new Set(validated.samples.map((s) => s.metricSlug))];
    for (const slug of slugs) {
      const exists = await catalog.exists(slug);
      if (!exists) {
        throw new MetricNotInCatalogError(slug);
      }
    }

    // ON CONFLICT (metric_slug, source, time) update values
    await db
      .insertInto("metric_samples")
      .values(
        validated.samples.map((s) => ({
          time: new Date(s.time),
          metric_slug: s.metricSlug,
          source: s.source,
          value_numeric: s.valueNumeric ?? null,
          value_json: s.valueJson ? JSON.stringify(s.valueJson) : null,
          value_boolean: s.valueBoolean ?? null,
          metadata: s.metadata ? JSON.stringify(s.metadata) : null,
        })),
      )
      .onConflict((oc) =>
        oc.columns(["metric_slug", "source", "time"]).doUpdateSet((eb) => ({
          value_numeric: eb.ref("excluded.value_numeric"),
          value_json: eb.ref("excluded.value_json"),
          value_boolean: eb.ref("excluded.value_boolean"),
          metadata: eb.ref("excluded.metadata"),
        })),
      )
      .execute();

    return { count: validated.samples.length };
  };

  ingestSession = async (input: {
    type: string;
    source: string;
    sourceId?: string;
    startTime: string;
    endTime: string;
    metadata?: Record<string, unknown>;
    metrics?: MetricSampleInput[];
  }): Promise<{ id: string }> => {
    const validated = sessionInputSchema.parse(input);
    const db = this.#services.get(DatabaseService).get();

    const values = {
      type: validated.type,
      source: validated.source,
      source_id: validated.sourceId ?? null,
      start_time: new Date(validated.startTime),
      end_time: new Date(validated.endTime),
      metadata: validated.metadata
        ? JSON.stringify(validated.metadata)
        : null,
    };

    const query = db.insertInto("sessions").values(values);

    // If source_id is provided, upsert (update on conflict)
    const result = validated.sourceId
      ? await query
          .onConflict((oc) =>
            oc.columns(["source", "source_id"]).doUpdateSet({
              start_time: values.start_time,
              end_time: values.end_time,
              metadata: values.metadata,
            }),
          )
          .returning("id")
          .execute()
      : await query.returning("id").execute();

    if (validated.metrics && validated.metrics.length > 0) {
      await this.ingestMetrics({ samples: validated.metrics });
    }

    return { id: result[0]!.id };
  };
}

class MetricNotInCatalogError extends Error {
  slug: string;

  constructor(slug: string) {
    super(`Metric "${slug}" is not in the catalog. Register it first.`);
    this.name = "MetricNotInCatalogError";
    this.slug = slug;
  }
}

export { IngestService, MetricNotInCatalogError };
