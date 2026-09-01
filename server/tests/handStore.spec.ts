import HandStore from '../src/handStore';

test('concurrent first reads wait for the database schema to finish initializing', async () => {
  const store = new HandStore(':memory:');

  await expect(Promise.all([
    store.listAllHands(),
    store.deleteExpiredParties(0),
    store.getAnalyticsStats(),
  ])).resolves.toBeDefined();
});

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

test('analytics reports completed parties and cookie client win rate', async () => {
  const store = new HandStore(':memory:');
  await store.saveHand({
    id: 'won-party', partyId: 'won-party', handNumber: 1, stage: 'showdown',
    players: [{ id: 'player-1', stack: 200 }, { id: 'player-2', stack: 0 }],
  });
  await store.saveHand({
    id: 'lost-party', partyId: 'lost-party', handNumber: 1, stage: 'showdown',
    players: [{ id: 'player-1', stack: 0 }, { id: 'player-2', stack: 200 }],
  });
  await store.recordAnalyticsVisit({ partyId: 'won-party', handId: 'won-party', playerId: 'player-1', clientCookie: 'Alice', ip: '1.1.1.1' }, 1_000);
  await store.recordAnalyticsVisit({ partyId: 'lost-party', handId: 'lost-party', playerId: 'player-1', clientCookie: 'Alice', ip: '1.1.1.1' }, 2_000);

  const access = (await store.getAnalyticsStats()).accesses[0];
  expect(access).toMatchObject({
    clientCookie: 'Alice',
    gamesPlayed: 2,
    partiesPlayed: 2,
    partiesWon: 1,
    dealsPlayed: 2,
    winPercent: 50,
  });
});

test('analytics aggregates a stable player cookie even when the display name changes', async () => {
  const store = new HandStore(':memory:');
  for (const [partyId, stack, at] of [
    ['party-a', 200, 1_000],
    ['party-b', 0, 2_000],
  ] as const) {
    await store.saveHand({
      id: partyId, partyId, handNumber: 1, stage: 'showdown',
      players: [{ id: 'player-1', stack }, { id: 'player-2', stack: stack ? 0 : 200 }],
    });
    await store.recordAnalyticsVisit({
      partyId, handId: partyId, playerId: 'player-1',
      clientCookie: 'stable-player-id', ip: '1.1.1.1',
    }, at);
  }

  const accesses = (await store.getAnalyticsStats()).accesses;
  expect(accesses).toHaveLength(1);
  expect(accesses[0]).toMatchObject({ clientCookie: 'stable-player-id', gamesPlayed: 2, winPercent: 50 });
});

test('expired parties and their started lobbies are forgotten while active parties remain', async () => {
  const store = new HandStore(':memory:');
  await store.saveHand({
    id: 'expired-hand-1',
    partyId: 'expired-party',
    created: 1_000,
  });
  await store.saveHand({
    id: 'expired-hand-2',
    partyId: 'expired-party',
    created: 2_000,
  });
  await store.saveHand({
    id: 'active-hand',
    partyId: 'active-party',
    created: 1_000,
  });
  await store.recordAnalyticsActivity('active-party', 10_000);
  await store.saveLobby({
    id: 'expired-lobby',
    status: 'started',
    handId: 'expired-hand-1',
    created: 1_000,
  });

  await expect(store.deleteExpiredParties(5_000)).resolves.toEqual({
    partyIds: ['expired-party'],
    handIds: ['expired-hand-1', 'expired-hand-2'],
  });
  await expect(store.getHand('expired-hand-1')).resolves.toBeNull();
  await expect(store.getHand('expired-hand-2')).resolves.toBeNull();
  await expect(store.getLobby('expired-lobby')).resolves.toBeNull();
  await expect(store.getHand('active-hand')).resolves.toMatchObject({ id: 'active-hand' });
  await expect(store.getPartyLastActivity('active-party')).resolves.toBe(10_000);
});

test('waiting lobbies are forgotten after their inactivity cutoff', async () => {
  const store = new HandStore(':memory:');
  await store.saveLobby({
    id: 'old-lobby',
    status: 'waiting',
    created: 1_000,
    lastActivity: 1_000,
  });
  await store.saveLobby({
    id: 'recent-lobby',
    status: 'waiting',
    created: 1_000,
    lastActivity: 10_000,
  });

  await expect(store.deleteExpiredWaitingLobbies(5_000)).resolves.toEqual(['old-lobby']);
  await expect(store.getLobby('old-lobby')).resolves.toBeNull();
  await expect(store.getLobby('recent-lobby')).resolves.toMatchObject({ id: 'recent-lobby' });
});
