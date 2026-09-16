import { expect, test } from '@jest/globals';
import { clockwiseOpponents, DESKTOP_OPPONENT_POSITIONS } from '../client/src/mobile-table/presentation';

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
