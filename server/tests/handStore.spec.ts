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
