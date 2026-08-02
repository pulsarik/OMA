export type TournamentSeat = {
  id: string;
  stack?: number;
};

export type TournamentTotal = {
  id: string;
  total: number;
};

export function findTournamentWinner<T extends TournamentSeat>(
  stage: string,
  players: T[],
  totals?: TournamentTotal[],
) {
  if (stage !== 'showdown') return undefined;

  const remainingPlayers = players.filter((seat) => {
    const settledStack = totals?.find((total) => total.id === seat.id)?.total;
    return (settledStack ?? seat.stack ?? 0) > 0;
  });

  return remainingPlayers.length === 1 ? remainingPlayers[0] : undefined;
}
