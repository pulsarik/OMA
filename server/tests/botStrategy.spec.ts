import { botMove, botSituation, estimateShowdownEquity } from '../src/bot';
import { dealHand, hasNutLow, potsAfterCall, recordPlayerMove, stacksAfterPayout } from '../src/game';

test('short all-in calls exclude inaccessible side pots and do not change the hand', () => {
  const hand = dealHand(3, 71);
  hand.currentBet = 100;
  hand.roundBets = { P1: 0, P2: 100, P3: 100 };
  hand.totalContributions = { P1: 20, P2: 120, P3: 120 };
  hand.potCoins = 260;
  hand.players[0].stack = 30;
  const before = JSON.stringify(hand);
  const { cost, pots } = potsAfterCall(hand, 'P1');
  expect(cost).toBe(30);
  expect(pots).toEqual([
    { amount: 150, eligiblePlayerIds: ['P1', 'P2', 'P3'] },
    { amount: 140, eligiblePlayerIds: ['P2', 'P3'] },
  ]);
  expect(botSituation(hand, hand.players[0]).potOdds).toBeCloseTo(0.2);
  expect(botSituation(hand, hand.players[0]).futureRisk).toBe(0);
  expect(JSON.stringify(hand)).toBe(before);
});

test('players yet to call stay eligible and folded contributions stay in the pot', () => {
  const hand = dealHand(4, 71);
  hand.currentBet = 100;
  hand.roundBets = { P1: 0, P2: 100, P3: 0, P4: 100 };
  hand.totalContributions = { P1: 20, P2: 120, P3: 20, P4: 120 };
  hand.players[0].stack = 30;
  hand.players[3].folded = true;
  hand.potCoins = 280;
  expect(potsAfterCall(hand, 'P1')).toEqual({ cost: 30, pots: [
    { amount: 170, eligiblePlayerIds: ['P1', 'P2', 'P3'] },
    { amount: 140, eligiblePlayerIds: ['P2', 'P3'] },
  ] });
});

test('range estimates react to repeated aggression without reading hidden cards or future board', () => {
  const hand = dealHand(2, 71);
  hand.stage = 'flop';
  hand.fullCommunity = ['Qs', 'Jh', '9d', '2c', '3c'];
  hand.community = hand.fullCommunity.slice(0, 3);
  hand.players[0].hole = ['Qh', 'Jd', '5s', '6s'];
  const passive = estimateShowdownEquity(hand, hand.players[0], 400);
  hand.actions = [1, 2, 3].map(at => ({ playerId: 'P2', move: 'raise', stage: 'flop', amount: 20 * at, at }));
  const aggressive = estimateShowdownEquity(hand, hand.players[0], 400);
  expect(aggressive.equity).toBeLessThan(passive.equity);
  hand.players[1].hole = ['As', 'Ah', 'Ad', 'Ac'];
  hand.fullCommunity[3] = 'Ks';
  hand.fullCommunity[4] = 'Kh';
  expect(estimateShowdownEquity(hand, hand.players[0], 400)).toEqual(aggressive);
});

test('a pending short caller is eligible only up to its total stack', () => {
  const hand = dealHand(3, 71);
  hand.currentBet = 80;
  hand.roundBets = { P1: 0, P2: 80, P3: 0 };
  hand.totalContributions = { P1: 20, P2: 100, P3: 20 };
  hand.players[2].stack = 30;
  hand.potCoins = 140;
  expect(potsAfterCall(hand, 'P1')).toEqual({ cost: 80, pots: [
    { amount: 120, eligiblePlayerIds: ['P1', 'P2', 'P3'] },
    { amount: 100, eligiblePlayerIds: ['P1', 'P2'] },
  ] });
});

test('a premium starting hand does not force a call at any price', () => {
  const hand = dealHand(6, 71);
  hand.players[0].hole = ['As', '2h', '3d', '9c'];
  // Everyone has put in 20; P2 raises to 120, within the pot limit.
  hand.currentBet = 120;
  hand.lastFullRaise = 100;
  hand.roundBets = { P1: 20, P2: 120, P3: 20, P4: 20, P5: 20, P6: 20 };
  hand.totalContributions = { ...hand.roundBets };
  hand.players.forEach(player => { player.stack = 1000 - hand.totalContributions[player.id]; });
  hand.potCoins = 220;
  expect(botMove(hand, hand.players[0]).move).toBe('fold');
});

