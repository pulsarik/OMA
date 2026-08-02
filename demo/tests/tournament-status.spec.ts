import { expect, test } from '@jest/globals';
import { findTournamentWinner } from '../client/src/tournamentStatus';

const players = [
  { id: 'P1', name: 'Dima', stack: 25 },
  { id: 'P2', name: 'Anna', stack: 0 },
];
const totals = [
  { id: 'P1', total: 25 },
  { id: 'P2', total: 0 },
];

test('does not declare a tournament winner while an all-in hand still needs action', () => {
  expect(findTournamentWinner('river', players, totals)).toBeUndefined();
});

test('declares the sole remaining player only after showdown settles the hand', () => {
  expect(findTournamentWinner('showdown', players, totals)).toEqual(players[0]);
});
