import pg from "pg";
import { config } from "../config/env.js";

let pool;

export function getPool() {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
