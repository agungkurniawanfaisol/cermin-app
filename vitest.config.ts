import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
    env: {
      // Pure policy unit tests import access.ts which loads prisma at module init.
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://test:test@127.0.0.1:5432/cermin_test",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
