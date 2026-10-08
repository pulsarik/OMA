import {
  DealtHand,
  evaluateOmahaHiLo,
  stacksAfterPayout,
} from './game';

export type ArchiveRow = {
  partyId: string;
  date: number;
  bots: number;
  humans: number;
  players: number;
  hands: number;
  finished: boolean;
  durationMinutes: number;
  lowPercent: number | null;
  lowWins: number;
  combinations: Record<ArchiveCombination, number>;
  replayCode?: string;
};

export type ArchiveCombination =
  | 'straightFlush'
  | 'fourOfAKind'
  | 'fullHouse'
  | 'flush'
  | 'straight'
  | 'threeOfAKind'
  | 'twoPair'
  | 'pair'
  | 'highCard';

const COMBINATION_BY_RANK: Record<string, ArchiveCombination> = {
  'straight flush': 'straightFlush',
  'four of a kind': 'fourOfAKind',
  'full house': 'fullHouse',
  flush: 'flush',
  straight: 'straight',
  'three of a kind': 'threeOfAKind',
  'two pair': 'twoPair',
  pair: 'pair',
  'high card': 'highCard',
};

const COMBINATIONS: ArchiveCombination[] = [
  'straightFlush',
  'fourOfAKind',
  'fullHouse',
  'flush',
  'straight',
  'threeOfAKind',
  'twoPair',
  'pair',
  'highCard',
];

export function buildArchiveRows(savedHands: DealtHand[]): ArchiveRow[] {
  const parent = savedHands.map((_hand, index) => index);
  const find = (index: number): number => {
    if (parent[index] !== index) parent[index] = find(parent[index]);
    return parent[index];
  };
  const union = (left: number, right: number) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[rightRoot] = leftRoot;
  };

  const indexByHandId = new Map(savedHands.map((hand, index) => [hand.id, index]));
  const indexByPartyId = new Map<string, number>();
  savedHands.forEach((hand, index) => {
    const partyId = hand.partyId || hand.id;
    const partyIndex = indexByPartyId.get(partyId);
    if (partyIndex !== undefined) union(partyIndex, index);
    else indexByPartyId.set(partyId, index);

    const previousIndex = hand.previousHandId
      ? indexByHandId.get(hand.previousHandId)
      : undefined;
    if (previousIndex !== undefined) union(previousIndex, index);
  });

  const parties = new Map<number, DealtHand[]>();
  savedHands.forEach((hand, index) => {
    const root = find(index);
    const partyHands = parties.get(root) ?? [];
    partyHands.push(hand);
    parties.set(root, partyHands);
  });

  return [...parties.values()].map(hands => {
    const orderedHands = [...hands].sort((a, b) => (
      (a.handNumber ?? 1) - (b.handNumber ?? 1) || a.created - b.created
    ));
    const firstHand = orderedHands[0];
    const partyId = firstHand.partyId || firstHand.id;
    const latestHand = orderedHands[orderedHands.length - 1];
    const completedHands = orderedHands.filter(hand => hand.stage === 'showdown');
    const combinations = Object.fromEntries(
      COMBINATIONS.map(combination => [combination, 0]),
    ) as Record<ArchiveCombination, number>;
    let handsWithLow = 0;

    for (const hand of completedHands) {
      const result = evaluateOmahaHiLo(hand);
      if (!result) continue;
      if (result.lowWinners.length > 0) handsWithLow += 1;
      for (const player of result.players) {
        // Count dealt combinations regardless of folds or payouts.
        if (!player.highRank) continue;
        const combination = COMBINATION_BY_RANK[player.highRank];
        if (combination) combinations[combination] += 1;
      }
    }

    const latestStacks = stacksAfterPayout(latestHand);
    const remainingPlayers = [...latestStacks.values()].filter(stack => stack > 0).length;
    const lastActivity = orderedHands.reduce((latest, hand) => (
      Math.max(
        latest,
        hand.created,
        ...(hand.actions ?? []).map(action => action.at),
      )
    ), firstHand.created);
    const rawReplayCode = [...orderedHands].reverse().find(hand => hand.replayCode)?.replayCode;
    const normalizedReplayCode = rawReplayCode?.trim().toUpperCase();
    const replayCode = normalizedReplayCode && /^[A-Z]{3}\d{3}$/.test(normalizedReplayCode)
      ? normalizedReplayCode
      : undefined;

    return {
      partyId,
      date: firstHand.created,
      bots: firstHand.players.filter(player => player.isBot).length,
      humans: firstHand.players.filter(player => !player.isBot).length,
      players: firstHand.players.length,
      hands: orderedHands.length,
      finished: Boolean(latestHand.partyFinishedEarly)
        || (latestHand.stage === 'showdown' && remainingPlayers === 1),
      durationMinutes: Math.max(0, (lastActivity - firstHand.created) / 60_000),
      lowPercent: completedHands.length ? (handsWithLow / completedHands.length) * 100 : null,
      lowWins: handsWithLow,
      combinations,
      replayCode,
    };
  }).sort((a, b) => b.date - a.date);
}
