import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

test.use({ viewport: { width: 1440, height: 1000 } });

test('desktop coach uses the full action panel width on a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 956, height: 467 });
  const initial = fixture(6, false);
  const state = { ...initial, players: initial.players.map((player, index) => ({ ...player, isBot: index > 0 })) };
  const mock = await mockTable(page, state);
  mock.advice('Call twenty. The pot odds support continuing with this hand.');

  const advice = page.getByTestId('training-advice');
  await expect(advice).toBeVisible();
  const geometry = await advice.evaluate(element => {
    const adviceBox = element.getBoundingClientRect();
    const dockBox = element.closest('.mt-dock')!.getBoundingClientRect();
    return { adviceWidth: adviceBox.width, dockWidth: dockBox.width, left: adviceBox.left, right: adviceBox.right };
  });
  expect(geometry.adviceWidth).toBeGreaterThan(geometry.dockWidth * 0.9);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(956);
});

test('desktop table keeps its size across streets, showdown and the next deal', async ({ page }) => {
  const mock = await mockTable(page, fixture(4, false));
  for (const viewport of [
    { width: 1440, height: 1000 }, { width: 1920, height: 1080 },
    { width: 2560, height: 1440 },
  ]) {
    await page.setViewportSize(viewport);
    let initial: { x: number; y: number; width: number; height: number }[] | undefined;
    for (const stage of ['preflop', 'flop', 'turn', 'river', 'showdown', 'preflop']) {
      const state = fixture(4, stage === 'showdown');
      state.stage = stage;
      state.community = state.community.slice(0, stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5);
      if (stage === 'preflop') state.currentCombo = undefined;
      mock.update(state);
      await expect(page.locator('.mt-street')).toHaveText(new RegExp(stage, 'i'));
      const geometry = await page.getByTestId('desktop-table').evaluate(table =>
        ['.mt-scene', '.mt-rail', '.dt-bottom-panel'].map(selector => {
          const { x, y, width, height } = table.querySelector(selector)!.getBoundingClientRect();
          return { x, y, width, height };
        }));
      initial ??= geometry;
      expect(geometry, `${viewport.width}x${viewport.height}, ${stage}`).toEqual(initial);
    }
  }
});

test('desktop seats, board, hints and actions fit without overlap for 2–10 players', async ({ page }, testInfo) => {
  const mock = await mockTable(page, fixture(8, false));
  test.setTimeout(90_000);
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1920, height: 1080 }, { width: 2560, height: 1440 }]) {
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
  await expect(page.getByTestId('desktop-table')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Play on' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Play on' }).click();
  expect(mock.messages.filter(m => m.action === 'new_deal')).toHaveLength(1);
});

