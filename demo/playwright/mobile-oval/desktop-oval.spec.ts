import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

test.use({ viewport: { width: 1440, height: 1000 } });

test('desktop seats, board, hints and actions fit without overlap for 2–10 players', async ({ page }, testInfo) => {
  const mock = await mockTable(page, fixture(8, false));
  test.setTimeout(90_000);
  for (const viewport of [{ width: 761, height: 800 }, { width: 820, height: 1180 }, { width: 1024, height: 768 }, { width: 1280, height: 632 }, { width: 1440, height: 1000 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
    await page.setViewportSize(viewport);
    for (const mode of ['live', 'showdown', 'side-pots']) {
      const showdown = mode !== 'live';
      for (let count = 2; count <= 10; count++) {
        const state = fixture(count, showdown);
        if (mode === 'side-pots') state.result!.sidePots.push({ ...state.result!.sidePots[0], amount: 200 });
        mock.update(state);
        await expect(page.getByTestId('desktop-table')).toBeVisible();
        await expect(page.locator('.mt-seat')).toHaveCount(count);
        await expect(page.locator('.mt-hand .mt-card[data-card]')).toHaveCount(showdown ? count * 4 : 4);
        const metrics = await page.getByTestId('desktop-table').evaluate(table => {
          const rect = (el: Element) => el.getBoundingClientRect();
          const areas = [...table.querySelectorAll('.mt-seat, .mt-board, .mt-hints, .mt-personal-result, .mt-dock')]
            .map(el => ({ ...rect(el).toJSON(), name: el.getAttribute('data-testid') ?? el.className }));
          const overlaps = areas.flatMap((a, i) => areas.slice(i + 1)
            .filter(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
            .map(b => [a.name, b.name]));
          const scene = rect(table.querySelector('.mt-scene')!);
          const cards = [...table.querySelectorAll('.mt-scene .mt-card')].map(rect);
          return { overlaps, inside: cards.every(c => c.left >= scene.left && c.right <= scene.right && c.top >= scene.top && c.bottom <= scene.bottom), overflow: document.documentElement.scrollWidth > innerWidth,
            verticalOverflow: document.documentElement.scrollHeight > innerHeight,
            controlsVisible: [...table.querySelectorAll('.mt-dock button')].every(el => rect(el).bottom <= innerHeight && rect(el).height >= 34) };
        });
        expect.soft(metrics, `${viewport.width}x${viewport.height}, ${count} seats, ${mode}`).toEqual({ overlaps: [], inside: true, overflow: false, verticalOverflow: false, controlsVisible: true });
        if (count === 6 || count === 10) {
          const path = testInfo.outputPath(`${viewport.width}x${viewport.height}-${count}-${mode}.png`);
          await page.screenshot({ path });
          await testInfo.attach('viewport', { path, contentType: 'image/png' });
        }
      }
    }
  }
});

test('desktop oval table keeps stable geometry when turn status changes', async ({ page }) => {
  const mock = await mockTable(page, fixture(8, false));
  await expect(page.getByTestId('desktop-table')).toBeVisible();

  const measure = async (state: Partial<any>) => {
    mock.update({ ...fixture(8, false), ...state });
    await page.waitForTimeout(50);
    return page.getByTestId('desktop-table').evaluate((table) => {
      const scene = table.querySelector<HTMLElement>('.mt-scene');
      const heroResult = table.querySelector<HTMLElement>('.mt-seat--hero .mt-seat-result');
      return {
        sceneHeight: scene?.getBoundingClientRect().height ?? 0,
        heroHeight: heroResult?.getBoundingClientRect().height ?? 0,
        heroText: heroResult?.textContent?.trim() ?? '',
      };
    });
  };

  const before = await measure({
    currentPlayerId: 'P2',
    currentBet: 20,
    actions: [{ playerId: 'P1', stage: 'river', move: 'raise', amount: 20, at: Date.now() }],
    roundBets: { P1: 0, P2: 20 },
  });
  const after = await measure({
    currentPlayerId: 'P1',
    currentBet: 20,
    actions: [{ playerId: 'P1', stage: 'river', move: 'raise', amount: 20, at: Date.now() }],
    roundBets: { P1: 0, P2: 20 },
  });

  expect(before.heroText.toLowerCase()).toContain('raise');
  expect(after.heroText.toLowerCase()).toContain('your turn');
  expect(Math.abs(after.heroHeight - before.heroHeight)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.sceneHeight - before.sceneHeight)).toBeLessThanOrEqual(2);
});

test('desktop actions, pot dialog, localization and resize preserve the hand', async ({ page }) => {
  const mock = await mockTable(page, fixture(8, false));
  await expect(page.locator('.mt-seat:not([data-hero=true]) .mt-card--back')).toHaveCount(28);
  await page.getByRole('button', { name: 'Call 20', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Call 20', exact: true })).toBeDisabled();
  const moves = mock.messages.filter(m => m.action === 'player_move');
  expect(moves).toHaveLength(1);
  expect(moves[0]).toMatchObject({ move: 'call', playerId: 'P1', handId: 'mobile-fixture', token: 'token' });
  mock.ack(moves[0].commandId);
  mock.update(fixture(8));
  await expect(page.getByTestId('mt-hint-high').locator('[data-card]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Pot 1 200' }).click();
  await expect(page.getByRole('dialog').locator('.mt-contribution')).toHaveCount(8);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'EN / RU', exact: true }).click();
  await expect(page.getByTestId('desktop-table')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('button', { name: 'Следующая раздача' })).toBeVisible();
  await page.getByRole('button', { name: 'EN / RU', exact: true }).click();
  await page.getByRole('button', { name: 'Rules', exact: true }).click();
  await expect(page.getByTestId('about-panel')).toBeVisible();
  await page.getByRole('tab', { name: 'TABLE', exact: true }).click();
  await expect(page.getByTestId('desktop-table')).toBeVisible();
  await page.setViewportSize({ width: 760, height: 844 });
  await expect(page.getByTestId('poker-table')).toBeVisible();
  mock.update(fixture(7));
  await expect(page.getByTestId('mobile-table')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByTestId('desktop-table')).toBeVisible();
  await page.getByRole('button', { name: 'Next deal' }).click();
  expect(mock.messages.filter(m => m.action === 'new_deal')).toHaveLength(1);
});

test.describe('touch tablet', () => {
  test.use({ hasTouch: true, deviceScaleFactor: 1.25 });

  test('Russian side pots fit after rotating without losing the hand', async ({ page }, testInfo) => {
    const state = fixture(10);
    state.result!.sidePots.push({ ...state.result!.sidePots[0], amount: 200 });
    state.players[3].name = 'Очень длинное имя игрока';
    await mockTable(page, state);
    await page.getByRole('button', { name: 'EN / RU', exact: true }).tap();
    await expect(page.getByTestId('desktop-table')).toHaveAttribute('lang', 'ru');
    for (const viewport of [{ width: 1280, height: 632 }, { width: 800, height: 1138 }, { width: 1280, height: 632 }]) {
      await page.setViewportSize(viewport);
      await expect(page.locator('.mt-seat')).toHaveCount(10);
      const metrics = await page.getByTestId('desktop-table').evaluate(table => {
        const boxes = [...table.querySelectorAll('.mt-seat, .mt-board, .mt-hints, .mt-personal-result, .mt-dock')]
          .map(el => ({ ...el.getBoundingClientRect().toJSON(), name: el.getAttribute('data-testid') ?? el.className }));
        return {
          inside: boxes.every(b => b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight),
          overlaps: boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
            && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1).map(b => [a.name, b.name])),
          overflow: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
        };
      });
      await page.screenshot({ path: testInfo.outputPath(`tablet-ru-${viewport.width}x${viewport.height}.png`) });
      expect(metrics, JSON.stringify(viewport)).toEqual({ inside: true, overlaps: [], overflow: false });
    }
    await page.locator('.mt-side-link').tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('.mt-pot-detail')).toHaveCount(2);
  });
});

test('real desktop lobby exposes ten seats and plays through to the next hand', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await expect(page.getByLabel('Seats at the table').locator('option')).toHaveCount(9);
  await page.getByLabel('Your name').fill('Desktop review');
  await page.getByLabel('Seats at the table').selectOption('8');
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByTestId('desktop-table')).toBeVisible();
  await expect(page.locator('.mt-seat')).toHaveCount(8);
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next deal' })).toBeVisible({ timeout: 25000 });
  await page.getByRole('button', { name: 'Next deal' }).click();
  await expect(page.locator('.mt-table-id')).toContainText('№2');
});
