import {
  blindLevelForHand,
  currentPotBreakdown,
  dealCodeFor,
  dealHand,
  dealHandFromCode,
  evaluateOmahaHiLo,
  evaluatePlayerCombo,
  isPlayerStillInParty,
  nextPartyHand,
  netResultsAfterPayout,
  recordPlayerMove,
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

test('a bot calls a made flush when a short all-in has not reopened betting', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'river';
  hand.fullCommunity = ['Qh', 'Jh', '9h', '4s', '5c'];
  hand.community = [...hand.fullCommunity];
  hand.currentBet = 100;
  hand.roundBets = { P1: 0, P2: 100 };
  hand.raiseCount = 3;
  hand.actedSinceLastFullRaise = ['P1'];
  hand.potCoins = 150;
  hand.currentPlayerId = 'P1';
  hand.players[0].hole = ['Ah', 'Kh', '2c', '3d'];

  expect(botMove(hand, hand.players[0])).toEqual({ move: 'call' });
});

test('problem 1000: a strong bot calls all-in when its stack cannot cover the call', () => {
  const hand = dealHand(3, 2947014801);
  hand.stage = 'river';
  hand.fullCommunity = ['Jc', 'Ah', 'Kd', 'Td', '7h'];
  hand.community = [...hand.fullCommunity];
  hand.currentPlayerId = 'P2';
  hand.currentBet = 665;
  hand.roundBets = { P1: 665 };
  hand.totalContributions = { P1: 1103, P2: 438, P3: 438 };
  hand.potCoins = 1995;
  hand.players[0].stack = 0;
  hand.players[0].hole = ['Qh', '8s', 'Jh', '4s'];
  hand.players[1].stack = 445;
  hand.players[1].hole = ['8c', 'Qs', 'Kh', '8h'];
  hand.players[2].stack = 547;
  hand.players[2].hole = ['6s', 'Ad', '3c', 'Qc'];
  hand.actions = [{
    playerId: 'P1',
    move: 'bet',
    amount: 665,
    stage: 'river',
    at: 1,
  }];

  expect(evaluatePlayerCombo(hand.players[1].hole, hand.community)?.highRank).toBe('straight');
  const decision = botMove(hand, hand.players[1]);
  expect(decision).toEqual({ move: 'call' });
  expect(() => recordPlayerMove(hand, 'P2', decision.move, decision.amount)).not.toThrow();
  expect(hand.players[1].stack).toBe(0);
  expect(hand.currentPlayerId).toBe('P3');

  const nextDecision = botMove(hand, hand.players[2]);
  expect(nextDecision).toEqual({ move: 'call' });
  expect(() => recordPlayerMove(hand, 'P3', nextDecision.move, nextDecision.amount)).not.toThrow();
  expect(hand.stage).toBe('showdown');
  expect(hand.currentPlayerId).toBeUndefined();
  expect(hand.players[0].stack).toBe(118);
  expect(hand.potCoins).toBe(2869);
});

test('a bot calls a full house when betting has not reopened', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'turn';
  hand.fullCommunity = ['As', 'Kh', 'Kd', '2c', '3d'];
  hand.community = hand.fullCommunity.slice(0, 4);
  hand.players[0].hole = ['Ah', 'Ad', '7c', '8c'];
  hand.players[1].hole = ['Qs', 'Jh', 'Tc', '9d'];
  hand.currentPlayerId = 'P1';
  hand.currentBet = 100;
  hand.roundBets = { P1: 0, P2: 100 };
  hand.raiseCount = 3;
  hand.actedSinceLastFullRaise = ['P1'];
  hand.potCoins = 200;

  expect(evaluatePlayerCombo(hand.players[0].hole, hand.community)?.highRank).toBe('full house');
  expect(botMove(hand, hand.players[0])).toEqual({ move: 'call' });
});

test('a bot calls a strong made low when betting has not reopened', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'river';
  hand.fullCommunity = ['3s', '4h', '6d', 'Kc', 'Qc'];
  hand.community = [...hand.fullCommunity];
  hand.currentBet = 100;
  hand.roundBets = { P1: 0, P2: 100 };
  hand.raiseCount = 3;
  hand.actedSinceLastFullRaise = ['P1'];
  hand.potCoins = 150;
  hand.currentPlayerId = 'P1';
  hand.players[0].hole = ['As', '2h', 'Jd', 'Td'];

  expect(botMove(hand, hand.players[0])).toEqual({ move: 'call' });
});

