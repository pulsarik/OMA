import { expect, test } from '@playwright/test';

test('home footer shows the commit and build date and time', async ({ page }) => {
  await page.route('**/api/version', route => route.fulfill({
    json: {
      commit: 'abcdef1234567890',
      shortCommit: 'abcdef1',
      buildTimeGmt: '2026-10-08 09:15:30 GMT',
    },
  }));
  await page.goto('/');
  await expect(page.locator('footer')).toContainText('abcdef1 · 2026-10-08 09:15:30 GMT');
});
