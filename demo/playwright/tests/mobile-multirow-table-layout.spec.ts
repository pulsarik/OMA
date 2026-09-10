import { expect, Page, test } from '@playwright/test';

async function startMobileTable(page: Page, seats: number) {
  await page.setViewportSize({ width: 510, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption(String(seats));
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByTestId('poker-table')).toBeVisible();
  await expect.poll(() => page.getByTestId('poker-table').locator('.deal-card').evaluateAll((cards) => (
    cards.length > 0 && cards.every((card) => card.getAnimations().every((animation) => animation.playState === 'finished'))
  ))).toBe(true);
}

test('mobile multi-row tables keep opponent cards equal and hero cards on the felt', async ({ page }) => {
  for (const seats of [7, 8]) {
    await startMobileTable(page, seats);

    const metrics = await page.getByTestId('poker-table').evaluate((table) => {
      const box = (element: Element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
      };
      const tableBox = box(table);
      const rows = Array.from(table.querySelectorAll<HTMLElement>('.wireframe-opponents-row'));
      const opponentCards = rows.flatMap((row) => Array.from(row.querySelectorAll<HTMLElement>('.deal-card')).map(box));
      const heroZone = table.querySelector<HTMLElement>('.wireframe-player-zone');
      const heroCards = heroZone
        ? Array.from(heroZone.querySelectorAll<HTMLElement>('.wireframe-hero-slot .deal-card')).map(box)
        : [];
      const guide = document.querySelector<HTMLElement>('.mobile-combination-guide');
      const actionDock = document.querySelector<HTMLElement>('.action-dock');

      return {
        table: tableBox,
        rowCount: rows.length,
        opponentCards,
        heroZone: heroZone ? box(heroZone) : null,
        heroCards,
        guide: guide ? box(guide) : null,
        actionDock: actionDock ? box(actionDock) : null,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          documentHeight: document.documentElement.scrollHeight,
          bodyHeight: document.body.scrollHeight,
        },
      };
    });

    expect(metrics.rowCount, `${seats}-seat row count`).toBe(2);
    expect(metrics.opponentCards.length, `${seats}-seat opponent card count`).toBe((seats - 1) * 4);

    const widths = metrics.opponentCards.map((card) => card.width);
    const heights = metrics.opponentCards.map((card) => card.height);
    expect(Math.max(...widths) - Math.min(...widths), `${seats}-seat opponent card widths`).toBeLessThanOrEqual(0.5);
    expect(Math.max(...heights) - Math.min(...heights), `${seats}-seat opponent card heights`).toBeLessThanOrEqual(0.5);

    expect(metrics.heroZone).toBeTruthy();
    expect(metrics.heroZone!.bottom).toBeLessThanOrEqual(metrics.table.bottom + 1);
    metrics.heroCards.forEach((card, index) => {
      expect(card.left, `${seats}-seat hero card ${index + 1} left`).toBeGreaterThanOrEqual(metrics.table.left - 1);
      expect(card.right, `${seats}-seat hero card ${index + 1} right`).toBeLessThanOrEqual(metrics.table.right + 1);
      expect(card.top, `${seats}-seat hero card ${index + 1} top`).toBeGreaterThanOrEqual(metrics.table.top - 1);
      expect(card.bottom, `${seats}-seat hero card ${index + 1} bottom`).toBeLessThanOrEqual(metrics.table.bottom + 1);
    });
    expect(metrics.guide).toBeTruthy();
    expect(metrics.guide!.top).toBeGreaterThanOrEqual(metrics.table.bottom - 1);
    expect(metrics.actionDock).toBeTruthy();
    expect(metrics.actionDock!.bottom).toBeLessThanOrEqual(metrics.viewport.height + 1);
    expect(metrics.viewport.documentHeight).toBeLessThanOrEqual(metrics.viewport.height + 1);
    expect(metrics.viewport.bodyHeight).toBeLessThanOrEqual(metrics.viewport.height + 1);
  }
});
