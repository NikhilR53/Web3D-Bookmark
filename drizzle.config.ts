import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";
import dotenv from "dotenv";

if (existsSync(".env")) {
  dotenv.config();
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
