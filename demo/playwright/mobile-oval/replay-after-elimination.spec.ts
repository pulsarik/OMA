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