test('a bot still folds a weak hand against an expensive bet', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'river';
  hand.fullCommunity = ['As', 'Kh', '9d', '7c', '4s'];
  hand.community = [...hand.fullCommunity];
  hand.currentBet = 100;
  hand.roundBets = { P1: 0, P2: 100 };
  hand.raiseCount = 3;
  hand.potCoins = 50;
  hand.currentPlayerId = 'P1';
  hand.players[0].hole = ['2h', '3h', '6c', '8d'];

  expect(botMove(hand, hand.players[0])).toEqual({ move: 'fold' });
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
  callBlindsToFlop(hand);
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

test('net results include bets and blinds instead of reporting the whole payout as profit', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Kh', 'Kc', '4h', '5c'];

  expect(netResultsAfterPayout(hand, new Map([['P1', 1000], ['P2', 1000]]))).toEqual([
    { id: 'P1', total: 4 },
    { id: 'P2', total: -4 },
  ]);
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

test('blinds move clockwise through every seat and determine the first preflop turn', () => {
  let hand = dealHand(5, 12345);
  const expectedPositions = [
    ['P1', 'P2', 'P3'],
    ['P2', 'P3', 'P4'],
    ['P3', 'P4', 'P5'],
    ['P4', 'P5', 'P1'],
    ['P5', 'P1', 'P2'],
    ['P1', 'P2', 'P3'],
  ];

  expectedPositions.forEach(([smallBlindId, bigBlindId, firstTurnId], index) => {
    expect(hand.handNumber).toBe(index + 1);
    expect(hand.blinds.smallBlindPlayerId).toBe(smallBlindId);
    expect(hand.blinds.bigBlindPlayerId).toBe(bigBlindId);
    expect(hand.currentPlayerId).toBe(firstTurnId);
    if (index < expectedPositions.length - 1) {
      hand.stage = 'showdown';
      hand = nextPartyHand(hand);
    }
  });
});

test('postflop action starts left of the rotating dealer button', () => {
  let hand = dealHand(5, 12345);
  hand.stage = 'showdown';
  hand = nextPartyHand(hand);

  expect(hand.blinds).toMatchObject({
    dealerPlayerId: 'P1',
    smallBlindPlayerId: 'P2',
    bigBlindPlayerId: 'P3',
  });

  ['P4', 'P5', 'P1', 'P2', 'P3'].forEach((playerId) => {
    expect(hand.currentPlayerId).toBe(playerId);
    const playerBet = hand.roundBets[playerId] ?? 0;
    recordPlayerMove(hand, playerId, playerBet < hand.currentBet ? 'call' : 'check');
  });

  expect(hand.stage).toBe('flop');
  expect(hand.currentPlayerId).toBe('P2');
});

test('turns move through seats from left to right and top to bottom on every street', () => {
  const hand = dealHand(6, 12345);
  const expectedByStreet = {
    preflop: ['P3', 'P4', 'P5', 'P6', 'P1', 'P2'],
    flop: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
    turn: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
    river: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'],
  } as const;

  Object.entries(expectedByStreet).forEach(([stage, expectedOrder]) => {
    expect(hand.stage).toBe(stage);
    expectedOrder.forEach((playerId) => {
      expect(hand.currentPlayerId).toBe(playerId);
      const playerBet = hand.roundBets[playerId] ?? 0;
      recordPlayerMove(hand, playerId, playerBet < hand.currentBet ? 'call' : 'check');
    });
    expect(hand.actions.filter(action => action.stage === stage).map(action => action.playerId))
      .toEqual(expectedOrder);
  });

  expect(hand.stage).toBe('showdown');
  expect(hand.currentPlayerId).toBeUndefined();
});

test('turn order skips folded and all-in seats without changing direction', () => {
  const hand = dealHand(6, 12345);
  hand.players.find(player => player.id === 'P4')!.folded = true;
  hand.players.find(player => player.id === 'P5')!.stack = 0;

  const expectedOrder = ['P3', 'P6', 'P1', 'P2'];
  expectedOrder.forEach((playerId) => {
    expect(hand.currentPlayerId).toBe(playerId);
    const playerBet = hand.roundBets[playerId] ?? 0;
    recordPlayerMove(hand, playerId, playerBet < hand.currentBet ? 'call' : 'check');
  });

  expect(hand.actions.filter(action => action.stage === 'preflop').map(action => action.playerId))
    .toEqual(expectedOrder);
  expect(hand.stage).toBe('flop');
  expect(hand.currentPlayerId).toBe('P1');
});

test('multiple raises reopen action clockwise and Alex acts before Dima', () => {
  const hand = dealHand(7, 12345, ['Dima', 'Anna', 'Ivan', 'Maria', 'Pavel', 'Elena', 'Alex']);

  expect(hand.currentPlayerId).toBe('P3');
  recordPlayerMove(hand, 'P3', 'call');
  expect(hand.currentPlayerId).toBe('P4');
  recordPlayerMove(hand, 'P4', 'call');
  expect(hand.currentPlayerId).toBe('P5');
  recordPlayerMove(hand, 'P5', 'call');
  expect(hand.currentPlayerId).toBe('P6');
  recordPlayerMove(hand, 'P6', 'fold');
  expect(hand.currentPlayerId).toBe('P7');
  recordPlayerMove(hand, 'P7', 'call');
  expect(hand.currentPlayerId).toBe('P1');

  recordPlayerMove(hand, 'P1', 'raise', 8);
  expect(hand.currentPlayerId).toBe('P2');
  recordPlayerMove(hand, 'P2', 'raise', 12);
  expect(hand.currentPlayerId).toBe('P3');
  recordPlayerMove(hand, 'P3', 'call');
  expect(hand.currentPlayerId).toBe('P4');
  recordPlayerMove(hand, 'P4', 'call');
  expect(hand.currentPlayerId).toBe('P5');
  recordPlayerMove(hand, 'P5', 'raise', 16);

  // Elena folded, but Alex still has to answer Pavel's raise before Dima.
  expect(hand.currentPlayerId).toBe('P7');
  recordPlayerMove(hand, 'P7', 'call');
  expect(hand.currentPlayerId).toBe('P1');
  recordPlayerMove(hand, 'P1', 'call');
  expect(hand.currentPlayerId).toBe('P2');
  recordPlayerMove(hand, 'P2', 'call');
  expect(hand.currentPlayerId).toBe('P3');

  expect(hand.actions.map(action => action.playerId)).toEqual([
    'P3', 'P4', 'P5', 'P6', 'P7', 'P1', 'P2',
    'P3', 'P4', 'P5', 'P7', 'P1', 'P2',
  ]);
});

test('a player going all-in does not reset the next turn to the first seat', () => {
  const hand = dealHand(6, 12345);
  hand.players.find(player => player.id === 'P3')!.stack = 1;

  expect(hand.currentPlayerId).toBe('P3');
  recordPlayerMove(hand, 'P3', 'call');

  expect(hand.players.find(player => player.id === 'P3')!.stack).toBe(0);
  expect(hand.currentPlayerId).toBe('P4');
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
  expect(hand.stage).toBe('showdown');
  expect(hand.players[1].stack).toBe(997);
  expect(hand.potCoins).toBe(6);
  expect(hand.totalContributions).toEqual({ P1: 3, P2: 3 });
});

test('a player without enough chips cannot use raise as a short call', () => {
  const hand = dealHand(2, 12345);
  hand.players[0].stack = 1;

  expect(() => recordPlayerMove(hand, 'P1', 'raise', 5)).toThrow('insufficient chips to raise');
});

test('a short all-in raise waits for the call before revealing the final hand', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'river';
  hand.community = [...hand.fullCommunity];
  hand.currentPlayerId = 'P1';
  hand.currentBet = 2;
  hand.roundBets = { P1: 2, P2: 2 };
  hand.totalContributions = { P1: 20, P2: 20 };
  hand.potCoins = 40;
  hand.players[0].stack = 3;
  hand.players[1].stack = 980;
  hand.actions = [{
    playerId: 'P2',
    move: 'bet',
    amount: 2,
    stage: 'river',
    at: 1,
  }];

  recordPlayerMove(hand, 'P1', 'raise', 5);

  expect(hand.stage).toBe('river');
  expect(hand.currentPlayerId).toBe('P2');
  expect(hand.cardsRevealed).toBe(false);

  recordPlayerMove(hand, 'P2', 'call');

  expect(hand.stage).toBe('showdown');
  expect(hand.currentPlayerId).toBeUndefined();
  expect(hand.cardsRevealed).toBe(true);
  expect(hand.revealVotes).toEqual(['P1', 'P2']);
});

test('short all-in returns the uncalled chips and awards the pot to the real winner', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'river';
  hand.community = [...hand.fullCommunity];
  hand.currentPlayerId = 'P1';
  hand.currentBet = 10;
  hand.roundBets = { P1: 0, P2: 10 };
  hand.totalContributions = { P1: 20, P2: 30 };
  hand.potCoins = 50;
  hand.players[0].stack = 4;
  hand.players[1].stack = 970;
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Kh', 'Kd', '4h', '5c'];
  hand.fullCommunity = ['Ts', 'Jh', 'Qd', '3c', '2d'];
  hand.actions = [{
    playerId: 'P2',
    move: 'bet',
    amount: 10,
    stage: 'river',
    at: 1,
  }];

  recordPlayerMove(hand, 'P1', 'call');

  expect(hand.stage).toBe('showdown');
  expect(hand.players[0].stack).toBe(0);
  expect(hand.players[1].stack).toBe(976);
  expect(hand.totalContributions).toEqual({ P1: 24, P2: 24 });
  expect(hand.potCoins).toBe(48);

  const result = evaluateOmahaHiLo(hand);
  expect(result?.sidePots).toHaveLength(1);
  expect(result?.highWinners).toEqual(['P1']);
  expect(result?.highWinners).not.toContain('P2');
  expect(result?.points).toEqual([
    { id: 'P1', high: 48, low: 0, total: 48 },
    { id: 'P2', high: 0, low: 0, total: 0 },
  ]);
});

