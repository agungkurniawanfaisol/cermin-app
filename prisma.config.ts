import { config } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

config({ path: resolve(process.cwd(), ".env.local") });
config();

/**
 * Prisma 7: connection URLs live here (not in schema.prisma).
 * Prefer DIRECT_URL for migrate/CLI against Supabase; fall back to DATABASE_URL.
 * Placeholder allows `prisma generate` / offline migrate diff without a live DB.
 */
const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/cermin?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
});
