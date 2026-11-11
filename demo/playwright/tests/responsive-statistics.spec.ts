import { expect, Page, test } from '@playwright/test';

async function openCompletedStatistics(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with friends' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await expect(page.getByLabel('Seats at the table')).toHaveCount(0);
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-host-member')).toHaveCount(2);
  await page.getByRole('button', { name: /Start game/ }).click();
  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByRole('button', { name: /^(New|Next) deal$/ })).toBeVisible({ timeout: 15_000 });
  if (await page.getByTestId('mobile-table').isVisible()) {
    await page.getByLabel('Table menu', { exact: true }).first().click();
    await page.getByRole('button', { name: 'Statistics', exact: true }).click();
  } else {
    await page.getByRole('tab', { name: 'STATISTICS' }).click();
  }
  await expect(page.getByTestId('statistics-player-detail')).toBeVisible();
  await expect(page.getByText('Hand complete', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'New deal', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toHaveCount(0);
}

test('statistics dashboard stays inside the viewport', async ({ page }) => {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await openCompletedStatistics(page);

    const dashboard = page.getByTestId('party-statistics');
    const layout = await dashboard.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        boxLeft: box.left,
        boxRight: box.right,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(layout.boxLeft, JSON.stringify(layout)).toBeGreaterThanOrEqual(0);
    expect(layout.boxRight, JSON.stringify(layout)).toBeLessThanOrEqual(viewport.width);
    expect(layout.documentWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewportWidth);
    await expect(page.getByTestId('statistics-select-P2')).toBeVisible();
    await expect(page.getByTestId('wallet-history-chart')).toBeVisible();
  }
});
