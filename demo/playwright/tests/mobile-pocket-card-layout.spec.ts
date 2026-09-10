import { expect, test } from '@playwright/test';

test('320px pocket cards use the shared scaled card layout', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });

  const cards = page.locator('.wireframe-hand:not(.wireframe-opponent-hand) .card-face--pocket');
  await expect(cards).toHaveCount(4);
  await cards.evaluateAll((faces) => {
    const suits = ['♣', '♠', '♥', '♦'];
    faces.forEach((face, index) => {
      const rank = face.querySelector<HTMLElement>('.card-rank')!;
      rank.classList.add('card-rank--ten');
      rank.textContent = '10';
      face.querySelector<HTMLElement>('.card-suit')!.textContent = suits[index];
    });
  });

  const geometry = await cards.evaluateAll((faces) => faces.map((face) => {
    const faceBox = face.getBoundingClientRect();
    const rank = face.querySelector<HTMLElement>('.card-rank')!.getBoundingClientRect();
    const suit = face.querySelector<HTMLElement>('.card-suit')!.getBoundingClientRect();
    return {
      face: { left: faceBox.left, right: faceBox.right, top: faceBox.top, bottom: faceBox.bottom, width: faceBox.width },
      rank: rank.toJSON(),
      suit: suit.toJSON(),
    };
  }));

  for (const card of geometry) {
    expect(card.rank.left).toBeGreaterThanOrEqual(card.face.left - 1);
    expect(card.suit.left).toBeGreaterThanOrEqual(card.face.left - 1);
    expect(card.rank.right).toBeLessThanOrEqual(card.face.right + 1);
    expect(card.suit.right).toBeLessThanOrEqual(card.face.right + 1);
    expect(card.rank.top).toBeGreaterThanOrEqual(card.face.top - 1);
    expect(card.suit.bottom).toBeLessThanOrEqual(card.face.bottom + 1);
    expect(card.rank.bottom).toBeLessThanOrEqual(card.suit.top + 2);
  }

  for (let index = 1; index < geometry.length; index += 1) {
    expect(geometry[index].face.left - geometry[index - 1].face.right).toBeGreaterThanOrEqual(1.5);
    expect(geometry[index].face.left - geometry[index - 1].face.right).toBeLessThanOrEqual(4);
  }
});
