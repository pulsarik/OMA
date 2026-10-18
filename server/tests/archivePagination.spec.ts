import HandStore from '../src/handStore';
import { dealHand } from '../src/game';
import { createArchiveSummary } from '../src/archive';

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

test('empty archive has one empty page', async () => {
  expect(await new HandStore(':memory:').getArchivePage()).toEqual({
    rows: [], total: 0, page: 1, pageSize: 20, totalPages: 1,
    summary: createArchiveSummary(),
  });
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
    handsWithLow: 1, finishedGames: 1, durationMinutes: 2, lowWins: 1,
    combinations: { ...createArchiveSummary().combinations, straight: 2 },
  });
  expect((await store.getArchivePage(2)).summary).toEqual(first.summary);
});