test('position matters before the river but future betting risk vanishes on the river', () => {
  const hand = dealHand(3, 71);
  hand.stage = 'flop';
  hand.blinds.dealerPlayerId = 'P1';
  hand.currentBet = 0;
  hand.roundBets = {};
  hand.totalContributions = { P1: 20, P2: 20, P3: 20 };
  hand.potCoins = 60;
  const last = botSituation(hand, hand.players[0]);
  const first = botSituation(hand, hand.players[1]);
  expect(first.futureRisk).toBeGreaterThan(last.futureRisk);
  hand.stage = 'river';
  expect(botSituation(hand, hand.players[1]).futureRisk).toBe(0);
});

test('a pending all-in caller cannot create future betting risk or justify another raise', () => {
  const hand = dealHand(2, 71);
  hand.stage = 'turn';
  hand.fullCommunity = ['As', 'Ah', 'Kd', 'Kc', '3d'];
  hand.community = hand.fullCommunity.slice(0, 4);
  hand.players[0].hole = ['Ac', 'Ad', '2h', '3h'];
  hand.currentBet = 100;
  hand.roundBets = { P1: 100, P2: 0 };
  hand.totalContributions = { P1: 120, P2: 20 };
  hand.players[1].stack = 50;
  hand.potCoins = 140;
  expect(botSituation(hand, hand.players[0]).futureRisk).toBe(0);
  expect(botMove(hand, hand.players[0]).move).toBe('check');
});

test('backup low cards protect a nut low against counterfeit runouts', () => {
  const board = ['3s', '4h', '8d'];
  expect(hasNutLow(['As', '2h', 'Kd', 'Qc'], board)).toBe(true);
  expect(hasNutLow(['As', '2h', 'Kd', 'Qc'], [...board, 'Ac'])).toBe(false);
  expect(hasNutLow(['As', '2h', '5d', 'Qc'], [...board, 'Ac'])).toBe(true);
  expect(hasNutLow(['Ks', 'Kh', 'Qd', 'Qc'], board)).toBe(false);
  const hand = dealHand(2, 71);
  hand.stage = 'flop';
  hand.fullCommunity = [...board, 'Tc', 'Jc'];
  hand.community = board;
  hand.players[0].hole = ['As', '2h', 'Kd', 'Qc'];
  const vulnerable = estimateShowdownEquity(hand, hand.players[0], 200);
  hand.players[0].hole = ['As', '2h', '5d', 'Qc'];
  const protectedLow = estimateShowdownEquity(hand, hand.players[0], 200);
  expect(vulnerable.nutLowLostRate).toBeGreaterThan(protectedLow.nutLowLostRate);
});

test('borderline estimates receive more samples and remain deterministic', () => {
  const hand = dealHand(2, 71);
  const initial = estimateShowdownEquity(hand, hand.players[0]);
  const refined = estimateShowdownEquity(hand, hand.players[0], undefined, initial.equity);
  expect(refined.samples).toBe(initial.samples * 3);
  expect(estimateShowdownEquity(hand, hand.players[0], undefined, initial.equity)).toEqual(refined);
  expect(estimateShowdownEquity(hand, hand.players[0], 25, initial.equity).samples).toBe(25);
});

test('bots complete varied tables with legal actions and preserve all chips', () => {
  for (const count of [2, 3, 6, 10]) {
    const hand = dealHand(count, 710 + count, [], Array(count).fill(true));
    let moves = 0;
    while (hand.stage !== 'showdown' && moves++ < 200) {
      const player = hand.players.find(candidate => candidate.id === hand.currentPlayerId)!;
      const decision = botMove(hand, player);
      recordPlayerMove(hand, player.id, decision.move, decision.amount);
    }
    expect(hand.stage).toBe('showdown');
    expect([...stacksAfterPayout(hand).values()].reduce((sum, stack) => sum + stack, 0)).toBe(count * 1000);
  }
});
