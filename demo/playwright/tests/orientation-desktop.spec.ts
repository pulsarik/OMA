import { expect, test } from '@playwright/test';

test('a narrow desktop window is not treated as a rotated phone', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('translate', 'no');
  await expect(page.locator('meta[name="google"]')).toHaveAttribute('content', 'notranslate');
  await expect(page.getByTestId('portrait-orientation-guard')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Create a table' })).toBeVisible();
});

test('a narrow desktop table asks for more horizontal space', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('2');
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByRole('button', { name: /Start game/ }).click();

  const widthGuard = page.getByTestId('horizontal-table-width-guard');
  await expect(widthGuard).toBeVisible();

  await page.setViewportSize({ width: 761, height: 900 });
  await expect(widthGuard).toBeHidden();
});
