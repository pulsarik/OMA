import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

test('seven open hands, split winners and both combinations fit the phone', async ({ page }, testInfo) => {
  await mockTable(page);
  await expect(page.getByTestId('mobile-table')).toBeVisible();
  await expect(page.locator('.mt-hand .mt-card[data-card]')).toHaveCount(28);
  await expect(page.locator('.mt-award--high')).toHaveCount(3);
  await expect(page.locator('.mt-award--low')).toHaveCount(3);
  await expect(page.getByTestId('mt-personal-result')).toContainText('Выплата 400');
  for (const kind of ['high', 'low']) {
    await expect(page.getByTestId(`mt-hint-${kind}`).locator('[data-card]')).toHaveCount(5);
    await expect(page.getByTestId(`mt-hint-${kind}`).locator('.mt-combo-source--hole [data-card]')).toHaveCount(2);
  }
  for (const viewport of [{ width: 390, height: 844 }, { width: 360, height: 800 }, { width: 320, height: 667 }, { width: 540, height: 960 }]) {
    await page.setViewportSize(viewport);
    const metrics = await page.getByTestId('mt-scene').evaluate(scene => {
      const rect = (el: Element) => el.getBoundingClientRect();
      const cards = [...scene.querySelectorAll('.mt-card')].map(rect);
      const areas = [...scene.querySelectorAll('.mt-seat, .mt-hints, .mt-personal-result, [data-testid="mt-board-cards"]')].map(el => ({ ...rect(el).toJSON(), name: el.getAttribute('data-testid') ?? el.className }));
      const overlaps = areas.flatMap((a, i) => areas.slice(i + 1).filter(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1).map(b => [a, b]));
      const s = rect(scene);
      return { overlaps, inside: cards.every(c => c.left >= s.left && c.right <= s.right && c.top >= s.top && c.bottom <= s.bottom), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    await page.screenshot({ path: testInfo.outputPath(`showdown-${viewport.width}.png`), fullPage: true });
    expect(metrics, JSON.stringify(viewport)).toEqual({ overlaps: [], inside: true, overflow: false });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: testInfo.outputPath('seven-player-showdown.png'), fullPage: true });
});

test('2–7 seats render all hands; larger tables and desktop use legacy layout', async ({ page }) => {
  const mock = await mockTable(page, fixture(2));
  for (let count = 2; count <= 7; count++) {
    mock.update(fixture(count));
    await expect(page.locator('.mt-seat')).toHaveCount(count);
    await expect(page.locator('.mt-hand .mt-card[data-card]')).toHaveCount(count * 4);
  }
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect(page.getByTestId('poker-table')).toBeVisible();
  await expect(page.getByTestId('mobile-table')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const eight = fixture();
  eight.players.push({ ...eight.players[1], id: 'P8' });
  mock.update(eight);
  await expect(page.getByTestId('poker-table')).toBeVisible();
  await expect(page.getByTestId('mobile-table')).toHaveCount(0);
});

test('live cards stay hidden and duplicate commands are blocked until ack', async ({ page }, testInfo) => {
  const mock = await mockTable(page, fixture(7, false));
  await expect(page.getByRole('button', { name: 'Колл 20', exact: true })).toBeEnabled();
  await expect(page.locator('.mt-seat:not([data-hero=true]) .mt-card--back')).toHaveCount(24);
  await expect(page.locator('.mt-hand .mt-card[data-card]')).toHaveCount(4);
  await page.screenshot({ path: testInfo.outputPath('seven-player-live.png'), fullPage: true });
  await page.getByRole('button', { name: 'Колл 20', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Колл 20', exact: true })).toBeDisabled();
  const moves = mock.messages.filter(m => m.action === 'player_move');
  expect(moves).toHaveLength(1);
  expect(moves[0]).toMatchObject({ move: 'call', handId: 'mobile-fixture', playerId: 'P1', token: 'token' });
  mock.ack(moves[0].commandId);
  mock.update(fixture());
  await expect(page.locator('.mt-hand .mt-card[data-card]')).toHaveCount(28);
  await page.getByRole('button', { name: 'Следующая раздача' }).click();
  await expect(page.getByRole('button', { name: 'Раздаём…' })).toBeDisabled();
  expect(mock.messages.filter(m => m.action === 'new_deal')).toHaveLength(1);
});

test('short-stack call displays actual all-in amount, confirmation and server command', async ({ page }) => {
  const state = fixture(7, false);
  state.stack = 7;
  const mock = await mockTable(page, state);
  await expect(page.getByRole('button', { name: 'All-in 7', exact: true }).first()).toBeEnabled();
  page.once('dialog', d => d.dismiss());
  await page.getByRole('button', { name: 'All-in 7', exact: true }).first().click();
  expect(mock.messages.filter(m => m.action === 'player_move')).toHaveLength(0);
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'All-in 7', exact: true }).first().click();
  await expect.poll(() => mock.messages.filter(m => m.action === 'player_move').length).toBe(1);
  expect(mock.messages.find(m => m.action === 'player_move')?.move).toBe('call');
});

test('side-pot results, long names, English and returning from rules', async ({ page }) => {
  const state = fixture();
  state.players[2].name = 'ОченьДлинноеИмяИгрокаБезПробелов';
  state.result!.sidePots.push({ ...state.result!.sidePots[0], amount: 200 });
  await mockTable(page, state);
  await page.getByRole('link', { name: 'Побочные банки · 2' }).click();
  await expect(page.locator('.mt-details')).toHaveAttribute('open', '');
  await expect(page.locator('.mt-details')).toContainText('Побочный банк 1');
  await page.getByLabel('Меню стола', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Русский / English' }).click();
  await expect(page.getByTestId('mobile-table')).toHaveAttribute('lang', 'en');
  await page.getByRole('button', { name: 'About & rules' }).click();
  await expect(page.getByTestId('about-panel')).toBeVisible();
  await page.getByRole('tab', { name: 'TABLE', exact: true }).click();
  await expect(page.getByTestId('mobile-table')).toBeVisible();
});

test('no-low, folded cards, spectator turns and disconnected controls remain explicit', async ({ page }) => {
  const state = fixture(7, false);
  state.currentPlayerId = 'P2';
  const mock = await mockTable(page, state);
  await expect(page.getByRole('button', { name: 'Колл 20', exact: true })).toBeDisabled();
  mock.update(fixture(7, false));
  await expect(page.getByRole('button', { name: 'Колл 20', exact: true })).toBeEnabled();
  mock.close();
  await expect(page.getByRole('button', { name: 'Колл 20', exact: true })).toBeDisabled();
  await expect(page.locator('.mt-connection--offline')).toBeVisible();
});

test('no qualifying low and folded players retain visible showdown hands', async ({ page }) => {
  const state = fixture();
  state.players[1].folded = true;
  state.result!.noLow = true;
  state.result!.lowWinners = [];
  state.result!.points.forEach(p => { p.high += p.low; p.low = 0; });
  delete state.currentCombo.lowRank;
  delete state.currentCombo.lowCombo;
  delete state.result!.players[0].lowRank;
  delete state.result!.players[0].lowCombo;
  await mockTable(page, state);
  await expect(page.locator('.mt-pot-caption')).toContainText('НЕТ LOW');
  await expect(page.getByTestId('mt-hint-low')).toContainText('Нет подходящей LOW');
  await expect(page.getByTestId('mt-hand-P2').locator('[data-card]')).toHaveCount(4);
  await expect(page.locator('.mt-award--low')).toHaveCount(0);
});

test('finished party shows the winner without offering another hand', async ({ page }) => {
  const state = fixture();
  state.partyTotals.forEach(p => { p.total = p.id === 'P1' ? 7000 : 0; });
  state.players.forEach(p => { p.stack = p.id === 'P1' ? 7000 : 0; });
  state.stack = 7000;
  await mockTable(page, state);
  await expect(page.locator('.mt-finished')).toContainText('Победитель');
  await expect(page.getByRole('button', { name: 'Следующая раздача' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Итоговая статистика' })).toBeVisible();
});

test('real lobby starts an opt-in table, makes a move and deals the next hand', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await expect(page.getByLabel('Seats at the table').locator('option')).toHaveCount(6);
  await page.getByLabel('Your name').fill('Mobile review');
  await page.getByLabel('Seats at the table').selectOption('2');
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByTestId('mobile-table')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Фолд', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Фолд', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Следующая раздача' })).toBeVisible();
  await expect(page.locator('.mt-hand .mt-card[data-card]')).toHaveCount(8);
  await page.getByRole('button', { name: 'Следующая раздача' }).click();
  await expect(page.locator('.mt-table-id')).toContainText('№2');
});
