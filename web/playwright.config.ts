import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'src/tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
