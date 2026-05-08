import { ensureSchema } from "../server/db/schema.js";
import { closePool } from "../server/db/pool.js";

await ensureSchema();
await closePool();
console.log("Database schema is ready.");
