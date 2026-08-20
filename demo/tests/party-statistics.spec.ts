import { expect, test } from '@jest/globals';
import {
  aggressiveHandPercent,
  botStyle,
  buildWalletHistory,
  countPlayerCombinations,
  type StatisticsHand,
} from '../client/src/partyStatistics';

const hands: StatisticsHand[] = [
  {
    handNumber: 2,
    players: [
      { id: 'P1', participated: true, highRank: 'straight' },
      { id: 'P2', participated: true, highRank: 'pair' },
    ],
    net: [{ id: 'P1', total: -25 }, { id: 'P2', total: 25 }],
    wallets: [{ id: 'P1', total: 1025 }, { id: 'P2', total: 975 }],
    actions: [{ playerId: 'P1', move: 'call' }, { playerId: 'P2', move: 'raise' }],
  },
  {
    handNumber: 1,
    players: [
      { id: 'P1', participated: true, highRank: 'flush' },
      { id: 'P2', participated: true, highRank: 'high card' },
    ],
    net: [{ id: 'P1', total: 50 }, { id: 'P2', total: -50 }],
    wallets: [{ id: 'P1', total: 1050 }, { id: 'P2', total: 950 }],
    actions: [{ playerId: 'P1', move: 'bet' }, { playerId: 'P2', move: 'fold' }],
  },
];

test('counts a hand once when the player bets or raises', () => {
  expect(aggressiveHandPercent('P1', hands)).toBe(50);
  expect(aggressiveHandPercent('P2', hands)).toBe(50);
});

test('builds wallet history in hand order with the pre-game balance', () => {
  expect(buildWalletHistory(['P1'], hands)).toEqual([{
    playerId: 'P1',
    points: [
      { handNumber: 0, wallet: 1000 },
      { handNumber: 1, wallet: 1050 },
      { handNumber: 2, wallet: 1025 },
    ],
  }]);
});

test('counts each high-hand combination and ignores pairs', () => {
  expect(countPlayerCombinations('P1', hands)).toMatchObject({
    straight: 1,
    flush: 1,
  });
  expect(countPlayerCombinations('P2', hands)).toMatchObject({
    straightFlush: 0,
    fourOfAKind: 0,
    fullHouse: 0,
    flush: 0,
    straight: 0,
    threeOfAKind: 0,
    twoPair: 0,
  });
});

test('classifies bots by their aggressive-hand share', () => {
  expect(botStyle('P1', hands)).toBe('aggressive');
  expect(botStyle('P1', hands.map((hand) => ({
    ...hand,
    actions: hand.actions?.filter((action) => action.playerId !== 'P1'),
  })))).toBe('cautious');
});
