import { defineConfig } from '@playwright/test';

// Test generated HTML through the same Express static routing used on Render.
export default defineConfig({
  testDir: './playwright/tests', testMatch: 'seo.spec.ts', workers: 1,
  timeout: 30_000, use: { headless: true, baseURL: 'http://localhost:4000' },
  webServer: { command: 'node ../server/dist/index.js', url: 'http://localhost:4000/api/version',
    reuseExistingServer: false, timeout: 120_000,
    env: { DATA_FILE: ':memory:', PORT: '4000' } },
});
