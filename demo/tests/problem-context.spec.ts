import { expect, test } from '@jest/globals';
import { problemContext } from '../client/src/problemContext';

function source(pathname: string, savedPlayerUrl?: string) {
  return {
    location: { pathname },
    innerWidth: 365,
    innerHeight: 681,
    sessionStorage: {
      getItem: (key: string) => key.endsWith('-player-url') ? savedPlayerUrl ?? null : null,
    },
  };
}

test('reports the active hand when a player page is embedded in the lobby route', () => {
  expect(problemContext(source(
    '/lobby/lobby-1',
    '/player/hand-1/P1/private-token',
  ))).toEqual({
    page: 'player',
    lobbyId: 'lobby-1',
    handId: 'hand-1',
    playerId: 'P1',
    viewport: { width: 365, height: 681 },
  });
});

test('never includes the player token in report context', () => {
  const context = problemContext(source('/player/hand-1/P1/private-token'));
  expect(context).toEqual({
    page: 'player',
    handId: 'hand-1',
    playerId: 'P1',
    viewport: { width: 365, height: 681 },
  });
  expect(JSON.stringify(context)).not.toContain('private-token');
});

test('keeps lobby diagnostics before a game starts', () => {
  expect(problemContext(source('/lobby/lobby-1'))).toEqual({
    page: 'lobby',
    lobbyId: 'lobby-1',
    viewport: { width: 365, height: 681 },
  });
});
