import { expect, Page, test } from '@playwright/test';

type Rect = { left: number; top: number; right: number; bottom: number; width: number; height: number };

type HandGeometry = {
  zone: Rect;
  row: Rect;
  cards: Rect[];
  cardTransforms: string[];
  cardRotations: string[];
  cardRadii: string[];
  labels: Rect[];
  cardBacks: number;
  cardFaces: number;
};

async function startFilledTable(page: Page, playerCount: number) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption(String(playerCount));
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByTestId('opponents-grid')).toBeVisible();
  await expect.poll(() => page.getByTestId('opponents-grid').locator('.deal-card').evaluateAll((cards) => (
    cards.every((card) => card.getAnimations().every((animation) => animation.playState === 'finished'))
  ))).toBe(true);
}

async function readGeometry(page: Page): Promise<{ table: Rect; grid: Rect; gap: number; hands: HandGeometry[] }> {
  return page.getByTestId('poker-table').evaluate((table) => {
    const rect = (element: Element): Rect => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };
    const gridElement = table.querySelector<HTMLElement>('[data-testid="opponents-grid"]');
    if (!gridElement) throw new Error('opponents grid is missing');
    const hands = Array.from(gridElement.querySelectorAll<HTMLElement>('[data-testid^="opponent-hand-zone-"]'))
      .map((zone): HandGeometry => {
        const row = zone.querySelector<HTMLElement>('.compact-card-row');
        if (!row) throw new Error('opponent card row is missing');
        const cards = Array.from(row.querySelectorAll<HTMLElement>('.opponent-card')).map(rect);
        const cardStyles = Array.from(row.querySelectorAll<HTMLElement>('.opponent-card')).map((card) => {
          const style = getComputedStyle(card);
          return {
            transform: style.transform,
            rotate: style.rotate,
            radius: style.borderTopLeftRadius,
          };
        });
        const labels = [
          zone.querySelector<HTMLElement>('.seat-topline .seat-name-score'),
          zone.querySelector<HTMLElement>('.seat-action-bubble'),
        ].filter((label): label is HTMLElement => Boolean(label)).map(rect);
        return {
          zone: rect(zone),
          row: rect(row),
          cards,
          cardTransforms: cardStyles.map(({ transform }) => transform),
          cardRotations: cardStyles.map(({ rotate }) => rotate),
          cardRadii: cardStyles.map(({ radius }) => radius),
          labels,
          cardBacks: row.querySelectorAll('[data-testid="card-back"]').length,
          cardFaces: row.querySelectorAll('[data-testid^="card-face-"]').length,
        };
      });
    return {
      table: rect(table),
      grid: rect(gridElement),
      gap: Number.parseFloat(getComputedStyle(gridElement).columnGap) || 0,
      hands,
    };
  });
}

