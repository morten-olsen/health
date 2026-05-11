import { z } from 'zod/v4';

const highWaterMarkSchema = z.object({
  source_integration: z.string(),
  source_device: z.string(),
  metric: z.string(),
  latest_at: z.string(),
});

const syncLatestQuerySchema = z.object({
  source_integration: z.string().min(1).max(100).optional(),
  source_device: z.string().min(1).max(100).optional(),
});

const syncLatestResponseSchema = z.object({
  samples: z.array(highWaterMarkSchema),
  events: z.array(highWaterMarkSchema),
  sessions: z.array(highWaterMarkSchema),
});

type HighWaterMark = z.infer<typeof highWaterMarkSchema>;
type SyncLatestQuery = z.infer<typeof syncLatestQuerySchema>;
type SyncLatestResponse = z.infer<typeof syncLatestResponseSchema>;

z.globalRegistry.add(highWaterMarkSchema, { id: 'HighWaterMark' });
z.globalRegistry.add(syncLatestResponseSchema, { id: 'SyncLatest' });

export type { HighWaterMark, SyncLatestQuery, SyncLatestResponse };
export { highWaterMarkSchema, syncLatestQuerySchema, syncLatestResponseSchema };
