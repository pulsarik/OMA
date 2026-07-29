import { expect, test } from '@jest/globals';
import { callAction, isAllInWager } from '../client/src/callAction';

test('shows a short call as all-in with the real remaining stack', () => {
  expect(callAction(100, 27)).toEqual({
    amount: 27,
    isAllIn: true,
    canRaise: false,
  });
});

test('keeps a covered call as a normal call and allows a raise', () => {
  expect(callAction(27, 100)).toEqual({
    amount: 27,
    isAllIn: false,
    canRaise: true,
  });
});

test('an exact-stack call is all-in and cannot be raised', () => {
  expect(callAction(27, 27)).toEqual({
    amount: 27,
    isAllIn: true,
    canRaise: false,
  });
});

test('marks a bet that consumes the remaining stack as all-in', () => {
  expect(isAllInWager(27, 0, 27)).toBe(true);
  expect(isAllInWager(26, 0, 27)).toBe(false);
});

test('uses only the unpaid part of a raise to identify all-in', () => {
  expect(isAllInWager(100, 20, 80)).toBe(true);
  expect(isAllInWager(100, 20, 81)).toBe(false);
});
