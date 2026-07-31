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
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Start game/ }).click();

  const table = page.getByTestId('poker-table');
  await expect(table).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= window.innerWidth
  ))).toBe(true);

  const viewport = page.viewportSize()!;
  const tableBox = await table.boundingBox();
  expect(tableBox).toBeTruthy();
  expect(tableBox!.x).toBeGreaterThanOrEqual(0);
  expect(tableBox!.x + tableBox!.width).toBeLessThanOrEqual(viewport.width);
  expect(tableBox!.y + tableBox!.height).toBeLessThanOrEqual(viewport.height);

  for (const combo of await page.locator('.combo-side').all()) {
    const box = await combo.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(tableBox!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width);
  }

  const fold = page.getByRole('button', { name: 'Fold' });
  await expect(fold).toBeVisible({ timeout: 15_000 });
  const actionDockBox = await page.locator('.action-dock').boundingBox();
  expect(actionDockBox).toBeTruthy();
  expect(actionDockBox!.y + actionDockBox!.height).toBeLessThanOrEqual(viewport.height);
  const playerCoinStackBox = await page.locator('.hero-seat [data-testid="coin-stack"]').boundingBox();
  expect(playerCoinStackBox).toBeTruthy();
  expect(playerCoinStackBox!.height).toBeLessThanOrEqual(60);
  const actionButtonBoxes = await page.locator('.action-dock button').evaluateAll(buttons => (
    buttons.map(button => {
      const box = button.getBoundingClientRect();
      return { left: box.left, right: box.right, top: Math.round(box.top) };
    })
  ));
  expect(new Set(actionButtonBoxes.map(box => box.top)).size).toBe(2);
  for (const box of actionButtonBoxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(viewport.width);
  }
  await fold.click();
  await expect(page.getByTestId('high-combo-side')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('low-combo-side')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));

  const showdownTableBox = await table.boundingBox();
  expect(showdownTableBox).toBeTruthy();
  expect(showdownTableBox!.y).toBeGreaterThanOrEqual(0);
  expect(showdownTableBox!.y + showdownTableBox!.height).toBeLessThanOrEqual(viewport.height);
  const tableCenterBox = await page.locator('.table-center.has-showdown').boundingBox();
  const newDealBox = await page.getByTestId('table-new-deal').boundingBox();
  expect(tableCenterBox).toBeTruthy();
  expect(newDealBox).toBeTruthy();
  expect(Math.abs(
    (newDealBox!.x + newDealBox!.width / 2) - (tableCenterBox!.x + tableCenterBox!.width / 2),
  )).toBeLessThanOrEqual(2);

  const revealedOpponentHands = page.locator('.opponents-row .compact-card-row').filter({
    has: page.locator('[data-testid^="card-face-"]'),
  });
  const expandableOpponentHands = page.locator('.opponents-row .compact-card-row.is-expandable');
  await expect(expandableOpponentHands).toHaveCount(await revealedOpponentHands.count());
  if (await expandableOpponentHands.count()) {
    const opponentCards = expandableOpponentHands.first();
    await expect(opponentCards).toHaveAttribute('aria-expanded', 'false');
    await opponentCards.click();
    const expandedHand = page.getByTestId('opponent-hand-overlay');
    await expect(expandedHand).toBeVisible();
    await expect(opponentCards).toHaveAttribute('aria-expanded', 'true');
    const expandedFrames = expandedHand.locator('.opponent-hand-expanded-frame');
    await expect(expandedFrames).toHaveCount(4);
    const expandedFrameBoxes = await expandedFrames.evaluateAll(frames => frames.map(frame => {
      const box = frame.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top };
    }));
    for (let index = 1; index < expandedFrameBoxes.length; index += 1) {
      expect(expandedFrameBoxes[index].left).toBeGreaterThanOrEqual(expandedFrameBoxes[index - 1].right);
      expect(expandedFrameBoxes[index].top).toBe(expandedFrameBoxes[0].top);
    }
    await expandedHand.click({ position: { x: 5, y: 5 } });
    await expect(expandedHand).toBeHidden();
  }
});
