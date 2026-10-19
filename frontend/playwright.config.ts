import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Use the locally installed Chrome so no browser download is needed
    channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
  },
  projects: [
    // Logs in once and saves the session for the authenticated specs
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "public",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome" },
    },
    {
      name: "desktop",
      testIgnore: [/public\.spec\.ts/, /mobile\.spec\.ts/, /auth\.setup\.ts/],
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
        viewport: { width: 1280, height: 800 },
        storageState: "e2e/.auth/user.json",
      },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        viewport: { width: 375, height: 812 },
        hasTouch: true,
        isMobile: true,
        channel: process.env.E2E_BROWSER_CHANNEL ?? "chrome",
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
