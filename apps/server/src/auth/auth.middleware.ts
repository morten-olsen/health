import type { FastifyReply, FastifyRequest, onRequestHookHandler } from 'fastify';

import type { Services } from '../services/services.ts';

import { AuthService, InvalidTokenError } from './auth.ts';
import type { TokenPayload } from './auth.ts';

declare module 'fastify' {
  // Module augmentation requires `interface`, not `type`.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface FastifyRequest {
    user: TokenPayload;
  }
}

const sendUnauthorized = (reply: FastifyReply, message: string): FastifyReply =>
  reply.code(401).send({ error: message });

const createAuthHook =
  (services: Services): onRequestHookHandler =>
  async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return sendUnauthorized(reply, 'Missing Bearer token');
    }
    const token = header.slice(7).trim();
    if (!token) {
      return sendUnauthorized(reply, 'Empty Bearer token');
    }
    try {
      req.user = await services.get(AuthService).verifyToken(token);
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        return sendUnauthorized(reply, err.message);
      }
      throw err;
    }
    return undefined;
  };

export { createAuthHook };
