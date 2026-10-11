const { defineConfig, devices } = require("@playwright/test");
const dotenv = require("dotenv");
const path = require("path");

// Load test environment variables from .env.test
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const PORT = Number(process.env.VITE_PORT || 5174);
const BASE_URL = `http://localhost:${PORT}`;

module.exports = defineConfig({
  testDir: "./e2e",
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: "./e2e/test-results",
  reporter: [["list"], ["html", { open: "never" }]],

  // Automatic isolated database setup before tests run
  globalSetup: "./e2e/global-setup.cjs",
  globalTeardown: "./e2e/global-teardown.cjs",

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Automatically start test backend and client servers if not already running
  webServer: [
    {
      command: "bun --env-file=.env.test run --cwd server dev",
      url: "http://localhost:5001/api/health",
      reuseExistingServer: true,
      timeout: 60 * 1000,
    },
    {
      command: "bun --env-file=.env.test run --cwd client dev",
      url: BASE_URL,
      reuseExistingServer: true,
      timeout: 60 * 1000,
    },
  ],
});