test.describe('touch tablet', () => {
  test.use({ hasTouch: true, deviceScaleFactor: 1.25 });

  test('short tablet showdown keeps the board clear of both hands and results', async ({ page }) => {
    const mock = await mockTable(page, fixture(4, true));
    for (const count of [4, 10]) {
      if (count !== 4) mock.update(fixture(count, true));
      for (const viewport of [{ width: 800, height: 632 }, { width: 1280, height: 632 }]) {
        await page.setViewportSize(viewport);
        await expect(page.getByTestId('desktop-table')).toBeVisible();

        const layout = await page.getByTestId('desktop-table').evaluate(table => {
          const rect = (selector: string) => table.querySelector(selector)!.getBoundingClientRect();
          const intersects = (a: DOMRect, b: DOMRect) => (
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2
            && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2
          );
          const board = rect('.mt-board');
          const opponents = [...table.querySelectorAll<HTMLElement>('.mt-seat:not(.mt-seat--hero)')]
            .map(seat => seat.getBoundingClientRect());
          const hero = rect('.mt-seat--hero');
          const result = rect('.mt-personal-result');
          const scene = rect('.mt-scene');
          const centerSeat = opponents.reduce((closest, seat) => (
            Math.abs((seat.left + seat.right) / 2 - (scene.left + scene.right) / 2)
              < Math.abs((closest.left + closest.right) / 2 - (scene.left + scene.right) / 2)
              ? seat : closest
          ));
          const cards = [...table.querySelectorAll('.mt-scene .mt-card')].map(card => card.getBoundingClientRect());
          return {
            boardOverlaps: opponents.some(seat => intersects(board, seat)) || intersects(board, hero),
            heroResultOverlap: intersects(hero, result),
            topSeatGap: board.top - centerSeat.bottom,
            boardHeroGap: hero.top - board.bottom,
            heroResultGap: result.top - hero.bottom,
            panelHeight: rect('.dt-bottom-panel').height,
            badgeCount: table.querySelectorAll('.mt-hand-positions .mt-position').length,
            badgesInHand: [...table.querySelectorAll('.mt-hand-positions .mt-position')].every(badge => {
              const badgeBox = badge.getBoundingClientRect();
              const hand = badge.closest('.mt-hand-cards')!.getBoundingClientRect();
              return badgeBox.left >= hand.left && badgeBox.left <= hand.right;
            }),
            cardWidth: cards[0].width,
            cardRatio: cards[0].height / cards[0].width,
            uniformCards: cards.every(card => Math.abs(card.width - cards[0].width) < 0.5
              && Math.abs(card.height - cards[0].height) < 0.5),
          };
        });

        expect(layout.boardOverlaps, JSON.stringify({ count, viewport })).toBe(false);
        expect(layout.heroResultOverlap, JSON.stringify({ count, viewport })).toBe(false);
        expect(layout.badgesInHand, JSON.stringify({ count, viewport })).toBe(true);
        expect(layout.badgeCount, JSON.stringify({ count, viewport })).toBeGreaterThanOrEqual(2);
        expect(layout.panelHeight, JSON.stringify({ count, viewport })).toBeLessThan(140);
        expect(layout.topSeatGap, JSON.stringify({ count, viewport })).toBeGreaterThanOrEqual(4);
        expect(layout.boardHeroGap, JSON.stringify({ count, viewport })).toBeGreaterThanOrEqual(4);
        expect(layout.heroResultGap, JSON.stringify({ count, viewport })).toBeGreaterThanOrEqual(6);
        expect(layout.cardWidth, JSON.stringify({ count, viewport })).toBeGreaterThanOrEqual(count <= 7 ? 24 : 18);
        expect(layout.cardRatio, JSON.stringify({ count, viewport })).toBeCloseTo(132 / 92, 1);
        expect(layout.uniformCards, JSON.stringify({ count, viewport })).toBe(true);
      }
    }
  });

  test('table, reserved coach space and action buttons fit without scrolling', async ({ page }) => {
    const state = fixture(4, false);
    state.players[1].isBot = true;
    state.forkRootCode = 'PA0001';
    await mockTable(page, state);

    for (const viewport of [{ width: 1280, height: 632 }, { width: 800, height: 1138 }]) {
      await page.setViewportSize(viewport);
      await expect(page.getByTestId('desktop-table')).toBeVisible();
      await expect(page.locator('.training-advice-slot')).toBeVisible();
      await expect(page.getByTestId('mt-actions')).toBeVisible();
      mock.advice('Check — you can stay in the hand without paying more right now.');
      await expect(page.getByTestId('training-advice')).toBeVisible();

      const metrics = await page.getByTestId('desktop-table').evaluate(table => {
        const scene = table.querySelector('.mt-scene')!.getBoundingClientRect();
        const panel = table.querySelector('.dt-bottom-panel')!.getBoundingClientRect();
        const coach = table.querySelector('.mt-coach-slot')!.getBoundingClientRect();
        const fieldset = table.querySelector('.mt-dock fieldset')!.getBoundingClientRect();
        const opponents = [...table.querySelectorAll('.mt-seat:not(.mt-seat--hero)')].map(seat => seat.getBoundingClientRect());
        const board = table.querySelector('.mt-board')!.getBoundingClientRect();
        const hero = table.querySelector('.mt-seat--hero')!.getBoundingClientRect();
        const banner = table.querySelector('[data-testid=fork-banner]')?.getBoundingClientRect();
        const coach = table.querySelector('.training-advice-slot')!.getBoundingClientRect();
        const buttons = [...table.querySelectorAll<HTMLButtonElement>('.mt-dock button')]
          .map(button => button.getBoundingClientRect());
        const cards = [...table.querySelectorAll('.mt-scene .mt-card')].map(card => card.getBoundingClientRect());
        const comboCards = [...table.querySelectorAll('.mt-combo .mt-card')].map(card => card.getBoundingClientRect());
        return {
          noScroll: document.documentElement.scrollHeight <= innerHeight,
          sceneVisible: scene.top >= 0 && scene.bottom <= innerHeight && scene.height >= 300,
          coachVisible: coach.top >= 0 && coach.bottom <= innerHeight,
          buttonsVisible: buttons.every(button => button.top >= 0 && button.bottom <= innerHeight),
          sceneBottomGap: panel.top - scene.bottom,
          sceneHeight: scene.height,
          panelHeight: panel.height,
          opponentsBottom: Math.max(...opponents.map(seat => seat.bottom)),
          boardTop: board.top,
          heroBottom: hero.bottom,
          pageHeight: document.documentElement.scrollHeight,
          viewportHeight: innerHeight,
          coachBottom: coach.bottom,
          controlsTop: fieldset.top,
          comboCardCount: comboCards.length,
          comboCardRatios: comboCards.map(card => card.height / card.width),
          comboCardWidths: comboCards.map(card => card.width),
          maxCardHeightRatio: Math.max(...cards.map(card => card.height / card.width)),
          bannerLeft: banner ? banner.left - scene.left : null,
          sceneWidth: scene.width,
        };
      });

      expect(metrics, JSON.stringify({ viewport, metrics })).toMatchObject({
        noScroll: true,
        sceneVisible: true,
        coachVisible: true,
        buttonsVisible: true,
      });
      if (viewport.height <= 700) {
        expect(metrics.sceneBottomGap, JSON.stringify(viewport)).toBeGreaterThanOrEqual(0);
        expect(metrics.maxCardHeightRatio, JSON.stringify(viewport)).toBeLessThanOrEqual(1.45);
        expect(metrics.coachBottom, JSON.stringify(viewport)).toBeLessThanOrEqual(metrics.controlsTop);
        expect(metrics.comboCardCount, JSON.stringify(viewport)).toBeGreaterThanOrEqual(10);
        expect(metrics.comboCardRatios.every(ratio => Math.abs(ratio - 132 / 92) < 0.1), JSON.stringify(viewport)).toBe(true);
        expect(Math.max(...metrics.comboCardWidths) - Math.min(...metrics.comboCardWidths), JSON.stringify(viewport)).toBeLessThan(0.5);
      }
      expect(metrics.bannerLeft, JSON.stringify(viewport)).toBeLessThan(metrics.sceneWidth * 0.05);
    }
  });

  test('English side pots fit after rotating without losing the hand', async ({ page }, testInfo) => {
    const state = fixture(10);
    state.result!.sidePots.push({ ...state.result!.sidePots[0], amount: 200 });
    state.players[3].name = 'Очень длинное имя игрока';
    await mockTable(page, state);
    await expect(page.getByTestId('desktop-table')).toHaveAttribute('lang', 'en');
    for (const viewport of [{ width: 1280, height: 632 }, { width: 800, height: 1138 }, { width: 1280, height: 632 }]) {
      await page.setViewportSize(viewport);
      await expect(page.locator('.mt-seat')).toHaveCount(10);
      await expect(page.getByTestId('mt-actions').locator('fieldset')).toBeHidden();
      const metrics = await page.getByTestId('desktop-table').evaluate(table => {
        const boxes = [...table.querySelectorAll('.mt-seat, .mt-board, .mt-hints, .mt-personal-result, .mt-dock')]
          .map(el => ({ ...el.getBoundingClientRect().toJSON(), name: el.getAttribute('data-testid') ?? el.className }));
        const pageHeight = document.documentElement.scrollHeight;
        return {
        inside: boxes.every(b => b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= pageHeight),
        overlaps: boxes.flatMap((a, i) => boxes.slice(i + 1).filter(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
          && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1).map(b => [a.name, b.name])),
        overflow: document.documentElement.scrollWidth > innerWidth,
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
  await page.getByRole('button', { name: 'Play with bots' }).click();
  await expect(page.getByLabel('Seats at the table').locator('option')).toHaveCount(9);
  await page.getByLabel('Your name').fill('Desktop review');
  await page.getByLabel('Seats at the table').selectOption('8');
  await page.getByRole('button', { name: 'Play now', exact: true }).click();
  await expect(page.getByTestId('desktop-table')).toBeVisible();
  await expect(page.locator('.mt-seat')).toHaveCount(8);
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play on' })).toBeVisible({ timeout: 25000 });
  await page.getByRole('button', { name: 'Play on' }).click();
  await expect(page.getByRole('button', { name: 'Fold', exact: true })).toBeVisible();
});
