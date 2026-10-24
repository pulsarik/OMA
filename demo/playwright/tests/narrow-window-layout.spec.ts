import { expect, Page, test } from '@playwright/test';
import { fixture, mockTable } from '../mobile-oval/fixture';

async function expectTableFits(page: Page) {
  const geometry = await page.evaluate(() => {
    const boxes = (selector: string) => Array.from(document.querySelectorAll(selector))
      .map(element => element.getBoundingClientRect()).filter(box => box.width && box.height);
    const cards = boxes('.wireframe-hero-slot .focal-card-frame');
    const guide = boxes('.mobile-combination-guide')[0];
    const board = boxes('.table-board .focal-card-frame');
    const controls = boxes('.action-dock button, .mobile-result-dock button');
    const table = boxes('.wireframe-table')[0];
    const opponents = boxes('.wireframe-opponent-slot .seat-name-score, .wireframe-opponent-slot .opponent-card-frame');
    const essentials = [...cards, ...board, ...controls, ...boxes('.wireframe-table, .pot-summary, .wireframe-street-badge, .turn-timer-badge')];
    return {
      height: innerHeight, width: innerWidth,
      documentHeight: document.documentElement.scrollHeight,
      documentWidth: document.documentElement.scrollWidth,
      outside: essentials.filter(box => box.left < -1 || box.top < -1 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1),
      cards: cards.map(box => box.toJSON()), board: board.map(box => box.toJSON()), guideTop: guide.top,
      controls: controls.map(box => box.toJSON()),
      opponentsOutsideTable: opponents.filter(box => box.left < table.left || box.right > table.right || box.top < table.top || box.bottom > table.bottom),
    };
  });
  expect(geometry.documentHeight).toBeLessThanOrEqual(geometry.height + 1);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.width);
  expect(geometry.outside).toEqual([]);
  expect(geometry.opponentsOutsideTable).toEqual([]);
  expect(geometry.cards).toHaveLength(4);
  for (const card of geometry.cards) {
    expect(card.width).toBeGreaterThanOrEqual(30);
    expect(card.height).toBeGreaterThanOrEqual(44);
    expect(card.bottom).toBeLessThanOrEqual(geometry.guideTop);
    expect(card.top).toBeGreaterThanOrEqual(Math.max(...geometry.board.map(box => box.bottom)));
  }
  for (const button of geometry.controls) {
    expect(button.width).toBeGreaterThanOrEqual(44);
    expect(button.height).toBeGreaterThanOrEqual(38);
  }
}

for (const height of [521, 633]) {
  for (const players of [2, 4, 7, 9]) {
    test(`285x${height}, ${players} players: turn, timer, waiting and showdown fit`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 285, height });
      const initial = fixture(players, false);
      const mock = await mockTable(page, initial);
      await expect(page.getByRole('button', { name: 'Fold', exact: true })).toBeVisible();
      await expectTableFits(page);
      mock.update({ ...initial, turnDeadline: Date.now() + 20_000 });
      await expect(page.getByTestId('turn-countdown-P1')).toBeVisible();
      await expectTableFits(page);
      await page.screenshot({ path: testInfo.outputPath('turn.png') });
      mock.update({ ...initial, currentPlayerId: 'P2' });
      await expect(page.locator('.action-dock button')).toHaveCount(0);
      await expectTableFits(page);
      mock.update(fixture(players, true));
      await expect(page.getByTestId('mobile-result-dock')).toBeVisible();
      await expect(page.getByTestId('mobile-result-dock').getByRole('button', { name: 'New deal' })).toBeVisible();
      await expectTableFits(page);
      await page.screenshot({ path: testInfo.outputPath('showdown.png') });
    });
  }
}

test('narrow menu keeps views accessible and restores full tabs on resize', async ({ page }) => {
  await page.setViewportSize({ width: 285, height: 521 });
  await mockTable(page, fixture(4, true));
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('tab', { name: 'SETTINGS', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'SETTINGS' })).toBeVisible();
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await page.getByRole('tab', { name: 'TABLE', exact: true }).click();
  await expect(page.getByTestId('poker-table')).toBeVisible();
  for (const width of [319, 320, 360, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    if (width < 320) await expect(menu).toBeVisible();
    else {
      await expect(menu).toBeHidden();
      await expect(page.getByRole('tab', { name: 'TABLE', exact: true })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'SETTINGS', exact: true })).toBeVisible();
    }
  }
});

test('narrow controls send moves and keep server confirmation visible', async ({ page }) => {
  await page.setViewportSize({ width: 285, height: 521 });
  const initial = fixture(9, false);
  const mock = await mockTable(page, initial);
  await page.getByRole('button', { name: 'Call 20', exact: true }).click();
  await expect.poll(() => mock.messages.filter(message => message.action === 'player_move').length).toBe(1);
  const move = mock.messages.find(message => message.action === 'player_move')!;
  expect(move.move).toBe('call');
  await expect(page.locator('.action-dock-status')).toBeVisible();
  await expectTableFits(page);
  mock.ack(move.commandId);
  mock.update({ ...initial, currentPlayerId: 'P2', revision: 2 });
  await expect(page.locator('.action-dock-status')).toBeHidden();
  mock.update({ ...fixture(9, true), revision: 3 });
  await page.getByTestId('mobile-result-dock').getByRole('button', { name: 'New deal' }).click();
  await expect.poll(() => mock.messages.filter(message => message.action === 'new_deal').length).toBe(1);
});
