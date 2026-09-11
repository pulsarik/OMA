import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/mobile-oval',
  timeout: 30_000,
  workers: 1,
  use: { baseURL: 'http://localhost:5187', headless: true, viewport: { width: 390, height: 844 } },
  webServer: [
    { command: 'node ../server/dist/index.js', url: 'http://localhost:4000/api/version', reuseExistingServer: true, env: { DATA_FILE: ':memory:' } },
    { command: 'npm.cmd --prefix client run dev -- --host localhost --port 5187 --strictPort', url: 'http://localhost:5187', reuseExistingServer: false, env: { VITE_MOBILE_TABLE_UI: 'true' } },
  ],
});
