import HandStore from '../src/handStore';
import { dealHand } from '../src/game';
import { createArchiveSummary } from '../src/archive';
import * as archive from '../src/archive';

test('archive pages load 20 whole parties and preserve legacy links', async () => {
  const store = new HandStore(':memory:');
  for (let index = 0; index < 21; index++) {
    await store.saveHand({ ...dealHand(2), id: `hand-${index}`, partyId: `party-${index}`,
      created: index * 1000, handNumber: 1, handCode: `H${index}`, partyCode: `P${index}` });
  }
  await store.saveHand({ ...dealHand(2), id: 'legacy-next', partyId: 'legacy-party',
    previousHandId: 'hand-20', handNumber: 2, created: 30000, handCode: 'HX', partyCode: 'PX' });
  const allHands = jest.spyOn(store, 'listAllHands').mockRejectedValue(new Error('Full archive must not be loaded'));
  const first = await store.getArchivePage();
  expect(first).toMatchObject({ total: 21, page: 1, pageSize: 20, totalPages: 2 });
  expect(first.rows).toHaveLength(20);
  expect(first.rows[0]).toMatchObject({ partyId: 'party-20', hands: 2 });
  expect(first.summary).toMatchObject({ games: 21, hands: 22, completedHands: 0 });
  const second = await store.getArchivePage(2);
  expect(second.summary).toEqual(first.summary);
  expect(second.rows.map(row => row.partyId)).toEqual(['party-0']);
  expect(await store.getArchivePage(999)).toEqual(second);
  expect(allHands).not.toHaveBeenCalled();
});

test('archive stack detail follows legacy links across party IDs', async () => {
  const store = new HandStore(':memory:');
  const first = { ...dealHand(2), id: 'linked-first', partyId: 'public-party', created: 1_000, handNumber: 1 };
  const second = {
    ...dealHand(2), id: 'linked-second', partyId: 'legacy-party', previousHandId: first.id,
    created: 2_000, handNumber: 2,
  };
  await store.saveHand(first);
  await store.saveHand(second);

  expect((await store.listArchiveHands('public-party')).map(hand => hand.id)).toEqual([
    'linked-first', 'linked-second',
  ]);
  expect(await store.listArchiveHands('legacy-party')).toEqual([]);
});

test('empty archive has one empty page', async () => {
  expect(await new HandStore(':memory:').getArchivePage()).toEqual({
    rows: [], total: 0, page: 1, pageSize: 20, totalPages: 1,
    summary: createArchiveSummary(),
  });
});

test('archive includes participant names and countries without exposing player IDs', async () => {
  const store = new HandStore(':memory:');
  const solo = { ...dealHand(2, 1, ['Solo', 'Bot'], [false, true], 'ABC123'), id: 'solo-hand', partyId: 'solo-party' };
  const group = { ...dealHand(3, 2, ['Alice', 'Bob', 'Bot'], [false, false, true], 'XYZ789'), id: 'group-hand', partyId: 'group-party' };
  await store.saveHand(solo);
  await store.saveHand(group);
  await store.recordAnalyticsVisit({
    partyId: 'solo-party', handId: 'solo-hand', playerId: 'P1', playerName: 'Solo', country: 'RU',
  });
  await store.recordAnalyticsVisit({
    partyId: 'group-party', handId: 'group-hand', playerId: 'P1', playerName: 'Alice', country: 'US',
  });
  await store.recordAnalyticsVisit({
    partyId: 'group-party', handId: 'group-hand', playerId: 'P2', playerName: 'Bob', country: 'CA',
  });

  const { rows } = await store.getArchivePage();
  expect(rows.find(row => row.partyId === 'solo-party')).toMatchObject({
    playerInfo: [{ name: 'Solo', country: 'RU' }],
  });
  const groupRow = rows.find(row => row.partyId === 'group-party');
  expect(groupRow).toMatchObject({
    playerInfo: [{ country: 'US' }, { country: 'CA' }],
  });
  expect(groupRow).not.toHaveProperty('humanPlayers');
  expect(JSON.stringify(rows)).not.toContain('"playerId"');
});

