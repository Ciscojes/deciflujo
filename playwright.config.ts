import { defineConfig, devices } from "@playwright/test";

const port = 3200;
const baseURL = `http://127.0.0.1:${port}`;
const externalDatabase = process.env.E2E_DATABASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run db:auth:migrate && npm run dev -- --webpack -p 3200",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_PROVIDER: externalDatabase ? "postgres" : "sqlite",
      DATABASE_URL: externalDatabase ?? "file:deciflujo-e2e.db",
      AUTH_DATABASE_PATH: externalDatabase ? "unused.db" : "deciflujo-e2e.db",
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET: "deciflujo-e2e-secret-with-more-than-32-characters",
      NODE_ENV: "test",
    },
  },
});
