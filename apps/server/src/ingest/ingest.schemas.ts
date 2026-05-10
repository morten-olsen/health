import { z } from 'zod/v4';

import type { RejectionReason } from '../database/database.types.ts';

const sourceSchema = z.object({
  integration: z.string().min(1).max(100),
  device: z.string().min(1).max(100),
  instance: z.string().min(1).max(200).optional(),
});

const isoInstantSchema = z.iso.datetime({ offset: true });
const tzSchema = z.string().min(1).max(60).optional();
const idempotencyKeySchema = z.string().min(1).max(200);
const metricIdSchema = z.string().min(1).max(200);

// Sample value is polymorphic by the resolved catalogue entry's kind:
// numeric → bare number, categorical → bare string, geo/composite → object.
// Zod just enforces "is something"; the per-kind check happens against the
// catalogue entry inside CatalogueService/validateSample.
const sampleValueSchema = z.unknown();

const sampleItemSchema = z.object({
  type: z.literal('sample'),
  idempotency_key: idempotencyKeySchema,
  metric: metricIdSchema,
  start: isoInstantSchema,
  end: isoInstantSchema,
  tz: tzSchema,
  value: sampleValueSchema,
});

const sessionItemSchema = z.object({
  type: z.literal('session'),
  idempotency_key: idempotencyKeySchema,
  session_type: metricIdSchema,
  start: isoInstantSchema,
  end: isoInstantSchema,
  tz: tzSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const eventItemSchema = z.object({
  type: z.literal('event'),
  idempotency_key: idempotencyKeySchema,
  metric: metricIdSchema,
  at: isoInstantSchema,
  tz: tzSchema,
  payload: z.record(z.string(), z.unknown()),
});

const annotationItemSchema = z.object({
  type: z.literal('annotation'),
  idempotency_key: idempotencyKeySchema,
  start: isoInstantSchema,
  end: isoInstantSchema,
  tz: tzSchema,
  text: z.string().min(1).max(10000),
  tags: z.array(z.string().min(1).max(60)).max(32).optional(),
});

const ingestItemSchema = z.discriminatedUnion('type', [
  sampleItemSchema,
  sessionItemSchema,
  eventItemSchema,
  annotationItemSchema,
]);

const ingestRequestSchema = z.object({
  source: sourceSchema,
  items: z.array(ingestItemSchema).min(1).max(10000),
});

// `as const satisfies` pins the Zod enum to the RejectionReason type at
// compile time — drift in either direction breaks the build.
const REJECTION_REASONS = [
  'unknown_metric',
  'invalid_value_kind',
  'schema_mismatch',
  'out_of_range',
  'missing_field',
  'invalid_timestamp',
  'catalogue_deprecated',
] as const satisfies readonly RejectionReason[];

const rejectionReasonSchema = z.enum(REJECTION_REASONS);

const itemResultSchema = z.discriminatedUnion('status', [
  z.object({
    idempotency_key: z.string(),
    status: z.literal('accepted'),
    id: z.string(),
  }),
  z.object({
    idempotency_key: z.string(),
    status: z.literal('rejected'),
    reason: rejectionReasonSchema,
    detail: z.string().optional(),
  }),
]);

const ingestResponseSchema = z.object({
  results: z.array(itemResultSchema),
});

const replayRequestSchema = z.object({
  // Admin-only field. Regular users always replay only their own data;
  // an explicit user_id here is silently ignored for non-admins.
  user_id: z.string().optional(),
  metric: z.string().optional(),
  source_integration: z.string().optional(),
  rejection_reason: rejectionReasonSchema.optional(),
  limit: z.number().int().min(1).max(10000).default(1000),
});

const replayResponseSchema = z.object({
  attempted: z.number().int(),
  promoted: z.number().int(),
  still_rejected: z.number().int(),
});

type IngestRequest = z.infer<typeof ingestRequestSchema>;
type IngestItem = z.infer<typeof ingestItemSchema>;
type SampleItem = z.infer<typeof sampleItemSchema>;
type SessionItem = z.infer<typeof sessionItemSchema>;
type EventItem = z.infer<typeof eventItemSchema>;
type AnnotationItem = z.infer<typeof annotationItemSchema>;
type IngestSource = z.infer<typeof sourceSchema>;
type ItemResult = z.infer<typeof itemResultSchema>;
type IngestResponse = z.infer<typeof ingestResponseSchema>;
type ReplayRequest = z.infer<typeof replayRequestSchema>;
type ReplayResponse = z.infer<typeof replayResponseSchema>;

z.globalRegistry.add(ingestRequestSchema, { id: 'IngestRequest' });
z.globalRegistry.add(ingestResponseSchema, { id: 'IngestResponse' });
z.globalRegistry.add(replayRequestSchema, { id: 'ReplayRequest' });
z.globalRegistry.add(replayResponseSchema, { id: 'ReplayResponse' });

export type {
  AnnotationItem,
  EventItem,
  IngestItem,
  IngestRequest,
  IngestResponse,
  IngestSource,
  ItemResult,
  ReplayRequest,
  ReplayResponse,
  SampleItem,
  SessionItem,
};
export {
  ingestItemSchema,
  ingestRequestSchema,
  ingestResponseSchema,
  itemResultSchema,
  rejectionReasonSchema,
  replayRequestSchema,
  replayResponseSchema,
};
