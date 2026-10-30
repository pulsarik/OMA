import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: '**/sharing.spec.ts',
  projects: [
    { name: 'desktop-table', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-table', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: (base.webServer as Array<any>).map((server, index) => index === 1
    ? { ...server, env: { ...server.env, VITE_MOBILE_TABLE_UI: 'true' } }
    : server),
});
