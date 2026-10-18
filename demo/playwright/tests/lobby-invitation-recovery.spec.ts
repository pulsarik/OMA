import { expect, test } from '@playwright/test';

test('missing PIN requests preserve invitations while five wrong guesses still rotate the PIN', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const socket = new WebSocket('ws://localhost:4100');
    await new Promise<void>((resolve, reject) => { socket.onopen = () => resolve(); socket.onerror = reject; });
    const request = (command: object, type: string) => new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.removeEventListener('message', receive);
        reject(new Error(`Missing ${type}`));
      }, 5000);
      function receive(event: MessageEvent) {
        const message = JSON.parse(event.data);
        if (message.type !== type && message.type !== 'error') return;
        clearTimeout(timer);
        socket.removeEventListener('message', receive);
        resolve(message);
      }
      socket.addEventListener('message', receive);
      socket.send(JSON.stringify(command));
    });
    try {
      const created = await request({ action: 'create_lobby', name: 'PIN host' }, 'lobby_joined');
      const { id: lobbyId, pin } = created.data.lobby;
      const missing = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        missing.push(await request({ action: attempt % 2 ? 'join_lobby' : 'view_lobby', lobbyId, pin: attempt % 2 ? '' : undefined }, 'lobby_updated'));
      }
      const valid = await request({ action: 'view_lobby', lobbyId, pin }, 'lobby_updated');
      const wrong = [];
      for (let attempt = 0; attempt < 5; attempt += 1) {
        wrong.push(await request({ action: 'view_lobby', lobbyId, pin: '0000' }, 'error'));
      }
      return { missing, valid: valid.type, wrong };
    } finally { socket.close(); }
  });
  expect(result.missing).toEqual(Array(6).fill({ type: 'error', message: 'enter a 4-digit PIN' }));
  expect(result.valid).toBe('lobby_updated');
  expect(result.wrong.slice(0, 4)).toEqual(Array(4).fill({ type: 'error', message: 'incorrect table PIN' }));
  expect(result.wrong[4]).toMatchObject({ type: 'error', message: 'incorrect table PIN; PIN changed after 5 failed attempts' });
});

for (const missingPin of [true, false]) {
  test(`guest can recover an invitation with ${missingPin ? 'a missing' : 'an incorrect'} PIN`, async ({ page, browser }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Play with friends' }).click();
    await page.getByRole('button', { name: 'Create your own table' }).click();
    await page.getByLabel('Your name').fill('Invitation host');
    await page.getByRole('button', { name: 'Create table' }).click();
    await expect(page.getByLabel('Table PIN')).toHaveText(/^\d{4}$/);
    const pin = (await page.getByLabel('Table PIN').textContent())!.trim();
    const tableUrl = page.url();

    const context = await browser.newContext();
    try {
      const guest = await context.newPage();
      await guest.goto(`${tableUrl}${missingPin ? '' : '?pin=0000'}`);
      await expect(guest.getByRole('textbox', { name: 'Table PIN' })).toBeVisible();
      if (missingPin) {
        // Opening a browser address without a PIN must not invalidate invitations.
        for (let attempt = 0; attempt < 6; attempt += 1) {
          await guest.reload();
          await expect(guest.getByRole('textbox', { name: 'Table PIN' })).toBeVisible();
          await expect(guest.getByRole('alert')).toHaveCount(0);
        }
        await expect(page.getByLabel('Table PIN')).toHaveText(pin);
      } else {
        await expect(guest.getByRole('alert')).toContainText('incorrect table PIN');
      }
      await guest.getByLabel('Your name').fill('Recovered guest');
      await guest.getByRole('textbox', { name: 'Table PIN' }).fill(pin);
      await guest.getByRole('button', { name: 'Open table', exact: true }).click();
      await expect(guest.getByTestId('lobby-join-member')).toContainText('Invitation host');
      await expect(guest.getByLabel('Your name')).toHaveValue('Recovered guest');
      await expect(guest.getByRole('alert')).toHaveCount(0);
      // The corrected PIN must survive reload instead of reusing the stale URL.
      await guest.reload();
      await expect(guest.getByTestId('lobby-join-member')).toContainText('Invitation host');
      await guest.getByLabel('Your name').fill('Recovered guest');
      await guest.getByRole('button', { name: 'Take a seat' }).click();
      await expect(page.getByTestId('lobby-host-members')).toContainText('Recovered guest');
    } finally {
      await context.close();
    }
  });
}
