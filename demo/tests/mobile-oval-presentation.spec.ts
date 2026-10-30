import { expect, test } from '@jest/globals';
import {
  clockwiseOpponents,
  DESKTOP_OPPONENT_POSITIONS,
  displayedStack,
  lastPlayedStage,
  latestActionForPlayer,
  unplayedRunoutLabel,
} from '../client/src/mobile-table/presentation';

test('showdown displays the settled stack without adding the payout twice', () => {
  const seat = { id: 'hero', stack: 844 };
  const player = { stage: 'river', partyTotals: [{ id: 'hero', total: 1006 }] };
  expect(displayedStack(player, seat)).toBe(844);
  expect(displayedStack({ ...player, stage: 'showdown' }, seat)).toBe(1006);
  expect(displayedStack({ stage: 'showdown', partyTotals: [{ id: 'hero', total: 0 }] }, seat)).toBe(0);
  expect(displayedStack({ stage: 'showdown', partyTotals: [] }, seat)).toBe(844);
});

test('the hero moves to the bottom without changing clockwise seat order', () => {
  const players = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(id => ({ id, folded: false, cardCount: 4 }));
  expect(clockwiseOpponents(players, 'D').map(p => p.id)).toEqual(['E', 'F', 'G', 'A', 'B', 'C']);
  expect(players.map(p => p.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
});

test('desktop tables have a distinct position for every opponent through ten seats', () => {
  for (let count = 2; count <= 10; count++) {
    const positions = DESKTOP_OPPONENT_POSITIONS[count - 1];
    expect(positions).toHaveLength(count - 1);
    expect(new Set(positions.map(position => position.join(','))).size).toBe(count - 1);
    const players = Array.from({ length: count }, (_, i) => ({ id: `P${i}`, folded: false, cardCount: 4 }));
    expect(clockwiseOpponents(players, 'P2').map(p => p.id)).toEqual(count > 2
      ? [...players.slice(3), ...players.slice(0, 2)].map(p => p.id)
      : players.map(p => p.id));
  }
});

test('problem 1007 keeps the street of a fold visible beside an unplayed runout', () => {
  const actions = [
    { playerId: 'P1', move: 'bet', stage: 'turn', at: 1 },
    { playerId: 'P2', move: 'fold', stage: 'turn', at: 2 },
  ];

  expect(latestActionForPlayer(actions, 'P2', 'showdown')).toEqual(actions[1]);
  expect(lastPlayedStage(actions)).toBe('turn');
  expect(unplayedRunoutLabel('turn', 'en')).toBe('Unplayed runout · turn');
  expect(unplayedRunoutLabel('turn', 'ru')).toBe('Несыгранный доезд · Тёрн');
});
