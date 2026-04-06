import { describe, it, expect } from "vitest";
import {
  metricCatalogEntrySchema,
  metricSampleInputSchema,
  rawRecordInputSchema,
  eventInputSchema,
  sessionInputSchema,
} from "./contracts.js";

describe("metricCatalogEntrySchema", () => {
  it("accepts a valid entry", () => {
    const result = metricCatalogEntrySchema.safeParse({
      slug: "heart_rate",
      name: "Heart Rate",
      unit: "bpm",
      valueType: "numeric",
      validRange: [20, 250],
      aggregations: ["avg", "min", "max"],
      category: "cardiovascular",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid slug format", () => {
    const result = metricCatalogEntrySchema.safeParse({
      slug: "Heart-Rate",
      name: "Heart Rate",
      unit: "bpm",
      valueType: "numeric",
      aggregations: ["avg"],
      category: "cardiovascular",
    });
    expect(result.success).toBe(false);
  });

  it("allows optional validRange", () => {
    const result = metricCatalogEntrySchema.safeParse({
      slug: "weight",
      name: "Weight",
      unit: "kg",
      valueType: "numeric",
      aggregations: ["last"],
      category: "body",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.validRange).toBeUndefined();
    }
  });
});

describe("metricSampleInputSchema", () => {
  it("accepts a valid numeric sample", () => {
    const result = metricSampleInputSchema.safeParse({
      time: "2026-04-06T08:30:00Z",
      metricSlug: "heart_rate",
      source: "oura",
      valueNumeric: 62,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing time", () => {
    const result = metricSampleInputSchema.safeParse({
      metricSlug: "heart_rate",
      source: "oura",
      valueNumeric: 62,
    });
    expect(result.success).toBe(false);
  });
});

describe("rawRecordInputSchema", () => {
  it("accepts a valid raw record", () => {
    const result = rawRecordInputSchema.safeParse({
      source: "oura",
      payload: { sleep: { duration: 28800 } },
    });
    expect(result.success).toBe(true);
  });
});

describe("eventInputSchema", () => {
  it("accepts a valid event", () => {
    const result = eventInputSchema.safeParse({
      time: "2026-04-06T09:00:00Z",
      category: "caffeine",
      label: "Morning coffee",
      metadata: { mg: 95 },
    });
    expect(result.success).toBe(true);
  });
});

describe("sessionInputSchema", () => {
  it("accepts a valid session with metrics", () => {
    const result = sessionInputSchema.safeParse({
      type: "sleep",
      source: "oura",
      startTime: "2026-04-05T23:00:00Z",
      endTime: "2026-04-06T07:00:00Z",
      metadata: { score: 85 },
      metrics: [
        {
          time: "2026-04-06T02:00:00Z",
          metricSlug: "heart_rate",
          source: "oura",
          valueNumeric: 52,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
