import { createApp } from "./app.js";
import { config, requireRuntimeConfig } from "./config/env.js";

requireRuntimeConfig();

const app = await createApp();

app.listen(config.port, "0.0.0.0", () => {
  console.log(`LINE OA Sender listening on port ${config.port}`);
});
