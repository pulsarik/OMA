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

test('portrait seating stays inside the table from two through ten players', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 640 });

  for (let playerCount = 2; playerCount <= 10; playerCount += 1) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create a table' }).click();
    await page.getByLabel('Your name').fill('Dima');
    await page.getByLabel('Seats at the table').selectOption(String(playerCount));
    await page.getByRole('button', { name: 'Create table' }).click();
    await page.getByRole('button', { name: /Start game/ }).click();

    const table = page.getByTestId('poker-table');
    await expect(table).toBeVisible();
    const tableBox = (await table.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(tableBox.x).toBeGreaterThanOrEqual(0);
    expect(tableBox.x + tableBox.width).toBeLessThanOrEqual(viewport.width);
    expect(tableBox.y + tableBox.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const opponentBoxes = await page.locator('.opponents-row [data-player-seat]').evaluateAll(seats => (
      seats.map((seat) => {
        const box = seat.getBoundingClientRect();
        return { left: box.left, right: box.right };
      })
    ));
    for (const box of opponentBoxes) {
      expect(box.left, `${playerCount}-player seat starts inside table`).toBeGreaterThanOrEqual(tableBox.x);
      expect(box.right, `${playerCount}-player seat ends inside table`).toBeLessThanOrEqual(tableBox.x + tableBox.width);
    }
  }
});
