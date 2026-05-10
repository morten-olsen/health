import { z } from 'zod/v4';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { createAuthHook } from '../auth/auth.middleware.ts';
import {
  CatalogueAliasTargetError,
  CatalogueDuplicateError,
  CatalogueSchemaError,
  CatalogueService,
} from '../catalogue/catalogue.ts';
import {
  catalogueAliasResponseSchema,
  catalogueEntryResponseSchema,
  catalogueKindSchema,
  catalogueNamespaceSchema,
  createAliasInputSchema,
  createCustomEntrySchema,
} from '../catalogue/catalogue.schemas.ts';
import type { Services } from '../services/services.ts';

const errorSchema = z.object({ error: z.string() });

const listQuerySchema = z.object({
  namespace: catalogueNamespaceSchema.optional(),
  kind: catalogueKindSchema.optional(),
});

const registerListRoute = (fastify: Parameters<FastifyPluginAsyncZod>[0], catalogue: CatalogueService): void => {
  fastify.route({
    method: 'GET',
    url: '/catalogue',
    schema: {
      querystring: listQuerySchema,
      response: { 200: z.object({ entries: z.array(catalogueEntryResponseSchema) }) },
    },
    handler: async (req) => ({ entries: await catalogue.list(req.query, req.user.sub) }),
  });
};

const registerListAliasesRoute = (fastify: Parameters<FastifyPluginAsyncZod>[0], catalogue: CatalogueService): void => {
  fastify.route({
    method: 'GET',
    url: '/catalogue/aliases',
    schema: { response: { 200: z.object({ aliases: z.array(catalogueAliasResponseSchema) }) } },
    handler: async (req) => ({ aliases: await catalogue.listAliases(req.user.sub) }),
  });
};

const registerGetRoute = (fastify: Parameters<FastifyPluginAsyncZod>[0], catalogue: CatalogueService): void => {
  fastify.route({
    method: 'GET',
    url: '/catalogue/:id',
    schema: {
      params: z.object({ id: z.string().min(1) }),
      response: { 200: catalogueEntryResponseSchema, 404: errorSchema },
    },
    handler: async (req, reply) => {
      const entry = await catalogue.get(req.params.id, req.user.sub);
      if (!entry) {
        return reply.code(404).send({ error: `Catalogue entry "${req.params.id}" not found` });
      }
      return entry;
    },
  });
};

const registerCreateCustomRoute = (
  fastify: Parameters<FastifyPluginAsyncZod>[0],
  catalogue: CatalogueService,
): void => {
  fastify.route({
    method: 'POST',
    url: '/catalogue/custom',
    schema: {
      body: createCustomEntrySchema,
      response: { 201: catalogueEntryResponseSchema, 400: errorSchema, 409: errorSchema },
    },
    handler: async (req, reply) => {
      try {
        const entry = await catalogue.createCustomEntry(req.body, req.user.sub);
        return reply.code(201).send(entry);
      } catch (err) {
        if (err instanceof CatalogueSchemaError) {
          return reply.code(400).send({ error: err.message });
        }
        if (err instanceof CatalogueDuplicateError) {
          return reply.code(409).send({ error: err.message });
        }
        throw err;
      }
    },
  });
};

const registerCreateAliasRoute = (fastify: Parameters<FastifyPluginAsyncZod>[0], catalogue: CatalogueService): void => {
  fastify.route({
    method: 'POST',
    url: '/catalogue/aliases',
    schema: {
      body: createAliasInputSchema,
      response: { 201: catalogueAliasResponseSchema, 404: errorSchema, 409: errorSchema },
    },
    handler: async (req, reply) => {
      try {
        const alias = await catalogue.createAlias(req.body, req.user.sub);
        return reply.code(201).send(alias);
      } catch (err) {
        if (err instanceof CatalogueAliasTargetError) {
          return reply.code(404).send({ error: err.message });
        }
        if (err instanceof CatalogueDuplicateError) {
          return reply.code(409).send({ error: err.message });
        }
        throw err;
      }
    },
  });
};

const createCatalogueRoutes =
  (services: Services): FastifyPluginAsyncZod =>
  async (fastify) => {
    const catalogue = services.get(CatalogueService);
    // All catalogue endpoints (read and write) require authentication. The
    // catalogue is per-user — there's no anonymous view.
    fastify.addHook('onRequest', createAuthHook(services));

    registerListRoute(fastify, catalogue);
    registerListAliasesRoute(fastify, catalogue);
    registerGetRoute(fastify, catalogue);
    registerCreateCustomRoute(fastify, catalogue);
    registerCreateAliasRoute(fastify, catalogue);
  };

export { createCatalogueRoutes };
