import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against the real backend (the Docker stack in the
// TaskManager repo), not mocks: what they exist to catch is the frontend and
// the gateway disagreeing, which a mocked API cannot show. Start that stack
// first; these tests do not.
//
// Port 3100 is not incidental. The gateway's CORS policy allows
// http://localhost:3100 by default, so the app must be served from exactly
// that origin or every API call is blocked in the browser.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  // Checkout goes through the async saga, so give each test room beyond the
  // default 30s without letting a genuinely stuck order hang the run.
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
    command: "npm run dev -- --port 3100",
    url: baseURL,
    // Reuses a dev server that is already running on 3100, which is the
    // normal case while developing against the stack.
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
