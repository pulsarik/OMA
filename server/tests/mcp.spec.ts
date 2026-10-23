import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { CreationQuota, mcpRouter, tableInput } from '../src/mcp';
import { newInvitation, canUseInvitation } from '../src/invitations';
import { preparedLobby, publicTableStatus } from '../src/lobby';
import { dealHand, isPartyFinished, recordPlayerMove } from '../src/game';
import HandStore from '../src/handStore';

const create = jest.fn(async () => ({ table_id: 'created', join_url: 'https://example.com/lobby/created' }));
let listener: http.Server;
let endpoint: URL;
let client: Client;

beforeEach(async () => {
  create.mockClear();
  const app = express();
  app.use('/mcp', mcpRouter({ create, status: async () => ({ exists: false }) }, 'https://example.com', {
    quota: new CreationQuota(2, 3), requestsPerMinute: 20,
  }));
  listener = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => listener.once('listening', resolve));
  endpoint = new URL(`http://127.0.0.1:${(listener.address() as AddressInfo).port}/mcp`);
  client = new Client({ name: 'protocol-test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(endpoint));
});

afterEach(async () => {
  await client.close();
  listener.closeAllConnections();
  await new Promise<void>(resolve => listener.close(() => resolve()));
});

test('official SDK initializes, discovers four tools and calls all tools over Streamable HTTP', async () => {
  const { tools } = await client.listTools();
  expect(tools.map(tool => tool.name).sort()).toEqual(['create_poker_table', 'get_game_info', 'get_play_link', 'get_table_status']);
  expect(tools.find(tool => tool.name === 'get_play_link')?.annotations?.readOnlyHint).toBe(false);
  expect((await client.callTool({ name: 'get_game_info', arguments: {} })).structuredContent).toMatchObject({ free_to_play: true });
  expect((await client.callTool({ name: 'get_table_status', arguments: { table_id: '3bb89098-9cde-4660-a0f9-7708bca156fe' } })).structuredContent).toEqual({ exists: false });
  expect((await client.callTool({ name: 'create_poker_table', arguments: {} })).isError).toBeFalsy();
  expect(create).toHaveBeenLastCalledWith({ game_type: 'omaha_hi_lo', opponents: 'bots', private: true });
  expect((await client.callTool({ name: 'get_play_link', arguments: { opponents: 'friends' } })).isError).toBeFalsy();
  expect(create).toHaveBeenCalledTimes(2);
});

test('invalid input never creates a table, including unknown game actions', async () => {
  for (const args of [{ bot_count: 10 }, { bot_count: 1.5 }, { game_type: 'holdem' }, { private: 'false' },
    { opponents: 'friends', bot_count: 2 }, { player_name: ' ' }, { player_name: 'x'.repeat(31) }, { action: 'fold' }]) {
    expect((await client.callTool({ name: 'create_poker_table', arguments: args })).isError).toBe(true);
  }
  expect(create).not.toHaveBeenCalled();
});

test('creation quota is shared between tool names and returns a tool error', async () => {
  await client.callTool({ name: 'create_poker_table', arguments: {} });
  await client.callTool({ name: 'get_play_link', arguments: {} });
  const limited = await client.callTool({ name: 'create_poker_table', arguments: {} });
  expect(limited.isError).toBe(true);
  expect(create).toHaveBeenCalledTimes(2);
});

test('Origin protection, CORS, unsupported HTTP methods, malformed and oversized requests', async () => {
  expect((await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } })).status).toBe(403);
  const allowed = await fetch(endpoint, { method: 'OPTIONS', headers: { Origin: 'https://example.com' } });
  expect(allowed.status).toBe(204);
  expect(allowed.headers.get('access-control-allow-origin')).toBe('https://example.com');
  expect((await fetch(endpoint)).status).toBe(405);
  expect((await fetch(endpoint, { method: 'DELETE' })).status).toBe(405);
  expect((await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status).toBe(400);
  expect((await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ input: 'x'.repeat(17_000) }) })).status).toBe(413);
});

test('HTTP rate limit cannot be bypassed by spoofing forwarding headers', async () => {
  let response: Response | undefined;
  for (let attempt = 0; attempt < 22; attempt++) response = await fetch(endpoint);
  expect(response!.status).toBe(429);
  expect(response!.headers.get('retry-after')).toBeTruthy();
  expect((await fetch(endpoint, { headers: { 'X-Forwarded-For': '203.0.113.18' } })).status).toBe(429);
});

test('global creation budget and window expiry bound distributed anonymous creation', () => {
  const quota = new CreationQuota(1, 2, 1000);
  expect(quota.take('a', 100)).toBe(true);
  expect(quota.take('a', 101)).toBe(false);
  expect(quota.take('b', 101)).toBe(true);
  expect(quota.take('c', 101)).toBe(false);
  expect(quota.take('a', 1100)).toBe(true);
});

test('invitation is unguessable, hashed, join-only, and expires with its lobby', () => {
  const invitation = newInvitation();
  const lobby = preparedLobby({ id: 'id', tableName: 'Berlin', invitationHash: invitation.hash,
    private: true, opponents: 'friends', botCount: 0, playerName: 'Secret', now: 100 });
  expect(invitation.token).toHaveLength(43);
  expect(JSON.stringify(lobby)).not.toContain(invitation.token);
  expect(lobby.members).toEqual([]);
  expect(lobby.hostMemberId).toBe('');
  expect(canUseInvitation(lobby, invitation.token, 101, 1000)).toBe(true);
  expect(canUseInvitation(lobby, newInvitation().token, 101, 1000)).toBe(false);
  expect(canUseInvitation(lobby, undefined, 101, 1000)).toBe(false);
  expect(canUseInvitation(lobby, invitation.token, 1100, 1000)).toBe(false);
  expect(publicTableStatus(lobby, 1100, 1000)).toEqual({ exists: false });
  expect(publicTableStatus(lobby, 101, 1000)).toEqual({ exists: true, table_id: 'id', waiting_for_players: true, game_in_progress: false, available_seats: 10 });
  lobby.status = 'started';
  expect(canUseInvitation(lobby, invitation.token, 101, 1000)).toBe(false);
  expect(publicTableStatus(lobby, 1100, 1000)).toMatchObject({ game_in_progress: true, available_seats: 0 });
  expect(tableInput.parse({}).private).toBe(true);
});

test('prepared invitations survive storage and a completed hand need not end the party', async () => {
  const invitation = newInvitation();
  const store = new HandStore(':memory:');
  const lobby = preparedLobby({ id: 'persisted', tableName: 'Berlin', invitationHash: invitation.hash,
    private: true, opponents: 'bots', botCount: 2, now: Date.now() });
  await store.saveLobby(lobby);
  const restored = await store.getLobby(lobby.id);
  expect(canUseInvitation(restored, invitation.token)).toBe(true);
  expect(restored.maxPlayers).toBe(3);
  const hand = dealHand(2);
  expect(isPartyFinished(hand)).toBe(false);
  recordPlayerMove(hand, hand.currentPlayerId!, 'fold');
  expect(hand.stage).toBe('showdown');
  expect(isPartyFinished(hand)).toBe(false);
  hand.partyFinishedEarly = true;
  expect(isPartyFinished(hand)).toBe(true);
});
