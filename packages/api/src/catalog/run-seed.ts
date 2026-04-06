import { Services } from "../services/services.js";
import { CatalogService } from "./catalog.js";
import { seedMetrics } from "./seed.js";

const run = async (): Promise<void> => {
  const services = new Services();
  const catalog = services.get(CatalogService);

  for (const metric of seedMetrics) {
    const exists = await catalog.exists(metric.slug);
    if (exists) {
      console.log(`Skipping "${metric.slug}" (already exists)`);
      continue;
    }
    await catalog.create(metric);
    console.log(`Created "${metric.slug}"`);
  }

  await services.destroy();
};

run();
