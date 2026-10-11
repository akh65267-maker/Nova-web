import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the real backend (the Docker stack in the TaskManager repo), not
// mocks, for the same reason as the shop's: what they exist to catch is the frontend and the
// gateway disagreeing. Start that stack first; these tests do not.
//
// Port 3200 is not incidental. The gateway only answers browsers on the origins listed in its
// Cors:AllowedOrigins (deploy/docker-compose.yml): 3100 for the shop, 3200 for this app.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3200";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
