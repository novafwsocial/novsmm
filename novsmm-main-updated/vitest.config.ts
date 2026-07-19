import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    // Use the src/__tests__ directory for test files
    include: ["src/__tests__/**/*.test.ts"],
    // Don't run tests in parallel (they share a DB)
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    // Timeout for async tests (DB operations can be slow)
    testTimeout: 30_000,
    // Setup files
    setupFiles: ["src/__tests__/setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
