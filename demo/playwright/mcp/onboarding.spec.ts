import { test, expect, Page } from '@playwright/test';
import { Client } from '../../../server/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/index.js';
import { StreamableHTTPClientTransport } from '../../../server/node_modules/@modelcontextprotocol/sdk/dist/cjs/client/streamableHttp.js';
import WebSocket from '../../../server/node_modules/ws';

let client: Client;
test.beforeAll(async () => {
  client = new Client({ name: 'external-browser-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('http://localhost:4310/mcp')));
});
test.afterAll(async () => { await client.close(); });

async function expectPlaying(page: Page) {
  await expect(page.getByRole('region', { name: 'Community board' })).toBeVisible();
  await expect(page.locator('[data-hero="true"]').getByRole('img', { name: /^[2-9TJQKA][cdhs]$/ })).toHaveCount(4);
}

async function create(args: Record<string, unknown>, tool = 'create_poker_table', connection = client) {
  const result = await connection.callTool({ name: tool, arguments: args });
  expect(result.isError).toBeFalsy();
  const table = result.structuredContent as { table_id: string; join_url: string };
  expect(table.join_url).toMatch(/^http:\/\/localhost:431[01]\/lobby\//);
  expect(table.join_url).not.toContain('pin=');
  return table;
}

async function socketRequest(message: object, port = 4310): Promise<any> {
  const socket = new WebSocket(`ws://localhost:${port}`);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.close(); reject(new Error('WebSocket response timeout')); }, 5000);
    socket.on('open', () => socket.send(JSON.stringify(message)));
    socket.on('message', data => {
      const result = JSON.parse(data.toString());
      if (result.type === 'version') return;
      clearTimeout(timeout); socket.close(); resolve(result);
    });
    socket.on('error', reject);
  });
}

test('SDK discovers tools, bot link joins a clean browser, starts real play and reconnects', async ({ page }) => {
  expect((await client.listTools()).tools).toHaveLength(4);
  const table = await create({ opponents: 'bots', bot_count: 2, player_name: 'MCP Player' });
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto(table.join_url);
  await expect(page.getByLabel('Your name')).toHaveValue('MCP Player');
  await expect(page).toHaveURL(new RegExp(`/lobby/${table.table_id}$`));
  await page.getByRole('button', { name: 'Take a seat' }).click();
  await expectPlaying(page);
  const status = await client.callTool({ name: 'get_table_status', arguments: { table_id: table.table_id } });
  expect(status.structuredContent).toEqual({ exists: true, table_id: table.table_id, waiting_for_players: false, game_in_progress: true, available_seats: 0 });
  expect(requests.every(url => !url.includes('#invite=') && !url.includes('pin='))).toBe(true);
  await page.reload();
  await expectPlaying(page);
  await expect(page.getByTestId('desktop-table')).toHaveAttribute('data-players', '3');
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.locator('[data-hero="true"]')).toHaveClass(/mt-seat--folded/);
});

test('private friends invitations admit distinct players, never reveal PIN or give guests host rights', async ({ page, browser }) => {
  const table = await create({ opponents: 'friends' });
  const invitation = new URLSearchParams(new URL(table.join_url).hash.slice(1)).get('invite');
  const open = await socketRequest({ action: 'list_open_lobbies' });
  expect(JSON.stringify(open)).not.toContain(table.table_id);
  for (const extra of [{}, { pin: '1234' }, { invitation: 'a'.repeat(43) }]) {
    expect((await socketRequest({ action: 'join_lobby', lobbyId: table.table_id, ...extra })).type).toBe('error');
  }
  await page.goto(table.join_url);
  await page.getByLabel('Your name').fill('Host');
  await page.getByRole('button', { name: 'Take a seat' }).click();
  await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible();
  await expect(page.getByLabel('Table PIN', { exact: true })).toHaveCount(0);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy invitation' }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain(table.join_url);
  expect(copied).not.toContain('PIN:');
  const guestContext = await browser.newContext();
  try {
    const guest = await guestContext.newPage();
    await guest.goto(table.join_url);
    await guest.getByLabel('Your name').fill('Friend');
    await guest.getByRole('button', { name: 'Take a seat' }).click();
    await expect(page.getByTestId('lobby-host-members')).toContainText('Friend');
    await expect(guest.getByRole('button', { name: 'Start game' })).toHaveCount(0);
    const identities = await Promise.all([page, guest].map(p => p.evaluate(id => JSON.parse(localStorage.getItem(`omaha-lobby-${id}-active`)!), table.table_id)));
    expect(identities[0].token).not.toBe(identities[1].token);
    expect(identities[0].token).not.toBe(invitation);
    const impersonate = await socketRequest({ action: 'join_lobby', lobbyId: table.table_id, memberId: identities[0].memberId, token: invitation });
    expect(impersonate.type).toBe('error');
    await page.getByRole('button', { name: 'Start game' }).click();
    await expectPlaying(page);
    await expectPlaying(guest);
    expect((await socketRequest({ action: 'join_lobby', lobbyId: table.table_id, invitation })).type).toBe('error');
  } finally { await guestContext.close(); }
});

test('get_play_link supports public bot practice without configuration or registration', async ({ page }) => {
  const table = await create({ opponents: 'bots', bot_count: 1, private: false }, 'get_play_link');
  expect(new URL(table.join_url).hash).toBe('');
  await page.goto(table.join_url);
  await expect(page.getByLabel('Your name')).toHaveValue('Guest');
  await page.getByRole('button', { name: 'Take a seat' }).click();
  await expectPlaying(page);
});

test('unused table expires, disappears from status and rejects its invitation', async ({ page }) => {
  const expiring = new Client({ name: 'expiry-test', version: '1.0.0' });
  await expiring.connect(new StreamableHTTPClientTransport(new URL('http://localhost:4311/mcp')));
  try {
    const table = await create({ opponents: 'friends' }, 'get_play_link', expiring);
    await expect.poll(async () => (await expiring.callTool({ name: 'get_table_status', arguments: { table_id: table.table_id } })).structuredContent).toEqual({ exists: false });
    await page.goto(table.join_url);
    await expect(page.getByRole('alert')).toContainText('lobby not found');
    const invitation = new URLSearchParams(new URL(table.join_url).hash.slice(1)).get('invite');
    expect((await socketRequest({ action: 'join_lobby', lobbyId: table.table_id, invitation }, 4311)).type).toBe('error');
  } finally { await expiring.close(); }
});

test('AI documentation is rendered on server and browser in both languages', async ({ page, request }) => {
  for (const path of ['/ai', '/ru/ai']) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('https://omahahilopoker.com/mcp');
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  expect((await (await request.get('/mcp-server.json')).json()).remotes[0].type).toBe('streamable-http');
});
