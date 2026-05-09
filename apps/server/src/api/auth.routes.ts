import { z } from 'zod/v4';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

import { AuthService, InvalidCredentialsError } from '../auth/auth.ts';
import { createAuthHook } from '../auth/auth.middleware.ts';
import { loginInputSchema, loginResponseSchema, userResponseSchema } from '../auth/auth.schemas.ts';
import type { Services } from '../services/services.ts';

const errorSchema = z.object({ error: z.string() });

const createAuthRoutes =
  (services: Services): FastifyPluginAsyncZod =>
  async (fastify) => {
    const auth = services.get(AuthService);
    const authenticate = createAuthHook(services);

    fastify.route({
      method: 'POST',
      url: '/auth/login',
      schema: {
        body: loginInputSchema,
        response: { 200: loginResponseSchema, 401: errorSchema },
      },
      handler: async (req, reply) => {
        try {
          const { user, token } = await auth.login(req.body.username, req.body.password);
          return { token, user: auth.toResponse(user) };
        } catch (err) {
          if (err instanceof InvalidCredentialsError) {
            return reply.code(401).send({ error: 'Invalid username or password' });
          }
          throw err;
        }
      },
    });

    fastify.route({
      method: 'GET',
      url: '/auth/me',
      onRequest: authenticate,
      schema: {
        response: { 200: userResponseSchema, 401: errorSchema, 404: errorSchema },
      },
      handler: async (req, reply) => {
        const user = await auth.getUserById(req.user.sub);
        if (!user) {
          return reply.code(404).send({ error: 'User no longer exists' });
        }
        return auth.toResponse(user);
      },
    });
  };

export { createAuthRoutes };
