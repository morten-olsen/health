import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import type { Services } from '../services/services.ts';

import { createCatalogueRoutes } from './catalogue.routes.ts';
import { healthRoute } from './health.routes.ts';
import { createIngestRoutes } from './ingest.routes.ts';

const registerRoutes = async (fastify: Parameters<FastifyPluginAsyncZod>[0], services: Services): Promise<void> => {
  await fastify.register(
    async (api) => {
      await api.register(healthRoute);
      await api.register(createCatalogueRoutes(services));
      await api.register(createIngestRoutes(services));
    },
    { prefix: '/api' },
  );
};

export { registerRoutes };
