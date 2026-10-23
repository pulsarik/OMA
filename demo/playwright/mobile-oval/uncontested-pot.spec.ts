import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

for (const width of [320, 390, 1280]) {
  test(`problem 1006: qualifying low with an uncontested pot (${width}px)`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 632 });

    const state = fixture(6);
    state.potCoins = 160;
    state.community = ['7s', '4d', 'Qc', '3c', '5c'];
    state.folded = true;
    state.hole = ['Tc', '3s', 'Kd', '7h'];
    state.currentCombo = { highRank: 'two pair' };
    state.totalContributions = { P1: 0, P2: 32, P3: 64, P4: 0, P5: 0, P6: 64 };
    state.players.forEach(player => { player.folded = player.id !== 'P6'; });
    state.players[0].hole = state.hole;
    state.players[5].hole = ['2h', '4s', '6d', 'Ac'];
    const result = state.result!;
    Object.assign(result, { potCoins: 160, highWinners: [], lowWinners: [], noLow: true });
    result.players.forEach(player => {
      player.folded = player.id !== 'P6';
      if (player.id === 'P6') Object.assign(player, { highRank: 'straight', lowRank: '5-4-3-2-1' });
    });
    result.points.forEach(score => Object.assign(score, {
      high: 0, low: 0, uncontested: score.id === 'P6' ? 160 : 0, total: score.id === 'P6' ? 160 : 0,
    }));
    Object.assign(result.sidePots[0], {
      amount: 160, eligiblePlayerIds: ['P6'], highWinners: [], lowWinners: [], noLow: true,
      uncontestedWinnerId: 'P6',
      players: result.points.map(score => ({
        id: score.id, high: 0, low: 0, payout: score.total,
        contributed: state.totalContributions[score.id],
        net: score.total - state.totalContributions[score.id], eligible: score.id === 'P6',
      })),
    });
    const mock = await mockTable(page, state);
    const caption = page.locator('.mt-pot-caption');
    const expectedCaption = 'Won without showdown · Whole pot 160';
    await expect(caption).toHaveText(expectedCaption);
    await expect(caption).not.toHaveAttribute('title');
    await expect(page.getByTestId('mt-seat-P6').locator('.mt-return')).toHaveText('Won 160');
    await expect(page.getByTestId('mt-seat-P6')).toContainText('L · 5-4-3-2-1');
    expect(await caption.evaluate(element => {
      const caption = element.getBoundingClientRect();
      return [...document.querySelectorAll('.mt-hand')].some(hand => {
        const cards = hand.getBoundingClientRect();
        return Math.min(caption.right, cards.right) > Math.max(caption.left, cards.left)
          && Math.min(caption.bottom, cards.bottom) > Math.max(caption.top, cards.top);
      });
    })).toBe(false);
    await page.screenshot({ path: testInfo.outputPath('uncontested-pot.png'), fullPage: true });

    // The summary-only response must also distinguish an uncontested award from no low.
    Object.assign(state, { result: undefined });
    mock.update(state);
    await expect(caption).toHaveText(expectedCaption);
    await expect(page.getByTestId('mt-seat-P6').locator('.mt-return')).toHaveText('Won 160');
    await page.getByRole('button', { name: 'Pot 160', exact: true }).click();
    const pot = page.getByRole('dialog').locator('.mt-pot-detail');
    await expect(pot).toContainText('Won without showdown: Ольга');
    await expect(pot).toContainText('Awarded without showdown: 160');
    await expect(pot.locator('.mt-pot-winners--low')).toHaveCount(0);
    await expect(pot).not.toContainText(/No qualifying low|Нет подходящей LOW|Uncalled return|Невостребованный остаток/);
  });
}
