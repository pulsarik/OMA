import { botMove, estimateShowdownEquity, isQualifyingStartingHand } from '../src/bot';
import { compareOmahaHands, dealHand, nextPartyHand, replayHandLayout } from '../src/game';

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

test('bot does not fold supported suited ace-king preflop at a normal price', () => {
  const hand = dealHand(2, 12345, [], [true, false]);
  hand.currentPlayerId = 'P1';
  hand.currentBet = 8;
  hand.roundBets = { P1: 0, P2: 8 };
  hand.potCoins = 80;
  hand.players[0].hole = ['As', 'Ks', 'Jc', '7h'];

  expect(botMove(hand, hand.players[0]).move).not.toBe('fold');
});

test('bot does not auto-fold a made two-pair hand at a normal price', () => {
  const hand = dealHand(3, 12345, [], [true, true, false]);
  hand.stage = 'turn';
  hand.fullCommunity = ['Qh', '7s', '9s', '7c', '2h'];
  hand.community = hand.fullCommunity.slice(0, 4);
  hand.currentPlayerId = 'P1';
  hand.currentBet = 16;
  hand.roundBets = { P1: 0, P2: 16, P3: 16 };
  hand.potCoins = 96;
  hand.players[0].hole = ['Qd', 'Ad', '2c', '9d'];

  expect(botMove(hand, hand.players[0]).move).not.toBe('fold');
});

test('a cautious bot continues with double-suited pocket aces', () => {
  const hand = dealHand(2, 12345, [], [true, false]);
  hand.currentPlayerId = 'P1';
  hand.currentBet = 16;
  hand.roundBets = { P1: 0, P2: 16 };
  hand.potCoins = 80;
  hand.players[0].botStyle = 'cautious';
  hand.players[0].hole = ['As', 'Ac', 'Ts', 'Tc'];

  expect(botMove(hand, hand.players[0]).move).not.toBe('fold');
});

test('bot styles change aggression while staying deterministic', () => {
  const hand = dealHand(2, 3, [], [true, false]);
  hand.stage = 'flop';
  hand.community = hand.fullCommunity.slice(0, 3);
  hand.currentPlayerId = 'P1';
  hand.currentBet = 0;
  hand.roundBets = { P1: 0, P2: 0 };
  hand.potCoins = 80;

  const bot = hand.players[0];
  const decisions = (['normal', 'aggressive', 'cautious'] as const).map((botStyle) => {
    bot.botStyle = botStyle;
    return botMove(hand, bot);
  });

  expect(decisions).toEqual([
    { move: 'bet', amount: 20 },
    { move: 'bet', amount: 40 },
    { move: 'check' },
  ]);
});

test('bot styles are seeded independently and survive new hands and replays', () => {
  const hand = dealHand(4, 24680, [], [true, true, false, true]);

  expect(hand.players.map((player) => player.botStyle)).toEqual([
    'cautious',
    'aggressive',
    undefined,
    'aggressive',
  ]);
  expect(dealHand(4, 24680, [], [true, true, false, true]).players.map((player) => player.botStyle)).toEqual(
    hand.players.map((player) => player.botStyle),
  );
  const sampledStyles = new Set(
    Array.from({ length: 30 }, (_, index) => dealHand(1, index + 1, [], [true]).players[0].botStyle),
  );
  expect([...sampledStyles].sort()).toEqual(['aggressive', 'cautious', 'normal']);
  expect(replayHandLayout(hand).players.map((player) => player.botStyle)).toEqual([
    'cautious',
    'aggressive',
    undefined,
    'aggressive',
  ]);
  expect(nextPartyHand(hand).players.map((player) => player.botStyle)).toEqual([
    'cautious',
    'aggressive',
    undefined,
    'aggressive',
  ]);
});

test.each([
  [['As', '7h', '4d', '2c'], true],
  [['Ts', 'Th', '8d', '2c'], true],
  [['9s', 'Th', 'Jd', 'Kc'], true],
  [['2s', '3h', '6d', '7c'], true],
  [['2s', '4h', '8d', 'Kc'], true],
  [['Ts', 'Th', '8d', '8c'], false],
  [['9s', '9h', 'Jd', 'Kc'], false],
  [['2s', '2h', '6d', '7c'], false],
  [['2s', '8h', '9d', 'Kc'], false],
])('Q-bot starting-hand criteria: %j qualifies=%s', (hole, qualifies) => {
  expect(isQualifyingStartingHand(hole as string[])).toBe(qualifies);
});

test('every second bot qualifies by its hand and ignores preflop bet size and player count', () => {
  const hand = dealHand(5, 9876, [], [false, true, false, true, false]);
  const bot = hand.players[3];
  bot.hole = ['As', '2h', '3c', 'Kd'];
  hand.currentPlayerId = bot.id;
  hand.currentBet = 500;
  hand.roundBets[bot.id] = 0;

  expect(bot.qualifyingEntryBot).toBe(true);
  expect(bot.name).toBe('Leo_Q_bot');
  expect(botMove(hand, bot)).toEqual({ move: 'call' });
});

test('Q-bot folds non-qualifying preflop hands and uses the normal strategy after the flop', () => {
  const hand = dealHand(3, 1357, [], [false, true, true]);
  const bot = hand.players[2];
  bot.hole = ['2s', '8h', '9d', 'Kc'];
  hand.currentPlayerId = bot.id;
  hand.currentBet = 0;
  hand.roundBets[bot.id] = 0;

  expect(bot.qualifyingEntryBot).toBe(true);
  expect(botMove(hand, bot)).toEqual({ move: 'fold' });

  hand.stage = 'flop';
  bot.hole = ['As', 'Ks', 'Jc', '7h'];
  hand.fullCommunity = ['3s', '4h', '6d', 'Qc', '9c'];
  hand.community = hand.fullCommunity.slice(0, 3);
  hand.currentBet = 0;
  hand.roundBets[bot.id] = 0;
  hand.potCoins = 80;
  const regularBot = { ...bot, qualifyingEntryBot: false };
  expect(botMove(hand, bot)).toEqual(botMove(hand, regularBot));
});