test('returns an unmatched bet instead of creating a third pot', () => {
  const hand = dealHand(3, 12345);
  hand.stage = 'river';
  hand.community = [...hand.fullCommunity];
  hand.currentPlayerId = 'P3';
  hand.currentBet = 0;
  hand.roundBets = {};
  hand.totalContributions = { P1: 10, P2: 30, P3: 30 };
  hand.potCoins = 70;
  hand.players[0].stack = 0;
  hand.players[1].stack = 10;
  hand.players[2].stack = 970;
  hand.actions = [];

  recordPlayerMove(hand, 'P3', 'bet', 20);
  recordPlayerMove(hand, 'P2', 'call');

  expect(hand.stage).toBe('showdown');
  expect(hand.players[2].stack).toBe(960);
  expect(hand.totalContributions).toEqual({ P1: 10, P2: 40, P3: 40 });
  expect(hand.potCoins).toBe(90);
  expect(currentPotBreakdown(hand)).toEqual([
    { amount: 30, eligiblePlayerIds: ['P1', 'P2', 'P3'] },
    { amount: 60, eligiblePlayerIds: ['P2', 'P3'] },
  ]);
  expect(evaluateOmahaHiLo(hand)?.sidePots).toHaveLength(2);
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
  expect(replay.blinds.smallBlindPlayerId).toBe('P2');
  expect(replay.blinds.bigBlindPlayerId).toBe('P1');
  expect(replay.currentPlayerId).toBe('P2');
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
  expect(hand.currentPlayerId).toBe('P2');
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

  recordPlayerMove(hand, 'P2', 'bet');
  expect(hand.potCoins).toBe(12);
  expect(hand.currentBet).toBe(4);
  expect(hand.currentPlayerId).toBe('P1');

  expect(() => recordPlayerMove(hand, 'P1', 'check')).toThrow('call or fold required');

  recordPlayerMove(hand, 'P1', 'call');
  expect(hand.potCoins).toBe(16);
  expect(hand.stage).toBe('turn');
  expect(hand.currentBet).toBe(0);
  expect(hand.roundBets).toEqual({});
});

