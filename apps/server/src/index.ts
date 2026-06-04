import { buildApp } from "./app.js";
import { connectDB, disconnectDB } from "./db/client.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";

async function main() {
  // DB connection before opening the port — fail fast if DB is unreachable.
  await connectDB();

  const app = buildApp();

  const address = await app.listen({ port: env.PORT, host: "0.0.0.0" });
  logger.info(`Server listening at ${address}`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    await app.close();
    await disconnectDB();
    process.exit(0);
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error({ err }, "Fatal startup error");
  process.exit(1);
});
