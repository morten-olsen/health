// Set env vars BEFORE any imports that read config. Vitest's per-project env
// config is unreliable in workspace mode, so we set process.env directly.
process.env['HEALTH_DB_DIALECT'] = 'sqlite';
process.env['HEALTH_DB_FILENAME'] = ':memory:';

import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';

import { createApp } from './app.ts';
import type { Services } from './services/services.ts';

type TestContext = {
  server: FastifyInstance;
  services: Services;
  stop: () => Promise<void>;
  inject: (opts: InjectOptions) => Promise<LightMyRequestResponse>;
};

const createTestApp = async (): Promise<TestContext> => {
  const app = await createApp({ logger: false });
  return {
    server: app.server,
    services: app.services,
    stop: app.stop,
    inject: (opts) => app.server.inject(opts),
  };
};

export type { TestContext };
export { createTestApp };
