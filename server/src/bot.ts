import {
  PlayerMove,
  MAX_RAISES_PER_STREET,
  BotStyle,
  compareOmahaField,
  DealtHand,
  PlayerHand,
  potsAfterCall,
  hasNutLow,
  evaluatePlayerCombo,
  normalizeHand,
  visibleCommunity,
} from './game';

export type BotDecision = {
  move: PlayerMove;
  amount?: number;
  reason?: {
    summary: string;
    factors: string[];
    equity: number;
    scoopRate: number;
    potOdds: number;
  };
};

const SUITS = ['s', 'h', 'd', 'c'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const DECK = RANKS.flatMap(rank => SUITS.map(suit => `${rank}${suit}`));

export type BotEquity = {
  /** Expected share of the accessible pots after calling, including ties. */
  equity: number;
  /** Chance of winning every available half of the pot outright. */
  scoopRate: number;
  /** Chance of receiving at most one quarter of the accessible pot, but not zero. */
  quarterRate: number;
  samples: number;
  effectiveSamples: number;
  /** Runouts on which a currently unbeatable low can be beaten. */
  nutLowLostRate: number;
};

function seededNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomGenerator(seed: number) {
  return () => {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(values: T[], random: () => number) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function simulationCount(stage: string) {
  if (stage === 'river') return 160;
  if (stage === 'turn') return 128;
  if (stage === 'flop') return 96;
  return 72;
}

// Soft likelihoods deliberately retain bluffs and draws. This is a heuristic
// range model, not a claim that an action reveals an opponent's actual cards.
function rangeEvidence(hand: DealtHand, playerId: string) {
  const stages = ['preflop', 'flop', 'turn', 'river'];
  return stages.slice(0, stages.indexOf(hand.stage) + 1).flatMap(stage => {
    const actions = hand.actions.filter(action => action.playerId === playerId && action.stage === stage);
    const aggression = actions.filter(action => action.move === 'bet' || action.move === 'raise').length;
    const calls = actions.filter(action => action.move === 'call').length;
    if (!aggression && !calls) return [];
    const count = stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5;
    return [{ board: visibleCommunity(hand).slice(0, count), pressure: Math.min(1.6, aggression * 0.65 + calls * 0.15) }];
  });
}

function rangeWeight(hole: string[], evidence: ReturnType<typeof rangeEvidence>) {
  let logWeight = 0;
  for (const { board, pressure } of evidence) {
    let strength = Math.min(1, Math.max(0, startingHandScore(hole) / 10));
    if (board.length) {
      const combo = evaluatePlayerCombo(hole, board);
      const ranks = ['high card', 'pair', 'two pair', 'three of a kind', 'straight', 'flush', 'full house', 'four of a kind', 'straight flush'];
      const high = Math.max(0, ranks.indexOf(combo?.highRank ?? '')) / 8;
      const low = combo?.lowRank ? (9 - Number(combo.lowRank[0])) / 4 : 0;
      // Low draws retain weight on early streets even before a low qualifies.
      strength = Math.min(1, high + low * 0.45 + (board.length < 5 ? strength * 0.25 : 0));
    }
    logWeight += pressure * (strength - 0.35) * 3;
  }
  return Math.exp(Math.max(-3, Math.min(3, logWeight)));
}

export function estimateShowdownEquity(hand: DealtHand, player: PlayerHand, samples?: number, decisionThreshold?: number): BotEquity {
  normalizeHand(hand);
  const board = visibleCommunity(hand);
  const opponents = hand.players.filter(candidate => candidate.id !== player.id && !candidate.folded);
  if (!opponents.length) return { equity: 1, scoopRate: 1, quarterRate: 0, samples: 0, effectiveSamples: 0, nutLowLostRate: 0 };

  // Heads-up spots benefit most from precision. In large pots each sample is
  // considerably more expensive, so scale the default while retaining enough
  // trials to recognize strong multi-way hands.
  const sampleCount = Math.max(1, Math.floor(samples ?? Math.max(
    40,
    simulationCount(hand.stage) / Math.sqrt(opponents.length),
  )));

  const knownCards = new Set([...player.hole, ...board]);
  const availableCards = DECK.filter(card => !knownCards.has(card));
  const cardsNeeded = Math.max(5 - board.length, 0) + opponents.length * 4;
  if (availableCards.length < cardsNeeded) return { equity: 0, scoopRate: 0, quarterRate: 0, samples: 0, effectiveSamples: 0, nutLowLostRate: 0 };

  const evidence = opponents.map(opponent => rangeEvidence(hand, opponent.id));
  const pots = potsAfterCall(hand, player.id).pots.filter(pot => pot.eligiblePlayerIds.includes(player.id));
  const accessiblePot = pots.reduce((sum, pot) => sum + pot.amount, 0);
  const trackNutLow = board.length >= 3 && board.length < 5 && hasNutLow(player.hole, board);

  const seedSource = `${hand.dealSeed ?? hand.id ?? ''}|${player.id}|${hand.stage}|${board.join('')}`;
  const random = randomGenerator(seededNumber(seedSource));
  let totalShare = 0;
  let scoops = 0;
  let quarters = 0;
  let nutLowLost = 0;
  let weightSum = 0;
  let weightSquared = 0;
  let shareSquared = 0;
  let trials = 0;
  let limit = sampleCount;

  for (let sample = 0; sample < limit; sample++) {
    const cards = shuffled(availableCards, random);
    let cursor = 0;
    const completeBoard = [...board, ...cards.slice(cursor, cursor += 5 - board.length)];
    const opponentHoles: string[][] = opponents.map(() => cards.slice(cursor, cursor += 4));
    const field = compareOmahaField(player.hole, opponentHoles, completeBoard);
    const weight = opponentHoles.reduce((value, hole, index) => value * rangeWeight(hole, evidence[index]), 1);
    const potShare = (ids: string[]) => {
      const comparisons = field.filter((_, index) => ids.includes(opponents[index].id));

      const highLoss = comparisons.some(comparison => comparison.high < 0);
      const highTies = comparisons.filter(comparison => comparison.high === 0).length;
      const highShare = highLoss ? 0 : 1 / (highTies + 1);
      const lowExists = comparisons.some(comparison => comparison.low !== undefined);
      const lowLoss = comparisons.some(comparison => comparison.low !== undefined && comparison.low < 0);
      const lowTies = comparisons.filter(comparison => comparison.low === 0).length;
      const lowShare = !lowExists || lowLoss ? 0 : 1 / (lowTies + 1);
      return lowExists ? (highShare + lowShare) / 2 : highShare;
    };
    const share = accessiblePot > 0
      ? pots.reduce((sum, pot) => sum + pot.amount * potShare(pot.eligiblePlayerIds), 0) / accessiblePot
      : potShare(opponents.map(opponent => opponent.id));

    totalShare += share * weight;
    shareSquared += share * share * weight;
    weightSum += weight;
    weightSquared += weight * weight;
    if (share >= 1 - 1e-10) scoops += weight;
    if (share > 0 && share <= 0.25 + 1e-10) quarters += weight;
    if (trackNutLow && !hasNutLow(player.hole, completeBoard)) nutLowLost += weight;
    trials++;
    if (trials === sampleCount && samples === undefined && decisionThreshold !== undefined) {
      const mean = totalShare / weightSum;
      const effective = weightSum * weightSum / weightSquared;
      const error = Math.sqrt(Math.max(0, shareSquared / weightSum - mean * mean) / effective);
      // Fixed work budgets preserve replay determinism; no wall-clock cutoff.
      if (Math.abs(mean - decisionThreshold) < Math.max(0.025, error * 2)) limit = sampleCount * 3;
    }
  }

  return {
    equity: totalShare / weightSum,
    scoopRate: scoops / weightSum,
    quarterRate: quarters / weightSum,
    samples: trials,
    effectiveSamples: weightSum * weightSum / weightSquared,
    nutLowLostRate: nutLowLost / weightSum,
  };
}

function rankValue(code: string) {
  const rank = code[0];
  return rank === 'A' ? 14
    : rank === 'K' ? 13
      : rank === 'Q' ? 12
        : rank === 'J' ? 11
          : rank === 'T' ? 10
            : Number(rank);
}

function lowValue(code: string) {
  const rank = code[0];
  if (rank === 'A') return 1;
  if (['2', '3', '4', '5', '6', '7', '8'].includes(rank)) return Number(rank);
  return undefined;
}

function suitedAceBonus(hole: string[]) {
  const aces = hole.filter((card) => card[0] === 'A');
  if (!aces.length) return 0;
  return aces.some((ace) => hole.some((card) => card !== ace && card[1] === ace[1])) ? 1 : 0;
}

function doubleSuitedBonus(hole: string[]) {
  const suitCounts = new Map<string, number>();
  hole.forEach((card) => suitCounts.set(card[1], (suitCounts.get(card[1]) ?? 0) + 1));
  return [...suitCounts.values()].filter((count) => count >= 2).length >= 2 ? 1 : 0;
}

function startingHandScore(hole: string[]) {
  const ranks = hole.map(rankValue);
  const lows = [...new Set(hole.map(lowValue).filter((value): value is number => Boolean(value)))];
  const rankCounts = new Map<number, number>();
  ranks.forEach((rank) => rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1));

  let score = 0;
  if (lows.includes(1) && lows.includes(2)) score += 4;
  if (lows.includes(1) && lows.includes(3)) score += 2;
  if (lows.length >= 3) score += 2;
  if ((rankCounts.get(14) ?? 0) >= 2) score += 4;
  if ([...rankCounts.values()].some((count) => count >= 3)) score -= 2;
  score += suitedAceBonus(hole);
  score += doubleSuitedBonus(hole);
  score += ranks.filter((rank) => rank >= 11).length * 0.5;
  score -= ranks.filter((rank) => rank >= 6 && rank <= 9).length * 0.25;
  return score;
}

function potBetAmount(hand: DealtHand, player: PlayerHand, fraction: number) {
  const bigBlind = hand.blinds?.big ?? 4;
  const amount = Math.ceil((hand.potCoins ?? 0) * fraction);
  return Math.min(Math.max(amount, Math.min(bigBlind, player.stack)), player.stack);
}

function potRaiseTo(hand: DealtHand, player: PlayerHand, fraction: number) {
  const playerBet = hand.roundBets?.[player.id] ?? 0;
  const currentBet = hand.currentBet ?? 0;
  const lastFullRaise = hand.lastFullRaise ?? hand.blinds?.big ?? 4;
  const callAmount = Math.max(currentBet - playerBet, 0);
  const maxRaiseTo = Math.min(playerBet + player.stack, currentBet + (hand.potCoins ?? 0) + callAmount);
  const fullRaiseTo = currentBet < lastFullRaise ? lastFullRaise : currentBet + lastFullRaise;
  const minRaiseTo = Math.min(fullRaiseTo, maxRaiseTo);
  const raiseSize = Math.ceil(((hand.potCoins ?? 0) + callAmount) * fraction);
  return Math.min(Math.max(currentBet + raiseSize, minRaiseTo), maxRaiseTo);
}

type BotProfile = {
  premiumPreflopScore: number;
  strongEquity: number;
  strongScoop: number;
  mediumEquity: number;
  mediumScoop: number;
  callMargin: number;
  riverCallMargin: number;
  raiseEquity: number;
  raiseScoop: number;
  bigRaiseEquity: number;
  bigRaiseScoop: number;
  strongBetFraction: number;
  mediumBetFraction: number;
  raiseFraction: number;
};

const BOT_PROFILES: Record<BotStyle, BotProfile> = {
  normal: {
    premiumPreflopScore: 5,
    strongEquity: 0.68,
    strongScoop: 0.52,
    mediumEquity: 0.48,
    mediumScoop: 0.32,
    callMargin: 0.02,
    riverCallMargin: 0.035,
    raiseEquity: 0.64,
    raiseScoop: 0.45,
    bigRaiseEquity: 0.78,
    bigRaiseScoop: 0.65,
    strongBetFraction: 0.75,
    mediumBetFraction: 0.25,
    raiseFraction: 0.5,
  },
  aggressive: {
    premiumPreflopScore: 4.5,
    strongEquity: 0.61,
    strongScoop: 0.44,
    mediumEquity: 0.42,
    mediumScoop: 0.25,
    callMargin: 0.01,
    riverCallMargin: 0.02,
    raiseEquity: 0.58,
    raiseScoop: 0.38,
    bigRaiseEquity: 0.72,
    bigRaiseScoop: 0.58,
    strongBetFraction: 1,
    mediumBetFraction: 0.5,
    raiseFraction: 0.75,
  },
  cautious: {
    premiumPreflopScore: 5.5,
    strongEquity: 0.75,
    strongScoop: 0.6,
    mediumEquity: 0.58,
    mediumScoop: 0.4,
    callMargin: 0.04,
    riverCallMargin: 0.06,
    raiseEquity: 0.8,
    raiseScoop: 0.68,
    bigRaiseEquity: 0.88,
    bigRaiseScoop: 0.78,
    strongBetFraction: 0.5,
    mediumBetFraction: 0.2,
    raiseFraction: 0.35,
  },
};

function botProfile(player: PlayerHand): BotProfile {
  return BOT_PROFILES[player.botStyle as BotStyle] ?? BOT_PROFILES.normal;
}

export function aggressiveMoveForMatchedBet(currentBet: number, raiseCount: number): PlayerMove {
  if (currentBet === 0) return 'bet';
  if (raiseCount >= MAX_RAISES_PER_STREET) return 'check';
  return 'raise';
}

export function botSituation(hand: DealtHand, player: PlayerHand) {
  const { cost, pots } = potsAfterCall(hand, player.id);
  const accessiblePot = pots.filter(pot => pot.eligiblePlayerIds.includes(player.id)).reduce((sum, pot) => sum + pot.amount, 0);
  const opponents = hand.players.filter(candidate => candidate.id !== player.id && !candidate.folded && candidate.stack > 0);
  const effectiveStack = Math.min(Math.max(0, player.stack - cost), Math.max(0, ...opponents.map(opponent => (
    opponent.stack - Math.max(0, hand.currentBet - (hand.roundBets[opponent.id] ?? 0))
  ))));
  const spr = effectiveStack / Math.max(accessiblePot, hand.blinds.big);
  const anchor = hand.stage === 'preflop' ? hand.blinds.bigBlindPlayerId : hand.blinds.dealerPlayerId;
  const anchorIndex = hand.players.findIndex(candidate => candidate.id === anchor);
  const order = (id: string) => (hand.players.findIndex(candidate => candidate.id === id) - anchorIndex - 1 + hand.players.length) % hand.players.length;
  const behind = opponents.filter(opponent => order(opponent.id) > order(player.id)).length;
  const pending = opponents.filter(opponent => !hand.actedSinceLastFullRaise?.includes(opponent.id)).length;
  const futureRisk = hand.stage === 'river' || effectiveStack === 0 ? 0
    : Math.min(0.08, Math.log1p(spr) * 0.018 + behind * 0.008 + pending * 0.003);
  return { cost, accessiblePot, potOdds: cost / Math.max(accessiblePot, 1), futureRisk, spr, behind };
}

export function botMove(hand: DealtHand, player: PlayerHand): BotDecision {
  normalizeHand(hand);
  const profile = botProfile(player);
  const playerBet = hand.roundBets?.[player.id] ?? 0;
  const callAmount = Math.max((hand.currentBet ?? 0) - playerBet, 0);
  const situation = botSituation(hand, player);
  const { potOdds } = situation;
  const startScore = startingHandScore(player.hole);
  const premiumPreflop = hand.stage === 'preflop' && startScore >= profile.premiumPreflopScore;
  const margin = hand.stage === 'river' ? profile.riverCallMargin : profile.callMargin;
  const threshold = (potOdds + margin) / (1 - situation.futureRisk);
  const { equity, scoopRate, quarterRate, nutLowLostRate } = estimateShowdownEquity(hand, player, undefined,
    callAmount > 0 ? threshold : profile.mediumEquity);
  const realizedEquity = equity * (1 - situation.futureRisk);
  // A low-only hand that often gets quartered should build a smaller pot.
  // Runouts already account for counterfeit cards and high/low redraws.
  const sizeFraction = (fraction: number) => Math.max(0.2, Math.min(1,
    (quarterRate > 0.2 || nutLowLostRate > 0.2) && scoopRate < 0.2 ? fraction * 0.5
      : situation.spr <= 1 && scoopRate > 0.6 ? 1 : fraction));
  const canRaise = player.stack > callAmount
    && !hand.actedSinceLastFullRaise?.includes(player.id)
    && hand.raiseCount < MAX_RAISES_PER_STREET
    && hand.players.some(opponent => opponent.id !== player.id && !opponent.folded
      && opponent.stack + (hand.roundBets[opponent.id] ?? 0) > hand.currentBet);
  const explain = (move: PlayerMove, amount?: number): BotDecision => {
    const decision: BotDecision = {
      move,
      ...(amount === undefined ? {} : { amount }),
    };
    Object.defineProperty(decision, 'reason', {
      enumerable: false,
      value: {
      summary: move === 'fold' ? 'Недостаточно выгодно продолжать' : move === 'call' ? 'Шансы банка оправдывают продолжение' : move === 'check' ? 'Контроль размера банка' : 'Достаточно сильная ситуация для давления',
      factors: [
        `Оценка доли банка: ${Math.round(equity * 100)}%`,
        `Шансы банка: ${Math.round(potOdds * 100)}%`,
        `Шанс забрать весь банк: ${Math.round(scoopRate * 100)}%`,
      ],
      equity,
      scoopRate,
      potOdds,
      },
    });
    return decision;
  };

  if (callAmount <= 0) {
    const aggressiveFraction = premiumPreflop
      ? profile.raiseFraction
      : hand.stage !== 'preflop' && (equity >= profile.strongEquity || scoopRate >= profile.strongScoop)
        ? profile.strongBetFraction
        : hand.stage !== 'preflop' && (equity >= profile.mediumEquity || scoopRate >= profile.mediumScoop)
          ? profile.mediumBetFraction
          : undefined;

    if (aggressiveFraction !== undefined) {
      const aggressiveMove = aggressiveMoveForMatchedBet(hand.currentBet, hand.raiseCount);
      if (aggressiveMove === 'bet' && canRaise) {
        return explain('bet', potBetAmount(hand, player, sizeFraction(aggressiveFraction)));
      }
      if (aggressiveMove === 'raise' && canRaise) {
        return explain('raise', potRaiseTo(hand, player, sizeFraction(aggressiveFraction)));
      }
    }
    return explain('check');
  }

  if (realizedEquity < potOdds + margin) return explain('fold');
  if (canRaise && (realizedEquity >= profile.raiseEquity || scoopRate >= profile.raiseScoop)) {
    return explain('raise', potRaiseTo(hand, player, sizeFraction(
      equity >= profile.bigRaiseEquity || scoopRate >= profile.bigRaiseScoop ? 1 : profile.raiseFraction,
    )));
  }
  return explain('call');
}
