import fastifySwagger from '@fastify/swagger';
import scalarReference from '@scalar/fastify-api-reference';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { registerRoutes } from './api/api.ts';
import { ConfigService } from './config/config.ts';
import { Services } from './services/services.ts';

type App = {
  server: FastifyInstance;
  services: Services;
  start: () => Promise<void>;
  stop: () => Promise<void>;
};

type CreateAppOptions = {
  logger?: boolean;
  services?: Services;
};

const createApp = async ({ logger = true, services }: CreateAppOptions = {}): Promise<App> => {
  const container = services ?? new Services();
  const { server: serverConfig } = container.get(ConfigService).config;

  const fastify = Fastify({
    logger: logger ? { level: 'info' } : false,
  }).withTypeProvider<ZodTypeProvider>();

  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  fastify.setErrorHandler((err, _req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send({ error: 'Validation Error', details: err.validation });
    }
    fastify.log.error(err);
    return reply.code(500).send({ error: 'Internal Server Error' });
  });

  await fastify.register(fastifySwagger, {
    openapi: {
      info: { title: 'Health Platform API', version: '0.0.1' },
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(scalarReference, { routePrefix: '/api/docs' });

  await registerRoutes(fastify, container);

  const start = async (): Promise<void> => {
    await fastify.listen({ host: serverConfig.host, port: serverConfig.port });
  };

  const stop = async (): Promise<void> => {
    await fastify.close();
    await container.destroy();
  };

  return { server: fastify, services: container, start, stop };
};

export type { App, CreateAppOptions };
export { createApp };
