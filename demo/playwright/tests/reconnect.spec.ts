import { expect, test } from '@playwright/test';

test('lobby restores its authenticated WebSocket after a disconnect', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    const sockets: WebSocket[] = [];

    class TrackedWebSocket extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        sockets.push(this);
      }
    }

    Object.defineProperty(window, 'WebSocket', { value: TrackedWebSocket });
    Object.defineProperty(window, '__omahaTestSockets', { value: sockets });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Reconnect host');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(page.getByText('connected', { exact: true })).toBeVisible();

  await page.evaluate(() => {
    const sockets = (window as Window & { __omahaTestSockets: WebSocket[] }).__omahaTestSockets;
    sockets.at(-1)?.close();
  });

  await page.waitForFunction(() => {
    const sockets = (window as Window & { __omahaTestSockets: WebSocket[] }).__omahaTestSockets;
    return sockets.length >= 2 && sockets.at(-1)?.readyState === WebSocket.OPEN;
  });
  await expect(page.getByText('connected', { exact: true })).toBeVisible();

  await page.getByLabel('Bot name').fill('After reconnect');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByText('After reconnect', { exact: true })).toBeVisible();
});

test('a player command survives refresh without applying twice', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    const sockets: WebSocket[] = [];
    const sentMessages: string[] = [];
    const receivedMessages: string[] = [];

    class TrackedWebSocket extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        sockets.push(this);
        this.addEventListener('message', event => receivedMessages.push(String(event.data)));
      }

      send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
        if (typeof data === 'string') sentMessages.push(data);
        super.send(data);
      }
    }

    Object.defineProperties(window, {
      WebSocket: { value: TrackedWebSocket },
      __omahaTestSockets: { value: sockets },
      __omahaSentMessages: { value: sentMessages },
      __omahaReceivedMessages: { value: receivedMessages },
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Reliable player');
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await page.getByRole('button', { name: 'Start game · fill with bots' }).click();

  const fold = page.getByRole('button', { name: 'Fold' });
  await expect(fold).toBeVisible({ timeout: 15_000 });
  await fold.click();

  const capturedCommand = await page.evaluate(() => {
    const testWindow = window as Window & {
      __omahaSentMessages: string[];
    };
    const serialized = [...testWindow.__omahaSentMessages]
      .reverse()
      .find(value => JSON.parse(value).action === 'player_move');
    if (!serialized) throw new Error('player command was not captured');
    const command = JSON.parse(serialized);
    return {
      commandId: command.commandId as string,
      serialized,
      storageKey: `omaha-pending-command-${command.handId}-${command.playerId}`,
    };
  });

  await page.waitForFunction((expectedCommandId) => {
    const messages = (window as Window & { __omahaReceivedMessages: string[] })
      .__omahaReceivedMessages
      .map(value => JSON.parse(value));
    return messages.some(message => (
      message.type === 'command_ack'
      && message.commandId === expectedCommandId
      && message.duplicate === false
    ));
  }, capturedCommand.commandId);

  await page.evaluate(({ storageKey, serialized }) => {
    window.sessionStorage.setItem(storageKey, serialized);
  }, capturedCommand);
  await page.reload();

  await page.waitForFunction((expectedCommandId) => {
    const messages = (window as Window & { __omahaReceivedMessages: string[] })
      .__omahaReceivedMessages
      .map(value => JSON.parse(value));
    return messages.some(message => (
      message.type === 'command_ack'
      && message.commandId === expectedCommandId
      && message.duplicate === true
    ));
  }, capturedCommand.commandId);
  expect(await page.evaluate(
    storageKey => window.sessionStorage.getItem(storageKey),
    capturedCommand.storageKey,
  )).toBeNull();
});
