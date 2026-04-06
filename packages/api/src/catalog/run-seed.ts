import { CatalogService } from "./catalog.js";
import { seedMetrics } from "./seed.js";

import type { Services } from "../services/services.js";

const runSeed = async (services: Services): Promise<void> => {
  const catalog = services.get(CatalogService);

  for (const metric of seedMetrics) {
    const exists = await catalog.exists(metric.slug);
    if (exists) continue;
    await catalog.create(metric);
    console.log(`Seeded metric "${metric.slug}"`);
  }
};

export { runSeed };
