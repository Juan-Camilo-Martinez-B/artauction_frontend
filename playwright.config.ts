import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3000',
  },
  webServer: {
    command: 'npm run start -- --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env['CI'],
  },
});
