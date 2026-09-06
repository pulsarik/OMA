import { expect, test } from '@playwright/test';

test('mobile opponent card rank and suit stay readable from 3 to 8 seats', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 390, height: 844 });

  for (const seats of [3, 4, 5, 6, 7, 8]) {
    await page.goto('/');
    await page.getByRole('button', { name: 'Create a table' }).click();
    await page.getByLabel('Your name').fill('Dima');
    await page.getByLabel('Seats at the table').selectOption(String(seats));
    await page.getByRole('button', { name: 'Create table' }).click();
    await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);

    await expect(page.getByRole('button', { name: /Start game/ })).toBeEnabled();
    await page.getByRole('button', { name: /Start game/ }).click();
    await expect(page.getByTestId('poker-table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Fold' }).click();
    await expect(page.getByTestId('mobile-result-dock')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => page.getByTestId('opponents-grid').locator('[data-player-seat]').count())
      .toBeGreaterThan(0);
    await expect.poll(() => page.getByTestId('opponents-grid').locator('.deal-card').evaluateAll((cards) => (
      cards.length > 0 && cards.every((card) => card.getAnimations().every((animation) => animation.playState === 'finished'))
    ))).toBe(true);

    const cards = await page.getByTestId('opponents-grid').locator('.card-face').evaluateAll((faces) => faces.map((face) => {
      const faceBox = face.getBoundingClientRect();
      const rankBox = face.querySelector<HTMLElement>('.card-rank')!.getBoundingClientRect();
      const suitBox = face.querySelector<HTMLElement>('.card-suit')!.getBoundingClientRect();
      return { face: faceBox.toJSON(), rank: rankBox.toJSON(), suit: suitBox.toJSON() };
    }));

    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.rank.left).toBeGreaterThanOrEqual(card.face.left - 1);
      expect(card.rank.right).toBeLessThanOrEqual(card.face.right + 1);
      expect(card.suit.left).toBeGreaterThanOrEqual(card.face.left - 1);
      expect(card.suit.right).toBeLessThanOrEqual(card.face.right + 1);
      expect(card.rank.top).toBeGreaterThanOrEqual(card.face.top - 1);
      expect(card.suit.bottom).toBeLessThanOrEqual(card.face.bottom + 1);
      expect(card.rank.bottom).toBeLessThanOrEqual(card.suit.top + 1);
    }
  }
});
