import { z } from 'zod/v4';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { createAuthHook } from '../auth/auth.middleware.ts';
import { DeviceAlreadyExistsError, DevicesService } from '../devices/devices.ts';
import {
  deviceListResponseSchema,
  deviceResponseSchema,
  errorResponseSchema,
  registerDeviceInputSchema,
  updateDeviceInputSchema,
} from '../devices/devices.schemas.ts';
import type { Services } from '../services/services.ts';

const deviceIdParamsSchema = z.object({ id: z.string().min(1) });

const createDevicesRoutes =
  (services: Services): FastifyPluginAsyncZod =>
  async (fastify) => {
    const devices = services.get(DevicesService);
    const authenticate = createAuthHook(services);

    fastify.route({
      method: 'GET',
      url: '/devices',
      onRequest: authenticate,
      schema: {
        response: { 200: deviceListResponseSchema },
      },
      handler: async (req) => ({ devices: await devices.listForUser(req.user.sub) }),
    });

    fastify.route({
      method: 'POST',
      url: '/devices',
      onRequest: authenticate,
      schema: {
        body: registerDeviceInputSchema,
        response: { 201: deviceResponseSchema, 409: errorResponseSchema },
      },
      handler: async (req, reply) => {
        try {
          const created = await devices.register({
            userId: req.user.sub,
            integration: req.body.integration,
            deviceId: req.body.device_id,
            name: req.body.name,
          });
          return reply.code(201).send(created);
        } catch (err) {
          if (err instanceof DeviceAlreadyExistsError) {
            return reply.code(409).send({ error: err.message });
          }
          throw err;
        }
      },
    });

    fastify.route({
      method: 'PATCH',
      url: '/devices/:id',
      onRequest: authenticate,
      schema: {
        params: deviceIdParamsSchema,
        body: updateDeviceInputSchema,
        response: { 200: deviceResponseSchema, 404: errorResponseSchema },
      },
      handler: async (req, reply) => {
        const updated = await devices.updateName(req.user.sub, req.params.id, req.body.name);
        if (!updated) {
          return reply.code(404).send({ error: 'Device not found' });
        }
        return updated;
      },
    });
  };

export { createDevicesRoutes };
