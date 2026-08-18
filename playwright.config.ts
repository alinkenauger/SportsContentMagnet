import { defineConfig, devices } from "@playwright/test";

const testBaseUrl = process.env.VIDMAGNET_TEST_URL?.replace(/\/$/, "") || "http://127.0.0.1:4176";
const testPort = new URL(testBaseUrl).port || "4176";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["line"], ["html", { outputFolder: "test-results/html", open: "never" }]],
  outputDir: "test-results/artifacts",
  preserveOutput: "always",
  use: {
    baseURL: testBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        channel: "chrome",
        viewport: { width: 375, height: 812 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `VITE_STRIPE_PUBLIC_KEY=pk_test_vidmagnet npm exec vite -- --host 127.0.0.1 --port ${testPort}`,
    url: testBaseUrl,
    // Never attach release tests to an arbitrary process that happens to own the port.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
