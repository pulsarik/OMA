import {
  PlayerMove,
  MAX_RAISES_PER_STREET,
  BotStyle,
  compareOmahaHands,
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
  /** Expected share of the whole pot, including ties and split pots. */
  equity: number;
  /** Chance of winning every available half of the pot outright. */
  scoopRate: number;
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

export function estimateShowdownEquity(hand: any, player: any, samples?: number): BotEquity {
  normalizeHand(hand);
  const board = visibleCommunity(hand);
  const opponents = hand.players.filter((candidate: any) => candidate.id !== player.id && !candidate.folded);
  if (!opponents.length) return { equity: 1, scoopRate: 1 };

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
  if (availableCards.length < cardsNeeded) return { equity: 0, scoopRate: 0 };

  const seedSource = `${hand.dealSeed ?? hand.id ?? ''}|${player.id}|${hand.stage}|${board.join('')}`;
  const random = randomGenerator(seededNumber(seedSource));
  let totalShare = 0;
  let scoops = 0;

  for (let sample = 0; sample < sampleCount; sample++) {
    const cards = shuffled(availableCards, random);
    let cursor = 0;
    const completeBoard = [...board, ...cards.slice(cursor, cursor += 5 - board.length)];
    const opponentHoles: string[][] = opponents.map(() => cards.slice(cursor, cursor += 4));
    const comparisons = opponentHoles.map(hole => compareOmahaHands(player.hole, hole, completeBoard));

    const highLoss = comparisons.some(comparison => comparison.high < 0);
    const highTies = comparisons.filter(comparison => comparison.high === 0).length;
    const highShare = highLoss ? 0 : 1 / (highTies + 1);
    const lowExists = comparisons.some(comparison => comparison.low !== undefined);
    const lowLoss = comparisons.some(comparison => comparison.low !== undefined && comparison.low < 0);
    const lowTies = comparisons.filter(comparison => comparison.low === 0).length;
    const lowShare = !lowExists || lowLoss ? 0 : 1 / (lowTies + 1);
    const share = lowExists ? (highShare + lowShare) / 2 : highShare;

    totalShare += share;
    if (share === 1) scoops++;
  }

  return {
    equity: totalShare / sampleCount,
    scoopRate: scoops / sampleCount,
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

function potBetAmount(hand: any, player: any, fraction: number) {
  const bigBlind = hand.blinds?.big ?? 4;
  const amount = Math.ceil((hand.potCoins ?? 0) * fraction);
  return Math.min(Math.max(amount, Math.min(bigBlind, player.stack)), player.stack);
}

function potRaiseTo(hand: any, player: any, fraction: number) {
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
  continueEquity: number;
  continueScoop: number;
  callMargin: number;
  riverCallMargin: number;
  cheapCallFloor: number;
  cheapCallOddsFactor: number;
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
    continueEquity: 0.64,
    continueScoop: 0.45,
    callMargin: 0.02,
    riverCallMargin: 0.035,
    cheapCallFloor: 0.12,
    cheapCallOddsFactor: 0.75,
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
    continueEquity: 0.58,
    continueScoop: 0.38,
    callMargin: 0.01,
    riverCallMargin: 0.02,
    cheapCallFloor: 0.08,
    cheapCallOddsFactor: 0.6,
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
    continueEquity: 0.72,
    continueScoop: 0.55,
    callMargin: 0.04,
    riverCallMargin: 0.06,
    cheapCallFloor: 0.18,
    cheapCallOddsFactor: 0.9,
    raiseEquity: 0.8,
    raiseScoop: 0.68,
    bigRaiseEquity: 0.88,
    bigRaiseScoop: 0.78,
    strongBetFraction: 0.5,
    mediumBetFraction: 0.2,
    raiseFraction: 0.35,
  },
};

function botProfile(player: any): BotProfile {
  return BOT_PROFILES[player.botStyle as BotStyle] ?? BOT_PROFILES.normal;
}

export function aggressiveMoveForMatchedBet(currentBet: number, raiseCount: number): PlayerMove {
  if (currentBet === 0) return 'bet';
  if (raiseCount >= MAX_RAISES_PER_STREET) return 'check';
  return 'raise';
}

export function botMove(hand: any, player: any): BotDecision {
  normalizeHand(hand);
  const profile = botProfile(player);
  const playerBet = hand.roundBets?.[player.id] ?? 0;
  const callAmount = Math.max((hand.currentBet ?? 0) - playerBet, 0);
  const bigBlind = hand.blinds?.big ?? 4;
  const potOdds = callAmount > 0 ? callAmount / Math.max((hand.potCoins ?? 0) + callAmount, 1) : 0;
  const startScore = startingHandScore(player.hole);
  const premiumPreflop = hand.stage === 'preflop' && startScore >= profile.premiumPreflopScore;
  const aceKingSuited = player.hole.some((card: string) => card[0] === 'A'
    && player.hole.some((other: string) => other[0] === 'K' && other[1] === card[1]));
  const aceKingSupport = player.hole.some((card: string) => ['T', 'J', 'Q'].includes(card[0]));
  const supportedAceKingPreflop = hand.stage === 'preflop'
    && aceKingSuited
    && aceKingSupport
    && callAmount <= bigBlind * 2;
  const currentCombo = hand.stage !== 'preflop'
    ? evaluatePlayerCombo(player.hole, visibleCommunity(hand))
    : undefined;
  const madeHighHand = [
    'two pair',
    'three of a kind',
    'straight',
    'flush',
    'full house',
    'four of a kind',
    'straight flush',
  ].includes(currentCombo?.highRank ?? '');
  const { equity, scoopRate } = estimateShowdownEquity(hand, player);
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
      if (aggressiveMove === 'bet') {
        return explain('bet', potBetAmount(hand, player, aggressiveFraction));
      }
      if (aggressiveMove === 'raise') {
        return explain('raise', potRaiseTo(hand, player, aggressiveFraction));
      }
    }
    return explain('check');
  }

  const cheapCall = callAmount <= bigBlind
    && equity >= Math.max(profile.cheapCallFloor, potOdds * profile.cheapCallOddsFactor);
  const profitableCall = equity >= potOdds + (
    hand.stage === 'river' ? profile.riverCallMargin : profile.callMargin
  );

  const mustContinue = premiumPreflop
    // Suited ace-king with a broadway side card is playable in Omaha at a
    // reasonable price. Avoid protecting every weak, disconnected A-K hand.
    || supportedAceKingPreflop
    // A simulation can undervalue a made Omaha hand when several opponents
    // are dealt unknown cards. Do not auto-fold a real made hand at a normal
    // price; equity still controls raises and expensive calls below.
    || (madeHighHand && equity >= Math.min(0.35, potOdds + 0.02))
    || equity >= profile.continueEquity
    || scoopRate >= profile.continueScoop;
  if (mustContinue) {
    if (player.stack <= callAmount) {
      return explain('call');
    }
    if (
      !hand.actedSinceLastFullRaise?.includes(player.id)
      && hand.raiseCount < MAX_RAISES_PER_STREET
      && (equity >= profile.raiseEquity || scoopRate >= profile.raiseScoop)
    ) {
      return explain('raise', potRaiseTo(
          hand,
          player,
          equity >= profile.bigRaiseEquity || scoopRate >= profile.bigRaiseScoop
            ? 1
            : profile.raiseFraction,
        ));
    }
    return explain('call');
  }
  if (cheapCall || profitableCall) return explain('call');
  return explain('fold');
}
