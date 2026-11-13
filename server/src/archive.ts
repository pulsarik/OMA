import {
  DealtHand,
  evaluateOmahaHiLo,
  stacksAfterPayout,
} from './game';

export type ArchiveStackHistory = {
  series: Array<{
    id: string;
    name?: string;
    points: Array<{ handNumber: number; stack: number }>;
  }>;
  completedHands: number;
};

export type ArchiveRow = {
  partyId: string;
  partyCode?: string;
  forkRootCode?: string;
  date: number;
  bots: number;
  humans: number;
  players: number;
  hands: number;
  completedHands: number;
  handsWithLow: number;
  finished: boolean;
  durationMinutes: number;
  lowPercent: number | null;
  lowWins: number;
  combinations: Record<ArchiveCombination, number>;
  evaluatedPlayerHands: number;
  replayCode?: string;
  humanPlayers: { playerId: string; name?: string }[];
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

const MAX_ACTIVE_GAP_MS = 60_000;

export function buildArchiveStackHistory(hands: DealtHand[]): ArchiveStackHistory {
  const orderedHands = [...hands].sort((a, b) => (
    (a.handNumber ?? 1) - (b.handNumber ?? 1) || a.created - b.created || a.id.localeCompare(b.id)
  ));
  const firstHand = orderedHands[0];
  if (!firstHand) return { series: [], completedHands: 0 };

  const humanSeats = firstHand.players
    .map((player, seat) => ({ player, seat }))
    .filter(({ player }) => !player.isBot);
  const firstHandNumber = firstHand.handNumber ?? 1;
  const completedHands = orderedHands.filter(hand => hand.stage === 'showdown');
  const series = humanSeats.map(({ player: firstPlayer, seat }, seriesIndex) => {
    const initialStack = firstHand.initialStacks?.[firstPlayer.id]
      ?? firstPlayer.stack + (firstHand.totalContributions?.[firstPlayer.id] ?? 0);
    const points = [{ handNumber: Math.max(0, firstHandNumber - 1), stack: initialStack }];

    for (const hand of completedHands) {
      const player = hand.players[seat];
      if (!player || player.isBot) continue;
      points.push({
        handNumber: hand.handNumber ?? 1,
        stack: stacksAfterPayout(hand).get(player.id) ?? player.stack,
      });
    }

    return {
      id: `human-${seriesIndex + 1}`,
      name: humanSeats.length === 1 ? firstPlayer.name : undefined,
      points,
    };
  });

  return { series, completedHands: completedHands.length };
}

export function archiveCacheSignature(hands: { id: string }[]) {
  return `archive-v2:${hands.map(hand => hand.id).join('|')}`;
}

function activeDurationMinutes(hands: DealtHand[]) {
  const activityTimes = hands
    .flatMap(hand => [hand.created, ...(hand.actions ?? []).map(action => action.at)])
    .sort((a, b) => a - b);
  const activeDurationMs = activityTimes.slice(1).reduce((total, time, index) => (
    total + Math.min(Math.max(0, time - activityTimes[index]), MAX_ACTIVE_GAP_MS)
  ), 0);
  return activeDurationMs / 60_000;
}

export function refreshCachedArchiveRows(rows: ArchiveRow[], savedHands: DealtHand[]) {
  const metadataByPartyId = new Map<string, { durationMinutes: number; humanPlayers: ArchiveRow['humanPlayers'] }>();
  for (const hands of groupArchiveHands(savedHands)) {
    const orderedHands = [...hands].sort((a, b) => (
      (a.handNumber ?? 1) - (b.handNumber ?? 1) || a.created - b.created || a.id.localeCompare(b.id)
    ));
    const firstHand = orderedHands[0];
    metadataByPartyId.set(firstHand.partyId || firstHand.id, {
      durationMinutes: activeDurationMinutes(orderedHands),
      humanPlayers: firstHand.players
        .filter(player => !player.isBot)
        .map(player => ({ playerId: player.id, name: player.name })),
    });
  }
  return rows.map(row => {
    const metadata = metadataByPartyId.get(row.partyId);
    if (!metadata) throw new Error(`Missing cached archive metadata for party ${row.partyId}`);
    return { ...row, ...metadata };
  });
}

export function createArchiveSummary() {
  return {
    games: 0,
    hands: 0,
    completedHands: 0,
    handsWithLow: 0,
    finishedGames: 0,
    durationMinutes: 0,
    lowWins: 0,
    combinations: Object.fromEntries(COMBINATIONS.map(key => [key, 0])) as Record<ArchiveCombination, number>,
    evaluatedPlayerHands: 0,
  };
}

export function addArchiveRow(summary: ReturnType<typeof createArchiveSummary>, row: ArchiveRow) {
  summary.games += 1;
  summary.hands += row.hands;
  summary.completedHands += row.completedHands;
  summary.handsWithLow += row.handsWithLow;
  summary.finishedGames += Number(row.finished);
  summary.durationMinutes += row.durationMinutes;
  summary.lowWins += row.lowWins;
  summary.evaluatedPlayerHands += row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0);
  for (const key of COMBINATIONS) summary.combinations[key] += row.combinations[key];
}

