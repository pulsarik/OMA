import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  use: { headless: true, baseURL: 'http://localhost:5173' },
  webServer: [
    {
      command: 'node ../server/dist/index.js',
      url: 'http://localhost:4000/api/version',
      timeout: 120_000,
      reuseExistingServer: false,
      env: { DATA_FILE: ':memory:' },
    },
    {
      command: 'node client/node_modules/vite/bin/vite.js client --host localhost',
      url: 'http://localhost:5173',
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
