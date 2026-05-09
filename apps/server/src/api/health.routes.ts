import { z } from 'zod/v4';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const healthRoute: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    method: 'GET',
    url: '/health',
    schema: {
      response: {
        200: z.object({ status: z.literal('ok') }),
      },
    },
    handler: async () => ({ status: 'ok' as const }),
  });
};

export { healthRoute };