export function groupArchiveHands<T extends { id: string; partyId?: string; previousHandId?: string }>(savedHands: T[]): T[][] {
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

  const parties = new Map<number, T[]>();
  savedHands.forEach((hand, index) => {
    const root = find(index);
    const partyHands = parties.get(root) ?? [];
    partyHands.push(hand);
    parties.set(root, partyHands);
  });

  return [...parties.values()];
}

export function buildArchiveRows(savedHands: DealtHand[]): ArchiveRow[] {
  return groupArchiveHands(savedHands).map(hands => {
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
    let lowWins = 0;
    let evaluatedPlayerHands = 0;

    for (const hand of completedHands) {
      const result = evaluateOmahaHiLo(hand);
      if (!result) continue;
      if (result.players.some(player => player.lowRank)) handsWithLow += 1;
      if (result.lowWinners.length > 0) lowWins += 1;
      for (const player of result.players) {
        // Count dealt combinations regardless of folds or payouts.
        if (!player.highRank) continue;
        evaluatedPlayerHands += 1;
        const combination = COMBINATION_BY_RANK[player.highRank];
        if (combination) combinations[combination] += 1;
      }
    }

    const latestStacks = stacksAfterPayout(latestHand);
    const remainingPlayers = [...latestStacks.values()].filter(stack => stack > 0).length;
    const rawReplayCode = [...orderedHands].reverse().find(hand => hand.replayCode)?.replayCode;
    const normalizedReplayCode = rawReplayCode?.trim().toUpperCase();
    const replayCode = !firstHand.forkRootCode && normalizedReplayCode && /^[A-Z]{3}\d{3}$/.test(normalizedReplayCode)
      ? normalizedReplayCode
      : undefined;

    return {
      partyId,
      partyCode: firstHand.partyCode,
      forkRootCode: firstHand.forkRootCode,
      date: firstHand.created,
      bots: firstHand.players.filter(player => player.isBot).length,
      humans: firstHand.players.filter(player => !player.isBot).length,
      players: firstHand.players.length,
      hands: orderedHands.length,
      completedHands: completedHands.length,
      handsWithLow,
      finished: Boolean(latestHand.partyFinishedEarly)
        || (latestHand.stage === 'showdown' && remainingPlayers === 1),
      durationMinutes: activeDurationMinutes(orderedHands),
      lowPercent: completedHands.length ? (handsWithLow / completedHands.length) * 100 : null,
      lowWins,
      combinations,
      evaluatedPlayerHands,
      replayCode,
      humanPlayers: firstHand.players
        .filter(player => !player.isBot)
        .map(player => ({ playerId: player.id, name: player.name })),
    };
  }).sort((a, b) => b.date - a.date);
}
