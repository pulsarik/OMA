import {
  blindLevelForHand,
  dealCodeFor,
  dealHand,
  dealHandFromCode,
  evaluateOmahaHiLo,
  evaluatePlayerCombo,
  nextPartyHand,
  recordPlayerMove,
  recordRevealVote,
  replayHandLayout,
  stacksAfterPayout,
} from '../src/game';
import { aggressiveMoveForMatchedBet, botMove } from '../src/bot';

function callBlindsToFlop(hand: ReturnType<typeof dealHand>) {
  recordPlayerMove(hand, 'P1', 'call');
  recordPlayerMove(hand, 'P2', 'check');
}

test('an aggressive bot raises instead of betting after everyone matched an open bet', () => {
  expect(aggressiveMoveForMatchedBet(4, 0)).toBe('raise');
  expect(aggressiveMoveForMatchedBet(4, 3)).toBe('check');
  expect(aggressiveMoveForMatchedBet(0, 0)).toBe('bet');
});

test('screenshot deal OMA1-P7-S12OCLCL advances instead of freezing on the big blind bot', () => {
  const hand = dealHandFromCode('OMA1-P7-S12OCLCL');
  hand.handNumber = 17;
  hand.blinds = {
    level: 2,
    small: 8,
    big: 16,
    smallBlindPlayerId: 'P1',
    bigBlindPlayerId: 'P2',
  };
  hand.potCoins = 80;
  hand.currentBet = 16;
  hand.currentPlayerId = 'P2';
  hand.roundBets = { P1: 16, P2: 16, P3: 16, P4: 16, P5: 16 };
  hand.players.forEach((player, index) => {
    player.isBot = index > 0;
    player.stack = [844.5, 258, 1003.5, 3673, 1141, 0, 0][index];
    player.folded = index >= 5;
  });
  hand.actions = ['P3', 'P4', 'P5', 'P1'].map((playerId, index) => ({
    playerId,
    move: 'call' as const,
    amount: 16,
    stage: 'preflop' as const,
    at: index,
  }));

  expect(hand.players[0].hole).toEqual(['8h', '4h', '5d', '7d']);
  expect(hand.players[1].hole).toEqual(['6c', '2h', 'Ac', '6d']);

  const decision = botMove(hand, hand.players[1]);
  expect(decision).toEqual({ move: 'raise', amount: 56 });
  expect(() => recordPlayerMove(hand, 'P2', decision.move, decision.amount)).not.toThrow();
  expect(hand.currentPlayerId).toBe('P3');
  expect(hand.actions.at(-1)).toMatchObject({ playerId: 'P2', move: 'raise', amount: 56 });
});

test('deal deterministic with seed', () => {
  const a = dealHand(2, 12345);
  const b = dealHand(2, 12345);
  expect(a.fullCommunity).toEqual(b.fullCommunity);
  expect(a.players.map(p => p.hole)).toEqual(b.players.map(p => p.hole));
});

test('deal code rebuilds the same card layout', () => {
  const original = dealHand(2, 12345);
  const rebuilt = dealHandFromCode(original.dealCode);

  expect(original.dealCode).toBe(dealCodeFor(2, 12345));
  expect(rebuilt.dealCode).toBe(original.dealCode);
  expect(rebuilt.fullCommunity).toEqual(original.fullCommunity);
  expect(rebuilt.players.map(player => player.hole)).toEqual(original.players.map(player => player.hole));
});

test('deal creates one private token per player', () => {
  const hand = dealHand(4, 12345);
  const tokens = hand.players.map(p => p.token);

  expect(hand.players).toHaveLength(4);
  expect(new Set(tokens).size).toBe(4);
});

test('next party hand keeps party and advances hand number', () => {
  const hand = dealHand(2, 12345);
  const next = nextPartyHand(hand);

  expect(next.partyId).toBe(hand.partyId);
  expect(next.handNumber).toBe(hand.handNumber + 1);
  expect(next.id).not.toBe(hand.id);
});

test('blind level doubles every eight hands', () => {
  expect(blindLevelForHand(1)).toEqual({ level: 0, small: 2, big: 4 });
  expect(blindLevelForHand(8)).toEqual({ level: 0, small: 2, big: 4 });
  expect(blindLevelForHand(9)).toEqual({ level: 1, small: 4, big: 8 });
  expect(blindLevelForHand(17)).toEqual({ level: 2, small: 8, big: 16 });
});

