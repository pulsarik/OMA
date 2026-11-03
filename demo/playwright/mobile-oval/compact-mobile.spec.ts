import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

for (const viewport of [
  { width: 320, height: 667 }, { width: 360, height: 640 }, { width: 390, height: 844 },
  { width: 393, height: 852 }, { width: 412, height: 915 },
]) {
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
      mock.advice('Call 20 — the pot odds support continuing with this hand. Watch the next community card and reconsider if another player raises before your next turn.');
      await expect(page.getByTestId('training-advice')).toBeVisible();
      await expect(page.getByTestId('training-advice').locator('strong')).toHaveText('Call 20');
      await expect(page.getByRole('button', { name: 'Call 20', exact: true })).toBeEnabled();
      await expect(page.locator('.mt-raise .mt-limit-pips--diamonds > span')).toHaveCount(3);
      const geometry = await page.getByTestId('mobile-table').evaluate(table => {
        const areas = [...table.querySelectorAll('.mt-seat, .mt-board, .mt-hints, .mt-dock, .mt-header')]
          .map(el => ({ ...el.getBoundingClientRect().toJSON(), name: el.getAttribute('data-testid') ?? el.className }));
        const buttons = [...table.querySelectorAll('.mt-dock button')].map(el => el.getBoundingClientRect());
        const badgesOnCardCorner = [...table.querySelectorAll('.mt-seat')].every(seat => {
          if (!seat.querySelector('.mt-position')) return true;
          const card = seat.querySelector('.mt-hand .mt-card:last-child')!.getBoundingClientRect();
          const badge = seat.querySelector('.mt-hand-positions')!.getBoundingClientRect();
          return badge.left < card.right && badge.right > card.right && badge.top < card.bottom && badge.bottom > card.bottom;
        });
        const rail = table.querySelector('.mt-rail')!.getBoundingClientRect();
        const advice = table.querySelector('[data-testid=training-advice]')!;
        const coachSlot = advice.closest('.training-advice-slot')!;
        const coach = coachSlot.getBoundingClientRect();
        const potSummary = table.querySelector('.mt-pot-summary')!;
        const pot = table.querySelector('.mt-pot')!.getBoundingClientRect();
        const potCaption = table.querySelector('.mt-pot-caption')!.getBoundingClientRect();
        const bounds = (selector: string) => {
          const box = document.querySelector(selector)!.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom, height: box.height };
        };
        const hintsInset = [...table.querySelectorAll('.mt-combo-title, .mt-preflop-hint')].every(el => {
          const hint = el.getBoundingClientRect();
          return hint.left >= rail.left + 12 && hint.right <= rail.right - 12 && hint.bottom <= rail.bottom - 10;
        });
        return {
          inside: areas.every(b => b.top >= 0 && b.bottom <= innerHeight + 1 && b.left >= 0 && b.right <= innerWidth),
          overlaps: areas.flatMap((a, i) => areas.slice(i + 1).filter(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
            && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1).map(b => [a.name, b.name])),
          overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight + 1,
          scrollHeight: document.documentElement.scrollHeight,
          bodyHeight: document.body.scrollHeight,
          shell: bounds('.mt-shell'),
          scene: bounds('.mt-scene'),
          dock: bounds('.mt-dock'),
          coach: { top: coach.top, bottom: coach.bottom, height: coach.height },
          coachInPotSummary: potSummary.contains(coachSlot),
          coachAbovePot: coach.bottom <= potSummary.getBoundingClientRect().top,
          potCaptionSingleLine: potCaption.height <= 16,
          potCaptionInline: Math.abs((potCaption.top + potCaption.bottom) / 2 - (pot.top + pot.bottom) / 2) <= 2,
          coachInsideRail: coach.left >= rail.left && coach.right <= rail.right
            && coach.top >= rail.top && coach.bottom <= rail.bottom,
          touchTargets: buttons.every(b => b.height >= 44 && b.width >= 44),
          badgesOnCardCorner, hintsInset,
        };
      });
      expect(geometry, `${stage}: ${JSON.stringify(geometry)}`).toMatchObject({
        inside: true, overlaps: [], overflow: false, touchTargets: true, badgesOnCardCorner: true,
        hintsInset: true, coachAbovePot: true, potCaptionSingleLine: true, potCaptionInline: true, coachInsideRail: true,
      });
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
    await expect(page.getByRole('button', { name: 'Play on', exact: true })).toBeInViewport();
    await expect(page.getByTestId('replay-current-deal').locator('.mt-limit-pips--hearts > span')).toHaveCount(3);
    const replay = await page.getByTestId('replay-current-deal').filter({ visible: true }).boundingBox();
    const next = await page.locator('.mt-next').boundingBox();
    expect(replay!.x).toBeGreaterThanOrEqual(0);
    expect(replay!.x + replay!.width).toBeLessThanOrEqual(viewport.width);
    expect(replay!.width).toBeGreaterThanOrEqual(76);
    expect(replay!.height).toBeGreaterThanOrEqual(44);
    expect(next!.width).toBeGreaterThan(replay!.width * 2);
    await page.screenshot({ path: testInfo.outputPath('showdown.png'), fullPage: true });
    await page.getByTestId('replay-current-deal').filter({ visible: true }).click();
    expect(mock.messages.filter(m => m.action === 'replay_deal')).toHaveLength(1);
  });
}

test('mobile advice overlays the table without moving its content or controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const initial = fixture(4, false);
  const state = {
    ...initial,
    players: initial.players.map((player, index) => ({ ...player, isBot: index > 0 })),
  };
  const mock = await mockTable(page, state);
  await expect(page.getByTestId('mobile-table')).toBeVisible();

  const measure = () => page.getByTestId('mobile-table').evaluate(table => (
    ['.mt-scene', '.mt-board', '.mt-hero-anchor', '.mt-hints', '.mt-dock'].map(selector => {
      const { x, y, width, height } = table.querySelector(selector)!.getBoundingClientRect();
      return { x, y, width, height };
    })
  ));
  const before = await measure();
  const potGeometryBefore = await page.getByTestId('mobile-table').evaluate(table => {
    const pot = table.querySelector('.mt-pot')!.getBoundingClientRect();
    const caption = table.querySelector('.mt-pot-caption')!.getBoundingClientRect();
    return {
      pot: { x: pot.x, y: pot.y, width: pot.width, height: pot.height },
      caption: { x: caption.x, y: caption.y, width: caption.width, height: caption.height },
    };
  });
  expect(potGeometryBefore.caption.height).toBeLessThanOrEqual(16);
  expect(Math.abs(
    potGeometryBefore.caption.y + potGeometryBefore.caption.height / 2
      - potGeometryBefore.pot.y - potGeometryBefore.pot.height / 2,
  )).toBeLessThanOrEqual(2);
  mock.advice('Check — you can stay in the hand without paying more right now.');
  await expect(page.getByTestId('training-advice')).toBeVisible();
  expect(await measure()).toEqual(before);
  await expect(page.getByTestId('training-advice')).toBeVisible();
  await page.locator('.mt-street').click();
  await expect(page.getByTestId('training-advice')).toHaveCount(0);
});

test('interface language survives reload and Russian coach text fits the small screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.addInitScript(() => localStorage.setItem('omaha-commentary', JSON.stringify({ mode: 'off', locale: 'ru' })));
  const state = fixture(7, false);
  const mock = await mockTable(page, { ...state, players: state.players.map(p => ({ ...p, isBot: p.id !== 'P1' })) });
  await page.getByLabel('Table menu', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Interface language').selectOption('ru');
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
