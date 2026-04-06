import { Services } from "./services/services.js";
import { createServer } from "./server/server.js";

const main = async (): Promise<void> => {
  const services = new Services();
  const app = createServer(services);

  const port = Number(process.env["PORT"] ?? 3007);
  const host = process.env["HOST"] ?? "0.0.0.0";

  await app.listen({ port, host });

  const shutdown = async (): Promise<void> => {
    await app.close();
    await services.destroy();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

main();
