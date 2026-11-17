import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

test('an eliminated player can spend a replay life', async ({ page }) => {
  const state = fixture(2);
  state.allHumansEliminated = true;
  state.stack = 0;
  state.players[0].stack = 0;
  state.partyTotals[0].total = 0;
  const table = await mockTable(page, state);

  const replay = page.getByTestId('replay-current-deal');
  await expect(replay).toBeVisible();
  await expect(replay).toHaveAccessibleName(/3 replays remaining/);

  await replay.click();
  const confirmation = page.getByRole('dialog', { name: 'Replay this deal?' });
  await expect(confirmation).toBeVisible();
  await expect(confirmation).toContainText('This will spend one replay life.');
  await confirmation.getByRole('button', { name: 'Cancel' }).click();
  await expect(confirmation).toBeHidden();
  expect(table.messages).not.toContainEqual(expect.objectContaining({
    action: 'replay_deal',
  }));

  await replay.click();
  await confirmation.getByRole('button', { name: 'OK' }).click();
  expect(table.messages).toContainEqual(expect.objectContaining({
    action: 'replay_deal',
    handId: state.handId,
  }));
});

test('an eliminated player watches the bots continue on the same screen', async ({ page }) => {
  const eliminated = fixture(3);
  eliminated.allHumansEliminated = true;
  eliminated.stack = 0;
  eliminated.players[0].stack = 0;
  eliminated.players[0].folded = true;
  eliminated.partyTotals[0].total = 0;
  eliminated.nextHandId = 'bot-hand';
  eliminated.nextPlayerLink = {
    id: 'P1',
    handCode: 'BOT002',
    url: '/player/bot-hand/P1/bot-token',
  };

  const botHand = fixture(3, false);
  botHand.handId = 'bot-hand';
  botHand.handCode = 'BOT002';
  botHand.handNumber = eliminated.handNumber + 1;
  botHand.allHumansEliminated = true;
  botHand.stack = 0;
  botHand.folded = true;
  botHand.players[0].stack = 0;
  botHand.players[0].folded = true;
  botHand.partyTotals[0].total = 0;
  botHand.currentPlayerId = 'P2';

  await page.route('**/api/player/**', route => route.fulfill({
    json: route.request().url().includes('/bot-hand/') ? botHand : eliminated,
  }));
  let pushPlayerState = (_state: typeof botHand) => {};
  await page.routeWebSocket(/ws:\/\/localhost:(4000|4100)\//, ws => {
    pushPlayerState = state => ws.send(JSON.stringify({ type: 'player_state', data: state }));
    ws.onMessage(raw => {
      const message = JSON.parse(String(raw));
      if (message.action === 'join_player') {
        ws.send(JSON.stringify({
          type: 'player_state',
          data: message.handId === botHand.handId ? botHand : eliminated,
        }));
      }
    });
  });

  await page.goto('/player/eliminated-hand/P1/eliminated-token');
  await expect(page).toHaveURL(/\/player\/bot-hand\/P1\/bot-token$/);
  await expect(page.getByTestId('mt-hand-label')).toHaveText('BOT002');
  await expect(page.getByTestId('mt-actions')).toContainText('All human players are out');
  await expect(page.getByText(/Thinking/)).toBeVisible();

  await page.getByRole('button', { name: 'Final statistics' }).click();
  botHand.stage = 'showdown';
  botHand.nextHandId = 'bot-hand-2';
  botHand.nextPlayerLink = {
    id: 'P1',
    handCode: 'BOT003',
    url: '/player/bot-hand-2/P1/bot-token-2',
  };
  pushPlayerState(botHand);
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/player\/bot-hand\/P1\/bot-token$/);
});
