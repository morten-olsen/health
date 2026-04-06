import { z } from "zod";

// ── Metric Catalog ──────────────────────────────────────────────────────────

const metricValueTypeSchema = z.enum(["numeric", "json", "boolean"]);

type MetricValueType = z.infer<typeof metricValueTypeSchema>;

const metricAggregationSchema = z.enum(["avg", "min", "max", "sum", "count", "last"]);

type MetricAggregation = z.infer<typeof metricAggregationSchema>;

const metricCatalogEntrySchema = z.object({
  slug: z.string().regex(/^[a-z][a-z0-9_]*$/, "Must be lowercase snake_case"),
  name: z.string().min(1),
  unit: z.string().min(1),
  valueType: metricValueTypeSchema,
  validRange: z.tuple([z.number(), z.number()]).optional(),
  aggregations: z.array(metricAggregationSchema),
  category: z.string().min(1),
});

type MetricCatalogEntry = z.infer<typeof metricCatalogEntrySchema>;

// ── Raw Ingest ──────────────────────────────────────────────────────────────

const rawRecordInputSchema = z.object({
  source: z.string().min(1),
  sourceId: z.string().optional(),
  endpoint: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
});

type RawRecordInput = z.infer<typeof rawRecordInputSchema>;

// ── Metric Samples ──────────────────────────────────────────────────────────

const metricSampleInputSchema = z.object({
  time: z.string().datetime(),
  metricSlug: z.string().min(1),
  source: z.string().min(1),
  valueNumeric: z.number().optional(),
  valueJson: z.record(z.string(), z.unknown()).optional(),
  valueBoolean: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type MetricSampleInput = z.infer<typeof metricSampleInputSchema>;

const metricSampleBatchInputSchema = z.object({
  samples: z.array(metricSampleInputSchema).min(1).max(10000),
});

type MetricSampleBatchInput = z.infer<typeof metricSampleBatchInputSchema>;

// ── Sessions ────────────────────────────────────────────────────────────────

const sessionInputSchema = z.object({
  type: z.string().min(1),
  source: z.string().min(1),
  sourceId: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  metrics: z.array(metricSampleInputSchema).optional(),
});

type SessionInput = z.infer<typeof sessionInputSchema>;

// ── Events ──────────────────────────────────────────────────────────────────

const eventInputSchema = z.object({
  time: z.string().datetime(),
  category: z.string().min(1),
  label: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

type EventInput = z.infer<typeof eventInputSchema>;

// ── Query ───────────────────────────────────────────────────────────────────

const metricQuerySchema = z.object({
  metricSlug: z.string().min(1),
  source: z.string().optional(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  resolution: z.enum(["raw", "1m", "5m", "15m", "1h", "1d"]).default("raw"),
});

type MetricQuery = z.infer<typeof metricQuerySchema>;

// ── Resolution Rules ────────────────────────────────────────────────────────

const mergeStrategySchema = z.enum(["priority", "average", "latest"]);

type MergeStrategy = z.infer<typeof mergeStrategySchema>;

const resolutionRuleInputSchema = z.object({
  metricSlug: z.string().min(1),
  sourcePriority: z.array(z.string().min(1)),
  mergeStrategy: mergeStrategySchema.default("priority"),
  windowSeconds: z.number().int().positive().default(60),
});

type ResolutionRuleInput = z.infer<typeof resolutionRuleInputSchema>;

// ── Exports ─────────────────────────────────────────────────────────────────

export type {
  MetricValueType,
  MetricAggregation,
  MetricCatalogEntry,
  RawRecordInput,
  MetricSampleInput,
  MetricSampleBatchInput,
  SessionInput,
  EventInput,
  MetricQuery,
  MergeStrategy,
  ResolutionRuleInput,
};

export {
  metricValueTypeSchema,
  metricAggregationSchema,
  metricCatalogEntrySchema,
  rawRecordInputSchema,
  metricSampleInputSchema,
  metricSampleBatchInputSchema,
  sessionInputSchema,
  eventInputSchema,
  metricQuerySchema,
  mergeStrategySchema,
  resolutionRuleInputSchema,
};
