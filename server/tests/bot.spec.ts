import { botMove, estimateShowdownEquity } from '../src/bot';
import { compareOmahaHands, dealHand } from '../src/game';

test('Omaha hand comparison handles both halves of a split pot', () => {
  const board = ['3s', '4h', '6d', 'Kc', 'Qc'];
  const nutLow = ['As', '2h', 'Jd', 'Td'];
  const highOnly = ['Ks', 'Kh', 'Qd', 'Jc'];

  expect(compareOmahaHands(nutLow, highOnly, board).high).toBeLessThan(0);
  expect(compareOmahaHands(nutLow, highOnly, board).low).toBeGreaterThan(0);
});

test('bot equity is deterministic and does not use opponents hidden cards', () => {
  const hand = dealHand(3, 24680);
  hand.stage = 'flop';
  hand.community = hand.fullCommunity.slice(0, 3);
  const player = hand.players[0];
  const first = estimateShowdownEquity(hand, player, 80);

  hand.players[1].hole = ['As', 'Ah', 'Ks', 'Kh'];
  hand.players[2].hole = ['2c', '3c', '4c', '5c'];

  expect(estimateShowdownEquity(hand, player, 80)).toEqual(first);
  expect(first.equity).toBeGreaterThanOrEqual(0);
  expect(first.equity).toBeLessThanOrEqual(1);
});

test('bot calls with a strong two-way draw when the pot price is favorable', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'flop';
  hand.fullCommunity = ['3s', '4h', 'Kd', 'Qc', '9c'];
  hand.community = hand.fullCommunity.slice(0, 3);
  hand.players[0].hole = ['As', '2h', 'Kh', '5s'];
  hand.currentPlayerId = 'P1';
  hand.currentBet = 12;
  hand.roundBets = { P1: 0, P2: 12 };
  hand.potCoins = 60;

  expect(botMove(hand, hand.players[0]).move).not.toBe('fold');
});
