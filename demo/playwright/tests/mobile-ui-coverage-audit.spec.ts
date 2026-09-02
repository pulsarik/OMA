import { expect, Page, test } from '@playwright/test';

async function startMobileTable(page: Page, seats = 4) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption(String(seats));
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-table').getByText('Anna', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByTestId('poker-table')).toBeVisible();
  await expect.poll(() => page.getByTestId('opponents-grid').locator('[data-player-seat]').count())
    .toBeGreaterThan(0);
  await expect.poll(() => page.getByTestId('poker-table').locator('.deal-card').evaluateAll((cards) => (
    cards.length > 0 && cards.every((card) => card.getAnimations().every((animation) => animation.playState === 'finished'))
  ))).toBe(true);
}

async function startMobileTableAt(page: Page, width: number, height: number, seats = 4) {
  await page.setViewportSize({ width, height });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption(String(seats));
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-table').getByText('Anna', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByTestId('poker-table')).toBeVisible();
  await expect.poll(() => page.getByTestId('opponents-grid').locator('[data-player-seat]').count())
    .toBeGreaterThan(0);
}

async function playToRiver(page: Page) {
  test.setTimeout(90_000);
  const board = page.getByTestId('table-board');
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await board.locator('[data-testid^="card-face-"]').count() >= 5) {
      await page.waitForTimeout(800);
      return;
    }
    const actionDock = page.locator('.action-dock');
    const action = actionDock.getByRole('button', { name: /^(Check|Call)\b/ }).first();
    if (await action.isVisible().catch(() => false) && await action.isEnabled()) {
      await action.click();
      continue;
    }
    const fallback = actionDock.getByRole('button', { name: /^(Bet|Raise)/ }).first();
    if (await fallback.isVisible().catch(() => false) && await fallback.isEnabled()) {
      await fallback.click();
      continue;
    }
    await page.waitForTimeout(250);
  }
  await expect(board.locator('[data-testid^="card-face-"]')).toHaveCount(5, { timeout: 30_000 });
  await page.waitForTimeout(800);
}

test('mobile table screenshot contains a visible populated table, not only the action dock', async ({ page }) => {
  await startMobileTable(page);
  const table = page.getByTestId('poker-table');
  const board = page.getByTestId('table-board');
  await expect(table).toBeVisible();
  await expect(page.getByTestId('opponents-grid')).toBeVisible();
  await expect(board).toBeVisible();
  await expect(page.locator('[data-testid^="opponent-hand-zone-"]').first()).toBeVisible();
  await expect(page.locator('[data-testid^="wireframe-hand-"]').first()).toBeVisible();

  const screenshot = await page.screenshot({ path: 'test-results/mobile-ui-audit-table.png', fullPage: true });
  expect(screenshot.byteLength).toBeGreaterThan(10_000);
  const state = await table.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      width: rect.width,
      height: rect.height,
      background: style.backgroundColor,
      visibleCards: element.querySelectorAll('.deal-card').length,
      visibleOpponents: element.querySelectorAll('[data-testid^="opponent-hand-zone-"]').length,
    };
  });
  expect(state.width).toBeGreaterThan(300);
  expect(state.height).toBeGreaterThan(500);
  expect(state.background).not.toBe('rgb(255, 255, 255)');
  expect(state.visibleCards).toBeGreaterThan(0);
  expect(state.visibleOpponents).toBeGreaterThan(0);
});

test('mobile River board keeps all five cards in one visible board area', async ({ page }) => {
  await startMobileTable(page);
  await playToRiver(page);

  const board = page.getByTestId('table-board');
  const metrics = await board.evaluate((element) => {
    const boardBox = element.getBoundingClientRect();
    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-testid^="card-face-"]'))
      .map((card) => {
        const box = card.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      });
    return { board: boardBox.toJSON(), cards };
  });
  expect(metrics.cards).toHaveLength(5);
  expect(metrics.cards.every((card) => card.width > 20 && card.height > 30)).toBe(true);
  expect(Math.max(...metrics.cards.map((card) => card.bottom)) - Math.min(...metrics.cards.map((card) => card.top)))
    .toBeLessThanOrEqual(metrics.board.height + 2);
  metrics.cards.forEach((card, index) => {
    expect(card.left, `River card ${index + 1} exits board left`).toBeGreaterThanOrEqual(metrics.board.left - 1);
    expect(card.right, `River card ${index + 1} exits board right`).toBeLessThanOrEqual(metrics.board.right + 1);
    expect(card.top, `River card ${index + 1} exits board top`).toBeGreaterThanOrEqual(metrics.board.top - 1);
    expect(card.bottom, `River card ${index + 1} exits board bottom`).toBeLessThanOrEqual(metrics.board.bottom + 1);
  });
  const screenshot = await page.screenshot({ path: 'test-results/mobile-river-board.png', fullPage: true });
  expect(screenshot.byteLength).toBeGreaterThan(10_000);
});

