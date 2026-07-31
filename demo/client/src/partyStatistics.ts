export type StatisticsHand = {
  handNumber: number;
  players: Array<{ id: string; participated: boolean }>;
  net: Array<{ id: string; total: number }>;
  wallets?: Array<{ id: string; total: number }>;
  actions?: Array<{ playerId: string; move: string }>;
};

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
