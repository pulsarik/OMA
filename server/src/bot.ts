import {
  MAX_RAISES_PER_STREET,
  PlayerMove,
  evaluatePlayerCombo,
  normalizeHand,
  visibleCommunity,
} from './game';

export type BotDecision = {
  move: PlayerMove;
  amount?: number;
};

const HIGH_RANK_STRENGTH: Record<string, number> = {
  'high card': 0,
  pair: 1,
  'two pair': 2,
  'three of a kind': 3,
  straight: 4,
  flush: 5,
  'full house': 6,
  'four of a kind': 7,
  'straight flush': 8,
};

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

function lowStrength(lowRank: string | undefined) {
  if (!lowRank) return 0;
  const highLowCard = Number(lowRank.split('-')[0]);
  if (!Number.isFinite(highLowCard)) return 1.5;
  return Math.max(1, 9 - highLowCard);
}

function potBetAmount(hand: any, player: any, fraction: number) {
  const bigBlind = hand.blinds?.big ?? 4;
  const amount = Math.ceil((hand.potCoins ?? 0) * fraction);
  return Math.min(Math.max(amount, Math.min(bigBlind, player.stack)), player.stack);
}

function potRaiseTo(hand: any, player: any, fraction: number) {
  const playerBet = hand.roundBets?.[player.id] ?? 0;
  const currentBet = hand.currentBet ?? 0;
  const bigBlind = hand.blinds?.big ?? 4;
  const callAmount = Math.max(currentBet - playerBet, 0);
  const maxRaiseTo = Math.min(playerBet + player.stack, currentBet + (hand.potCoins ?? 0) + callAmount);
  const minRaiseTo = Math.min(currentBet + bigBlind, maxRaiseTo);
  const raiseSize = Math.ceil(((hand.potCoins ?? 0) + callAmount) * fraction);
  return Math.min(Math.max(currentBet + raiseSize, minRaiseTo), maxRaiseTo);
}

export function aggressiveMoveForMatchedBet(currentBet: number, raiseCount: number): PlayerMove {
  if (currentBet === 0) return 'bet';
  if (raiseCount < MAX_RAISES_PER_STREET) return 'raise';
  return 'check';
}

export function botMove(hand: any, player: any): BotDecision {
  normalizeHand(hand);
  const playerBet = hand.roundBets?.[player.id] ?? 0;
  const callAmount = Math.max((hand.currentBet ?? 0) - playerBet, 0);
  const bigBlind = hand.blinds?.big ?? 4;
  const potOdds = callAmount > 0 ? callAmount / Math.max((hand.potCoins ?? 0) + callAmount, 1) : 0;
  const combo = evaluatePlayerCombo(player.hole, visibleCommunity(hand));
  const highStrength = HIGH_RANK_STRENGTH[combo?.highRank ?? 'high card'] ?? 0;
  const lowScore = lowStrength(combo?.lowRank);
  const startScore = startingHandScore(player.hole);
  const scoopScore = highStrength + lowScore + (hand.stage === 'preflop' ? startScore : 0);
  const strongMadeHand = highStrength >= 4 || lowScore >= 3;
  const premiumPreflop = hand.stage === 'preflop' && startScore >= 5;

  if (callAmount <= 0) {
    const aggressiveFraction = premiumPreflop
      ? 0.5
      : hand.stage !== 'preflop' && scoopScore >= 5
        ? 0.75
        : hand.stage !== 'preflop' && scoopScore >= 3
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

  const cheapCall = callAmount <= bigBlind || potOdds <= 0.18;
  const fairCall = potOdds <= 0.32 && scoopScore >= 2.5;

  const mustContinue = premiumPreflop || strongMadeHand || scoopScore >= 6;
  if (mustContinue) {
    if (hand.raiseCount < MAX_RAISES_PER_STREET) {
      return { move: 'raise', amount: potRaiseTo(hand, player, scoopScore >= 7 ? 1 : 0.5) };
    }
    return { move: 'call' };
  }
  if (cheapCall || fairCall) return { move: 'call' };
  return { move: 'fold' };
}
