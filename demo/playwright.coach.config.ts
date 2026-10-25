import { defineConfig } from '@playwright/test';

// Isolated ports and an in-memory server; exercise both supported table layouts.
export default defineConfig({
  testDir: './playwright/tests', testMatch: 'training-advice.spec.ts',
  timeout: 40_000, workers: 1, use: { headless: true },
  projects: [
    { name: 'legacy', use: { baseURL: 'http://localhost:5198' } },
    { name: 'oval', use: { baseURL: 'http://localhost:5199' } },
  ],
  webServer: [
    { command: 'node ../server/dist/index.js', url: 'http://localhost:4119/api/version',
      reuseExistingServer: false, env: { DATA_FILE: ':memory:', PORT: '4119' } },
    ...[false, true].map((oval, index) => ({
      command: `node client/node_modules/vite/bin/vite.js client --host localhost --port ${5198 + index} --strictPort`,
      url: `http://localhost:${5198 + index}`, reuseExistingServer: false,
      env: { VITE_SERVER_URL: 'http://localhost:4119', VITE_MOBILE_TABLE_UI: String(oval) },
    })),
  ],
});
