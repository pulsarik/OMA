import { v4 as uuid } from 'uuid';
import { dealHand, forkPartyFromHand, nextPartyHand, recordPlayerMove, stacksAfterPayout } from '../src/game';
import HandStore from '../src/handStore';
import { buildArchiveRows } from '../src/archive';

function completedHand() {
  const previous = dealHand(3, 12345, ['Alice', 'Bob', 'Carol']);
  previous.handNumber = 8;
  previous.matchHandNumber = 8;
  previous.stage = 'showdown';
  previous.players[0].stack = 700;
  previous.players[1].stack = 1200;
  previous.players[2].stack = 0;
  previous.players[2].folded = true;
  const hand = nextPartyHand(previous);
  hand.partyCode = 'PA0042';
  recordPlayerMove(hand, hand.currentPlayerId!, 'fold');
  return hand;
}

test('fork preserves the deal, unequal stacks, blind level and seats without modifying the source', () => {
  const source = completedHand();
  const before = JSON.stringify(source);
  const fork = forkPartyFromHand(source, 'P1');
  expect(JSON.stringify(source)).toBe(before);
  expect(fork.id).not.toBe(source.id);
  expect(fork.partyId).not.toBe(source.partyId);
  expect(fork.previousHandId).toBeUndefined();
  expect(fork.replayOfHandId).toBeUndefined();
  expect(fork.blinds).toEqual(source.blinds);
  expect(fork.fullCommunity).toEqual(source.fullCommunity);
  expect(fork.community).toEqual([]);
  expect(fork.actions).toEqual([]);
  expect(fork.stage).toBe('preflop');
  fork.players.forEach((p, i) => {
    expect(p.hole).toEqual(source.players[i].hole);
    expect(p.token).not.toBe(source.players[i].token);
    expect(p.stack + (fork.totalContributions[p.id] ?? 0)).toBe(source.players[i].stack + (source.totalContributions[p.id] ?? 0));
    expect(p.isBot).toBe(p.id !== 'P1');
  });
  expect(fork.players[2].folded).toBe(true);
  recordPlayerMove(fork, fork.currentPlayerId!, 'fold');
  const next = nextPartyHand(fork);
  expect(next.partyId).toBe(fork.partyId);
  expect(next.forkRootCode).toBe('PA0042');
  next.players.forEach(p => expect(p.stack + (next.totalContributions[p.id] ?? 0)).toBe(stacksAfterPayout(fork).get(p.id)));
  expect(buildArchiveRows([source, fork, next])).toHaveLength(2);
});

test('sharing rejects unfinished hands and seats eliminated before the deal', () => {
  expect(() => forkPartyFromHand(dealHand(2), 'P1')).toThrow('in progress');
  expect(() => forkPartyFromHand(completedHand(), 'P3')).toThrow('participate');
});

test('immutable shares create distinct numbered branches and concurrent retries reuse the same hand', async () => {
  const store = new HandStore(':memory:');
  const source = completedHand();
  await store.saveHand(source);
  const share = await store.shareHand(source, 'P1');
  const cards = [...source.fullCommunity];
  source.fullCommunity.reverse();
  await store.updateHand(source);
  const claim = uuid();
  const [one, duplicate, two] = await Promise.all([
    store.claimSharedHand(share.token, claim), store.claimSharedHand(share.token, claim), store.claimSharedHand(share.token, uuid()),
  ]);
  expect(one!.hand.id).toBe(duplicate!.hand.id);
  expect(one!.hand.partyCode).toBe('PA0042-1');
  expect(two!.hand.partyCode).toBe('PA0042-2');
  expect(one!.hand.fullCommunity).toEqual(cards);
  expect((await store.getHand(source.id)).nextHandId).toBeUndefined();
  expect(buildArchiveRows(await store.listAllHands())).toHaveLength(3);
  const branch = one!.hand;
  recordPlayerMove(branch, branch.currentPlayerId!, 'fold');
  const secondShare = await store.shareHand(branch, 'P1');
  const third = await store.claimSharedHand(secondShare.token, uuid());
  expect(third!.hand.partyCode).toBe('PA0042-3');
  await expect(store.claimSharedHand(uuid(), uuid())).resolves.toBeNull();
  const clock = jest.spyOn(Date, 'now').mockReturnValue(share.expires + 1);
  try { await expect(store.claimSharedHand(share.token, uuid())).resolves.toBeNull(); }
  finally { clock.mockRestore(); }
});
