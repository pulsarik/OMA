import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });

test('mobile UI stays available in portrait and is blocked in landscape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const orientationGuard = page.getByTestId('portrait-orientation-guard');
  await expect(orientationGuard).toBeHidden();
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= window.innerWidth
  ))).toBe(true);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(orientationGuard).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(orientationGuard).toBeHidden();
});

test('player table fits a portrait phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const language = page.locator('select[aria-label="Language"], select[aria-label="Язык"]');
  if (await language.inputValue() !== 'en') await language.selectOption('en');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('2');
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Start game/ }).click();

  const table = page.getByTestId('poker-table');
  await expect(table).toBeVisible();
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= window.innerWidth
  ))).toBe(true);

  const viewport = page.viewportSize()!;
  const tableBox = await table.boundingBox();
  expect(tableBox).toBeTruthy();
  expect(tableBox!.x).toBeGreaterThanOrEqual(0);
  expect(tableBox!.x + tableBox!.width).toBeLessThanOrEqual(viewport.width);

  for (const combo of await page.locator('.combo-side').all()) {
    const box = await combo.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(tableBox!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width);
  }
});
