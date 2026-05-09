import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { IngestService } from '../ingest/ingest.ts';
import {
  ingestRequestSchema,
  ingestResponseSchema,
  replayRequestSchema,
  replayResponseSchema,
} from '../ingest/ingest.schemas.ts';
import type { Services } from '../services/services.ts';

const createIngestRoutes =
  (services: Services): FastifyPluginAsyncZod =>
  async (fastify) => {
    const ingest = services.get(IngestService);

    fastify.route({
      method: 'POST',
      url: '/ingest',
      schema: {
        body: ingestRequestSchema,
        response: {
          200: ingestResponseSchema,
        },
      },
      handler: async (req) => {
        const results = await ingest.ingest(req.body);
        return { results };
      },
    });

    fastify.route({
      method: 'POST',
      url: '/replay',
      schema: {
        body: replayRequestSchema,
        response: {
          200: replayResponseSchema,
        },
      },
      handler: async (req) => {
        return ingest.replay(req.body);
      },
    });
  };

export { createIngestRoutes };
