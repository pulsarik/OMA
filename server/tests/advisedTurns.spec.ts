import { AdvisedTurns } from '../src/advisedTurns';

test('an advised turn suppresses commentary exactly once', () => {
  let now = 1_000;
  const advised = new AdvisedTurns(() => now);
  const turn = { id: 'hand-1', stage: 'flop', turnDeadline: 20_000 };

  advised.mark(turn, 'player-1');

  expect(advised.consume(turn, 'player-2')).toBe(false);
  expect(advised.consume(turn, 'player-1')).toBe(true);
  expect(advised.consume(turn, 'player-1')).toBe(false);

  advised.mark(turn, 'player-1');
  now = 21_001;
  expect(advised.consume(turn, 'player-1')).toBe(false);
});