test('raise keeps the betting round open until every active player matches', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P2', 'bet');
  recordPlayerMove(hand, 'P1', 'raise');
  expect(hand.potCoins).toBe(20);
  expect(hand.currentBet).toBe(8);
  expect(hand.currentPlayerId).toBe('P2');

  recordPlayerMove(hand, 'P2', 'call');
  expect(hand.potCoins).toBe(24);
  expect(hand.stage).toBe('turn');
});

test('bet and raise accept pot-limit target amounts', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P2', 'bet', 8);
  expect(hand.potCoins).toBe(16);
  expect(hand.currentBet).toBe(8);

  recordPlayerMove(hand, 'P1', 'raise', 100);
  expect(hand.potCoins).toBe(48);
  expect(hand.currentBet).toBe(32);
  expect(hand.currentPlayerId).toBe('P2');
});

test('bet actions preserve a valid selected pot-size preset for other players', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P2', 'bet', 4, 'quarter');
  expect(hand.actions.at(-1)).toMatchObject({
    playerId: 'P2',
    move: 'bet',
    amount: 4,
    betSize: 'quarter',
  });
});

test('bet actions discard an unknown pot-size preset', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P2', 'bet', 4, 'four');
  expect(hand.actions.at(-1)).not.toHaveProperty('betSize');
});

test('player must call after opponent raises a custom amount', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P2', 'bet', 8);
  recordPlayerMove(hand, 'P1', 'raise', 30);

  expect(hand.stage).toBe('flop');
  expect(hand.currentBet).toBe(30);
  expect(hand.roundBets.P2).toBe(8);
  expect(hand.roundBets.P1).toBe(30);
  expect(hand.currentPlayerId).toBe('P2');
  expect(() => recordPlayerMove(hand, 'P2', 'check')).toThrow('call or fold required');

  recordPlayerMove(hand, 'P2', 'call');
  expect(hand.stage).toBe('turn');
});

