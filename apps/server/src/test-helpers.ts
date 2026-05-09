// Set env vars BEFORE any imports that read config. Vitest's per-project env
// config is unreliable in workspace mode, so we set process.env directly.
process.env['HEALTH_DB_DIALECT'] = 'sqlite';
process.env['HEALTH_DB_FILENAME'] = ':memory:';
process.env['JWT_SECRET'] = 'test-jwt-secret-do-not-use-in-production';
process.env['ADMIN_USERNAME'] = 'admin';
process.env['ADMIN_PASSWORD'] = 'admin-password';

import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';

import { createApp } from './app.ts';
import { AuthService } from './auth/auth.ts';
import type { UserRole } from './database/database.types.ts';
import type { Services } from './services/services.ts';

type AuthedUser = {
  id: string;
  username: string;
  token: string;
  headers: { authorization: string };
};

type TestContext = {
  server: FastifyInstance;
  services: Services;
  stop: () => Promise<void>;
  inject: (opts: InjectOptions) => Promise<LightMyRequestResponse>;
  loginAdmin: () => Promise<AuthedUser>;
  createUser: (username: string, password: string, role?: UserRole) => Promise<AuthedUser>;
};

const createTestApp = async (): Promise<TestContext> => {
  const app = await createApp({ logger: false });

  const inject = (opts: InjectOptions): Promise<LightMyRequestResponse> => app.server.inject(opts);

  const login = async (username: string, password: string): Promise<AuthedUser> => {
    const res = await inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username, password },
    });
    if (res.statusCode !== 200) {
      throw new Error(`Login failed for ${username}: ${res.statusCode} ${res.body}`);
    }
    const body = JSON.parse(res.body) as { token: string; user: { id: string; username: string } };
    return {
      id: body.user.id,
      username: body.user.username,
      token: body.token,
      headers: { authorization: `Bearer ${body.token}` },
    };
  };

  const createUser = async (username: string, password: string, role: UserRole = 'user'): Promise<AuthedUser> => {
    await app.services.get(AuthService).createUser({ username, password, role });
    return login(username, password);
  };

  const loginAdmin = async (): Promise<AuthedUser> => login('admin', 'admin-password');

  return {
    server: app.server,
    services: app.services,
    stop: app.stop,
    inject,
    loginAdmin,
    createUser,
  };
};

export type { AuthedUser, TestContext };
export { createTestApp };