test('534px mobile River board stays in one row inside the table board', async ({ page }) => {
  await startMobileTableAt(page, 534, 900);
  await playToRiver(page);

  const board = page.getByTestId('table-board');
  const metrics = await board.evaluate((element) => {
    const boardBox = element.getBoundingClientRect();
    const cards = Array.from(element.querySelectorAll<HTMLElement>('[data-testid^="card-face-"]'))
      .map((card) => card.getBoundingClientRect());
    return { board: boardBox, cards };
  });
  expect(metrics.cards).toHaveLength(5);
  expect(new Set(metrics.cards.map((card) => Math.round(card.top))).size)
    .toBe(1);
  metrics.cards.forEach((card, index) => {
    expect(card.left, `River card ${index + 1} exits board left`).toBeGreaterThanOrEqual(metrics.board.left - 1);
    expect(card.right, `River card ${index + 1} exits board right`).toBeLessThanOrEqual(metrics.board.right + 1);
  });
});

test('mobile own turn keeps cards, opponents and board visible after two seconds', async ({ page }) => {
  await startMobileTable(page);
  const dock = page.locator('.action-dock');
  await expect(dock.getByRole('button').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2_100);

  const table = page.getByTestId('poker-table');
  const state = await table.evaluate((element) => {
    const tableBox = element.getBoundingClientRect();
    const dockElement = document.querySelector<HTMLElement>('.action-dock');
    const dockBox = dockElement?.getBoundingClientRect();
    const hero = element.querySelector<HTMLElement>('[data-testid^="wireframe-hand-"]');
    return {
      table: tableBox.toJSON(),
      dock: dockBox?.toJSON() ?? null,
      heroCards: hero?.querySelectorAll('[data-testid^="card-face-"], [data-testid="card-back"]').length ?? 0,
      opponents: element.querySelectorAll('[data-testid^="opponent-hand-zone-"]').length,
      waiting: dockElement?.textContent?.includes('Waiting for your turn') ?? false,
    };
  });
  expect(state.waiting).toBe(false);
  expect(state.heroCards).toBe(4);
  expect(state.opponents).toBeGreaterThan(0);
  expect(state.dock).toBeTruthy();
  expect(state.dock!.height).toBeLessThan(180);
  expect(state.dock!.top).toBeGreaterThanOrEqual(state.table.bottom - 2);
  const screenshot = await page.screenshot({ path: 'test-results/mobile-own-turn-table.png', fullPage: true });
  expect(screenshot.byteLength).toBeGreaterThan(10_000);
});

test('mobile action dock buttons are usable and stay inside the viewport', async ({ page }) => {
  await startMobileTable(page);
  const dock = page.locator('.action-dock');
  await expect(dock.getByRole('button').first()).toBeVisible({ timeout: 30_000 });
  const viewport = page.viewportSize()!;
  const buttons = await dock.getByRole('button').evaluateAll((items) => items.map((button) => {
    const box = button.getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
  }));
  expect(buttons.length).toBeGreaterThanOrEqual(2);
  buttons.forEach((button, index) => {
    expect(button.width, `button ${index + 1} width`).toBeGreaterThanOrEqual(40);
    expect(button.height, `button ${index + 1} height`).toBeGreaterThanOrEqual(40);
    expect(button.left, `button ${index + 1} exits viewport left`).toBeGreaterThanOrEqual(0);
    expect(button.right, `button ${index + 1} exits viewport right`).toBeLessThanOrEqual(viewport.width);
    expect(button.top, `button ${index + 1} exits viewport top`).toBeGreaterThanOrEqual(0);
    expect(button.bottom, `button ${index + 1} exits viewport bottom`).toBeLessThanOrEqual(viewport.height);
  });
});

