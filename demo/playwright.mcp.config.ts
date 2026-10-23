import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright/mcp', workers: 1, fullyParallel: false, timeout: 30_000,
  use: { headless: true, baseURL: 'http://localhost:4310' },
  webServer: [
    { command: 'node ../server/dist/index.js', url: 'http://localhost:4310/api/version', reuseExistingServer: false,
      env: { PORT: '4310', PUBLIC_ORIGIN: 'http://localhost:4310', DATA_FILE: ':memory:' } },
    { command: 'node ../server/dist/index.js', url: 'http://localhost:4311/api/version', reuseExistingServer: false,
      env: { PORT: '4311', PUBLIC_ORIGIN: 'http://localhost:4311', DATA_FILE: ':memory:', LOBBY_WAIT_MS: '1500' } },
  ],
});
