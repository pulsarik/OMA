import { isLobbyExpired, LOBBY_WAIT_MS, requiresLobbyPin, type Lobby } from '../src/lobby';

const lobby: Lobby = {
  id: 'table', pin: '1234', tableName: 'Berlin', mode: 'friends', hostMemberId: 'host',
  maxPlayers: 4, status: 'waiting', members: [], created: 1000, lastActivity: 1000,
};

test('only guest tables bypass the PIN, including when old records have no mode', () => {
  expect(requiresLobbyPin(lobby)).toBe(true);
  expect(requiresLobbyPin({ mode: 'bots' })).toBe(true);
  expect(requiresLobbyPin({ mode: 'guests' })).toBe(false);
  expect(requiresLobbyPin({} as Lobby)).toBe(true);
});

test.each(['friends', 'guests', 'bots'] as const)('%s tables expire one hour after creation even with recent activity', mode => {
  const active = { ...lobby, mode, lastActivity: lobby.created + LOBBY_WAIT_MS - 1 };
  expect(isLobbyExpired(active, lobby.created + LOBBY_WAIT_MS - 1)).toBe(false);
  expect(isLobbyExpired(active, lobby.created + LOBBY_WAIT_MS)).toBe(true);
  expect(isLobbyExpired({ ...active, status: 'started' }, lobby.created + LOBBY_WAIT_MS * 10)).toBe(false);
});
