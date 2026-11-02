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

test('home game choices fit in a short tablet landscape viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 632 });
  await page.goto('/');

  const gameChoices = [
    page.getByRole('button', { name: /Play with bots/ }),
    page.getByRole('button', { name: /Play with friends/ }),
    page.getByRole('button', { name: /Play with guests/ }),
  ];
  for (const choice of gameChoices) {
    await expect(choice).toBeVisible();
    const box = await choice.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.y + box!.height).toBeLessThanOrEqual(632);
  }
});