test('mobile hero cards fill their zone and combo hint stays outside the hand', async ({ page }) => {
  await startMobileTable(page);
  await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2_100);

  const beforeShowdown = await page.getByTestId('poker-table').evaluate((table) => {
    const heroZone = table.querySelector<HTMLElement>('.wireframe-hero-slot');
    const row = heroZone?.querySelector<HTMLElement>('.compact-card-row');
    const cards = Array.from(heroZone?.querySelectorAll<HTMLElement>('.focal-card-frame') ?? [])
      .map((card) => card.getBoundingClientRect());
    const zone = heroZone?.getBoundingClientRect();
    const rowBox = row?.getBoundingClientRect();
    return { zone, row: rowBox, cards };
  });
  expect(beforeShowdown.cards).toHaveLength(4);
  expect(beforeShowdown.row).toBeTruthy();
  expect(beforeShowdown.zone).toBeTruthy();
  expect(beforeShowdown.cards.every((card) => card.width > 1 && card.height > 1)).toBe(true);
  beforeShowdown.cards.forEach((card) => {
    expect(card.left).toBeGreaterThanOrEqual((beforeShowdown.zone?.left ?? 0) - 1);
    expect(card.right).toBeLessThanOrEqual((beforeShowdown.zone?.right ?? 0) + 1);
    expect(card.top).toBeGreaterThanOrEqual((beforeShowdown.zone?.top ?? 0) - 1);
    expect(card.bottom).toBeLessThanOrEqual((beforeShowdown.zone?.bottom ?? 0) + 1);
    expect(card.width / card.height).toBeCloseTo(92 / 132, 2);
  });

  await page.getByRole('button', { name: 'Fold' }).click();
  const hint = page.getByTestId('high-combo-side');
  await expect(hint).toBeVisible({ timeout: 30_000 });
  const overlap = await page.getByTestId('poker-table').evaluate((table) => {
    const hand = table.querySelector<HTMLElement>('.wireframe-hero-slot .compact-card-row')?.getBoundingClientRect();
    const high = table.querySelector<HTMLElement>('[data-testid="high-combo-side"]')?.getBoundingClientRect();
    const low = table.querySelector<HTMLElement>('[data-testid="low-combo-side"]')?.getBoundingClientRect();
    return [high, low].filter(Boolean).map((box) => ({
      intersects: !!hand && box!.left < hand.right && box!.right > hand.left && box!.top < hand.bottom && box!.bottom > hand.top,
    }));
  });
  expect(overlap.every(({ intersects }) => !intersects)).toBe(true);
});

test('mobile opponents keep four hidden cards and non-overlapping hand zones', async ({ page }) => {
  await startMobileTable(page);
  const table = page.getByTestId('poker-table');
  const zones = page.locator('[data-testid^="opponent-hand-zone-"]');
  await expect(zones).toHaveCount(3);
  const data = await zones.evaluateAll((items) => items.map((zone) => {
    const zoneBox = zone.getBoundingClientRect();
    const cards = Array.from(zone.querySelectorAll<HTMLElement>('.opponent-card-frame'))
      .map((card) => card.getBoundingClientRect());
    return { zone: zoneBox.toJSON(), backs: cards.length, cards };
  }));
  data.forEach(({ zone, backs, cards }, index) => {
    expect(backs, `opponent ${index + 1} hidden card count`).toBe(4);
    expect(zone.width).toBeGreaterThan(0);
    cards.forEach((card, cardIndex) => {
      expect(card.width, `opponent ${index + 1} card ${cardIndex + 1} width`).toBeGreaterThan(10);
      expect(card.left).toBeGreaterThanOrEqual(zone.left - 1);
      expect(card.right).toBeLessThanOrEqual(zone.right + 1);
    });
  });
  for (let first = 0; first < data.length; first += 1) {
    for (let second = first + 1; second < data.length; second += 1) {
      const a = data[first].zone;
      const b = data[second].zone;
      expect(a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)
        .toBe(false);
    }
  }
  await expect(table).toBeVisible();
});
