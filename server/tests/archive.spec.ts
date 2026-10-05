import { buildArchiveRows } from '../src/archive';
import { DealtHand, dealHand } from '../src/game';

function showdown(id: string, partyId: string, handNumber: number, created: number, replayCode: string) {
  const hand = dealHand(3, handNumber, ['Alice', 'Bot 1', 'Bot 2'], [false, true, true], replayCode) as DealtHand;
  hand.id = id;
  hand.partyId = partyId;
  hand.handNumber = handNumber;
  hand.created = created;
  hand.stage = 'showdown';
  hand.players[0].stack = 1_000;
  hand.players[1].stack = 0;
  hand.players[2].stack = 0;
  hand.players[1].folded = true;
  hand.players[2].folded = true;
  hand.actions = [{ playerId: hand.players[0].id, move: 'check', stage: 'showdown', at: created + 30_000 }];
  return hand;
}

test('archive summarizes parties and returns newest games first', () => {
  const firstHand = showdown('hand-1', 'party-1', 1, 1_000, 'ABC123');
  const secondHand = showdown('hand-2', 'party-1', 2, 61_000, 'ABC123');
  const otherParty = showdown('hand-3', 'party-2', 1, 121_000, 'XYZ987');

  const rows = buildArchiveRows([firstHand, otherParty, secondHand]);

  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    partyId: 'party-2',
    date: 121_000,
    bots: 2,
    humans: 1,
    players: 3,
    hands: 1,
    reachedWinner: true,
    replayCode: 'XYZ987',
  });
  expect(rows[1]).toMatchObject({
    partyId: 'party-1',
    date: 1_000,
    hands: 2,
    reachedWinner: true,
    replayCode: 'ABC123',
  });
  expect(rows[1].durationMinutes).toBeCloseTo(1.5);
  expect(Object.values(rows[1].combinations).reduce((sum, count) => sum + count, 0)).toBe(2);
});

test('archive represents games with no completed hands without inventing statistics', () => {
  const hand = dealHand(2, 1, ['Alice', 'Bot'], [false, true], 'ABC123') as DealtHand;
  hand.stage = 'preflop';
  hand.created = 1_000;

  expect(buildArchiveRows([hand])[0]).toMatchObject({
    hands: 0,
    reachedWinner: false,
    lowPercent: null,
    durationMinutes: 0,
  });
});
