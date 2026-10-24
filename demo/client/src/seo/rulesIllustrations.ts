// Authored illustrations, checked against the server evaluator in rulesPractice.spec.ts.
// These selections demonstrate the rules; they do not evaluate live player hands.
export const illustratedBlindLevels = [
  { from: 1, to: 8, small: 2, big: 4 },
  { from: 9, to: 16, small: 4, big: 8 },
  { from: 17, to: 24, small: 8, big: 16 },
  { from: 25, to: 32, small: 16, big: 32 },
] as const;

export const illustratedRaises = { bet: 4, raises: [8, 12, 16] } as const;

export const illustratedBetSizes = [
  { id: 'opening', move: 'bet', stage: 'flop', pot: 100, currentBet: 0, ownBet: 0, call: 0, lastRaise: 4, stack: 500,
    targets: [4, 25, 50, 100], added: [4, 25, 50, 100] },
  { id: 'facing-bet', move: 'raise', stage: 'flop', pot: 100, currentBet: 20, ownBet: 0, call: 20, lastRaise: 20, stack: 500,
    targets: [40, 50, 80, 140], added: [40, 50, 80, 140] },
  { id: 'small-blind', move: 'raise', stage: 'preflop', pot: 6, currentBet: 4, ownBet: 2, call: 2, lastRaise: 4, stack: 500,
    targets: [8, 8, 8, 12], added: [6, 6, 6, 10] },
  { id: 'short-stack', move: 'bet', stage: 'flop', pot: 100, currentBet: 0, ownBet: 0, call: 0, lastRaise: 4, stack: 30,
    targets: [4, 25, 30, 30], added: [4, 25, 30, 30] },
] as const;

export const illustratedHand = {
  hole: 'As 2d Kc Qh',
  board: '3c 4d 8s Kh Ks',
  high: ['Kc', 'Qh', '8s', 'Kh', 'Ks'],
  low: ['As', '2d', '3c', '4d', '8s'],
};

export const lowIllustrations = [
  { cards: '5c 4d 3h 2s Ac', low: '5-4-3-2-1', en: 'The best low', ru: 'Лучшее лоу', enNote: 'Five-high. An ace counts as 1.', ruNote: 'До пятёрки. Туз считается за 1.' },
  { cards: '8s 6c 4h 2d As', low: '8-6-4-2-1', en: 'This low qualifies', ru: 'Это лоу подходит', enNote: 'Five different ranks, all 8 or lower.', ruNote: 'Пять разных достоинств, все не выше 8.' },
  { cards: '9c 5d 4h 2s Ac', low: null, en: 'No qualifying low', ru: 'Лоу не подходит', enNote: 'The 9 is too high. A pair would also fail.', ruNote: 'Девятка слишком старшая. Пара тоже не подходит.' },
] as const;
