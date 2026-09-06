import { expect, Page, test } from '@playwright/test';

async function startMobileTable(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
}

test('mobile combo hints are replaced by card outlines', async ({ page }) => {
  await startMobileTable(page);
  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByTestId('high-combo-side')).toBeHidden({ timeout: 30_000 });

  const countCombinationOutlines = () => page.getByTestId('poker-table').evaluate((table) => {
    const hero = table.querySelectorAll('.wireframe-hero-slot .combo-card-high, .wireframe-hero-slot .combo-card-low').length;
    const board = table.querySelectorAll('.table-board .combo-card-high, .table-board .combo-card-low').length;
    return hero > 0 && board > 0;
  });
  await expect.poll(countCombinationOutlines, { timeout: 30_000 }).toBe(true);
  const metrics = await page.getByTestId('poker-table').evaluate((table) => {
    return {
      heroHigh: table.querySelectorAll('.wireframe-hero-slot .combo-card-high').length,
      heroLow: table.querySelectorAll('.wireframe-hero-slot .combo-card-low').length,
      boardHigh: table.querySelectorAll('.table-board .combo-card-high').length,
      boardLow: table.querySelectorAll('.table-board .combo-card-low').length,
    };
  });
  expect(metrics.heroHigh + metrics.heroLow + metrics.boardHigh + metrics.boardLow).toBeGreaterThan(0);
  expect(metrics.heroHigh + metrics.heroLow).toBeGreaterThan(0);
  expect(metrics.boardHigh + metrics.boardLow).toBeGreaterThan(0);
});
