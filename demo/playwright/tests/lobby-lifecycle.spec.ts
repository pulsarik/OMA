import { expect, test } from '@playwright/test';

test('table activity does not reset expiry; started tables reject new members but allow reconnect', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const sockets: WebSocket[] = [];
    const connect = async () => {
      const ws = new WebSocket('ws://localhost:4100');
      sockets.push(ws);
      await new Promise<void>((resolve, reject) => { ws.onopen = () => resolve(); ws.onerror = reject; });
      return ws;
    };
    const request = (ws: WebSocket, command: object, type: string) => new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => { ws.removeEventListener('message', receive); reject(new Error(`Missing ${type}`)); }, 5000);
      function receive(event: MessageEvent) {
        const message = JSON.parse(event.data);
        if (message.type !== type && message.type !== 'error') return;
        clearTimeout(timer);
        ws.removeEventListener('message', receive);
        resolve(message);
      }
      ws.addEventListener('message', receive);
      ws.send(JSON.stringify(command));
    });
    try {
      const host = await connect();
      const created = (await request(host, { action: 'create_lobby', name: 'Lifecycle host', maxPlayers: 4 }, 'lobby_joined')).data;
      const credentials = { lobbyId: created.lobby.id, memberId: created.memberId, token: created.token };
      const activity = await request(host, { action: 'lobby_activity', lobbyId: created.lobby.id }, 'lobby_updated');
      const reconnected = await connect();
      const joined = await request(reconnected, { action: 'join_lobby', ...credentials }, 'lobby_joined');
      await request(reconnected, { action: 'lobby_start', lobbyId: created.lobby.id }, 'lobby_started');
      const guest = await connect();
      const rejected = await request(guest, { action: 'join_lobby', lobbyId: created.lobby.id, pin: created.lobby.pin, name: 'Late guest' }, 'lobby_joined');
      const open = await request(guest, { action: 'list_open_lobbies' }, 'open_lobbies');
      const owner = await connect();
      const resumed = await request(owner, { action: 'join_lobby', ...credentials }, 'lobby_joined');
      return {
        initial: created.lobby.session, activity: activity.data.session, reconnect: joined.data.lobby.session,
        rejected, listed: open.data.some((lobby: any) => lobby.id === created.lobby.id), resumed: resumed.data.lobby.status,
      };
    } finally { sockets.forEach(ws => ws.close()); }
  });
  expect(result.initial.expiresAfterMs).toBe(3_600_000);
  expect(result.activity.lastActivity).toBe(result.initial.lastActivity);
  expect(result.reconnect.lastActivity).toBe(result.initial.lastActivity);
  expect(result.rejected).toMatchObject({ type: 'error', message: 'game already started' });
  expect(result.listed).toBe(false);
  expect(result.resumed).toBe('started');
});
