import { isLobbyExpired, LOBBY_WAIT_MS, lobbyBotName, requiresLobbyPin, type Lobby } from '../src/lobby';

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

test('every second lobby bot is marked with Q after its name', () => {
  const withOneBot = {
    ...lobby,
    members: [{ id: 'bot1', token: 'token1', name: 'Alex_bot', isBot: true, joinedAt: 1000 }],
  };
  const withTwoBots = {
    ...withOneBot,
    members: [
      ...withOneBot.members,
      { id: 'bot2', token: 'token2', name: 'Maria_Q_bot', isBot: true, joinedAt: 1000 },
    ],
  };

  expect(lobbyBotName(lobby, 'Alex')).toBe('Alex_bot');
  expect(lobbyBotName(withOneBot, 'Maria')).toBe('Maria_Q_bot');
  expect(lobbyBotName(withTwoBots, 'Ivan')).toBe('Ivan_bot');
});
