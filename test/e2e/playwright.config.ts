import {defineConfig} from '@playwright/test';
import path from 'node:path';

// eslint-disable-next-line no-restricted-syntax
export default defineConfig({
  testDir: __dirname,
  testMatch: '**/*.e2e.ts',
  outputDir: path.resolve(__dirname, '../../test-results'),
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30000,
  reporter: [
    ['list'],
    ['html', {outputFolder: 'playwright-report', open: 'never'}],
  ],
  use: {
    browserName: 'chromium',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    baseURL: 'http://127.0.0.1:5174',
    viewport: {width: 1000, height: 700},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'node --import tsx test/e2e/start-server.ts',
      cwd: path.resolve(__dirname, '../..'),
      // Playwright accepts 400 as ready; this read-only request validates ID 0.
      url: 'http://127.0.0.1:3100/api/users/0/planets/1',
      reuseExistingServer: false,
      timeout: 60000,
    },
    {
      command:
        'node node_modules/vite/bin/vite.js client --config test/e2e/vite.config.ts',
      cwd: path.resolve(__dirname, '../..'),
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
