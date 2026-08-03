import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/tests',
  testMatch: '**/*.timer.spec.ts',
  timeout: 25_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: { headless: true, baseURL: 'http://localhost:5173' },
  webServer: [
    {
      command: 'node ../server/dist/index.js',
      url: 'http://localhost:4000/api/version',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        DATA_FILE: ':memory:',
        HUMAN_TURN_MS: '3000',
        BOT_THINK_MS: '25',
      },
    },
    {
      command: 'node client/node_modules/vite/bin/vite.js client --host localhost',
      url: 'http://localhost:5173',
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
