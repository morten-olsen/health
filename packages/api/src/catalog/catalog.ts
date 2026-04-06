import { metricCatalogEntrySchema } from "@morten-olsen/health-contracts";
import type { MetricCatalogEntry } from "@morten-olsen/health-contracts";

import type { Services } from "../services/services.js";
import { DatabaseService } from "../db/db.js";

class CatalogService {
  #services: Services;

  constructor(services: Services) {
    this.#services = services;
  }

  getAll = async (): Promise<MetricCatalogEntry[]> => {
    const db = this.#services.get(DatabaseService).get();
    const rows = await db.selectFrom("metric_catalog").selectAll().execute();

    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      unit: row.unit,
      valueType: row.value_type as MetricCatalogEntry["valueType"],
      validRange:
        row.valid_range_min !== null && row.valid_range_max !== null
          ? [row.valid_range_min, row.valid_range_max] as [number, number]
          : undefined,
      aggregations: row.aggregations as MetricCatalogEntry["aggregations"],
      category: row.category,
    }));
  };

  getBySlug = async (slug: string): Promise<MetricCatalogEntry | null> => {
    const db = this.#services.get(DatabaseService).get();
    const row = await db
      .selectFrom("metric_catalog")
      .selectAll()
      .where("slug", "=", slug)
      .executeTakeFirst();

    if (!row) return null;

    return {
      slug: row.slug,
      name: row.name,
      unit: row.unit,
      valueType: row.value_type as MetricCatalogEntry["valueType"],
      validRange:
        row.valid_range_min !== null && row.valid_range_max !== null
          ? [row.valid_range_min, row.valid_range_max] as [number, number]
          : undefined,
      aggregations: row.aggregations as MetricCatalogEntry["aggregations"],
      category: row.category,
    };
  };

  exists = async (slug: string): Promise<boolean> => {
    const db = this.#services.get(DatabaseService).get();
    const row = await db
      .selectFrom("metric_catalog")
      .select("slug")
      .where("slug", "=", slug)
      .executeTakeFirst();
    return row !== undefined;
  };

  create = async (entry: MetricCatalogEntry): Promise<MetricCatalogEntry> => {
    const validated = metricCatalogEntrySchema.parse(entry);
    const db = this.#services.get(DatabaseService).get();

    await db
      .insertInto("metric_catalog")
      .values({
        slug: validated.slug,
        name: validated.name,
        unit: validated.unit,
        value_type: validated.valueType,
        valid_range_min: validated.validRange?.[0] ?? null,
        valid_range_max: validated.validRange?.[1] ?? null,
        aggregations: validated.aggregations,
        category: validated.category,
      })
      .execute();

    return validated;
  };
}

export { CatalogService };
