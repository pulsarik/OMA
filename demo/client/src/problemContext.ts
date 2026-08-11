export type ProblemContext = {
  page: 'player' | 'debug' | 'lobby' | 'home';
  handId?: string;
  playerId?: string;
  lobbyId?: string;
  viewport: { width: number; height: number };
};

type ProblemWindow = Pick<Window, 'innerWidth' | 'innerHeight'> & {
  location: Pick<Location, 'pathname'>;
  sessionStorage: Pick<Storage, 'getItem'>;
};

export function problemContext(source: ProblemWindow): ProblemContext {
  const parts = source.location.pathname.split('/').filter(Boolean);
  const viewport = {
    width: source.innerWidth,
    height: source.innerHeight,
  };

  if (parts[0] === 'player') {
    return { page: 'player', handId: parts[1], playerId: parts[2], viewport };
  }
  if (parts[0] === 'debug') {
    return { page: 'debug', handId: parts[1], viewport };
  }
  if (parts[0] === 'lobby') {
    const lobbyId = parts[1];
    const playerUrl = source.sessionStorage.getItem(`omaha-lobby-${lobbyId}-player-url`);
    if (playerUrl) {
      try {
        const playerParts = new URL(playerUrl, 'http://local.invalid').pathname.split('/').filter(Boolean);
        if (playerParts[0] === 'player' && playerParts[1] && playerParts[2]) {
          return {
            page: 'player',
            handId: playerParts[1],
            playerId: playerParts[2],
            lobbyId,
            viewport,
          };
        }
      } catch {
        // Fall back to lobby-only diagnostics when saved navigation data is malformed.
      }
    }
    return { page: 'lobby', lobbyId, viewport };
  }
  return { page: 'home', viewport };
}
