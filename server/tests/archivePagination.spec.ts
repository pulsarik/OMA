import HandStore from '../src/handStore';
import { dealHand } from '../src/game';

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
  const second = await store.getArchivePage(2);
  expect(second.rows.map(row => row.partyId)).toEqual(['party-0']);
  expect(await store.getArchivePage(999)).toEqual(second);
  expect(allHands).not.toHaveBeenCalled();
});

test('empty archive has one empty page', async () => {
  expect(await new HandStore(':memory:').getArchivePage()).toEqual({
    rows: [], total: 0, page: 1, pageSize: 20, totalPages: 1,
  });
});