test('next party hand carries stacks after payout and posts next blinds', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Kh', 'Kc', '4h', '5c'];

  const stacks = stacksAfterPayout(hand);
  expect(stacks.get('P1')).toBe(1004);
  expect(stacks.get('P2')).toBe(996);

  const next = nextPartyHand(hand);
  expect(next.players.find(player => player.id === 'P1')?.stack).toBe(1000);
  expect(next.players.find(player => player.id === 'P2')?.stack).toBe(994);
  expect(next.potCoins).toBe(6);
});

test('next party hand preserves player names', () => {
  const hand = dealHand(2, 12345, ['Alice', 'Bob']);
  hand.stage = 'showdown';

  const next = nextPartyHand(hand);

  expect(next.players.map(player => player.id)).toEqual(['P1', 'P2']);
  expect(next.players.map(player => player.name)).toEqual(['Alice', 'Bob']);
});

test('next party and replay hands preserve bot seats', () => {
  const hand = dealHand(2, 12345, ['Alice', 'Bot'], [false, true]);
  hand.stage = 'showdown';

  const next = nextPartyHand(hand);
  const replay = replayHandLayout(hand);

  expect(hand.players.map(player => Boolean(player.isBot))).toEqual([false, true]);
  expect(hand.players.map(player => player.name)).toEqual(['Alice', 'Bot_bot']);
  expect(next.players.map(player => Boolean(player.isBot))).toEqual([false, true]);
  expect(replay.players.map(player => Boolean(player.isBot))).toEqual([false, true]);
  expect(next.players.map(player => player.name)).toEqual(['Alice', 'Bot_bot']);
  expect(replay.players.map(player => player.name)).toEqual(['Alice', 'Bot_bot']);
});

test('unnamed bots receive human names with a bot suffix', () => {
  const hand = dealHand(3, 12345, [], [true, true, true]);

  expect(hand.players.map(player => player.name)).toEqual(['Alex_bot', 'Maria_bot', 'Ivan_bot']);
});

test('blind positions rotate by hand number', () => {
  const hand = dealHand(3, 12345);

  expect(hand.blinds.smallBlindPlayerId).toBe('P1');
  expect(hand.blinds.bigBlindPlayerId).toBe('P2');
  expect(hand.currentPlayerId).toBe('P3');

  hand.stage = 'showdown';
  const next = nextPartyHand(hand);

  expect(next.blinds.smallBlindPlayerId).toBe('P2');
  expect(next.blinds.bigBlindPlayerId).toBe('P3');
  expect(next.currentPlayerId).toBe('P1');
});

test('players with zero stack are skipped by blinds and turns', () => {
  const hand = dealHand(3, 12345);
  hand.stage = 'showdown';
  hand.players[0].stack = 0;
  hand.players[1].stack = 1000;
  hand.players[2].stack = 1000;
  hand.potCoins = 0;

  const next = nextPartyHand(hand);

  expect(next.players.find(player => player.id === 'P1')?.folded).toBe(true);
  expect(next.blinds.smallBlindPlayerId).toBe('P3');
  expect(next.blinds.bigBlindPlayerId).toBe('P2');
  expect(next.currentPlayerId).toBe('P3');
});

test('all-in call cannot make stack negative and does not require more action', () => {
  const hand = dealHand(2, 12345);
  hand.players[0].stack = 1;

  recordPlayerMove(hand, 'P1', 'call');

  expect(hand.players[0].stack).toBe(0);
  expect(hand.potCoins).toBe(7);
  expect(hand.currentPlayerId).toBe('P2');

  recordPlayerMove(hand, 'P2', 'check');
  expect(hand.stage).toBe('flop');
});

test('replay hand keeps layout with fresh tokens and state', () => {
  const hand = dealHand(2, 12345);
  recordPlayerMove(hand, 'P1', 'fold');
  const replay = replayHandLayout(hand);

  expect(replay.partyId).toBe(hand.partyId);
  expect(replay.handNumber).toBe(hand.handNumber + 1);
  expect(replay.replayOfHandId).toBe(hand.id);
  expect(replay.fullCommunity).toEqual(hand.fullCommunity);
  expect(replay.players.map(player => player.hole)).toEqual(hand.players.map(player => player.hole));
  expect(replay.players.map(player => player.token)).not.toEqual(hand.players.map(player => player.token));
  expect(replay.players.every(player => !player.folded)).toBe(true);
  expect(replay.stage).toBe('preflop');
});

test('deal does not duplicate cards between players and board', () => {
  const hand = dealHand(9, 12345);
  const allCards = [
    ...hand.fullCommunity,
    ...hand.players.flatMap(p => p.hole),
  ];

  expect(new Set(allCards).size).toBe(allCards.length);
});

