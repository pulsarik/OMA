import { expect, test, Page } from '@playwright/test';

async function finishCommand(page: Page, action: string) {
  await page.evaluate(async (action) => {
    const lobbyId = localStorage.getItem('omaha-last-lobby-id');
    const credentials = JSON.parse(localStorage.getItem(`omaha-lobby-${lobbyId}-active`)!);
    const ws = new WebSocket('ws://localhost:4100');
    await new Promise<void>(resolve => { ws.onopen = () => resolve(); });
    const request = (command: object, type: string) => new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Missing ${type}`)), 5000);
      function receive(event: MessageEvent) {
        const message = JSON.parse(event.data);
        if (message.type !== type && message.type !== 'error') return;
        clearTimeout(timer);
        ws.removeEventListener('message', receive);
        if (message.type === 'error') reject(new Error(message.message));
        else resolve(message.data);
      }
      ws.addEventListener('message', receive);
      ws.send(JSON.stringify(command));
    });
    try {
      const started = await request({ action: 'join_lobby', lobbyId, ...credentials }, 'lobby_started');
      const [, , handId, playerId, token] = started.playerUrl.split('/');
      await request({ action: 'join_player', handId, playerId, token }, 'player_state');
      await request({ action, handId, playerId, token, approve: true }, 'player_state');
    } finally { ws.close(); }
  }, action);
}

test('host can end a completed table only after every player confirms', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with people' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByRole('button', { name: 'Create table' }).click();

  const pin = (await page.getByLabel('Table PIN').textContent())?.trim() ?? '';
  const tableName = (await page.getByLabel('Table name').textContent())?.trim() ?? '';
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();

  await guest.goto('/');
  await guest.getByRole('button', { name: 'Play with people' }).click();
  await guest.getByRole('button').filter({ hasText: tableName }).filter({ hasText: 'Dima' }).click();
  await guest.getByRole('textbox', { name: 'Table PIN' }).fill(pin);
  await guest.getByRole('button', { name: 'Enter table' }).click();
  await guest.getByLabel('Your name').fill('Anna');
  await guest.getByRole('button', { name: 'Take a seat' }).click();
  await expect(page.getByTestId('lobby-host-members')).toContainText('Anna');

  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible({ timeout: 15_000 });
  await expect(guest.getByRole('tab', { name: 'TABLE' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'End table early and calculate results' })).toHaveCount(0);

  const hostFold = page.getByRole('button', { name: 'Fold' });
  const guestFold = guest.getByRole('button', { name: 'Fold' });
  await expect.poll(async () => (await hostFold.count()) + (await guestFold.count())).toBeGreaterThan(0);
  if (await hostFold.isVisible()) await hostFold.click();
  else await guestFold.click();

  await finishCommand(page, 'request_early_finish');
  await expect(page.getByTestId('early-finish-summary')).toHaveCount(0);
  await finishCommand(guest, 'vote_early_finish');

  await Promise.all([
    expect(page.getByTestId('early-finish-summary')).toBeVisible(),
    expect(guest.getByTestId('early-finish-summary')).toBeVisible(),
  ]);
  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toHaveAttribute('aria-selected', 'true');
  await expect(guest.getByRole('tab', { name: 'STATISTICS' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'New deal' })).toHaveCount(0);
  await expect(guest.getByRole('button', { name: 'New deal' })).toHaveCount(0);

  await page.goto('/');
  await page.waitForFunction(() => window.localStorage.getItem('omaha-last-lobby-id') === null);
  await expect(page.getByRole('button', { name: 'Return to your last table' })).toHaveCount(0);

  await guestContext.close();
});
