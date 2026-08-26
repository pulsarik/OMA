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
    const toplineBox = zone.querySelector<HTMLElement>('.seat-topline')?.getBoundingClientRect();
    const cards = Array.from(zone.querySelectorAll<HTMLElement>('[data-hand-card-index] .opponent-card'))
      .map((card) => card.getBoundingClientRect());
    const cardAreaBox = zone.querySelector<HTMLElement>('.compact-card-row')?.getBoundingClientRect();
    const nameBox = zone.querySelector<HTMLElement>('.seat-topline .seat-name-score')?.getBoundingClientRect();
    const statusElement = zone.querySelector<HTMLElement>('.seat-action-bubble');
    const statusStyle = statusElement ? getComputedStyle(statusElement) : undefined;
    const statusRect = statusElement?.getBoundingClientRect();
    const statusBox = statusRect
      && statusRect.width > 1
      && statusRect.height > 1
      && statusStyle?.display !== 'none'
      && statusStyle.visibility !== 'hidden'
      ? statusRect
      : undefined;
    return {
      slotWidth: zoneBox.width,
      tops: cards.map((card) => card.top),
      lefts: cards.map((card) => card.left),
      widths: cards.map((card) => card.width),
      cardsCenter: cards.length
        ? (Math.min(...cards.map((card) => card.left)) + Math.max(...cards.map((card) => card.right))) / 2
        : 0,
      zoneLeft: zoneBox.left,
      zoneCenter: zoneBox.left + zoneBox.width / 2,
      toplineLeft: toplineBox?.left ?? zoneBox.left,
      toplineWidth: toplineBox?.width ?? zoneBox.width,
      nameLeft: nameBox?.left ?? 0,
      nameRight: nameBox?.right ?? 0,
      nameWidth: nameBox?.width ?? 0,
      statusLeft: statusBox?.left ?? null,
      topLabelBottom: Math.max(nameBox?.bottom ?? 0, statusBox?.bottom ?? 0),
      firstCardTop: cards.length ? Math.min(...cards.map((card) => card.top)) : 0,
      cardAreaTop: cardAreaBox?.top ?? 0,
      cardAreaBottom: cardAreaBox?.bottom ?? 0,
      cardAreaLeft: cardAreaBox?.left ?? 0,
      cardAreaRight: cardAreaBox?.right ?? 0,
      cardRatios: cards.map((card) => card.width / card.height),
      cardsFitArea: cardAreaBox
        ? cards.every((card) => (
          card.top >= cardAreaBox.top - 1
          && card.bottom <= cardAreaBox.bottom + 1
          && card.left >= cardAreaBox.left - 1
          && card.right <= cardAreaBox.right + 1
        ))
        : false,
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
    expect(zone.nameLeft).toBeGreaterThanOrEqual(zone.toplineLeft - 1);
    expect(zone.nameWidth).toBeGreaterThanOrEqual(zone.toplineWidth * .79);
    expect(zone.nameRight).toBeLessThanOrEqual(zone.toplineLeft + zone.toplineWidth * .81 + 2);
    expect(zone.firstCardTop - zone.topLabelBottom).toBeGreaterThanOrEqual(4);
    zone.cardRatios.forEach((ratio) => {
      expect(ratio).toBeCloseTo(92 / 132, 1);
    });
    expect(zone.cardsFitArea).toBe(true);
    expect(new Set(zone.lefts.map((left) => Math.round(left))).size).toBe(4);
    zone.lefts.slice(1).forEach((left, index) => {
      expect(left).toBeGreaterThan(zone.lefts[index] + zone.widths[index] * 0.5);
    });
  });
});

test('revealed opponent card typography follows the card scale', async ({ page }) => {
  await page.setViewportSize({ width: 1558, height: 1037 });
  await startTable(page, 6);

  const typography = await page.locator('[data-testid^="opponent-hand-zone-"]').evaluateAll((zones) => zones.map((zone) => {
    const card = zone.querySelector<HTMLElement>('.opponent-card');
    if (!card) throw new Error('opponent card is missing');
    const rank = document.createElement('span');
    const suit = document.createElement('span');
    rank.className = 'card-rank';
    suit.className = 'card-suit';
    card.append(rank, suit);
    const result = {
      rank: Number.parseFloat(getComputedStyle(rank).fontSize),
      suit: Number.parseFloat(getComputedStyle(suit).fontSize),
    };
    rank.remove();
    suit.remove();
    return result;
  }));

  expect(typography).toHaveLength(5);
  typography.forEach(({ rank, suit }) => {
    expect(rank / suit).toBeCloseTo(48 / 44, 2);
  });
});

