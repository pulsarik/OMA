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

test('player table fits a portrait phone viewport', async ({ page }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');

  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  const lobbyTable = page.getByTestId('lobby-table');
  await expect(lobbyTable).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= window.innerWidth
  ))).toBe(true);
  const lobbyTableBox = await lobbyTable.boundingBox();
  expect(lobbyTableBox).toBeTruthy();
  expect(lobbyTableBox!.x).toBeGreaterThanOrEqual(0);
  expect(lobbyTableBox!.x + lobbyTableBox!.width).toBeLessThanOrEqual(360);
  for (const seat of await lobbyTable.locator('[data-lobby-seat]').all()) {
    const seatBox = await seat.boundingBox();
    expect(seatBox).toBeTruthy();
    expect(seatBox!.x).toBeGreaterThanOrEqual(lobbyTableBox!.x);
    expect(seatBox!.x + seatBox!.width).toBeLessThanOrEqual(lobbyTableBox!.x + lobbyTableBox!.width);
  }
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
  const opponentNameBoxes = await page.locator('.opponents-row [data-testid^="player-name-"]')
    .evaluateAll(names => names.map(name => {
      const box = name.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    }));
  for (const box of opponentNameBoxes) {
    expect(box.top).toBeGreaterThanOrEqual(tableBox!.y);
    expect(box.bottom).toBeLessThanOrEqual(tableBox!.y + tableBox!.height);
  }

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
  expect(new Set(actionButtonBoxes.map(box => box.top)).size).toBeLessThanOrEqual(3);
  for (const box of actionButtonBoxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(viewport.width);
  }
  await fold.click();
  await expect(page.getByTestId('high-combo-side')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('low-combo-side')).toBeVisible();
  await expect(page.locator('.table-center.has-showdown')).toBeVisible({ timeout: 15_000 });
  await page.evaluate(() => window.scrollTo(0, 0));

  const showdownTableBox = await table.boundingBox();
  expect(showdownTableBox).toBeTruthy();
  expect(
    Math.abs(showdownTableBox!.height - tableBox!.height),
    `table height changed from ${tableBox!.height}px to ${showdownTableBox!.height}px`,
  ).toBeLessThanOrEqual(2);
  expect(showdownTableBox!.y).toBeGreaterThanOrEqual(0);
  expect(showdownTableBox!.y + showdownTableBox!.height).toBeLessThanOrEqual(viewport.height);
  const resultBoxes = await page.locator('[data-testid^="player-result-"]').evaluateAll(results => (
    results.map(result => {
      const box = result.getBoundingClientRect();
      return { top: box.top, right: box.right, bottom: box.bottom, left: box.left };
    })
  ));
  for (const box of resultBoxes) {
    expect(box.left).toBeGreaterThanOrEqual(showdownTableBox!.x);
    expect(box.right).toBeLessThanOrEqual(showdownTableBox!.x + showdownTableBox!.width);
    expect(box.top).toBeGreaterThanOrEqual(showdownTableBox!.y);
    expect(box.bottom).toBeLessThanOrEqual(showdownTableBox!.y + showdownTableBox!.height);
  }
  const tableCenterBox = await page.locator('.table-center.has-showdown').boundingBox();
  const newDealBox = await page.getByTestId('showdown-new-deal').boundingBox();
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
    const compactFrames = opponentCards.locator('.opponent-card-frame');
    const firstCompactFrameBox = await compactFrames.nth(0).boundingBox();
    const secondCompactFrameBox = await compactFrames.nth(1).boundingBox();
    const firstRankBox = await compactFrames.nth(0).locator('.card-rank').boundingBox();
    const firstSuitBox = await compactFrames.nth(0).locator('.card-suit').boundingBox();
    expect(firstCompactFrameBox).toBeTruthy();
    expect(secondCompactFrameBox).toBeTruthy();
    expect(firstRankBox).toBeTruthy();
    expect(firstSuitBox).toBeTruthy();
    expect(firstRankBox!.x).toBeGreaterThanOrEqual(firstCompactFrameBox!.x);
    expect(firstSuitBox!.x).toBeGreaterThanOrEqual(firstCompactFrameBox!.x);
    expect(firstRankBox!.x + firstRankBox!.width).toBeLessThanOrEqual(secondCompactFrameBox!.x);
    expect(firstSuitBox!.x + firstSuitBox!.width).toBeLessThanOrEqual(secondCompactFrameBox!.x);
    await expect(opponentCards).toHaveAttribute('aria-expanded', 'false');
    await opponentCards.click();
    const expandedHand = page.getByTestId('opponent-hand-overlay');
    await expect(expandedHand).toBeVisible();
    await expect(page.getByTestId('opponent-hand-name')).not.toHaveText('');
    await expect(opponentCards).toHaveAttribute('aria-expanded', 'true');
    const expandedFrames = expandedHand.locator('.opponent-hand-expanded-frame');
    await expect(expandedFrames).toHaveCount(4);
    await expect(expandedFrames.first().locator('[data-testid^="card-face-"]')).toHaveCSS('opacity', '1');
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
