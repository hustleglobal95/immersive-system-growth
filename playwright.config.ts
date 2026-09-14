import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  failOnFlakyTests: !!process.env.CI,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: process.env.HELIOT_STATIC ? "node scripts/serve-heliot.mjs" : "npm run start -- --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
          args: [
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
            "--in-process-gpu",
            "--enable-webgl",
            "--ignore-gpu-blocklist",
          ],
        },
      },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
