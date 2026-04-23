import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["checkout.spec.js"],
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false, // Keep serial — emulators share state
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "test-results/emulator-report", open: "never" }]],
  globalSetup: "./tests/global-setup.js",
  globalTeardown: "./tests/global-teardown.js",
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry",
    storageState: "tests/.auth/user.json",
  },
  projects: [
    {
      name: "checkout",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "VITE_USE_EMULATORS=true npm run dev -- --host 127.0.0.1 --port 4174",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    timeout: 120000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
