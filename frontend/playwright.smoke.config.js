const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/smoke",
  testMatch: "**/*.spec.js",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:5500",
    headless: true,
    trace: "on-first-retry",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npx live-server --port=5500 --host=127.0.0.1 --no-browser --quiet",
    url: "http://127.0.0.1:5500/login.html",
    timeout: 60_000,
    reuseExistingServer: true
  },
  reporter: [["list"], ["html", { outputFolder: "playwright-report-smoke", open: "never" }]]
});
