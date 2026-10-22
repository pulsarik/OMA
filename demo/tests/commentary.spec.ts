import { expect, test } from '@jest/globals';
import { canPresentCommentary, readCommentary } from '../client/src/commentary/protocol';

const message = { id: 'h:complete', handId: 'h', partyId: 'p', revision: 5, locale: 'ru' as const,
  text: 'За столом новый лидер.', serverNow: 10_000, expiresAt: 20_000 };

test('commentary waits for its result state and rejects a different hand or party', () => {
  expect(readCommentary(message, 'h', 'ru')).toEqual(message);
  expect(canPresentCommentary(message, { handId: 'h', partyId: 'p', revision: 4, stage: 'showdown' })).toBe(false);
  expect(canPresentCommentary(message, { handId: 'h', partyId: 'p', revision: 6, stage: 'showdown' })).toBe(true);
  expect(canPresentCommentary(message, { handId: 'h', partyId: 'p', revision: 6, stage: 'river' })).toBe(false);
  expect(canPresentCommentary(message, { handId: 'h2', partyId: 'p', revision: 6, stage: 'showdown' })).toBe(false);
  expect(canPresentCommentary(message, { handId: 'h', partyId: 'other', revision: 6, stage: 'showdown' })).toBe(false);
});

test('rejects stale, wrong-language and malformed events, and external audio URLs', () => {
  for (const invalid of [{ ...message, expiresAt: 9_000 }, { ...message, expiresAt: 99_000 },
    { ...message, revision: '5' }, { ...message, audioUrl: 'https://elsewhere/audio.mp3' },
    { ...message, locale: 'en' }, { ...message, handId: 'other' }, { ...message, stage: 'invalid' }]) {
    expect(readCommentary(invalid, 'h', 'ru')).toBeUndefined();
  }
});

test('live commentary waits for its revision and disappears on the next street or showdown', () => {
  const live = { ...message, stage: 'flop' as const };
  expect(readCommentary(live, 'h', 'ru')).toEqual(live);
  for (const stage of ['preflop', 'turn', 'river', 'showdown']) {
    expect(canPresentCommentary(live, { handId: 'h', partyId: 'p', revision: 6, stage })).toBe(false);
  }
  expect(canPresentCommentary(live, { handId: 'h', partyId: 'p', revision: 4, stage: 'flop' })).toBe(false);
  expect(canPresentCommentary(live, { handId: 'h', partyId: 'p', revision: 5, stage: 'flop' })).toBe(true);
  expect(canPresentCommentary(live, { handId: 'h', partyId: 'p', revision: 6, stage: 'flop' })).toBe(true);
});
