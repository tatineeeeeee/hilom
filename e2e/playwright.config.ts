import { defineConfig, devices } from "@playwright/test";

const PORT_CLIENT = process.env.E2E_CLIENT_PORT ?? "5174";
const PORT_SERVER = process.env.E2E_SERVER_PORT ?? "4001";

const BASE_URL = `http://localhost:${PORT_CLIENT}`;

export default defineConfig({
  testDir: "./specs",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html"], ["github"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : [
        {
          command: `cross-env PORT=${PORT_SERVER} NODE_ENV=test bun run --filter server dev`,
          url: `http://localhost:${PORT_SERVER}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          cwd: "..",
        },
        {
          command: `cross-env VITE_API_URL=http://localhost:${PORT_SERVER}/api VITE_SOCKET_URL=http://localhost:${PORT_SERVER} bun run --filter client dev -- --port ${PORT_CLIENT}`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          cwd: "..",
        },
      ],
});
