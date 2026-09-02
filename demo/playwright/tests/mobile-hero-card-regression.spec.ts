import { expect, Page, test } from '@playwright/test';

async function startMobileTable(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-table').getByText('Anna', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByTestId('poker-table')).toBeVisible();
}

test('mobile 390x844 keeps four hero cards visible and geometrically valid one second after turn', async ({ page }) => {
  await startMobileTable(page);

  // The turn is the stable synchronization point for the post-deal layout.
  await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1_000);

  const heroSlot = page.locator('.wireframe-hero-slot');
  const cards = heroSlot.locator('.focal-card-frame');
  await expect(cards).toHaveCount(4);

  for (let index = 0; index < 4; index += 1) {
    await expect(cards.nth(index), `hero card ${index + 1} visibility`).toBeVisible();
  }

  const geometry = await heroSlot.evaluate((slot) => {
    const slotBox = slot.getBoundingClientRect();
    const viewport = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    const cards = Array.from(slot.querySelectorAll<HTMLElement>('.focal-card-frame'))
      .map((card) => {
        const box = card.getBoundingClientRect();
        return {
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
          ratio: box.width / box.height,
        };
      });
    return { slot: slotBox.toJSON(), viewport, cards };
  });

  expect(geometry.cards).toHaveLength(4);
  geometry.cards.forEach((card, index) => {
    expect(card.width, `hero card ${index + 1} width`).toBeGreaterThan(1);
    expect(card.height, `hero card ${index + 1} height`).toBeGreaterThan(1);
    expect(card.left, `hero card ${index + 1} exits hero slot left`).toBeGreaterThanOrEqual(geometry.slot.left - 3);
    expect(card.right, `hero card ${index + 1} exits hero slot right`).toBeLessThanOrEqual(geometry.slot.right + 3);
    expect(card.top, `hero card ${index + 1} exits hero slot top`).toBeGreaterThanOrEqual(geometry.slot.top - 3);
    expect(card.bottom, `hero card ${index + 1} exits hero slot bottom`).toBeLessThanOrEqual(geometry.slot.bottom + 3);
    expect(card.left, `hero card ${index + 1} exits viewport left`).toBeGreaterThanOrEqual(geometry.viewport.left - 1);
    expect(card.right, `hero card ${index + 1} exits viewport right`).toBeLessThanOrEqual(geometry.viewport.right + 1);
    expect(card.top, `hero card ${index + 1} exits viewport top`).toBeGreaterThanOrEqual(geometry.viewport.top - 1);
    expect(card.bottom, `hero card ${index + 1} exits viewport bottom`).toBeLessThanOrEqual(geometry.viewport.bottom + 1);
    expect(card.ratio, `hero card ${index + 1} ratio`).toBeCloseTo(92 / 132, 2);
  });
});
