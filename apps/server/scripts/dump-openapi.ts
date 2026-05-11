// Dumps the live OpenAPI spec to apps/server/openapi.json. The spec is the
// integration contract — gb-ingest (and any other client) generates its
// typed wire bindings from this file. Run via `task openapi:dump`.

import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from '../src/app.ts';

const outFile = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'openapi.json');

const app = await createApp({ logger: false });
try {
  await app.server.ready();
  const spec = app.server.swagger();
  await writeFile(outFile, `${JSON.stringify(spec, null, 2)}\n`);
  console.log(`Wrote ${outFile}`);
} finally {
  await app.stop();
}
