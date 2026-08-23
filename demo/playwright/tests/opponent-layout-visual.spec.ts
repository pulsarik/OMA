import { expect, test } from '@playwright/test';

async function startTable(page: import('@playwright/test').Page, seats: number) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption(String(seats));
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-table').getByText('Anna', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByTestId('opponents-grid')).toBeVisible();
  await expect.poll(() => page.getByTestId('opponents-grid').locator('.deal-card').evaluateAll((cards) => (
    cards.every((card) => card.getAnimations().every((animation) => animation.playState === 'finished'))
  ))).toBe(true);
}

test('visual opponent layout desktop before showdown', async ({ page }) => {
  await page.setViewportSize({ width: 1558, height: 1037 });
  await startTable(page, 6);
  await page.screenshot({ path: 'test-results/opponent-layout-desktop.png' });
});

test('visual opponent layout portrait before showdown', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startTable(page, 4);
  await page.screenshot({ path: 'test-results/opponent-layout-mobile.png' });
});

test('visual QA viewport matrix before showdown', async ({ page }) => {
  for (const width of [1558, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: width >= 1024 ? 900 : 1024 });
    await startTable(page, 6);
    await page.screenshot({ path: `test-results/opponent-layout-${width}.png` });
  }
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    await startTable(page, 4);
    await page.screenshot({ path: `test-results/opponent-layout-${width}.png` });
  }
});