function assertCardsStayInsideZones(geometry: Awaited<ReturnType<typeof readGeometry>>, phase: string) {
  const opponentCount = geometry.hands.length;
  const expectedZoneWidth = (geometry.grid.width - geometry.gap * Math.max(0, opponentCount - 1)) / opponentCount;
  geometry.hands.forEach((hand, index) => {
    expect(Math.abs(hand.zone.width - expectedZoneWidth), `${phase}: zone ${index + 1} width`)
      .toBeLessThanOrEqual(Math.max(6, expectedZoneWidth * 0.02));
    expect(hand.cards, `${phase}: zone ${index + 1} should contain four cards`).toHaveLength(4);
    const cardSpan = Math.max(...hand.cards.map((card) => card.right))
      - Math.min(...hand.cards.map((card) => card.left));
    expect(cardSpan, `${phase}: zone ${index + 1} cards should occupy the zone`)
      .toBeGreaterThanOrEqual(hand.zone.width * 0.9);
    expect(cardSpan, `${phase}: zone ${index + 1} cards should stay within the zone`)
      .toBeLessThanOrEqual(hand.zone.width + 2);
    expect(Math.max(...hand.cards.map((card) => card.top)) - Math.min(...hand.cards.map((card) => card.top)),
      `${phase}: zone ${index + 1} cards should stay on one row`).toBeLessThanOrEqual(2);
    hand.cardTransforms.forEach((transform, cardIndex) => {
      expect(transform, `${phase}: zone ${index + 1} card ${cardIndex + 1} should not be transformed`).toBe('none');
    });
    hand.cardRotations.forEach((rotation, cardIndex) => {
      expect(rotation, `${phase}: zone ${index + 1} card ${cardIndex + 1} should not rotate`).toBe('none');
    });
    hand.cardRadii.forEach((radius, cardIndex) => {
      expect(radius, `${phase}: zone ${index + 1} card ${cardIndex + 1} radius should scale with the card`).toBe('12px');
    });
    expect(hand.row.left, `${phase}: row ${index + 1} exits left`).toBeGreaterThanOrEqual(hand.zone.left - 1);
    expect(hand.row.right, `${phase}: row ${index + 1} exits right`).toBeLessThanOrEqual(hand.zone.right + 1);
    hand.cards.forEach((card, cardIndex) => {
      expect(card.left, `${phase}: zone ${index + 1} card ${cardIndex + 1} exits left`)
        .toBeGreaterThanOrEqual(hand.zone.left - 1);
      expect(card.right, `${phase}: zone ${index + 1} card ${cardIndex + 1} exits right`)
        .toBeLessThanOrEqual(hand.zone.right + 1);
      expect(card.top, `${phase}: zone ${index + 1} card ${cardIndex + 1} exits top`)
        .toBeGreaterThanOrEqual(hand.zone.top - 1);
      expect(card.bottom, `${phase}: zone ${index + 1} card ${cardIndex + 1} exits bottom`)
        .toBeLessThanOrEqual(hand.zone.bottom + 1);
    });
  });
}

test('opponent cards fit their table zone from deal through the next round for 2-10 players', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1280, height: 900 });

  for (let playerCount = 2; playerCount <= 10; playerCount += 1) {
    await startFilledTable(page, playerCount);
    const opponents = page.getByTestId('opponents-grid').locator('[data-player-seat]');
    await expect(opponents).toHaveCount(playerCount - 1);

    const beforeReveal = await readGeometry(page);
    expect(beforeReveal.table.width).toBeGreaterThan(beforeReveal.grid.width);
    expect(beforeReveal.hands).toHaveLength(playerCount - 1);
    beforeReveal.hands.forEach((hand, index) => {
      expect(hand.cardBacks, `deal: opponent ${index + 1} should be hidden`).toBe(4);
      expect(hand.cardFaces, `deal: opponent ${index + 1} should not be revealed`).toBe(0);
    });
    assertCardsStayInsideZones(beforeReveal, `${playerCount} players / deal`);

    await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Fold' }).click();
    await expect(page.getByRole('button', { name: 'New deal' })).toBeVisible({ timeout: 30_000 });
    const afterReveal = await readGeometry(page);
    expect(afterReveal.hands).toHaveLength(playerCount - 1);
    afterReveal.hands.forEach((hand, index) => {
      expect(hand.cardBacks, `showdown: opponent ${index + 1} should have no backs`).toBe(0);
      expect(hand.cardFaces, `showdown: opponent ${index + 1} should be revealed`).toBe(4);
    });
    assertCardsStayInsideZones(afterReveal, `${playerCount} players / showdown`);

    await page.getByRole('button', { name: 'New deal' }).click();
    await expect(page.getByText('preflop', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('opponents-grid').locator('[data-player-seat]'))
      .toHaveCount(playerCount - 1);

    const nextDeal = await readGeometry(page);
    nextDeal.hands.forEach((hand, index) => {
      expect(hand.cardBacks, `next deal: opponent ${index + 1} should be hidden`).toBe(4);
      expect(hand.cardFaces, `next deal: opponent ${index + 1} should not be revealed`).toBe(0);
    });
    assertCardsStayInsideZones(nextDeal, `${playerCount} players / next deal`);
  }
});
