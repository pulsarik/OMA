import { defineConfig } from '@playwright/test';
import base from './playwright.mobile-oval.config';
export default defineConfig({ ...base, use: { ...base.use, baseURL: 'http://localhost:5197' }, webServer: [
  ...(Array.isArray(base.webServer) ? base.webServer.slice(0, 1) : []),
  { command: 'npm.cmd --prefix client run dev -- --host localhost --port 5197 --strictPort', url: 'http://localhost:5197', reuseExistingServer: false, env: { VITE_MOBILE_TABLE_UI: 'true' } },
] });
