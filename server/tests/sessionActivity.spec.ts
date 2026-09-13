import HandStore from '../src/handStore';

test('one hour without play expires a table even when browser activity continues', async () => {
  const store = new HandStore(':memory:');
  const started = 100_000;
  const hour = 3_600_000;
  await store.saveHand({ id: 'hand', partyId: 'party', created: started });
  await store.saveLobby({ id: 'lobby', status: 'started', handId: 'hand', created: started });
  await store.recordAnalyticsActivity('party', started + hour - 1);
  expect(await store.getPartyLastActivity('party')).toBe(started);
  expect(await store.deleteExpiredParties(started - 1)).toEqual({ partyIds: [], handIds: [] });
  expect(await store.deleteExpiredParties(started)).toEqual({ partyIds: ['party'], handIds: ['hand'] });
  expect(await store.getLobby('lobby')).toBeNull();
  await store.recordAnalyticsActivity('party', started + hour);
  await store.recordGameActivity('party', started + hour);
  expect(await store.getPartyLastActivity('party')).toBeUndefined();
});

test('a move extends the table lifetime and old events cannot move the clock backwards', async () => {
  const store = new HandStore(':memory:');
  await store.saveHand({ id: 'hand', partyId: 'party', created: 1_000 });
  await store.recordGameActivity('party', 50_000);
  await store.recordGameActivity('party', 20_000);
  expect(await store.getPartyLastActivity('party')).toBe(50_000);
  expect(await store.deleteExpiredParties(49_999)).toEqual({ partyIds: [], handIds: [] });
  expect(await store.deleteExpiredParties(50_000)).toEqual({ partyIds: ['party'], handIds: ['hand'] });
});
