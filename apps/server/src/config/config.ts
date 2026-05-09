import { z } from 'zod/v4';

import type { Services } from '../services/services.ts';

const dialectSchema = z.enum(['sqlite', 'postgres']);

const configSchema = z
  .object({
    server: z
      .object({
        host: z.string().default('0.0.0.0'),
        port: z.coerce.number().int().min(0).max(65535).default(3000),
      })
      .default({ host: '0.0.0.0', port: 3000 }),
    database: z
      .object({
        dialect: dialectSchema.default('sqlite'),
        filename: z.string().default('./health.db'),
        url: z.string().optional(),
      })
      .default({ dialect: 'sqlite', filename: './health.db' }),
    auth: z
      .object({
        // Optional. If absent, an ephemeral secret is generated per process —
        // tokens stop working across restarts, which is fine for dev but
        // requires setting in production.
        jwtSecret: z.string().min(16).optional(),
        // Optional admin bootstrap. If both username and password are set,
        // the admin user is reconciled on every startup: created if missing,
        // password updated if it diverges, role forced to 'admin'.
        adminUsername: z.string().min(1).optional(),
        adminPassword: z.string().min(8).optional(),
      })
      .default({}),
  })
  .default({
    server: { host: '0.0.0.0', port: 3000 },
    database: { dialect: 'sqlite', filename: './health.db' },
    auth: {},
  });

type Config = z.infer<typeof configSchema>;
type Dialect = z.infer<typeof dialectSchema>;

const loadConfig = (): Config => {
  const env = process.env;
  return configSchema.parse({
    server: {
      host: env['HOST'],
      port: env['PORT'],
    },
    database: {
      dialect: env['HEALTH_DB_DIALECT'],
      filename: env['HEALTH_DB_FILENAME'],
      url: env['HEALTH_DB_URL'],
    },
    auth: {
      jwtSecret: env['JWT_SECRET'],
      adminUsername: env['ADMIN_USERNAME'],
      adminPassword: env['ADMIN_PASSWORD'],
    },
  });
};

class ConfigService {
  #config: Config;

  constructor(_services: Services) {
    this.#config = loadConfig();
  }

  get config(): Config {
    return this.#config;
  }
}

export type { Config, Dialect };
export { ConfigService };
