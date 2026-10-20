import { createApp } from "./app.js";
import { config, requireRuntimeConfig } from "./config/env.js";
import { closePool } from "./db/pool.js";

requireRuntimeConfig();

const app = await createApp();

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`LINE OA Sender listening on port ${config.port}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down gracefully`);

  server.close(async (error) => {
    if (error) console.error("HTTP server shutdown error", error);
    try {
      await closePool();
      process.exit(error ? 1 : 0);
    } catch (closeError) {
      console.error("Database pool shutdown error", closeError);
      process.exit(1);
    }
  });
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
