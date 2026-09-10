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
      await action.click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(100);
      continue;
    }
    const fallback = actionDock.getByRole('button', { name: /^(Bet|Raise)/ }).first();
    if (await fallback.isVisible().catch(() => false) && await fallback.isEnabled()) {
      await fallback.click({ timeout: 2_000 }).catch(() => undefined);
      await page.waitForTimeout(100);
      continue;
    }
    await page.waitForTimeout(250);
  }
  await expect(board.locator('[data-testid^="card-face-"]')).toHaveCount(5, { timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function collectBoardGeometryByStreet(page: Page) {
  const snapshots: Record<number, { width: number; height: number; ratio: number }[]> = {};
  const actionDock = page.locator('.action-dock');
  for (let attempt = 0; attempt < 120 && Object.keys(snapshots).length < 3; attempt += 1) {
    const frames = page.locator('[data-testid="table-board"] .focal-card-frame');
    const count = await frames.count();
    if ([3, 4, 5].includes(count) && !snapshots[count]) {
      snapshots[count] = await frames.evaluateAll((cards) => cards.map((card) => {
        const box = card.getBoundingClientRect();
        return { width: box.width, height: box.height, ratio: box.width / box.height };
      }));
      if (Object.keys(snapshots).length === 3) break;
    }
    const action = actionDock.getByRole('button', { name: /^(Check|Call)\b/ }).first();
    const fallback = actionDock.getByRole('button', { name: /^(Bet|Raise)/ }).first();
    const candidate = await action.isVisible().catch(() => false) && await action.isEnabled().catch(() => false)
      ? action
      : fallback;
    if (await candidate.isVisible().catch(() => false) && await candidate.isEnabled().catch(() => false)) {
      await candidate.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(250);
  }
  return snapshots;
}

async function collectStreetBadgeGeometry(page: Page) {
  test.setTimeout(90_000);
  const snapshots: Record<number, {
    zone: { left: number; right: number; top: number; bottom: number };
    badge: { left: number; right: number; top: number; bottom: number };
    cards: { left: number; right: number; top: number; bottom: number }[];
  }> = {};
  const actionDock = page.locator('.action-dock');
  for (let attempt = 0; attempt < 120 && Object.keys(snapshots).length < 3; attempt += 1) {
    const board = page.getByTestId('table-board');
    const count = await board.locator('.focal-card-frame').count();
    if ([3, 4, 5].includes(count) && !snapshots[count]) {
      snapshots[count] = await page.getByTestId('flop-zone').evaluate((zone) => {
        const rect = (element: Element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        };
        return {
          zone: rect(zone),
          badge: rect(zone.querySelector('.wireframe-street-badge')!),
          cards: Array.from(zone.querySelectorAll('.table-board .focal-card-frame')).map(rect),
        };
      });
      if (Object.keys(snapshots).length === 3) break;
    }
    const action = actionDock.getByRole('button', { name: /^(Check|Call)\b/ }).first();
    const fallback = actionDock.getByRole('button', { name: /^(Bet|Raise)/ }).first();
    const candidate = await action.isVisible().catch(() => false) && await action.isEnabled().catch(() => false)
      ? action
      : fallback;
    if (await candidate.isVisible().catch(() => false) && await candidate.isEnabled().catch(() => false)) {
      await candidate.click({ timeout: 2_000 }).catch(() => undefined);
    }
    await page.waitForTimeout(250);
  }
  return snapshots;
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
    const cards = Array.from(element.querySelectorAll<HTMLElement>('.focal-card-frame'))
      .map((card) => {
        const box = card.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height, ratio: box.width / box.height };
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
    expect(card.ratio, `River card ${index + 1} ratio`).toBeCloseTo(92 / 132, 1);
  });
  const screenshot = await page.screenshot({ path: 'test-results/mobile-river-board.png', fullPage: true });
  expect(screenshot.byteLength).toBeGreaterThan(10_000);
});

test('mobile community card frames keep stable dimensions from flop through river', async ({ page }) => {
  await startMobileTable(page);
  const snapshots = await collectBoardGeometryByStreet(page);
  expect(Object.keys(snapshots).sort()).toEqual(['3', '4', '5']);
  const reference = snapshots[3][0];
  [4, 5].forEach((street) => {
    snapshots[street].forEach((card, index) => {
      expect(card.width, `street ${street} card ${index + 1} width`).toBeCloseTo(reference.width, 0);
      expect(card.height, `street ${street} card ${index + 1} height`).toBeCloseTo(reference.height, 0);
      expect(card.ratio, `street ${street} card ${index + 1} ratio`).toBeCloseTo(92 / 132, 1);
    });
  });
});

test('mobile street badge stays in the free band above the board', async ({ page }) => {
  for (const width of [390, 534]) {
    await startMobileTableAt(page, width, 844);
    const snapshots = await collectStreetBadgeGeometry(page);
    expect(Object.keys(snapshots).sort(), `${width}px streets`).toEqual(['3', '4', '5']);
    Object.entries(snapshots).forEach(([street, geometry]) => {
      const { zone, badge, cards } = geometry;
      expect(badge.left, `${width}px street ${street} badge exits zone left`).toBeGreaterThanOrEqual(zone.left);
      expect(badge.right, `${width}px street ${street} badge exits zone right`).toBeLessThanOrEqual(zone.right);
      expect(badge.top, `${width}px street ${street} badge exits viewport top`).toBeGreaterThanOrEqual(0);
      expect(badge.bottom, `${width}px street ${street} badge exits viewport bottom`).toBeLessThanOrEqual(844);
      cards.forEach((card, index) => {
        const intersects = badge.left < card.right && badge.right > card.left
          && badge.top < card.bottom && badge.bottom > card.top;
        expect(intersects, `${width}px street ${street} badge intersects board card ${index + 1}`).toBe(false);
      });
    });
  }
});

test('534px mobile River board stays in one row inside the table board', async ({ page }) => {
  await startMobileTableAt(page, 534, 900);
  await playToRiver(page);

  const board = page.getByTestId('table-board');
  const metrics = await board.evaluate((element) => {
    const boardBox = element.getBoundingClientRect();
    const cards = Array.from(element.querySelectorAll<HTMLElement>('.focal-card-frame'))
      .map((card) => card.getBoundingClientRect());
    return { board: boardBox, cards };
  });
  expect(metrics.cards).toHaveLength(5);
  expect(new Set(metrics.cards.map((card) => Math.round(card.top))).size)
    .toBe(1);
  metrics.cards.forEach((card, index) => {
    expect(card.left, `River card ${index + 1} exits board left`).toBeGreaterThanOrEqual(metrics.board.left - 1);
    expect(card.right, `River card ${index + 1} exits board right`).toBeLessThanOrEqual(metrics.board.right + 1);
    expect(card.width / card.height, `River card ${index + 1} ratio`).toBeCloseTo(92 / 132, 1);
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

test('mobile Hi-Lo guide is visible before actions without overlap', async ({ page }) => {
  await startMobileTable(page);
  const guide = page.getByTestId('mobile-combination-guide');
  const dock = page.locator('.action-dock');
  await expect(guide).toBeVisible();
  await expect(guide).toContainText('HIGH');
  await expect(guide).toContainText('LOW');
  await expect(guide.locator('.mobile-combination-visual-example')).toHaveCount(2);
  await expect(guide.locator('[data-card-style="simple"]')).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const guide = document.querySelector<HTMLElement>('[data-testid="mobile-combination-guide"]')!.getBoundingClientRect();
    const dock = document.querySelector<HTMLElement>('.action-dock')!.getBoundingClientRect();
    const table = document.querySelector<HTMLElement>('[data-testid="poker-table"]')!.getBoundingClientRect();
    return { guide, dock, table, viewportHeight: window.innerHeight };
  });
  expect(geometry.guide.top).toBeGreaterThanOrEqual(geometry.table.bottom - 1);
  expect(geometry.guide.bottom).toBeLessThanOrEqual(geometry.dock.top + 1);
  expect(geometry.dock.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
});

test('Galaxy S8 viewport keeps all own cards visible', async ({ page }) => {
  await startMobileTableAt(page, 360, 740);
  await page.waitForTimeout(2_100);
  const cards = page.locator('.wireframe-hero-slot .focal-card-frame');
  await expect(cards).toHaveCount(4);
  const geometry = await page.getByTestId('poker-table').evaluate((table) => {
    const zone = table.querySelector<HTMLElement>('.wireframe-hero-slot')?.getBoundingClientRect();
    const guide = document.querySelector<HTMLElement>('[data-testid="mobile-combination-guide"]')?.getBoundingClientRect();
    const items = Array.from(table.querySelectorAll<HTMLElement>('.wireframe-hero-slot .focal-card-frame'))
      .map((card) => ({ frame: card.getBoundingClientRect(), face: card.querySelector<HTMLElement>('.focal-card')?.getBoundingClientRect() }));
    return { zone, guide, items, viewport: { width: innerWidth, height: innerHeight } };
  });
  expect(geometry.items.every(({ frame, face }) => face && face.width >= 20 && face.height >= 28)).toBe(true);
  geometry.items.forEach(({ frame, face }) => {
    expect(frame.left).toBeGreaterThanOrEqual((geometry.zone?.left ?? 0) - 1);
    expect(frame.right).toBeLessThanOrEqual((geometry.zone?.right ?? 0) + 1);
    expect(frame.top).toBeGreaterThanOrEqual((geometry.zone?.top ?? 0) - 30);
    expect(frame.bottom).toBeLessThanOrEqual((geometry.guide?.top ?? Number.POSITIVE_INFINITY) - 1);
    expect(face!.left).toBeGreaterThanOrEqual(frame.left - 1);
    expect(face!.right).toBeLessThanOrEqual(frame.right + 1);
    expect(face!.top).toBeGreaterThanOrEqual(frame.top - 1);
    expect(face!.bottom).toBeLessThanOrEqual(frame.bottom + 1);
  });
});

test('Galaxy S8 keeps the essential table information readable', async ({ page }) => {
  await startMobileTableAt(page, 360, 740);
  await page.waitForTimeout(2_100);
  await expect(page.locator('.wireframe-street-badge')).toBeVisible();
  await expect(page.locator('.pot-summary')).toBeVisible();
  await expect(page.locator('[data-testid^="player-name-"]')).toHaveCount(4);
  await expect(page.locator('[data-testid^="player-score-"]')).toHaveCount(4);
  await expect(page.locator('[data-testid^="wireframe-hand-"] .seat-name-score')).toBeVisible();
  await expect(page.locator('.wireframe-hero-slot .seat-name-score')).toContainText('Dima');
  await expect(page.locator('.wireframe-hero-slot .seat-name-score')).toBeVisible();
  await expect(page.locator('.wireframe-hero-slot .focal-card-frame')).toHaveCount(4);
  await expect(page.locator('.wireframe-hero-slot [data-testid^="card-face-"]')).toHaveCount(4);
  await expect(page.locator('.action-dock')).toBeVisible();
  await expect(page.locator('.action-dock button')).toHaveCount(7);
  const boxes = await page.locator('[data-testid^="player-name-"], [data-testid^="player-score-"], .wireframe-street-badge, .pot-summary, .wireframe-hero-slot .focal-card-frame, .action-dock button').evaluateAll((items) => items.map((item) => {
    const box = item.getBoundingClientRect();
    return { text: item.textContent?.trim(), left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
  }));
  boxes.forEach((box) => {
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
    expect(box.left).toBeGreaterThanOrEqual(-1);
    expect(box.right).toBeLessThanOrEqual(361);
    expect(box.top).toBeGreaterThanOrEqual(-1);
    expect(box.bottom).toBeLessThanOrEqual(741);
  });
});

test('popular phone viewport matrix keeps the mobile table usable', async ({ page }) => {
  const phones = [
    ['iPhone SE', 320, 568],
    ['Galaxy S8', 360, 740],
    ['iPhone 12', 390, 844],
    ['Pixel 7', 412, 915],
  ] as const;
  for (const [name, width, height] of phones) {
    await startMobileTableAt(page, width, height);
    await page.waitForTimeout(2_100);
    const guide = page.getByTestId('mobile-combination-guide');
    await expect(guide, `${name}: guide`).toBeVisible();
    await expect(page.locator('.wireframe-street-badge'), `${name}: street`).toBeVisible();
    await expect(page.locator('.pot-summary'), `${name}: pot`).toBeVisible();
    await expect(page.locator('[data-testid^="wireframe-hand-"] .seat-name-score'), `${name}: hero identity`).toBeVisible();
    await expect(page.locator('.wireframe-hero-slot .focal-card-frame'), `${name}: hero cards`).toHaveCount(4);
    const cardText = await page.locator('.wireframe-hero-slot .focal-card-frame .card-face--pocket').evaluateAll((faces) => faces.map((face) => {
      const faceBox = face.getBoundingClientRect();
      const rank = face.querySelector<HTMLElement>('.card-rank')?.getBoundingClientRect();
      const suit = face.querySelector<HTMLElement>('.card-suit')?.getBoundingClientRect();
      const clipped = [rank, suit].some((target) => {
        if (!target) return true;
        let parent = face.parentElement;
        while (parent && parent !== document.body) {
          const style = getComputedStyle(parent);
          if (style.overflow !== 'visible' || style.overflowX !== 'visible' || style.overflowY !== 'visible') {
            const box = parent.getBoundingClientRect();
            if (target.left < box.left - 1 || target.right > box.right + 1 || target.top < box.top - 1 || target.bottom > box.bottom + 1) {
              return true;
            }
          }
          parent = parent.parentElement;
        }
        return false;
      });
      return { face: faceBox, rank, suit, clipped };
    }));
    expect(cardText, `${name}: hero card faces`).toHaveLength(4);
    cardText.forEach(({ face, rank, suit, clipped }, index) => {
      expect(rank, `${name}: card ${index + 1} rank`).toBeTruthy();
      expect(suit, `${name}: card ${index + 1} suit`).toBeTruthy();
      expect(rank!.left).toBeGreaterThanOrEqual(face.left - 1);
      expect(rank!.right).toBeLessThanOrEqual(face.right + 1);
      expect(rank!.top).toBeGreaterThanOrEqual(face.top - 1);
      expect(rank!.bottom).toBeLessThanOrEqual(face.bottom + 1);
      expect(suit!.left).toBeGreaterThanOrEqual(face.left - 1);
      expect(suit!.right).toBeLessThanOrEqual(face.right + 1);
      expect(suit!.top).toBeGreaterThanOrEqual(face.top - 1);
      expect(suit!.bottom).toBeLessThanOrEqual(face.bottom + 1);
      expect(face.width).toBeGreaterThan(18);
      expect(face.height).toBeGreaterThan(26);
      expect(rank!.width).toBeGreaterThan(0);
      expect(rank!.height).toBeGreaterThan(0);
      expect(suit!.width).toBeGreaterThan(0);
      expect(suit!.height).toBeGreaterThan(0);
      expect(clipped, `${name}: card ${index + 1} glyph is clipped`).toBe(false);
    });
    await expect(page.locator('.action-dock'), `${name}: action dock`).toBeVisible();
    const overflow = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll<HTMLElement>('.wireframe-table, .mobile-combination-guide, .wireframe-hero-slot .seat-name-score, .wireframe-hero-slot .focal-card-frame, .action-dock'));
      return items.filter((item) => {
        const box = item.getBoundingClientRect();
        return box.left < -1 || box.right > innerWidth + 1 || box.top < -1 || box.bottom > innerHeight + 1;
      }).map((item) => ({ className: item.className, testId: item.dataset.testid, box: item.getBoundingClientRect().toJSON() }));
    });
    expect(overflow, `${name}: an essential element exits viewport`).toEqual([]);
    const overlap = await page.evaluate(() => {
      const guide = document.querySelector<HTMLElement>('[data-testid="mobile-combination-guide"]')!.getBoundingClientRect();
      const cards = Array.from(document.querySelectorAll<HTMLElement>('.wireframe-hero-slot .focal-card-frame'))
        .map((card) => card.getBoundingClientRect().toJSON());
      return { count: cards.filter((box) => box.bottom > guide.top && box.top < guide.bottom).length, guide: guide.toJSON(), cards };
    });
    expect(overlap.count, `${name}: hero cards overlap guide`).toBe(0);
  }
});

test('mobile hero cards fill their zone and combination hints are replaced by outlines', async ({ page }) => {
  await startMobileTable(page);
  await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2_100);
  await expect.poll(() => page.locator('.wireframe-hero-slot .focal-card-frame').evaluateAll((cards) => (
    cards.length === 4 && cards.every((card) => {
      const box = card.getBoundingClientRect();
      return box.width > 1 && box.height > 1;
    })
  ))).toBe(true);

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
  await expect(hint).toBeHidden({ timeout: 30_000 });
  await expect(page.locator('.wireframe-hero-slot .combo-card-high, .wireframe-hero-slot .combo-card-low').first()).toBeVisible();
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
      expect(card.width / card.height, `opponent ${index + 1} card ${cardIndex + 1} ratio`).toBeCloseTo(92 / 132, 1);
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
