import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

if (existsSync(".env")) {
  loadEnvFile();
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

function parsePositiveMs(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const dbConnectTimeoutMs = parsePositiveMs(
  process.env.DB_CONNECT_TIMEOUT_MS,
  5_000,
);
const dbQueryTimeoutMs = parsePositiveMs(
  process.env.DB_QUERY_TIMEOUT_MS,
  10_000,
);
export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: dbConnectTimeoutMs,
  query_timeout: dbQueryTimeoutMs,
  statement_timeout: dbQueryTimeoutMs,
  keepAlive: true,
});

export const db = drizzle(pool, { schema });

export async function assertDatabaseConnection() {
  const startedAt = Date.now();
  await pool.query("SELECT 1");
  const elapsedMs = Date.now() - startedAt;
  console.log(`[db] Connectivity check passed in ${elapsedMs}ms`);
}
