export type StatisticsHand = {
  handNumber: number;
  players: Array<{
    id: string;
    participated: boolean;
    highRank?: string;
    lowRank?: string;
  }>;
  net: Array<{ id: string; total: number }>;
  wallets?: Array<{ id: string; total: number }>;
  actions?: Array<{ playerId: string; move: string }>;
};

export const COMBINATION_RANKS = [
  { key: 'straightFlush', rank: 'straight flush', short: 'SF', en: 'Straight flush', ru: 'Стрит-флеш' },
  { key: 'fourOfAKind', rank: 'four of a kind', short: '4K', en: 'Four of a kind', ru: 'Каре' },
  { key: 'fullHouse', rank: 'full house', short: 'FH', en: 'Full house', ru: 'Фулл-хаус' },
  { key: 'flush', rank: 'flush', short: 'F', en: 'Flush', ru: 'Флеш' },
  { key: 'straight', rank: 'straight', short: 'S', en: 'Straight', ru: 'Стрит' },
  { key: 'threeOfAKind', rank: 'three of a kind', short: '3K', en: 'Three of a kind', ru: 'Сет' },
  { key: 'twoPair', rank: 'two pair', short: '2P', en: 'Two pair', ru: 'Две пары' },
] as const;

export type CombinationKey = typeof COMBINATION_RANKS[number]['key'];
export type CombinationCounts = Record<CombinationKey, number>;

export function countPlayerCombinations(playerId: string, hands: StatisticsHand[]): CombinationCounts {
  const counts = Object.fromEntries(
    COMBINATION_RANKS.map(({ key }) => [key, 0]),
  ) as CombinationCounts;
  const ranks = new Map<string, CombinationKey>(COMBINATION_RANKS.map(({ rank, key }) => [rank, key]));

  hands.forEach((hand) => {
    const rank = hand.players.find((player) => player.id === playerId)?.highRank;
    const key = rank ? ranks.get(rank) : undefined;
    if (key) counts[key] += 1;
  });

  return counts;
}

const HIGH_RANK_STRENGTH = new Map(COMBINATION_RANKS.map((combination, index) => [combination.rank, COMBINATION_RANKS.length - index]));

function compareLowRank(first?: string, second?: string) {
  if (!first) return 1;
  if (!second) return -1;
  const a = first.split('-').map(Number);
  const b = second.split('-').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) < (b[index] ?? 0) ? -1 : 1;
  }
  return 0;
}

export function advantageRealizationPercent(playerId: string, hands: StatisticsHand[]) {
  const advantagedHands = hands.filter((hand) => {
    const ranks = hand.players
      .filter((player) => player.participated && player.highRank)
      .map((player) => HIGH_RANK_STRENGTH.get(player.highRank! ) ?? 0);
    const player = hand.players.find((entry) => entry.id === playerId && entry.participated);
    const playerStrength = player?.highRank ? (HIGH_RANK_STRENGTH.get(player.highRank) ?? 0) : 0;
    const bestHigh = playerStrength > 0 && playerStrength === Math.max(...ranks);
    const lowPlayers = hand.players.filter((entry) => entry.participated && entry.lowRank);
    const bestLow = Boolean(player?.lowRank) && lowPlayers.every((entry) => compareLowRank(player.lowRank, entry.lowRank) <= 0);
    return bestHigh || bestLow;
  });
  if (!advantagedHands.length) return 0;
  const realized = advantagedHands.filter((hand) => (
    (hand.net.find((result) => result.id === playerId)?.total ?? 0) > 0
  )).length;
  return Math.round((realized / advantagedHands.length) * 100);
}

export type WalletHistorySeries = {
  playerId: string;
  points: Array<{ handNumber: number; wallet: number }>;
};

export function aggressiveHandPercent(playerId: string, hands: StatisticsHand[]) {
  const participatedHands = hands.filter((hand) => (
    hand.players.some((player) => player.id === playerId && player.participated)
  ));
  if (!participatedHands.length) return 0;

  const aggressiveHands = participatedHands.filter((hand) => (
    hand.actions?.some((action) => (
      action.playerId === playerId && (action.move === 'bet' || action.move === 'raise')
    ))
  )).length;
  return Math.round((aggressiveHands / participatedHands.length) * 100);
}

export type BotStyle = 'aggressive' | 'cautious';

export function botStyle(playerId: string, hands: StatisticsHand[]): BotStyle {
  return aggressiveHandPercent(playerId, hands) >= 50 ? 'aggressive' : 'cautious';
}

export function buildWalletHistory(
  playerIds: string[],
  hands: StatisticsHand[],
): WalletHistorySeries[] {
  const chronologicalHands = [...hands].sort((a, b) => a.handNumber - b.handNumber);
  if (!chronologicalHands.length) return [];

  const firstHand = chronologicalHands[0];
  const initialHandNumber = Math.max(0, firstHand.handNumber - 1);

  return playerIds.map((playerId) => {
    const firstWallet = firstHand.wallets?.find((wallet) => wallet.id === playerId)?.total;
    const firstNet = firstHand.net.find((net) => net.id === playerId)?.total ?? 0;
    let wallet = firstWallet === undefined ? 0 : firstWallet - firstNet;
    const points = [{ handNumber: initialHandNumber, wallet }];

    chronologicalHands.forEach((hand) => {
      const reportedWallet = hand.wallets?.find((item) => item.id === playerId)?.total;
      wallet = reportedWallet ?? wallet + (hand.net.find((item) => item.id === playerId)?.total ?? 0);
      points.push({ handNumber: hand.handNumber, wallet });
    });

    return { playerId, points };
  });
}
