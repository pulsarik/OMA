import HandStore from '../src/handStore';

test('problem IDs start at 1000 and saved reports can be read back', async () => {
  const store = new HandStore(':memory:');

  const first = await store.saveProblem('Wrong pot calculation', {
    context: { page: 'player', handId: 'hand-1' },
    hand: { actions: [{ playerId: 'P1', move: 'call' }] },
  });
  const second = await store.saveProblem('Wrong stack', {
    context: { page: 'player', handId: 'hand-2' },
  });

  expect(first.id).toBe(1000);
  expect(second.id).toBe(1001);
  await expect(store.getProblem(1000)).resolves.toMatchObject({
    id: 1000,
    description: 'Wrong pot calculation',
    context: { page: 'player', handId: 'hand-1' },
    hand: { actions: [{ playerId: 'P1', move: 'call' }] },
  });
});

test('analytics pauses after 30 seconds and resumes on later activity', async () => {
  const store = new HandStore(':memory:');
  await store.saveHand({
    id: 'hand-1',
    partyId: 'party-1',
    partyCode: 'PA0001',
    created: 1_000,
  });

  await store.recordAnalyticsActivity('party-1', 1_000);
  await store.recordAnalyticsActivity('party-1', 11_000);
  await store.recordAnalyticsActivity('party-1', 101_000);
  await store.recordAnalyticsVisit({
    partyId: 'party-1',
    handId: 'hand-1',
    playerId: 'player-1',
    ip: '203.0.113.10',
    deviceType: 'Mobile',
    platform: 'Android',
    screenWidth: 412,
    screenHeight: 915,
  }, 2_000);

  const stats = await store.getAnalyticsStats(106_000);
  expect(stats.totals).toMatchObject({
    deals: 1,
    parties: 1,
    activeMs: 45_000,
    visits: 1,
    uniqueIps: 1,
  });
  expect(stats.totals.averagePartyActiveMs).toBe(45_000);
  expect(stats.accesses[0]).toMatchObject({
    ip: '203.0.113.10',
    deviceType: 'Mobile',
    screenWidth: 412,
    screenHeight: 915,
    connections: 1,
  });
});
