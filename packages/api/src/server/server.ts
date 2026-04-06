import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import scalarPlugin from "@scalar/fastify-api-reference";
import { z } from "zod";
import {
  rawRecordInputSchema,
  metricSampleBatchInputSchema,
  sessionInputSchema,
  eventInputSchema,
  metricQuerySchema,
  metricCatalogEntrySchema,
} from "@morten-olsen/health-contracts";

import type { Services } from "../services/services.js";
import { IngestService, MetricNotInCatalogError } from "../ingest/ingest.js";
import { CatalogService } from "../catalog/catalog.js";
import { EventService } from "../events/events.js";
import { QueryService } from "../query/query.js";

const createServer = (services: Services) => {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Health Data Aggregation API",
        description: "Personal health data ingest, query, and resolution API",
        version: "0.0.1",
      },
    },
    transform: jsonSchemaTransform,
  });

  app.register(scalarPlugin, {
    routePrefix: "/docs",
  });

  // All routes inside a plugin so swagger captures them
  app.register((instance, _opts, done) => {
    const api = instance.withTypeProvider<ZodTypeProvider>();

    // ── Catalog ───────────────────────────────────────────────────────────

    api.get("/catalog", {
      schema: {
        response: {
          200: z.array(metricCatalogEntrySchema),
        },
      },
      handler: async () => {
        const catalog = services.get(CatalogService);
        return catalog.getAll();
      },
    });

    api.post("/catalog", {
      schema: {
        body: metricCatalogEntrySchema,
        response: {
          201: metricCatalogEntrySchema,
        },
      },
      handler: async (request, reply) => {
        const catalog = services.get(CatalogService);
        const entry = await catalog.create(request.body);
        return reply.status(201).send(entry);
      },
    });

    // ── Ingest ────────────────────────────────────────────────────────────

    api.post("/ingest/raw", {
      schema: {
        body: rawRecordInputSchema,
        response: {
          201: z.object({ id: z.string() }),
        },
      },
      handler: async (request, reply) => {
        const ingest = services.get(IngestService);
        const result = await ingest.ingestRaw(request.body);
        return reply.status(201).send(result);
      },
    });

    api.post("/ingest/metrics", {
      schema: {
        body: metricSampleBatchInputSchema,
        response: {
          201: z.object({ count: z.number() }),
          422: z.object({ error: z.string(), slug: z.string() }),
        },
      },
      handler: async (request, reply) => {
        const ingest = services.get(IngestService);
        try {
          const result = await ingest.ingestMetrics(request.body);
          return reply.status(201).send(result);
        } catch (error) {
          if (error instanceof MetricNotInCatalogError) {
            return reply.status(422).send({ error: error.message, slug: error.slug });
          }
          throw error;
        }
      },
    });

    api.post("/ingest/sessions", {
      schema: {
        body: sessionInputSchema,
        response: {
          201: z.object({ id: z.string() }),
          422: z.object({ error: z.string(), slug: z.string() }),
        },
      },
      handler: async (request, reply) => {
        const ingest = services.get(IngestService);
        try {
          const result = await ingest.ingestSession(request.body);
          return reply.status(201).send(result);
        } catch (error) {
          if (error instanceof MetricNotInCatalogError) {
            return reply.status(422).send({ error: error.message, slug: error.slug });
          }
          throw error;
        }
      },
    });

    // ── Events ────────────────────────────────────────────────────────────

    api.post("/events", {
      schema: {
        body: eventInputSchema,
        response: {
          201: z.object({ id: z.string() }),
        },
      },
      handler: async (request, reply) => {
        const events = services.get(EventService);
        const result = await events.create(request.body);
        return reply.status(201).send(result);
      },
    });

    api.get("/events", {
      schema: {
        querystring: z.object({
          category: z.string().optional(),
          from: z.string().datetime(),
          to: z.string().datetime(),
        }),
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              time: z.string(),
              category: z.string(),
              label: z.string(),
              metadata: z.unknown(),
            }),
          ),
        },
      },
      handler: async (request) => {
        const events = services.get(EventService);
        return events.query(request.query);
      },
    });

    // ── Query ─────────────────────────────────────────────────────────────

    api.get("/query/metrics", {
      schema: {
        querystring: metricQuerySchema,
        response: {
          200: z.array(
            z.object({
              time: z.string(),
              metricSlug: z.string(),
              source: z.string(),
              valueNumeric: z.number().nullable(),
              valueJson: z.unknown().nullable(),
              valueBoolean: z.boolean().nullable(),
              metadata: z.unknown().nullable(),
            }),
          ),
        },
      },
      handler: async (request) => {
        const query = services.get(QueryService);
        return query.queryMetrics(request.query);
      },
    });

    api.get("/query/sessions", {
      schema: {
        querystring: z.object({
          type: z.string().optional(),
          from: z.string().datetime(),
          to: z.string().datetime(),
        }),
        response: {
          200: z.array(
            z.object({
              id: z.string(),
              type: z.string(),
              source: z.string(),
              startTime: z.string(),
              endTime: z.string(),
              metadata: z.unknown().nullable(),
            }),
          ),
        },
      },
      handler: async (request) => {
        const query = services.get(QueryService);
        return query.querySessions(request.query);
      },
    });

    done();
  });

  return app;
};

export { createServer };