test('deal starts preflop with blinds and advances to flop after they are matched', () => {
  const hand = dealHand(2, 12345);

  expect(hand.revision).toBe(0);
  expect(hand.stage).toBe('preflop');
  expect(hand.community).toEqual([]);
  expect(hand.currentPlayerId).toBe('P1');
  expect(hand.blinds).toMatchObject({ level: 0, small: 2, big: 4, smallBlindPlayerId: 'P1', bigBlindPlayerId: 'P2' });
  expect(hand.potCoins).toBe(6);
  expect(hand.roundBets).toEqual({ P1: 2, P2: 4 });
  expect(hand.players.map(player => player.stack)).toEqual([998, 996]);

  recordPlayerMove(hand, 'P1', 'call');
  expect(hand.revision).toBe(1);
  expect(hand.stage).toBe('preflop');
  expect(hand.currentPlayerId).toBe('P2');
  expect(hand.potCoins).toBe(8);

  recordPlayerMove(hand, 'P2', 'check');
  expect(hand.revision).toBe(2);
  expect(hand.stage).toBe('flop');
  expect(hand.community).toEqual(hand.fullCommunity.slice(0, 3));
  expect(hand.currentPlayerId).toBe('P1');
});

test('check does not change the pot', () => {
  const hand = dealHand(2, 12345);

  recordPlayerMove(hand, 'P1', 'call');
  const initialPot = hand.potCoins;
  recordPlayerMove(hand, 'P2', 'check');

  expect(hand.potCoins).toBe(initialPot);
  expect(hand.currentBet).toBe(0);
});

test('bet and call grow the pot before the next street opens', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P1', 'bet');
  expect(hand.potCoins).toBe(12);
  expect(hand.currentBet).toBe(4);
  expect(hand.currentPlayerId).toBe('P2');

  expect(() => recordPlayerMove(hand, 'P2', 'check')).toThrow('call or fold required');

  recordPlayerMove(hand, 'P2', 'call');
  expect(hand.potCoins).toBe(16);
  expect(hand.stage).toBe('turn');
  expect(hand.currentBet).toBe(0);
  expect(hand.roundBets).toEqual({});
});

test('raise keeps the betting round open until every active player matches', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P1', 'bet');
  recordPlayerMove(hand, 'P2', 'raise');
  expect(hand.potCoins).toBe(20);
  expect(hand.currentBet).toBe(8);
  expect(hand.currentPlayerId).toBe('P1');

  recordPlayerMove(hand, 'P1', 'call');
  expect(hand.potCoins).toBe(24);
  expect(hand.stage).toBe('turn');
});

test('bet and raise accept pot-limit target amounts', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P1', 'bet', 8);
  expect(hand.potCoins).toBe(16);
  expect(hand.currentBet).toBe(8);

  recordPlayerMove(hand, 'P2', 'raise', 100);
  expect(hand.potCoins).toBe(48);
  expect(hand.currentBet).toBe(32);
  expect(hand.currentPlayerId).toBe('P1');
});

test('player must call after opponent raises a custom amount', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P1', 'bet', 8);
  recordPlayerMove(hand, 'P2', 'raise', 30);

  expect(hand.stage).toBe('flop');
  expect(hand.currentBet).toBe(30);
  expect(hand.roundBets.P1).toBe(8);
  expect(hand.roundBets.P2).toBe(30);
  expect(hand.currentPlayerId).toBe('P1');
  expect(() => recordPlayerMove(hand, 'P1', 'check')).toThrow('call or fold required');

  recordPlayerMove(hand, 'P1', 'call');
  expect(hand.stage).toBe('turn');
});

test('raise is capped at three raises per street', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P1', 'bet');
  recordPlayerMove(hand, 'P2', 'raise');
  recordPlayerMove(hand, 'P1', 'raise');
  recordPlayerMove(hand, 'P2', 'raise');

  expect(hand.raiseCount).toBe(3);
  expect(() => recordPlayerMove(hand, 'P1', 'raise')).toThrow('raise cap reached');

  recordPlayerMove(hand, 'P1', 'call');
  expect(hand.stage).toBe('turn');
});

test('deal rejects actions from players out of turn', () => {
  const hand = dealHand(2, 12345);

  expect(() => recordPlayerMove(hand, 'P2', 'check')).toThrow('not your turn');
});

test('checking through all streets reaches showdown', () => {
  const hand = dealHand(2, 12345);

  recordPlayerMove(hand, 'P1', 'call');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');

  expect(hand.stage).toBe('showdown');
  expect(hand.currentPlayerId).toBeUndefined();
  expect(hand.community).toEqual(hand.fullCommunity);
});

