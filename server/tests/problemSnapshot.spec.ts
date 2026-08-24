import { diagnosticPlayerSnapshot } from '../src/problemSnapshot';

test('problem snapshots include starting stacks and bot metadata', () => {
  expect(diagnosticPlayerSnapshot({
    id: 'P1',
    name: 'Alex',
    isBot: true,
    botStyle: 'aggressive',
    hole: ['As', 'Kd', 'Qc', 'Jh'],
    folded: false,
    stack: 0,
  }, 988)).toEqual({
    id: 'P1',
    name: 'Alex',
    isBot: true,
    botStyle: 'aggressive',
    startingStack: 988,
    hole: ['As', 'Kd', 'Qc', 'Jh'],
    folded: false,
    stack: 0,
  });
});

test('human players do not receive a bot style in problem snapshots', () => {
  expect(diagnosticPlayerSnapshot({
    id: 'P2',
    isBot: false,
    stack: 992,
    folded: true,
  }, 8)).toMatchObject({
    isBot: false,
    startingStack: 1000,
    stack: 992,
  });
  expect(diagnosticPlayerSnapshot({ id: 'P2', isBot: false, stack: 992 }, 8).botStyle).toBeUndefined();
});