test('raise count is limited to three per street', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P2', 'bet');
  recordPlayerMove(hand, 'P1', 'raise');
  recordPlayerMove(hand, 'P2', 'raise');
  recordPlayerMove(hand, 'P1', 'raise');

  expect(hand.raiseCount).toBe(3);
  expect(() => recordPlayerMove(hand, 'P2', 'raise')).toThrow('raise limit reached');

  recordPlayerMove(hand, 'P2', 'call');
  expect(hand.stage).toBe('turn');
});

test('minimum raise uses the previous full raise increment', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);

  recordPlayerMove(hand, 'P2', 'bet', 8);
  recordPlayerMove(hand, 'P1', 'raise', 20);
  expect(hand.lastFullRaise).toBe(12);

  // A requested raise to 24 is below the minimum of 32 and is normalized up.
  recordPlayerMove(hand, 'P2', 'raise', 24);
  expect(hand.currentBet).toBe(32);
  expect(hand.lastFullRaise).toBe(12);
});

test('a short all-in raise neither lowers the minimum nor reopens betting', () => {
  const hand = dealHand(2, 12345);
  callBlindsToFlop(hand);
  hand.players[0].stack = 12;

  recordPlayerMove(hand, 'P2', 'bet', 8);
  recordPlayerMove(hand, 'P1', 'raise', 12);

  expect(hand.currentBet).toBe(12);
  expect(hand.lastFullRaise).toBe(8);
  expect(() => recordPlayerMove(hand, 'P2', 'raise', 20)).toThrow('betting is not reopened');
  recordPlayerMove(hand, 'P2', 'call');
  expect(hand.stage).toBe('showdown');
});

test('deal rejects actions from players out of turn', () => {
  const hand = dealHand(2, 12345);

  expect(() => recordPlayerMove(hand, 'P2', 'check')).toThrow('not your turn');
});

test('checking through all streets reaches showdown', () => {
  const hand = dealHand(2, 12345);

  recordPlayerMove(hand, 'P1', 'call');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');

  expect(hand.stage).toBe('showdown');
  expect(hand.currentPlayerId).toBeUndefined();
  expect(hand.community).toEqual(hand.fullCommunity);
});