test('archive migrates legacy summaries without reevaluating hands', async () => {
  const store = new HandStore(':memory:');
  const hand = dealHand(2, 1, ['Solo', 'Bot'], [false, true], 'ABC123');
  hand.id = 'legacy-cache-hand';
  hand.partyId = 'legacy-cache-party';
  hand.stage = 'showdown';
  hand.community = [...hand.fullCommunity];
  hand.created = 1_000;
  hand.actions = [{ playerId: hand.players[0].id, move: 'check', stage: 'showdown', at: 91_000 }];
  await store.saveHand(hand);

  const db = (store as unknown as {
    db: { run(sql: string, ...params: unknown[]): Promise<unknown> };
  }).db;
  await db.run(
    'UPDATE archive_party_cache SET signature = ? WHERE first_hand_id = ?',
    hand.id,
    hand.id,
  );
  const rebuild = jest.spyOn(archive, 'buildArchiveRows');

  const result = await store.getArchivePage();

  expect(rebuild).not.toHaveBeenCalled();
  expect(result.rows[0]).toMatchObject({
    durationMinutes: 1,
    playerInfo: [{ name: 'Solo' }],
  });
  expect((await store.getArchivePage()).rows[0]).toMatchObject({
    durationMinutes: 1,
    playerInfo: [{ name: 'Solo' }],
  });
  expect(rebuild).not.toHaveBeenCalled();
  rebuild.mockRestore();
});

test('updating one party leaves other cached archive summaries warm', async () => {
  const store = new HandStore(':memory:');
  for (const [id, partyId] of [['one', 'party-one'], ['two', 'party-two']]) {
    const hand = dealHand(2, 1, ['Solo', 'Bot'], [false, true], 'ABC123');
    hand.id = `${id}-hand`;
    hand.partyId = partyId;
    hand.stage = 'showdown';
    hand.community = [...hand.fullCommunity];
    await store.saveHand(hand);
  }

  const updated = await store.getHand('one-hand');
  updated.actions = [{ playerId: updated.players[0].id, move: 'check', stage: 'showdown', at: 90_000 }];
  await store.updateHand(updated);
  const rebuild = jest.spyOn(archive, 'buildArchiveRows');
  const rebuildsBeforeRequest = rebuild.mock.calls.length;

  const result = await store.getArchivePage();

  expect(result.rows).toHaveLength(2);
  expect(rebuild).toHaveBeenCalledTimes(rebuildsBeforeRequest);
  rebuild.mockRestore();
});

test('archive cache can warm at startup while requests wait for it', async () => {
  const store = new HandStore(':memory:');
  const [warm, page] = await Promise.all([store.warmArchiveCache(), store.getArchivePage()]);

  await warm;
  expect(page).toMatchObject({ rows: [], total: 0, page: 1 });
});

test('archive summary includes off-page results and reflects saved changes', async () => {
  const store = new HandStore(':memory:');
  for (let index = 0; index < 21; index++) {
    await store.saveHand({ ...dealHand(2), id: `hand-${index}`, partyId: `party-${index}`,
      created: index * 1000, handCode: `H${index}`, partyCode: `P${index}` });
  }
  const hand = await store.getHand('hand-0');
  hand.stage = 'showdown';
  hand.partyFinishedEarly = true;
  hand.fullCommunity = ['3c', '4d', '5h', 'Ks', 'Qh'];
  hand.community = [...hand.fullCommunity];
  hand.players[0].hole = ['As', '2s', 'Jc', 'Tc'];
  hand.players[1].hole = ['Ah', '2h', 'Jd', 'Td'];
  hand.actions = [{ playerId: hand.players[0].id, move: 'check', stage: 'showdown', at: 120000 }];
  const before = await store.getArchivePage();
  expect(before.summary.completedHands).toBe(0);
  await store.updateHand(hand);
  const first = await store.getArchivePage();
  expect(first.rows.every(row => row.completedHands === 0)).toBe(true);
  expect(first.summary).toEqual({
    ...createArchiveSummary(), games: 21, hands: 21, completedHands: 1,
    handsWithLow: 1, finishedGames: 1, durationMinutes: 1, lowWins: 1,
    evaluatedPlayerHands: 2,
    combinations: { ...createArchiveSummary().combinations, straight: 2 },
  });
  expect((await store.getArchivePage(2)).summary).toEqual(first.summary);
});
