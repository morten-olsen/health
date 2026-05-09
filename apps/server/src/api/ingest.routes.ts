import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { createAuthHook } from '../auth/auth.middleware.ts';
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
    const authenticate = createAuthHook(services);

    fastify.route({
      method: 'POST',
      url: '/ingest',
      onRequest: authenticate,
      schema: {
        body: ingestRequestSchema,
        response: { 200: ingestResponseSchema },
      },
      handler: async (req) => {
        const results = await ingest.ingest(req.body, req.user.sub);
        return { results };
      },
    });

    fastify.route({
      method: 'POST',
      url: '/replay',
      onRequest: authenticate,
      schema: {
        body: replayRequestSchema,
        response: { 200: replayResponseSchema },
      },
      handler: async (req) => {
        // Regular users implicitly scope to their own user_id; admin can pass
        // an explicit user_id (or omit to span all users).
        const userId = req.user.role === 'admin' ? req.body.user_id : req.user.sub;
        return ingest.replay(req.body, userId);
      },
    });
  };

export { createIngestRoutes };
