import { expect, Page, test } from '@playwright/test';

async function openCompletedStatistics(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('2');
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-table').getByText('Anna', { exact: true }))
    .toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Start game/ }).click();
  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByText('You lost', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await expect(page.getByTestId('party-metrics-scroll')).toBeVisible();
  await expect(page.getByText('Hand complete', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Results', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'New deal', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Replay', exact: true })).toHaveCount(0);
}

test('statistics table stays inside the viewport and scrolls its full width', async ({ page }) => {
  for (const viewport of [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await openCompletedStatistics(page);

    const metricsScroll = page.getByTestId('party-metrics-scroll');
    const layout = await metricsScroll.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        boxRight: box.right,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(layout.boxRight, JSON.stringify(layout)).toBeLessThanOrEqual(viewport.width);
    expect(layout.scrollWidth).toBeGreaterThan(layout.clientWidth);
    expect(layout.documentWidth, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewportWidth);

    const firstPlayerCell = metricsScroll.locator('tbody tr:first-child td:first-child');
    const scrollBox = await metricsScroll.boundingBox();
    const beforeScroll = await firstPlayerCell.boundingBox();
    expect(scrollBox).toBeTruthy();
    expect(beforeScroll).toBeTruthy();
    await metricsScroll.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const afterScroll = await firstPlayerCell.boundingBox();
    expect(afterScroll).toBeTruthy();
    expect(afterScroll!.x).toBeGreaterThanOrEqual(scrollBox!.x - 1);
    expect(afterScroll!.x + afterScroll!.width)
      .toBeLessThanOrEqual(scrollBox!.x + Math.min(scrollBox!.width, beforeScroll!.width) + 1);
  }
});
