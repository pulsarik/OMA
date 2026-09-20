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

test('mobile showdown replaces action buttons with result and New Deal', async ({ page }) => {
  await startMobileTable(page);
  await page.getByRole('button', { name: 'Fold' }).click();

  const resultDock = page.getByTestId('mobile-result-dock');
  await expect(resultDock).toBeVisible({ timeout: 30_000 });
  await expect(resultDock.getByTestId('showdown-contributed')).toBeVisible();
  await expect(resultDock.getByTestId('showdown-payout')).toBeVisible();
  await expect(resultDock.getByTestId('showdown-net')).toBeVisible();
  await expect(resultDock.getByRole('button', { name: /New deal/i })).toHaveCount(1);
  await expect(page.getByTestId('actions-zone').locator('.action-dock')).toHaveCount(0);

  const combinationCards = page.locator('.wireframe-hand .compact-card-row > [class*="combo-card-"]');
  await expect(combinationCards).toHaveCount(0);
  const cardStyles = await page.locator('.wireframe-hand .compact-card-row').evaluateAll((rows) => rows.map((row) => ({
    hadWinnerRowClass: row.classList.contains('has-winner-border'),
    borderWidth: getComputedStyle(row).borderWidth,
  })));
  for (const row of cardStyles) {
    if (row.hadWinnerRowClass) expect(row.borderWidth).toBe('0px');
  }

  const geometry = await resultDock.evaluate((dock) => {
    const box = dock.getBoundingClientRect();
    const actions = dock.closest<HTMLElement>('[data-testid="actions-zone"]')!.getBoundingClientRect();
    return { box: box.toJSON(), actions: actions.toJSON(), viewportHeight: window.innerHeight };
  });
  expect(geometry.box.left).toBeGreaterThanOrEqual(geometry.actions.left - 1);
  expect(geometry.box.right).toBeLessThanOrEqual(geometry.actions.right + 1);
  expect(geometry.box.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
});
