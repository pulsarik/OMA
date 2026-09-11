import { expect, test } from '@jest/globals';
import { clockwiseOpponents } from '../client/src/mobile-table/presentation';

test('the hero moves to the bottom without changing clockwise seat order', () => {
  const players = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(id => ({ id, folded: false, cardCount: 4 }));
  expect(clockwiseOpponents(players, 'D').map(p => p.id)).toEqual(['E', 'F', 'G', 'A', 'B', 'C']);
  expect(players.map(p => p.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
});
