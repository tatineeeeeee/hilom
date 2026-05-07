import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/env.ts", "tests/setup.ts"],
    globals: true,
    pool: "forks",
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    clearMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/db/seed*.ts",
        "src/db/schema.ts",
        "src/index.ts",
        "src/types/**",
        "src/config/logger.ts",
      ],
      reporter: ["text-summary", "lcov", "json-summary"],
      reportsDirectory: "coverage",
    },
  },
});
