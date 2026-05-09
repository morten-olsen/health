import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'server',
    globals: true,
    env: {
      HEALTH_DB_DIALECT: 'sqlite',
      HEALTH_DB_FILENAME: ':memory:',
    },
  },
});