test('players who reach final showdown reveal automatically', () => {
  const hand = dealHand(2, 12345);

  recordPlayerMove(hand, 'P1', 'call');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');

  expect(hand.stage).toBe('showdown');
  expect(hand.cardsRevealed).toBe(true);
  expect(hand.revealVotes).toEqual(['P1', 'P2']);
});

test('folding everyone but one player moves hand to showdown', () => {
  const hand = dealHand(3, 12345);

  recordPlayerMove(hand, 'P3', 'fold');
  recordPlayerMove(hand, 'P1', 'fold');

  expect(hand.stage).toBe('showdown');
  expect(hand.players.find(p => p.id === 'P3')?.folded).toBe(true);
  expect(hand.players.find(p => p.id === 'P1')?.folded).toBe(true);
  expect(hand.players.find(p => p.id === 'P2')?.folded).toBe(false);
});

test('cards reveal by agreement after showdown caused by folds', () => {
  const hand = dealHand(2, 12345);

  recordPlayerMove(hand, 'P1', 'fold');

  recordRevealVote(hand, 'P1');
  expect(hand.cardsRevealed).toBe(false);

  recordRevealVote(hand, 'P2');
  expect(hand.cardsRevealed).toBe(true);
});

test('evaluates Omaha Hi-Lo with high and qualifying low', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['2s', '3h', '4d', 'Kc', 'Kd'];
  hand.players[0].hole = ['As', '5c', 'Qh', 'Qs'];
  hand.players[1].hole = ['Kh', '4c', 'Qd', 'Jd'];

  const result = evaluateOmahaHiLo(hand);

  expect(result?.highWinners).toEqual(['P2']);
  expect(result?.lowWinners).toEqual(['P1']);
  expect(result?.noLow).toBe(false);
  expect(result?.points).toEqual([
    { id: 'P1', high: 0, low: 3, total: 3 },
    { id: 'P2', high: 3, low: 0, total: 3 },
  ]);
});

test('evaluates Omaha Hi-Lo with no qualifying low', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Kh', 'Kc', '4h', '5c'];

  const result = evaluateOmahaHiLo(hand);

  expect(result?.highWinners).toEqual(['P1']);
  expect(result?.lowWinners).toEqual([]);
  expect(result?.noLow).toBe(true);
  expect(result?.points).toEqual([
    { id: 'P1', high: 6, low: 0, total: 6 },
    { id: 'P2', high: 0, low: 0, total: 0 },
  ]);
});

test('evaluates folded players combinations without making them eligible to win', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['2s', '3h', '4d', 'Kc', 'Kd'];
  hand.players[0].hole = ['As', '5c', 'Qh', 'Qs'];
  hand.players[0].folded = true;
  hand.players[1].hole = ['Kh', '4c', 'Qd', 'Jd'];

  const result = evaluateOmahaHiLo(hand);
  const folded = result?.players.find(player => player.id === 'P1');

  expect(folded).toMatchObject({
    id: 'P1',
    folded: true,
    highRank: 'straight',
    lowRank: '5-4-3-2-1',
  });
  expect(folded?.highCombo).toHaveLength(5);
  expect(folded?.lowCombo).toHaveLength(5);
  expect(result?.highWinners).toEqual(['P2']);
  expect(result?.lowWinners).toEqual([]);
  expect(result?.points.find(score => score.id === 'P1')?.total).toBe(0);
});

test('evaluates current player combo from open board cards', () => {
  const combo = evaluatePlayerCombo(
    ['As', '5c', 'Qh', 'Qs'],
    ['2s', '3h', '4d'],
  );

  expect(combo?.highRank).toBe('straight');
  expect(combo?.lowRank).toBe('5-4-3-2-1');
  expect(combo?.highCombo?.filter(card => card.source === 'hole')).toHaveLength(2);
  expect(combo?.highCombo?.filter(card => card.source === 'board')).toHaveLength(3);
});

test('evaluates trips when exactly two hand cards and paired board cards are used', () => {
  const combo = evaluatePlayerCombo(
    ['9s', '4h', '3d', 'Ks'],
    ['Jh', 'Td', '3h', '7h', '3c'],
  );

  expect(combo?.highRank).toBe('three of a kind');
  expect(combo?.highCards).toEqual(['3d', 'Ks', 'Jh', '3h', '3c']);
  expect(combo?.highCombo?.filter(card => card.source === 'hole')).toHaveLength(2);
  expect(combo?.highCombo?.filter(card => card.source === 'board')).toHaveLength(3);
});

test('table supports ten players and rejects an eleventh', () => {
  expect(dealHand(10, 12345).players).toHaveLength(10);
  expect(() => dealHand(11, 12345)).toThrow('table supports at most 10 players');
});
