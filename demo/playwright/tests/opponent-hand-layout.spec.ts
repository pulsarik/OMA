import { expect, test } from '@playwright/test';

const ROW_MIN_WIDTH = 220;

async function startTable(page: import('@playwright/test').Page, seats: number) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption(String(seats));
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByTestId('opponents-grid')).toBeVisible();
  await expect.poll(() => page.getByTestId('opponents-grid').locator('.deal-card').evaluateAll((cards) => (
    cards.every((card) => card.getAnimations().every((animation) => animation.playState === 'finished'))
  ))).toBe(true);
}

test('wide opponent slots use the table arc and a straight card row', async ({ page }) => {
  await page.setViewportSize({ width: 1558, height: 1037 });
  await startTable(page, 6);

  const zones = page.locator('[data-testid^="opponent-hand-zone-"]');
  const result = await zones.evaluateAll((items, rowMinWidth) => items.map((zone) => {
    const zoneBox = zone.getBoundingClientRect();
    const cards = Array.from(zone.querySelectorAll<HTMLElement>('[data-hand-card-index] .opponent-card'))
      .map((card) => card.getBoundingClientRect());
    const nameBox = zone.querySelector<HTMLElement>('.seat-topline .seat-name-score')?.getBoundingClientRect();
    const statusBox = zone.querySelector<HTMLElement>('.seat-action-bubble')?.getBoundingClientRect();
    return {
      slotWidth: zoneBox.width,
      tops: cards.map((card) => card.top),
      lefts: cards.map((card) => card.left),
      widths: cards.map((card) => card.width),
      cardsCenter: cards.length
        ? (Math.min(...cards.map((card) => card.left)) + Math.max(...cards.map((card) => card.right))) / 2
        : 0,
      zoneCenter: zoneBox.left + zoneBox.width / 2,
      nameRight: nameBox?.right ?? 0,
      statusLeft: statusBox?.left ?? null,
      topLabelBottom: Math.max(nameBox?.bottom ?? 0, statusBox?.bottom ?? 0),
      firstCardTop: cards.length ? Math.min(...cards.map((card) => card.top)) : 0,
      visibleCardCount: cards.filter((card) => card.width > 1 && card.height > 1).length,
      rowMode: zoneBox.width >= Number(rowMinWidth),
    };
  }), ROW_MIN_WIDTH);
  expect(result.every((zone) => zone.rowMode)).toBe(true);
  const slotWidths = result.map((zone) => zone.slotWidth);
  expect(Math.max(...slotWidths) - Math.min(...slotWidths)).toBeLessThanOrEqual(2);
  result.forEach((zone) => {
    expect(Math.max(...zone.tops) - Math.min(...zone.tops)).toBeLessThanOrEqual(14);
    expect(zone.visibleCardCount).toBe(4);
    expect(Math.abs(zone.cardsCenter - zone.zoneCenter)).toBeLessThanOrEqual(2);
    expect(Math.abs(zone.nameRight - zone.zoneCenter)).toBeLessThanOrEqual(2);
    if (zone.statusLeft !== null) {
      expect(Math.abs(zone.statusLeft - zone.zoneCenter)).toBeLessThanOrEqual(2);
    }
    expect(zone.firstCardTop - zone.topLabelBottom).toBeGreaterThanOrEqual(4);
    expect(new Set(zone.lefts.map((left) => Math.round(left))).size).toBe(4);
    zone.lefts.slice(1).forEach((left, index) => {
      expect(left).toBeGreaterThan(zone.lefts[index] + zone.widths[index] * 0.5);
    });
  });
});

test('narrow opponent slots use one straight row with at most 40 percent overlap', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startTable(page, 4);

  const zones = page.locator('[data-testid^="opponent-hand-zone-"]');
  const result = await zones.evaluateAll((items, rowMinWidth) => items.map((zone) => {
    const zoneBox = zone.getBoundingClientRect();
    const cards = Array.from(zone.querySelectorAll<HTMLElement>('[data-hand-card-index]'))
      .sort((a, b) => Number(a.dataset.handCardIndex) - Number(b.dataset.handCardIndex))
      .map((frame) => {
        const card = frame.querySelector<HTMLElement>('.opponent-card')!;
        return { box: card.getBoundingClientRect(), transform: getComputedStyle(card).transform };
      });
    return {
      slotWidth: zoneBox.width,
      cards,
      rowMode: zoneBox.width >= Number(rowMinWidth),
    };
  }), ROW_MIN_WIDTH);

  expect(result.every((zone) => !zone.rowMode)).toBe(true);
  result.forEach(({ cards }) => {
    expect(cards).toHaveLength(4);
    const tops = cards.map(({ box }) => box.top);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
    cards.slice(1).forEach(({ box }, index) => {
      const overlap = Math.max(0, cards[index].box.right - box.left);
      expect(overlap).toBeLessThanOrEqual(cards[index].box.width * .4 + 1);
    });
  });
});

test('thinking state highlights the name without moving the opponent cards', async ({ page }) => {
  await page.setViewportSize({ width: 1558, height: 1037 });
  await startTable(page, 6);

  const zone = page.locator('[data-testid^="opponent-hand-zone-"].is-thinking').first();
  await expect(zone).toHaveClass(/is-thinking/);
  const status = zone.locator('.seat-action-bubble');
  await expect(status).toBeVisible();
  const nameBadge = zone.locator('.seat-topline [data-testid^="player-name-"]').locator('..');
  await expect(nameBadge).toHaveCSS('border-top-color', 'rgb(250, 204, 21)');
  await expect(nameBadge).toHaveCSS('animation-name', 'thinking-name-pulse');
  await expect(zone).toHaveCSS('border-top-style', 'none');
  await expect(zone).toBeVisible();
  const cardPositions = () => zone.locator('[data-hand-card-index] .opponent-card').evaluateAll((cards) => (
    cards.map((card) => {
      const box = card.getBoundingClientRect();
      return { left: box.left, top: box.top, width: box.width, height: box.height };
    })
  ));
  const visible = await cardPositions();
  await zone.locator('.seat-action-bubble').evaluate((bubble) => {
    (bubble as HTMLElement).style.display = 'none';
  });
  const hidden = await cardPositions();
  expect(hidden).toEqual(visible);
});
