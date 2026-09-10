import { expect, test } from '@playwright/test';

test('mobile showdown keeps three opponent hands in one row and card text inside faces', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  for (const name of ['Anna', 'Boris', 'Clara']) {
    await page.getByLabel('Bot name').fill(name);
    await page.getByRole('button', { name: 'Add bot' }).click();
  }
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByTestId('mobile-result-dock')).toBeVisible({ timeout: 30_000 });
  const netActions = page.locator('[data-testid^="showdown-net-action-"]');
  await expect(netActions.first()).toBeVisible();
  expect(await netActions.count()).toBeGreaterThan(0);
  const resultNet = await page.getByTestId('showdown-net').first().innerText();
  const heroNet = page.locator('.wireframe-hand:not(.wireframe-opponent-hand) [data-testid^="showdown-net-action-"]');
  if (await heroNet.count()) {
    await expect(heroNet).toHaveText(resultNet.replace(/^Net:\s*/, ''));
  }
  await page.screenshot({ path: 'test-results/mobile-opponent-showdown-visual.png', fullPage: true });

  const geometry = await page.getByTestId('opponents-grid').evaluate((grid) => {
    const zones = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .wireframe-opponent-slot'));
    const cards = Array.from(grid.querySelectorAll<HTMLElement>('.opponent-card')).map((card) => {
      const face = card.getBoundingClientRect();
      const rank = card.querySelector<HTMLElement>('.card-rank')!.getBoundingClientRect();
      const suit = card.querySelector<HTMLElement>('.card-suit')!.getBoundingClientRect();
      return { face, rank, suit };
    });
    return { zoneTops: zones.map((zone) => zone.getBoundingClientRect().top), cards };
  });
  expect(geometry.zoneTops).toHaveLength(3);
  expect(Math.max(...geometry.zoneTops) - Math.min(...geometry.zoneTops)).toBeLessThan(40);
  expect(geometry.cards).toHaveLength(12);
  for (const card of geometry.cards) {
    expect(card.rank.left).toBeGreaterThanOrEqual(card.face.left - 1);
    expect(card.rank.right).toBeLessThanOrEqual(card.face.right + 1);
    expect(card.rank.top).toBeGreaterThanOrEqual(card.face.top - 1);
    expect(card.rank.bottom).toBeLessThanOrEqual(card.face.bottom + 1);
    expect(card.suit.left).toBeGreaterThanOrEqual(card.face.left - 1);
    expect(card.suit.right).toBeLessThanOrEqual(card.face.right + 1);
    expect(card.suit.top).toBeGreaterThanOrEqual(card.face.top - 1);
    expect(card.suit.bottom).toBeLessThanOrEqual(card.face.bottom + 1);
  }

  const comboFrames = await page.locator('.wireframe-table .combo-card-high, .wireframe-table .combo-card-low').evaluateAll((frames) =>
    frames.map((frame) => {
      const style = getComputedStyle(frame);
      return { border: style.borderWidth, shadow: style.boxShadow };
    }),
  );
  expect(comboFrames.length).toBeGreaterThan(0);
  for (const frame of comboFrames) {
    expect(frame.border).toBe('0px');
    expect(frame.shadow).toBe('none');
  }
});