test('narrow desktop crowded tables switch to a multi-row opponent grid', async ({ page }) => {
  await page.setViewportSize({ width: 974, height: 1280 });
  await startTable(page, 7);

  const readGridLayout = () => page.getByTestId('opponents-grid').evaluate((grid) => {
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const style = getComputedStyle(grid);
    const zones = Array.from(grid.querySelectorAll<HTMLElement>('[data-testid^="opponent-hand-zone-"]'))
      .map((zone) => {
        const row = zone.querySelector<HTMLElement>('.compact-card-row');
        if (!row) throw new Error('opponent card row is missing');
        const cards = Array.from(row.querySelectorAll<HTMLElement>('.opponent-card')).map((card) => {
          const cardStyle = getComputedStyle(card);
          return {
            box: box(card),
            transform: cardStyle.transform,
            rotate: cardStyle.rotate,
            borderRadius: cardStyle.borderTopLeftRadius,
          };
        });
        const labels = [
          zone.querySelector<HTMLElement>('.seat-topline .seat-name-score'),
          zone.querySelector<HTMLElement>('.seat-action-bubble'),
        ].filter((label): label is HTMLElement => {
          if (!label) return false;
          const style = getComputedStyle(label);
          const rect = label.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 1 && rect.height > 1;
        }).map(box);
        return { zone: box(zone), row: box(row), cards, labels };
      });
    return {
      display: style.display,
      columns: style.gridTemplateColumns.split(' ').filter(Boolean).length,
      zones,
    };
  });

  const assertGridLayout = async (phase: string) => {
    const result = await readGridLayout();
    expect(result.display, `${phase}: opponents row should be a grid`).toBe('grid');
    expect(result.columns, `${phase}: grid column count`).toBe(3);
    expect(result.zones, `${phase}: opponent count`).toHaveLength(6);
    expect(result.zones.every((zone) => zone.zone.width > 200), `${phase}: zones must not collapse`).toBe(true);
    const firstRow = result.zones.slice(0, 3).map((zone) => zone.zone.top);
    const secondRow = result.zones.slice(3).map((zone) => zone.zone.top);
    expect(Math.max(...firstRow) - Math.min(...firstRow), `${phase}: first grid row alignment`).toBeLessThanOrEqual(5);
    expect(Math.max(...secondRow) - Math.min(...secondRow), `${phase}: second grid row alignment`).toBeLessThanOrEqual(5);
    expect(Math.min(...secondRow) - Math.max(...firstRow), `${phase}: grid rows should be separated`).toBeGreaterThan(80);

    result.zones.forEach(({ zone, row, cards, labels }, zoneIndex) => {
      expect(cards, `${phase}: zone ${zoneIndex + 1} card count`).toHaveLength(4);
      expect(row.left, `${phase}: zone ${zoneIndex + 1} row exits left`).toBeGreaterThanOrEqual(zone.left - 1);
      expect(row.right, `${phase}: zone ${zoneIndex + 1} row exits right`).toBeLessThanOrEqual(zone.right + 1);
      const cardSpan = Math.max(...cards.map(({ box: card }) => card.right))
        - Math.min(...cards.map(({ box: card }) => card.left));
      expect(cardSpan, `${phase}: zone ${zoneIndex + 1} cards should fill the zone`)
        .toBeGreaterThanOrEqual(zone.width * .9);
      expect(Math.max(...cards.map(({ box: card }) => card.top))
        - Math.min(...cards.map(({ box: card }) => card.top)), `${phase}: zone ${zoneIndex + 1} cards should share one row`)
        .toBeLessThanOrEqual(2);
      cards.slice(1).forEach(({ box: card }, cardIndex) => {
        expect(card.left, `${phase}: zone ${zoneIndex + 1} cards should not overlap`)
          .toBeGreaterThanOrEqual(cards[cardIndex].box.right - 1);
      });
      const firstCardTop = Math.min(...cards.map(({ box: card }) => card.top));
      labels.forEach((label) => {
        expect(label.bottom, `${phase}: zone ${zoneIndex + 1} label overlaps cards`)
          .toBeLessThanOrEqual(firstCardTop - 0.5);
      });
      cards.forEach(({ box: card, transform, rotate, borderRadius }, cardIndex) => {
        expect(transform, `${phase}: zone ${zoneIndex + 1} card ${cardIndex + 1} transform`).toBe('none');
        expect(rotate, `${phase}: zone ${zoneIndex + 1} card ${cardIndex + 1} rotation`).toBe('none');
        expect(borderRadius, `${phase}: zone ${zoneIndex + 1} card ${cardIndex + 1} radius`).toBe('10%');
      });
    });
  };

  await assertGridLayout('deal');
  await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByRole('button', { name: 'New deal' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.poker-table')).toHaveClass(/is-showdown/);
  await assertGridLayout('showdown');
});

test('narrow opponent slots switch to a straight, non-overlapping row', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startTable(page, 4);

  const zones = page.locator('[data-testid^="opponent-hand-zone-"]');
  const result = await zones.evaluateAll((items, rowMinWidth) => items.map((zone) => {
    const zoneBox = zone.getBoundingClientRect();
    const cards = Array.from(zone.querySelectorAll<HTMLElement>('[data-hand-card-index]'))
      .sort((a, b) => Number(a.dataset.handCardIndex) - Number(b.dataset.handCardIndex))
      .map((frame) => {
        const card = frame.querySelector<HTMLElement>('.opponent-card')!;
        const style = getComputedStyle(card);
        return {
          box: card.getBoundingClientRect(),
          transform: style.transform,
          rotate: style.rotate,
          borderRadius: style.borderTopLeftRadius,
        };
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
      expect(box.left).toBeGreaterThanOrEqual(cards[index].box.right - 1);
    });
    cards.forEach(({ transform, rotate, borderRadius }) => {
      expect(transform).toBe('none');
      expect(rotate).toBe('none');
      expect(borderRadius).toBe('10%');
    });
  });
});

test('active turn highlights the name without adding a status label or moving cards', async ({ page }) => {
  await page.setViewportSize({ width: 1558, height: 1037 });
  await startTable(page, 6);

  const zone = page.locator('[data-testid^="opponent-hand-zone-"].is-thinking').first();
  await expect(zone).toHaveClass(/is-thinking/);
  const status = zone.locator('.seat-action-bubble');
  await expect(status).toHaveCount(0);
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
  const hidden = await cardPositions();
  expect(hidden).toEqual(visible);
});
