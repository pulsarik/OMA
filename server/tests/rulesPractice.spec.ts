import { practiceCases, practiceGroups } from '../../demo/client/src/seo/practice';
import { compareOmahaHands, evaluatePlayerCombo, hasNutLow } from '../src/game';

const cards = (value: string) => value ? value.split(' ') : [];
const example = (id: number) => practiceCases.find(item => item.id === id)!;

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
