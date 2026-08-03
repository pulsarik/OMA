import {
  PlayerMove,
  MAX_RAISES_PER_STREET,
  compareOmahaHands,
  normalizeHand,
  visibleCommunity,
} from './game';

export type BotDecision = {
  move: PlayerMove;
  amount?: number;
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

function startingHandScore(hole: string[]) {
  const ranks = hole.map(rankValue);
  const lows = [...new Set(hole.map(lowValue).filter((value): value is number => Boolean(value)))];
  const rankCounts = new Map<number, number>();
  ranks.forEach((rank) => rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1));

  let score = 0;
  if (lows.includes(1) && lows.includes(2)) score += 4;
  if (lows.includes(1) && lows.includes(3)) score += 2;
  if (lows.length >= 3) score += 2;
  if ((rankCounts.get(14) ?? 0) >= 2) score += 3;
  if ([...rankCounts.values()].some((count) => count >= 3)) score -= 2;
  score += suitedAceBonus(hole);
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

export function aggressiveMoveForMatchedBet(currentBet: number, raiseCount: number): PlayerMove {
  if (currentBet === 0) return 'bet';
  if (raiseCount >= MAX_RAISES_PER_STREET) return 'check';
  return 'raise';
}

export function botMove(hand: any, player: any): BotDecision {
  normalizeHand(hand);
  const playerBet = hand.roundBets?.[player.id] ?? 0;
  const callAmount = Math.max((hand.currentBet ?? 0) - playerBet, 0);
  const bigBlind = hand.blinds?.big ?? 4;
  const potOdds = callAmount > 0 ? callAmount / Math.max((hand.potCoins ?? 0) + callAmount, 1) : 0;
  const startScore = startingHandScore(player.hole);
  const premiumPreflop = hand.stage === 'preflop' && startScore >= 5;
  const { equity, scoopRate } = estimateShowdownEquity(hand, player);

  if (callAmount <= 0) {
    const aggressiveFraction = premiumPreflop
      ? 0.5
      : hand.stage !== 'preflop' && (equity >= 0.68 || scoopRate >= 0.52)
        ? 0.75
        : hand.stage !== 'preflop' && (equity >= 0.48 || scoopRate >= 0.32)
          ? 0.25
          : undefined;

    if (aggressiveFraction !== undefined) {
      const aggressiveMove = aggressiveMoveForMatchedBet(hand.currentBet, hand.raiseCount);
      if (aggressiveMove === 'bet') {
        return { move: 'bet', amount: potBetAmount(hand, player, aggressiveFraction) };
      }
      if (aggressiveMove === 'raise') {
        return { move: 'raise', amount: potRaiseTo(hand, player, aggressiveFraction) };
      }
    }
    return { move: 'check' };
  }

  const cheapCall = callAmount <= bigBlind && equity >= Math.max(0.12, potOdds * 0.75);
  const profitableCall = equity >= potOdds + (hand.stage === 'river' ? 0.035 : 0.02);

  const mustContinue = premiumPreflop || equity >= 0.64 || scoopRate >= 0.45;
  if (mustContinue) {
    if (player.stack <= callAmount) {
      return { move: 'call' };
    }
    if (!hand.actedSinceLastFullRaise?.includes(player.id) && hand.raiseCount < MAX_RAISES_PER_STREET) {
      return { move: 'raise', amount: potRaiseTo(hand, player, equity >= 0.78 || scoopRate >= 0.65 ? 1 : 0.5) };
    }
    return { move: 'call' };
  }
  if (cheapCall || profitableCall) return { move: 'call' };
  return { move: 'fold' };
}
