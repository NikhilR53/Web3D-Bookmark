import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";

const { Pool } = pg;

if (existsSync(".env")) {
  loadEnvFile();
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbConnectTimeoutMs = Number(process.env.DB_CONNECT_TIMEOUT_MS ?? 5_000);
const dbQueryTimeoutMs = Number(process.env.DB_QUERY_TIMEOUT_MS ?? 10_000);
const shouldUseSsl =
  process.env.NODE_ENV === "production" || process.env.RENDER === "true";

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl
    ? {
        rejectUnauthorized: false,
      }
    : undefined,
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
