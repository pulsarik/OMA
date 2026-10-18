import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testDir: './playwright/lobby-expiry',
  webServer: [
    {
      command: 'node ../server/dist/index.js', url: 'http://localhost:4100/api/version',
      reuseExistingServer: false,
      env: { DATA_FILE: ':memory:', PORT: '4100', LOBBY_WAIT_MS: '6000' },
    },
    {
      command: 'node client/node_modules/vite/bin/vite.js client --host localhost --port 5174 --strictPort',
      url: 'http://localhost:5174', reuseExistingServer: false,
      env: { VITE_SERVER_URL: 'http://localhost:4100', VITE_MOBILE_TABLE_UI: 'false' },
    },
  ],
});
