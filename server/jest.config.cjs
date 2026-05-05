/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.test.json",
      },
    ],
  },
  testTimeout: 10000,
  clearMocks: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/db/seed*.ts",
    "!src/db/schema.ts",
    "!src/index.ts",
    "!src/types/**",
    "!src/config/logger.ts",
  ],
  coverageReporters: ["text-summary", "lcov", "json-summary"],
  coverageDirectory: "<rootDir>/coverage",
  // No coverage gate yet — measure with `bun run --filter server test:coverage`
  // first, then ratchet from the measured floor. See CONTRIBUTING.md.
};
