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
    finished: true,
    replayCode: 'XYZ987',
  });
  expect(rows[1]).toMatchObject({
    partyId: 'party-1',
    date: 1_000,
    hands: 2,
    finished: true,
    replayCode: 'ABC123',
  });
  expect(rows[1].durationMinutes).toBeCloseTo(1.5);
  expect(Object.values(rows[1].combinations).reduce((sum, count) => sum + count, 0)).toBe(2);
});

test('archive keeps unfinished hands and marks the game as incomplete', () => {
  const hand = dealHand(2, 1, ['Alice', 'Bot'], [false, true], 'ABC123') as DealtHand;
  hand.stage = 'preflop';
  hand.created = 1_000;
  hand.actions = [{ playerId: hand.players[0].id, move: 'call', stage: 'preflop', at: 91_000 }];

  expect(buildArchiveRows([hand])[0]).toMatchObject({
    hands: 1,
    finished: false,
    lowPercent: null,
    durationMinutes: 1.5,
    replayCode: 'ABC123',
  });
});

test('archive includes unfinished deals alongside completed ones in the same game', () => {
  const completed = showdown('hand-1', 'party-1', 1, 1_000, 'ABC123');
  const inProgress = dealHand(3, 2, ['Alice', 'Bot 1', 'Bot 2'], [false, true, true], 'ABC123') as DealtHand;
  inProgress.id = 'hand-2';
  inProgress.partyId = 'party-1';
  inProgress.handNumber = 2;
  inProgress.created = 61_000;
  inProgress.actions = [{ playerId: inProgress.players[0].id, move: 'call', stage: 'preflop', at: 91_000 }];

  expect(buildArchiveRows([completed, inProgress])[0]).toMatchObject({
    hands: 2,
    finished: false,
    durationMinutes: 1.5,
    lowPercent: expect.any(Number),
    replayCode: 'ABC123',
  });
});

test('archive keeps linked hands together when their party IDs differ', () => {
  const firstHand = showdown('hand-1', 'party-1', 1, 1_000, 'ABC123');
  const nextHand = showdown('hand-2', 'party-2', 2, 61_000, 'ABC123');
  nextHand.previousHandId = firstHand.id;

  const rows = buildArchiveRows([firstHand, nextHand]);

  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    partyId: 'party-1',
    hands: 2,
    replayCode: 'ABC123',
  });
});

test('archive does not merge unrelated games that share a replay code', () => {
  const firstGame = showdown('hand-1', 'party-1', 1, 1_000, 'ABC123');
  const secondGame = showdown('hand-2', 'party-2', 1, 2_000, 'ABC123');

  expect(buildArchiveRows([firstGame, secondGame])).toHaveLength(2);
});

test('archive treats an approved early finish as a completed game', () => {
  const hand = showdown('hand-1', 'party-1', 1, 1_000, 'ABC123');
  hand.players[1].stack = 500;
  hand.partyFinishedEarly = true;

  expect(buildArchiveRows([hand])[0]).toMatchObject({
    finished: true,
    replayCode: 'ABC123',
  });
});

test('archive counts low-winning hands once even when multiple players tie', () => {
  const low = dealHand(2, 1) as DealtHand;
  low.id = 'low-hand';
  low.partyId = 'low-party';
  low.stage = 'showdown';
  low.fullCommunity = ['3c', '4d', '5h', 'Ks', 'Qh'];
  low.community = [...low.fullCommunity];
  low.players[0].hole = ['As', '2s', 'Jc', 'Tc'];
  low.players[1].hole = ['Ah', '2h', 'Jd', 'Td'];
  low.totalContributions = { P1: 50, P2: 50 };
  low.potCoins = 100;

  const noLow = dealHand(2, 2) as DealtHand;
  noLow.id = 'no-low-hand';
  noLow.partyId = low.partyId;
  noLow.handNumber = 2;
  noLow.stage = 'showdown';
  noLow.fullCommunity = ['Kc', 'Qd', 'Jh', '9s', '8h'];
  noLow.community = [...noLow.fullCommunity];

  const unfinished = dealHand(2, 3) as DealtHand;
  unfinished.partyId = low.partyId;
  unfinished.handNumber = 3;

  expect(buildArchiveRows([low, noLow, unfinished])[0]).toMatchObject({
    hands: 3,
    lowWins: 1,
    lowPercent: 50,
  });
  expect(buildArchiveRows([noLow])[0].lowWins).toBe(0);
  expect(buildArchiveRows([unfinished])[0].lowWins).toBe(0);
});