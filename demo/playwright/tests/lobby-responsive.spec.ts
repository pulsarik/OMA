import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });

test('mobile lobby keeps the start CTA visible and table names on one line', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();

  const tableName = page.getByLabel('Table name');
  const startButton = page.getByRole('button', { name: /Start game/ });
  await expect(tableName).toBeVisible();
  await expect(startButton).toBeVisible();
  await expect(tableName).toHaveCSS('white-space', 'nowrap');

  const viewport = page.viewportSize()!;
  const startButtonBox = await startButton.boundingBox();
  expect(startButtonBox).toBeTruthy();
  expect(startButtonBox!.y + startButtonBox!.height).toBeLessThanOrEqual(viewport.height);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);

  const reportBox = await page.getByRole('button', { name: 'Report a problem' }).boundingBox();
  const connectedBox = await page.getByText('connected', { exact: true }).boundingBox();
  expect(reportBox).toBeTruthy();
  expect(connectedBox).toBeTruthy();
  const reportRight = reportBox!.x + reportBox!.width;
  const reportBottom = reportBox!.y + reportBox!.height;
  const connectedRight = connectedBox!.x + connectedBox!.width;
  const connectedBottom = connectedBox!.y + connectedBox!.height;
  expect(
    reportRight <= connectedBox!.x
      || connectedRight <= reportBox!.x
      || reportBottom <= connectedBox!.y
      || connectedBottom <= reportBox!.y,
  ).toBe(true);
});
