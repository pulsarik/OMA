import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

for (const viewport of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 412, height: 915 }, { width: 320, height: 667 }]) {
  test(`mobile cards, coach and actions fit ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const initial = fixture(7, false);
    const state = { ...initial, players: initial.players.map((p, i) => ({ ...p, name: 'VeryLongPlayerNameWithoutSpaces', stack: 1234567, isBot: i > 0 })) };
    const mock = await mockTable(page, state);
    await expect(page.getByTestId('mobile-table')).toBeVisible();
    for (const stage of ['preflop', 'flop', 'turn', 'river']) {
      state.stage = stage;
      state.community = initial.community.slice(0, stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5);
      state.players[1].folded = true;
      state.players[2].stack = 0;
      mock.update(state);
      await expect(page.locator('.mt-street')).toHaveText(new RegExp(stage, 'i'));
      mock.advice('Call twenty. The pot odds support continuing with this hand. Watch the next community card and reconsider if another player raises before your next turn.');
      await expect(page.getByTestId('training-advice')).toBeVisible();
      await expect(page.getByTestId('training-advice').locator('strong')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Call 20', exact: true })).toBeEnabled();
      const geometry = await page.getByTestId('mobile-table').evaluate(table => {
        const areas = [...table.querySelectorAll('.mt-seat, .mt-board, .mt-hints, .mt-dock, .mt-header')]
          .map(el => ({ ...el.getBoundingClientRect().toJSON(), name: el.getAttribute('data-testid') ?? el.className }));
        const buttons = [...table.querySelectorAll('.mt-dock button')].map(el => el.getBoundingClientRect());
        const badgesBesideCards = [...table.querySelectorAll('.mt-seat')].every(seat => {
          const hand = seat.querySelector('.mt-hand')!.getBoundingClientRect();
          return [...seat.querySelectorAll('.mt-position')].every(el => {
            const badge = el.getBoundingClientRect();
            return badge.left >= hand.right && badge.top < hand.bottom && badge.bottom > hand.top;
          });
        });
        return {
          inside: areas.every(b => b.top >= 0 && b.bottom <= innerHeight + 1 && b.left >= 0 && b.right <= innerWidth),
          overlaps: areas.flatMap((a, i) => areas.slice(i + 1).filter(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
            && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1).map(b => [a.name, b.name])),
          overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight + 1,
          touchTargets: buttons.every(b => b.height >= 44 && b.width >= 44),
          badgesBesideCards,
        };
      });
      expect(geometry, stage).toEqual({ inside: true, overlaps: [], overflow: false, touchTargets: true, badgesBesideCards: true });
      if (stage === 'preflop') {
        await expect(page.locator('.mt-preflop-hint')).toHaveCount(1);
        await expect(page.locator('.mt-combo')).toHaveCount(0);
        await page.screenshot({ path: testInfo.outputPath('preflop-coach.png') });
      }
    }
    await page.getByTestId('mt-hint-high').locator('summary').click();
    await expect(page.getByTestId('mt-hint-high').locator('.mt-combo-groups')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Call 20', exact: true })).toBeInViewport();
    await page.getByTestId('mt-hint-high').locator('summary').click();
    state.currentPlayerId = 'P2';
    mock.update(state);
    await expect(page.getByRole('button', { name: 'Call 20', exact: true })).toBeDisabled();
    await expect(page.locator('.mt-seat--hero .mt-seat-result')).not.toContainText('Your turn');
    mock.update({ ...fixture(7), players: state.players });
    await expect(page.getByRole('button', { name: 'Next deal', exact: true })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('showdown.png'), fullPage: true });
  });
}

test('language setting changes the table and advice together and survives reload', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  const state = fixture(7, false);
  const mock = await mockTable(page, { ...state, players: state.players.map(p => ({ ...p, isBot: p.id !== 'P1' })) });
  await page.getByLabel('Table menu', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Interface and advice language').selectOption('ru');
  await page.getByRole('tab', { name: 'СТОЛ', exact: true }).click();
  await expect(page.getByTestId('mobile-table')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('button', { name: 'Колл 20', exact: true })).toBeEnabled();
  mock.advice('Колл двадцать — шансы банка позволяют продолжить. Посмотрите следующую общую карту и оцените ситуацию ещё раз, если соперник повысит ставку перед вашим ходом.', 'ru');
  await expect(page.getByTestId('training-advice')).toContainText('Колл двадцать');
  await expect(page.getByRole('button', { name: '½ БАНКА', exact: true })).toBeVisible();
  expect(await page.getByTestId('mobile-table').evaluate(table => {
    const elements = [...table.querySelectorAll('.mt-seat, .mt-board, .mt-hints, .mt-dock')].map(el => el.getBoundingClientRect());
    return elements.every(b => b.top >= 0 && b.bottom <= innerHeight && b.left >= 0 && b.right <= innerWidth)
      && document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth;
  })).toBe(true);
  await page.reload();
  await expect(page.getByTestId('mobile-table')).toHaveAttribute('lang', 'ru');
});
