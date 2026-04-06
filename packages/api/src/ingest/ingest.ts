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

  ingestRaw = async (input: { source: string; sourceId?: string; endpoint?: string; payload: Record<string, unknown> }): Promise<{ id: string }> => {
    const validated = rawRecordInputSchema.parse(input);
    const db = this.#services.get(DatabaseService).get();

    const [row] = await db
      .insertInto("raw_records")
      .values({
        source: validated.source,
        source_id: validated.sourceId ?? null,
        endpoint: validated.endpoint ?? null,
        payload: JSON.stringify(validated.payload),
      })
      .returning("id")
      .execute();

    return { id: row!.id };
  };

  ingestMetrics = async (input: { samples: MetricSampleInput[] }): Promise<{ count: number }> => {
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

    const [row] = await db
      .insertInto("sessions")
      .values({
        type: validated.type,
        source: validated.source,
        source_id: validated.sourceId ?? null,
        start_time: new Date(validated.startTime),
        end_time: new Date(validated.endTime),
        metadata: validated.metadata ? JSON.stringify(validated.metadata) : null,
      })
      .returning("id")
      .execute();

    if (validated.metrics && validated.metrics.length > 0) {
      await this.ingestMetrics({ samples: validated.metrics });
    }

    return { id: row!.id };
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
