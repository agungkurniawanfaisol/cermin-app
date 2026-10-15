import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: false,
    passWithNoTests: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    environment: "node",
    environmentMatchGlobs: [
      ["tests/components/**", "jsdom"],
      ["tests/**/*.component.test.{ts,tsx}", "jsdom"],
    ],
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