test('players who reach final showdown reveal automatically', () => {
  const hand = dealHand(2, 12345);

  recordPlayerMove(hand, 'P1', 'call');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');
  recordPlayerMove(hand, 'P2', 'check');
  recordPlayerMove(hand, 'P1', 'check');

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

test('all cards reveal automatically after showdown caused by a fold', () => {
  const hand = dealHand(2, 12345);

  recordPlayerMove(hand, 'P1', 'fold');

  expect(hand.cardsRevealed).toBe(true);
  expect(hand.revealVotes).toEqual(['P1', 'P2']);
  expect(hand.players.every(player => player.hole.length === 4)).toBe(true);
});

test('evaluates Omaha Hi-Lo with high and qualifying low', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.totalContributions = { P1: 3, P2: 3 };
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
  hand.totalContributions = { P1: 3, P2: 3 };
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

test('splits the pot when a short-stacked player is all in', () => {
  const hand = dealHand(3, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Ah', 'Ad', '3c', '4c'];
  hand.players[2].hole = ['Kh', 'Kd', '3h', '4h'];
  hand.totalContributions = { P1: 10, P2: 30, P3: 30 };
  hand.potCoins = 70;

  const result = evaluateOmahaHiLo(hand);

  expect(result?.sidePots.map(({ players, ...pot }) => pot)).toEqual([
    {
      amount: 30,
      eligiblePlayerIds: ['P1', 'P2', 'P3'],
      highWinners: ['P1'],
      lowWinners: [],
      noLow: true,
    },
    {
      amount: 40,
      eligiblePlayerIds: ['P2', 'P3'],
      highWinners: ['P2'],
      lowWinners: [],
      noLow: true,
    },
  ]);
  expect(result?.points).toEqual([
    { id: 'P1', high: 30, low: 0, total: 30 },
    { id: 'P2', high: 40, low: 0, total: 40 },
    { id: 'P3', high: 0, low: 0, total: 0 },
  ]);
  expect(result?.sidePots[0].players.find(player => player.id === 'P1')).toMatchObject({
    contributed: 10,
    payout: 30,
    net: 20,
    eligible: true,
  });
  expect(result?.sidePots[1].players.find(player => player.id === 'P1')).toMatchObject({
    contributed: 0,
    payout: 0,
    net: 0,
    eligible: false,
  });
  result?.sidePots.forEach(pot => {
    expect(pot.players.reduce((sum, player) => sum + (player.contributed ?? 0), 0)).toBe(pot.amount);
    expect(pot.players.reduce((sum, player) => sum + player.payout, 0)).toBe(pot.amount);
    expect(pot.players.reduce((sum, player) => sum + (player.net ?? 0), 0)).toBe(0);
  });
});

test('creates multiple side pots for several all-in levels', () => {
  const hand = dealHand(3, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Ah', 'Ad', '3c', '4c'];
  hand.players[2].hole = ['Kh', 'Kd', '3h', '4h'];
  hand.totalContributions = { P1: 10, P2: 30, P3: 50 };
  hand.potCoins = 90;

  const result = evaluateOmahaHiLo(hand);

  expect(result?.sidePots.map(pot => ({
    amount: pot.amount,
    eligiblePlayerIds: pot.eligiblePlayerIds,
    highWinners: pot.highWinners,
  }))).toEqual([
    { amount: 30, eligiblePlayerIds: ['P1', 'P2', 'P3'], highWinners: ['P1'] },
    { amount: 40, eligiblePlayerIds: ['P2', 'P3'], highWinners: ['P2'] },
    { amount: 20, eligiblePlayerIds: ['P3'], highWinners: [] },
  ]);
  expect(result?.points.map(({ id, total }) => ({ id, total }))).toEqual([
    { id: 'P1', total: 30 },
    { id: 'P2', total: 40 },
    { id: 'P3', total: 20 },
  ]);
  expect(result?.points.reduce((sum, score) => sum + score.total, 0)).toBe(hand.potCoins);
  expect(result?.highWinners).toEqual(['P1', 'P2']);
});

test('settles high and low independently in every side pot', () => {
  const hand = dealHand(3, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['2s', '3h', '4d', 'Kc', 'Kd'];
  hand.players[0].hole = ['As', '5c', 'Qh', 'Qs'];
  hand.players[1].hole = ['Kh', '4c', 'Qd', 'Jd'];
  hand.players[2].hole = ['Ah', '6c', 'Td', '9d'];
  hand.totalContributions = { P1: 10, P2: 30, P3: 30 };
  hand.potCoins = 70;

  const result = evaluateOmahaHiLo(hand);

  expect(result?.sidePots.map(pot => ({
    amount: pot.amount,
    eligiblePlayerIds: pot.eligiblePlayerIds,
    highWinners: pot.highWinners,
    lowWinners: pot.lowWinners,
  }))).toEqual([
    {
      amount: 30,
      eligiblePlayerIds: ['P1', 'P2', 'P3'],
      highWinners: ['P2'],
      lowWinners: ['P1'],
    },
    {
      amount: 40,
      eligiblePlayerIds: ['P2', 'P3'],
      highWinners: ['P2'],
      lowWinners: ['P3'],
    },
  ]);
  expect(result?.points).toEqual([
    { id: 'P1', high: 0, low: 15, total: 15 },
    { id: 'P2', high: 35, low: 0, total: 35 },
    { id: 'P3', high: 0, low: 20, total: 20 },
  ]);
});

test('splits tied high and low shares inside a side pot', () => {
  const hand = dealHand(3, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['2s', '3h', '4d', '9c', 'Kd'];
  hand.players[0].hole = ['7s', '8c', 'Jd', 'Td'];
  hand.players[1].hole = ['As', '5c', 'Kh', 'Qh'];
  hand.players[2].hole = ['Ah', '5d', 'Ks', 'Qs'];
  hand.totalContributions = { P1: 10, P2: 30, P3: 30 };
  hand.potCoins = 70;

  const result = evaluateOmahaHiLo(hand);
  const sidePot = result?.sidePots[1];

  expect(sidePot).toMatchObject({
    amount: 40,
    eligiblePlayerIds: ['P2', 'P3'],
    highWinners: ['P2', 'P3'],
    lowWinners: ['P2', 'P3'],
    noLow: false,
  });
  expect(sidePot?.players.find(player => player.id === 'P2')).toMatchObject({
    high: 10,
    low: 10,
    payout: 20,
    net: 0,
  });
  expect(sidePot?.players.find(player => player.id === 'P3')).toMatchObject({
    high: 10,
    low: 10,
    payout: 20,
    net: 0,
  });
  expect(result?.points.reduce((sum, score) => sum + score.total, 0)).toBe(70);
});

test('awards odd chips as integers clockwise from the dealer, with HIGH first', () => {
  const hand = dealHand(3, 12345);
  hand.stage = 'showdown';
  hand.blinds.dealerPlayerId = 'P1';
  hand.fullCommunity = ['2s', '3h', '4d', '9c', 'Kd'];
  hand.players[0].hole = ['As', '5c', 'Kh', 'Qh'];
  hand.players[1].hole = ['Ah', '5d', 'Ks', 'Qs'];
  hand.players[2].hole = ['Ac', '5h', 'Kc', 'Qd'];
  hand.totalContributions = { P1: 5, P2: 5, P3: 5 };
  hand.potCoins = 15;

  const result = evaluateOmahaHiLo(hand);

  expect(result?.points).toEqual([
    { id: 'P1', high: 2, low: 2, total: 4 },
    { id: 'P2', high: 3, low: 3, total: 6 },
    { id: 'P3', high: 3, low: 2, total: 5 },
  ]);
  expect(result?.sidePots[0].players.every(player => (
    Number.isInteger(player.high)
    && Number.isInteger(player.low)
    && Number.isInteger(player.payout)
  ))).toBe(true);
  expect(result?.points.reduce((sum, score) => sum + score.total, 0)).toBe(15);
});

test('includes folded chips in settlement without making the folder eligible', () => {
  const hand = dealHand(4, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Ah', 'Ad', '3c', '4c'];
  hand.players[2].hole = ['Kh', 'Kd', '3h', '4h'];
  hand.players[3].hole = ['Ac', 'Ks', '7d', '8h'];
  hand.players[3].folded = true;
  hand.totalContributions = { P1: 10, P2: 30, P3: 30, P4: 20 };
  hand.potCoins = 90;

  const result = evaluateOmahaHiLo(hand);

  expect(result?.sidePots.map(pot => ({
    amount: pot.amount,
    eligiblePlayerIds: pot.eligiblePlayerIds,
    highWinners: pot.highWinners,
  }))).toEqual([
    { amount: 40, eligiblePlayerIds: ['P1', 'P2', 'P3'], highWinners: ['P1'] },
    { amount: 50, eligiblePlayerIds: ['P2', 'P3'], highWinners: ['P2'] },
  ]);
  result?.sidePots.forEach(pot => {
    const folded = pot.players.find(player => player.id === 'P4');
    expect(folded).toMatchObject({
      payout: 0,
      eligible: false,
      net: -(folded?.contributed ?? 0),
    });
    expect(pot.players.reduce((sum, player) => sum + (player.contributed ?? 0), 0)).toBe(pot.amount);
    expect(pot.players.reduce((sum, player) => sum + player.payout, 0)).toBe(pot.amount);
  });
  expect(result?.points.find(score => score.id === 'P4')?.total).toBe(0);
});

test('returns an unmatched contribution through a one-player side pot', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Kh', 'Kd', '3h', '4h'];
  hand.totalContributions = { P1: 10, P2: 30 };
  hand.potCoins = 40;

  const result = evaluateOmahaHiLo(hand);
  const unmatchedPot = result?.sidePots[1];

  expect(unmatchedPot).toMatchObject({
    amount: 20,
    eligiblePlayerIds: ['P2'],
    highWinners: [],
    lowWinners: [],
    uncontestedWinnerId: 'P2',
  });
  expect(unmatchedPot?.players.find(player => player.id === 'P2')).toMatchObject({
    contributed: 20,
    payout: 20,
    net: 0,
  });
  expect(result?.highWinners).toEqual(['P1']);
  expect(result?.points.reduce((sum, score) => sum + score.total, 0)).toBe(hand.potCoins);
});

test('trims reconstructed side pots when contributions exceed the stored pot', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Kh', 'Kd', '3h', '4h'];
  hand.players[0].stack = 0;
  hand.totalContributions = { P1: 10, P2: 31 };
  hand.potCoins = 31;

  expect(currentPotBreakdown(hand)).toEqual([
    { amount: 20, eligiblePlayerIds: ['P1', 'P2'] },
    { amount: 11, eligiblePlayerIds: ['P2'] },
  ]);

  const result = evaluateOmahaHiLo(hand);

  expect(result?.sidePots.map(pot => pot.amount)).toEqual([20, 11]);
  expect(result?.sidePots.flatMap(pot => pot.players)
    .reduce((sum, player) => sum + (player.contributed ?? 0), 0)).toBe(31);
  expect(result?.points.reduce((sum, score) => sum + score.total, 0)).toBe(31);
});

test('settles a legacy pot when contribution history is missing', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Kh', 'Kd', '3h', '4h'];
  hand.totalContributions = {};
  hand.potCoins = 17;

  const result = evaluateOmahaHiLo(hand);

  expect(result?.sidePots).toHaveLength(1);
  expect(result?.sidePots[0]).toMatchObject({
    amount: 17,
    eligiblePlayerIds: ['P1', 'P2'],
    highWinners: ['P1'],
  });
  expect(result?.points).toEqual([
    { id: 'P1', high: 17, low: 0, total: 17 },
    { id: 'P2', high: 0, low: 0, total: 0 },
  ]);
});

test('carries side-pot payouts into the next hand without losing chips', () => {
  const hand = dealHand(3, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['2s', '3h', '4d', 'Kc', 'Kd'];
  hand.players[0].hole = ['As', '5c', 'Qh', 'Qs'];
  hand.players[1].hole = ['Kh', '4c', 'Qd', 'Jd'];
  hand.players[2].hole = ['Ah', '6c', 'Td', '9d'];
  hand.players[0].stack = 990;
  hand.players[1].stack = 970;
  hand.players[2].stack = 970;
  hand.totalContributions = { P1: 10, P2: 30, P3: 30 };
  hand.potCoins = 70;

  expect([...stacksAfterPayout(hand).entries()]).toEqual([
    ['P1', 1005],
    ['P2', 1005],
    ['P3', 990],
  ]);

  const next = nextPartyHand(hand);
  expect(next.players.map(player => player.stack)).toEqual([1005, 1003, 986]);
  expect(next.players.reduce((sum, player) => sum + player.stack, next.potCoins)).toBe(3000);
});

test('a player with no chips does not continue in the party', () => {
  expect(isPlayerStillInParty({ stack: 1 })).toBe(true);
  expect(isPlayerStillInParty({ stack: 0 })).toBe(false);
});

test('shows a compact live pot breakdown only after an all-in', () => {
  const hand = dealHand(3, 12345);
  hand.totalContributions = { P1: 10, P2: 30, P3: 30 };
  hand.potCoins = 70;

  expect(currentPotBreakdown(hand)).toEqual([
    { amount: 70, eligiblePlayerIds: ['P1', 'P2', 'P3'] },
  ]);

  hand.players[0].stack = 0;
  expect(currentPotBreakdown(hand)).toEqual([
    { amount: 30, eligiblePlayerIds: ['P1', 'P2', 'P3'] },
    { amount: 40, eligiblePlayerIds: ['P2', 'P3'] },
  ]);
});

test('folded contribution levels do not create fake side pots', () => {
  const hand = dealHand(3, 12345);
  hand.totalContributions = { P1: 4, P2: 62, P3: 130 };
  hand.potCoins = 196;
  hand.players[0].folded = true;
  hand.players[1].folded = true;
  hand.players[2].stack = 0;

  expect(currentPotBreakdown(hand)).toEqual([
    { amount: 196, eligiblePlayerIds: ['P3'] },
  ]);
});

test('side pot sizes include folded chips at the correct all-in level', () => {
  const hand = dealHand(4, 12345);
  hand.totalContributions = { P1: 10, P2: 30, P3: 30, P4: 20 };
  hand.potCoins = 90;
  hand.players[0].stack = 0;
  hand.players[3].folded = true;

  expect(currentPotBreakdown(hand)).toEqual([
    { amount: 40, eligiblePlayerIds: ['P1', 'P2', 'P3'] },
    { amount: 50, eligiblePlayerIds: ['P2', 'P3'] },
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
  expect(result?.highWinners).toEqual([]);
  expect(result?.lowWinners).toEqual([]);
  expect(result?.sidePots[0].uncontestedWinnerId).toBe('P2');
  expect(result?.points.find(score => score.id === 'P1')?.total).toBe(0);
});

test('a folded qualifying low receives no payout', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['2s', '3h', '4d', 'Kc', 'Kd'];
  hand.players[0].hole = ['As', '5c', 'Qh', 'Qs'];
  hand.players[0].folded = true;
  hand.players[1].hole = ['Ah', '6c', 'Qd', 'Jd'];
  hand.totalContributions = { P1: 3, P2: 3 };
  hand.potCoins = 6;

  const result = evaluateOmahaHiLo(hand);

  expect(result?.players.find(player => player.id === 'P1')?.lowRank).toBe('5-4-3-2-1');
  expect(result?.lowWinners).toEqual([]);
  expect(result?.points.find(score => score.id === 'P1')?.total).toBe(0);
  expect(result?.points.find(score => score.id === 'P2')?.total).toBe(6);
});

test('active players with the same high hand split the high pool', () => {
  const hand = dealHand(2, 12345);
  hand.stage = 'showdown';
  hand.fullCommunity = ['9s', 'Th', 'Jd', 'Qc', '2d'];
  hand.players[0].hole = ['As', 'Kc', '7h', '8s'];
  hand.players[1].hole = ['Ah', 'Ks', '3c', '4c'];
  hand.totalContributions = { P1: 3, P2: 3 };
  hand.potCoins = 6;

  const result = evaluateOmahaHiLo(hand);

  expect(result?.highWinners).toEqual(['P1', 'P2']);
  expect(result?.points).toEqual([
    { id: 'P1', high: 3, low: 0, total: 3 },
    { id: 'P2', high: 3, low: 0, total: 3 },
  ]);
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
