import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { createAuthHook } from '../auth/auth.middleware.ts';
import type { Services } from '../services/services.ts';
import { SyncService } from '../sync/sync.ts';
import { syncLatestQuerySchema, syncLatestResponseSchema } from '../sync/sync.schemas.ts';

const createSyncRoutes =
  (services: Services): FastifyPluginAsyncZod =>
  async (fastify) => {
    const sync = services.get(SyncService);
    const authenticate = createAuthHook(services);

    fastify.route({
      method: 'GET',
      url: '/sync/latest',
      onRequest: authenticate,
      schema: {
        querystring: syncLatestQuerySchema,
        response: { 200: syncLatestResponseSchema },
      },
      handler: async (req) => sync.latest(req.user.sub, req.query),
    });
  };

export { createSyncRoutes };
