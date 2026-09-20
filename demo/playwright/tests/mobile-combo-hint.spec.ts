import { expect, Page, test } from '@playwright/test';

async function startMobileTable(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByRole('button', { name: 'Add bot' }).click();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
}

test('mobile combo hints stay in the guide without table card outlines', async ({ page }) => {
  await startMobileTable(page);
  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByTestId('high-combo-side')).toBeHidden({ timeout: 30_000 });

  await expect(page.getByTestId('mobile-combination-guide')).toBeVisible();
  await expect(page.getByTestId('poker-table').locator('.combo-card-high, .combo-card-low')).toHaveCount(0);
});
