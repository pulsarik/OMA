import { practiceCases, practiceGroups } from '../../demo/client/src/seo/practice';
import { blindLevelForHand, compareOmahaHands, dealHand, evaluatePlayerCombo, hasNutLow, MAX_RAISES_PER_STREET, recordPlayerMove } from '../src/game';
import { illustratedBetSizes, illustratedBlindLevels, illustratedHand, illustratedRaises, lowIllustrations } from '../../demo/client/src/seo/rulesIllustrations';

const cards = (value: string) => value ? value.split(' ') : [];
const example = (id: number) => practiceCases.find(item => item.id === id)!;

test('illustrated bet sizes, minimums, pot caps and chips added agree with the engine', () => {
  for (const example of illustratedBetSizes) {
    const act = (requested: number) => {
      const hand = dealHand(2, 12345);
      hand.stage = example.stage;
      hand.community = example.stage === 'flop' ? hand.fullCommunity.slice(0, 3) : [];
      hand.potCoins = example.pot;
      hand.currentBet = example.currentBet;
      hand.lastFullRaise = example.lastRaise;
      hand.currentPlayerId = 'P1';
      hand.actedSinceLastFullRaise = [];
      hand.roundBets = { P1: example.ownBet, P2: example.currentBet };
      const previousContribution = (example.pot - example.ownBet - example.currentBet) / 2;
      hand.totalContributions = { P1: previousContribution + example.ownBet, P2: previousContribution + example.currentBet };
      hand.players[0].stack = example.stack;
      recordPlayerMove(hand, 'P1', example.move, requested);
      return { target: hand.currentBet, added: example.stack - hand.players[0].stack };
    };
    example.targets.forEach((target, index) => expect(act(target)).toEqual({ target, added: example.added[index] }));
    expect(act(1).target).toBe(example.targets[0]);
    expect(act(10_000).target).toBe(example.targets[3]);
  }
});

test('illustrated blind levels match the server at both ends of every displayed range', () => {
  for (const { from, to, small, big } of illustratedBlindLevels) {
    expect(blindLevelForHand(from)).toMatchObject({ small, big });
    expect(blindLevelForHand(to)).toMatchObject({ small, big });
    expect(blindLevelForHand(to + 1).big).toBe(big * 2);
  }
});

test('the illustrated bet and three raises are legal and the count resets on the next street', () => {
  const hand = dealHand(2, 12345);
  recordPlayerMove(hand, hand.currentPlayerId!, 'call');
  recordPlayerMove(hand, hand.currentPlayerId!, 'check');
  expect(hand.stage).toBe('flop');
  recordPlayerMove(hand, hand.currentPlayerId!, 'bet', illustratedRaises.bet);
  expect(hand.raiseCount).toBe(0);
  expect(illustratedRaises.raises).toHaveLength(MAX_RAISES_PER_STREET);
  for (const amount of illustratedRaises.raises) {
    recordPlayerMove(hand, hand.currentPlayerId!, 'raise', amount);
    expect(hand.currentBet).toBe(amount);
  }
  expect(() => recordPlayerMove(hand, hand.currentPlayerId!, 'raise', 20)).toThrow('raise limit reached');
  recordPlayerMove(hand, hand.currentPlayerId!, 'call');
  expect(hand.stage).toBe('turn');
  expect(hand.raiseCount).toBe(0);
});

test('visual high and low selections use two hole cards, three board cards and match the engine', () => {
  const hole = cards(illustratedHand.hole), board = cards(illustratedHand.board);
  const result = evaluatePlayerCombo(hole, board)!;
  expect(result.highRank).toBe('three of a kind');
  expect(result.lowRank).toBe('8-4-3-2-1');
  for (const mode of ['high', 'low'] as const) {
    const selected = illustratedHand[mode];
    expect(new Set(selected).size).toBe(5);
    const selectedHole = selected.filter(card => hole.includes(card));
    const selectedBoard = selected.filter(card => board.includes(card));
    expect(selectedHole).toHaveLength(2);
    expect(selectedBoard).toHaveLength(3);
    const selectedResult = evaluatePlayerCombo(selectedHole, selectedBoard)!;
    expect(selectedResult[`${mode}Rank`]).toBe(result[`${mode}Rank`]);
  }
});

test('illustrated low examples qualify or fail exactly as explained', () => {
  for (const illustration of lowIllustrations) {
    const hand = cards(illustration.cards);
    const result = evaluatePlayerCombo(hand.slice(0, 2), hand.slice(2));
    expect(result?.lowRank ?? null).toBe(illustration.low);
  }
});

test('all 50 bilingual examples use legal, non-duplicated cards', () => {
  expect(practiceCases).toHaveLength(50);
  expect(new Set(practiceCases.map(item => item.id)).size).toBe(50);
  practiceGroups.forEach((_, group) => expect(practiceCases.filter(item => item.group === group)).toHaveLength(10));
  for (const item of practiceCases) {
    const hole = cards(item.hole), board = cards(item.board);
    expect(hole).toHaveLength(4);
    expect([0, 3, 4, 5]).toContain(board.length);
    expect(new Set([...hole, ...board]).size).toBe(hole.length + board.length);
    [...hole, ...board].forEach(card => expect(card).toMatch(/^[2-9TJQKA][shdc]$/));
    for (const language of ['en', 'ru'] as const) {
      expect(item.question[language].length).toBeGreaterThan(10);
      expect(item.answer[language].length).toBeGreaterThan(60);
    }
    if (item.expectedLow !== undefined) {
      expect({ id: item.id, low: evaluatePlayerCombo(hole, board)?.lowRank ?? null })
        .toEqual({ id: item.id, low: item.expectedLow });
    }
  }
});

test('the engine confirms the high combinations described in the worked examples', () => {
  const expected: Record<number, string> = {
    1: 'pair', 2: 'flush', 3: 'high card', 4: 'three of a kind', 5: 'pair',
    6: 'three of a kind', 7: 'straight', 8: 'straight flush', 9: 'three of a kind', 10: 'full house',
    34: 'high card', 35: 'flush', 36: 'straight', 37: 'three of a kind', 38: 'two pair', 40: 'flush',
  };
  for (const [id, high] of Object.entries(expected)) {
    const item = example(Number(id));
    expect({ id, high: evaluatePlayerCombo(cards(item.hole), cards(item.board))?.highRank }).toEqual({ id, high });
  }
});

test('counterfeit and backup examples match the same low evaluator used by the game', () => {
  for (const id of [11, 16, 31, 32, 33, 34, 39, 40]) {
    const item = example(id);
    expect({ id, nut: hasNutLow(cards(item.hole), cards(item.board)) })
      .toEqual({ id, nut: ![31, 33].includes(id) });
  }
  for (const [id, opponent] of [[31, '2h 5s Jc Td'], [33, 'Ah 5s Jc Td']] as const) {
    const item = example(id);
    expect(compareOmahaHands(cards(item.hole), cards(opponent), cards(item.board)).low).toBeLessThan(0);
  }
});
