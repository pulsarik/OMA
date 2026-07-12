import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: { headless: true, baseURL: 'http://localhost:4000' },
  webServer: {
    command: 'npm run dev:server',
    url: 'http://localhost:4000',
    timeout: 120000,
    reuseExistingServer: false
  }
});