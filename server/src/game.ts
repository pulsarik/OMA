import { v4 as uuidv4 } from 'uuid';

const SUITS = ['s','h','d','c'];
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const CARDS_PER_PLAYER = 4;
const COMMUNITY_CARDS = 5;
export const DEFAULT_BOT_NAMES = ['Alex', 'Maria', 'Ivan', 'Anna', 'Dmitry', 'Elena', 'Pavel', 'Sofia', 'Nikolai', 'Olga'];
export const MAX_PLAYERS = 10;
export const STARTING_STACK = 1000;
export const BLIND_LEVEL_HANDS = 8;
export const INITIAL_SMALL_BLIND = 2;
export const INITIAL_BIG_BLIND = 4;
export const MAX_RAISES_PER_STREET = 3;
export const POT_COINS = INITIAL_SMALL_BLIND + INITIAL_BIG_BLIND;
export const SHUFFLE_VERSION = 'OMA1';
const STAGES = ['preflop', 'flop', 'turn', 'river', 'showdown'] as const;
const RANK_VALUE: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export type GameStage = typeof STAGES[number];
export type PlayerMove = 'check' | 'bet' | 'call' | 'raise' | 'fold';

export type PlayerHand = {
  id: string;
  name?: string;
  isBot?: boolean;
  token: string;
  hole: string[];
  folded: boolean;
  stack: number;
};

export type DealtHand = {
  id: string;
  partyId: string;
  partyCode?: string;
  handCode?: string;
  handNumber: number;
  revision?: number;
  previousHandId?: string;
  enteredPlayerIds?: string[];
  replayOfHandId?: string;
  nextReplayHandId?: string;
  players: PlayerHand[];
  community: string[];
  fullCommunity: string[];
  stage: GameStage;
  currentPlayerId?: string;
  currentBet: number;
  roundBets: Record<string, number>;
  totalContributions: Record<string, number>;
  raiseCount: number;
  blinds: {
    level: number;
    small: number;
    big: number;
    dealerPlayerId?: string;
    smallBlindPlayerId?: string;
    bigBlindPlayerId?: string;
  };
  revealVotes: string[];
  cardsRevealed: boolean;
  actions: Array<{
    playerId: string;
    move: PlayerMove;
    amount?: number;
    stage: GameStage;
    at: number;
  }>;
  rngSeed?: number;
  dealSeed: number;
  dealCode: string;
  potCoins: number;
  nextHandId?: string;
  created: number;
};

export type HiLoResult = {
  potCoins: number;
  highWinners: string[];
  lowWinners: string[];
  noLow: boolean;
  sidePots: Array<{
    amount: number;
    eligiblePlayerIds: string[];
    highWinners: string[];
    lowWinners: string[];
    noLow: boolean;
    uncontestedWinnerId?: string;
    players: Array<{
      id: string;
      contributed?: number;
      high: number;
      low: number;
      payout: number;
      net?: number;
      eligible: boolean;
    }>;
  }>;
  points: Array<{
    id: string;
    high: number;
    low: number;
    uncontested?: number;
    total: number;
  }>;
  players: Array<{
    id: string;
    folded: boolean;
    highCards?: string[];
    highCombo?: ComboCard[];
    highRank?: string;
    lowCards?: string[];
    lowCombo?: ComboCard[];
    lowRank?: string;
  }>;
};

export type PotBreakdown = {
  amount: number;
  eligiblePlayerIds: string[];
};

type ContributionLayer = PotBreakdown & {
  contributions: Record<string, number>;
};

export type ComboCard = {
  code: string;
  source: 'hole' | 'board';
};

export type PlayerCombo = {
  highCards?: string[];
  highCombo?: ComboCard[];
  highRank?: string;
  lowCards?: string[];
  lowCombo?: ComboCard[];
  lowRank?: string;
};

function normalizedPlayerName(name: string | undefined, index: number, isBot: boolean) {
  const baseName = name?.trim() || (isBot ? DEFAULT_BOT_NAMES[index % DEFAULT_BOT_NAMES.length] : '');
  if (!baseName) return undefined;
  return isBot && !baseName.toLowerCase().endsWith('_bot') ? `${baseName}_bot` : baseName;
}

export function blindLevelForHand(handNumber: number) {
  const level = Math.floor((Math.max(handNumber, 1) - 1) / BLIND_LEVEL_HANDS);
  return {
    level,
    small: INITIAL_SMALL_BLIND * (2 ** level),
    big: INITIAL_BIG_BLIND * (2 ** level),
  };
}

export function normalizeHand(hand: DealtHand) {
  hand.partyId = hand.partyId ?? hand.id;
  hand.handNumber = hand.handNumber ?? 1;
  hand.revision = hand.revision ?? 0;
  hand.fullCommunity = hand.fullCommunity ?? hand.community ?? [];
  hand.stage = hand.stage ?? 'showdown';
  hand.community = visibleCommunity(hand);
  hand.actions = hand.actions ?? [];
  hand.revealVotes = hand.revealVotes ?? [];
  hand.cardsRevealed = Boolean(hand.cardsRevealed);
  hand.potCoins = hand.potCoins ?? POT_COINS;
  hand.currentBet = hand.currentBet ?? 0;
  hand.roundBets = hand.roundBets ?? {};
  hand.totalContributions = hand.totalContributions ?? legacyContributions(hand);
  hand.raiseCount = hand.raiseCount ?? 0;
  hand.blinds = hand.blinds ?? { ...blindLevelForHand(hand.handNumber) };
  hand.dealSeed = normalizeSeed(hand.dealSeed ?? hand.rngSeed);
  hand.dealCode = hand.dealCode ?? dealCodeFor(hand.players?.length ?? 0, hand.dealSeed);
  hand.players.forEach((player, index) => {
    player.folded = Boolean(player.folded);
    player.isBot = Boolean(player.isBot);
    player.name = normalizedPlayerName(player.name, index, player.isBot);
    player.stack = Math.max(0, player.stack ?? STARTING_STACK);
  });
  hand.blinds.dealerPlayerId = hand.blinds.dealerPlayerId ?? inferredDealerPlayer(hand)?.id;
  if (hand.stage === 'showdown') {
    hand.cardsRevealed = true;
    hand.revealVotes = hand.players.map(player => player.id);
  }
  if (hand.stage !== 'showdown' && !hand.currentPlayerId) {
    hand.currentPlayerId = firstActivePlayer(hand)?.id;
  }
  return hand;
}

function legacyContributions(hand: DealtHand) {
  const totals: Record<string, number> = {};
  const streetTotals = new Map<string, number>();

  (hand.actions ?? []).forEach(action => {
    if (typeof action.amount !== 'number') return;
    const key = `${action.stage}:${action.playerId}`;
    streetTotals.set(key, Math.max(streetTotals.get(key) ?? 0, action.amount));
  });
  streetTotals.forEach((amount, key) => {
    const playerId = key.slice(key.indexOf(':') + 1);
    totals[playerId] = (totals[playerId] ?? 0) + amount;
  });

  Object.entries(hand.roundBets ?? {}).forEach(([playerId, amount]) => {
    const actionAmount = streetTotals.get(`${hand.stage}:${playerId}`) ?? 0;
    totals[playerId] = (totals[playerId] ?? 0) + Math.max(amount - actionAmount, 0);
  });

  const smallBlindId = hand.blinds?.smallBlindPlayerId;
  const bigBlindId = hand.blinds?.bigBlindPlayerId;
  if (smallBlindId) totals[smallBlindId] = Math.max(totals[smallBlindId] ?? 0, Math.min(hand.blinds.small, hand.potCoins));
  if (bigBlindId) totals[bigBlindId] = Math.max(totals[bigBlindId] ?? 0, Math.min(hand.blinds.big, hand.potCoins));
  return totals;
}

function contributionLayers(hand: DealtHand): ContributionLayer[] {
  const levels = [...new Set(
    Object.values(hand.totalContributions).filter(amount => amount > 0),
  )].sort((a, b) => a - b);
  const activePlayerIds = hand.players.filter(player => !player.folded).map(player => player.id);
  let previousLevel = 0;

  const rawLayers = levels.map(level => {
    const contributors = hand.players.filter(player => (
      (hand.totalContributions[player.id] ?? 0) >= level
    ));
    const eligibleAtLevel = hand.players
      .filter(player => !player.folded && (hand.totalContributions[player.id] ?? 0) >= level)
      .map(player => player.id);
    const eligiblePlayerIds = eligibleAtLevel.length ? eligibleAtLevel : activePlayerIds;
    const contributionPerPlayer = level - previousLevel;
    const contributions = Object.fromEntries(
      contributors.map(player => [player.id, contributionPerPlayer]),
    );
    const amount = contributionPerPlayer * contributors.length;
    previousLevel = level;
    return { amount, eligiblePlayerIds, contributions };
  });

  const layers = rawLayers.reduce<ContributionLayer[]>((pots, layer) => {
    const previous = pots[pots.length - 1];
    const sameEligibility = previous
      && previous.eligiblePlayerIds.length === layer.eligiblePlayerIds.length
      && previous.eligiblePlayerIds.every((id, index) => id === layer.eligiblePlayerIds[index]);

    if (sameEligibility) {
      previous.amount += layer.amount;
      Object.entries(layer.contributions).forEach(([id, amount]) => {
        previous.contributions[id] = (previous.contributions[id] ?? 0) + amount;
      });
    } else {
      pots.push({
        ...layer,
        eligiblePlayerIds: [...layer.eligiblePlayerIds],
        contributions: { ...layer.contributions },
      });
    }
    return pots;
  }, []);

  // Legacy or malformed action history can reconstruct more contributions than
  // the stored pot contains. Remove that excess from the outermost side pots
  // first so the breakdown and settlement can never create chips.
  let excess = layers.reduce((sum, layer) => sum + layer.amount, 0) - hand.potCoins;
  for (let index = layers.length - 1; index >= 0 && excess > 0; index -= 1) {
    const layer = layers[index];
    const reduction = Math.min(excess, layer.amount);
    const remaining = layer.amount - reduction;
    const scale = layer.amount > 0 ? remaining / layer.amount : 0;
    Object.keys(layer.contributions).forEach(playerId => {
      layer.contributions[playerId] *= scale;
    });
    layer.amount = remaining;
    excess -= reduction;
  }

  return layers.filter(layer => layer.amount > 0);
}

export function currentPotBreakdown(hand: DealtHand): PotBreakdown[] {
  normalizeHand(hand);
  const layers = contributionLayers(hand);
  const hasAllInContender = hand.players.some(player => !player.folded && player.stack === 0);

  if (!hasAllInContender || layers.length <= 1) {
    return [{
      amount: hand.potCoins,
      eligiblePlayerIds: hand.players.filter(player => !player.folded).map(player => player.id),
    }];
  }

  const tracked = layers.reduce((sum, layer) => sum + layer.amount, 0);
  if (tracked < hand.potCoins) {
    layers[0].amount += hand.potCoins - tracked;
  }
  return layers.map(({ amount, eligiblePlayerIds }) => ({ amount, eligiblePlayerIds }));
}

export function visibleCommunity(hand: Pick<DealtHand, 'fullCommunity' | 'community' | 'stage'>) {
  const fullCommunity = hand.fullCommunity ?? hand.community;
  if (hand.stage === 'preflop') return [];
  if (hand.stage === 'flop') return fullCommunity.slice(0, 3);
  if (hand.stage === 'turn') return fullCommunity.slice(0, 4);
  return fullCommunity.slice(0, 5);
}

export function nextStage(stage: GameStage): GameStage {
  const index = STAGES.indexOf(stage);
  return STAGES[Math.min(index + 1, STAGES.length - 1)];
}

function activePlayers(hand: DealtHand) {
  return hand.players.filter(p => !p.folded);
}

function actingPlayers(hand: DealtHand) {
  return activePlayers(hand).filter(p => p.stack > 0);
}

function firstActivePlayer(hand: DealtHand) {
  return actingPlayers(hand)[0] ?? activePlayers(hand)[0];
}

function inferredDealerPlayer(hand: DealtHand) {
  const smallBlindPlayerId = hand.blinds.smallBlindPlayerId;
  if (!smallBlindPlayerId) return undefined;

  const dealtPlayers = hand.players.filter(player => (
    player.stack > 0 || (hand.totalContributions[player.id] ?? 0) > 0
  ));
  const smallBlindIndex = dealtPlayers.findIndex(player => player.id === smallBlindPlayerId);
  if (smallBlindIndex === -1) return undefined;
  if (dealtPlayers.length === 2) return dealtPlayers[smallBlindIndex];
  return dealtPlayers[(smallBlindIndex - 1 + dealtPlayers.length) % dealtPlayers.length];
}

function firstPostflopPlayer(hand: DealtHand) {
  const dealerPlayerId = hand.blinds.dealerPlayerId;
  if (!dealerPlayerId) return firstActivePlayer(hand);
  return nextActivePlayerAfter(hand, dealerPlayerId);
}

function nextActivePlayerAfter(hand: DealtHand, playerId: string) {
  if (!actingPlayers(hand).length) return undefined;

  const currentIndex = hand.players.findIndex(player => player.id === playerId);
  if (currentIndex === -1) return firstActivePlayer(hand);

  for (let offset = 1; offset <= hand.players.length; offset += 1) {
    const candidate = hand.players[(currentIndex + offset) % hand.players.length];
    if (!candidate.folded && candidate.stack > 0) return candidate;
  }
  return undefined;
}

function playerNeedsAction(hand: DealtHand, playerId: string, actedPlayers: Set<string>) {
  const player = hand.players.find(p => p.id === playerId);
  if (!player || player.stack <= 0) return false;
  const playerBet = hand.roundBets[playerId] ?? 0;
  return !actedPlayers.has(playerId) || playerBet < hand.currentBet;
}

function resetBettingRound(hand: DealtHand) {
  hand.currentBet = 0;
  hand.roundBets = {};
  hand.raiseCount = 0;
}

function returnUncalledBet(hand: DealtHand) {
  const bets = hand.players
    .map(player => ({ player, amount: hand.roundBets[player.id] ?? 0 }))
    .sort((a, b) => b.amount - a.amount);
  const highest = bets[0];
  const matchedAmount = bets[1]?.amount ?? 0;

  if (!highest || highest.amount <= matchedAmount) return;

  const returned = highest.amount - matchedAmount;
  highest.player.stack += returned;
  hand.roundBets[highest.player.id] = matchedAmount;
  hand.totalContributions[highest.player.id] = Math.max(
    (hand.totalContributions[highest.player.id] ?? 0) - returned,
    0,
  );
  hand.potCoins = Math.max(hand.potCoins - returned, 0);
}

function finishHand(hand: DealtHand) {
  returnUncalledBet(hand);
  hand.stage = 'showdown';
  hand.currentPlayerId = undefined;
  resetBettingRound(hand);
  hand.community = visibleCommunity(hand);
  hand.cardsRevealed = true;
  hand.revealVotes = hand.players.map(player => player.id);
}

function setNextTurnOrAdvance(hand: DealtHand, playerId: string) {
  const active = activePlayers(hand);
  const acting = actingPlayers(hand);
  const actedPlayers = new Set(
    hand.actions
      .filter(action => action.stage === hand.stage)
      .map(action => action.playerId),
  );

  if (active.length <= 1 || acting.length === 0) {
    finishHand(hand);
    return;
  }

  if (acting.length === 1 && !playerNeedsAction(hand, acting[0].id, actedPlayers)) {
    finishHand(hand);
    return;
  }

  if (active.every(p => !playerNeedsAction(hand, p.id, actedPlayers))) {
    returnUncalledBet(hand);
    hand.stage = nextStage(hand.stage);
    resetBettingRound(hand);
    hand.currentPlayerId = hand.stage === 'showdown' ? undefined : firstPostflopPlayer(hand)?.id;
    hand.community = visibleCommunity(hand);
    if (hand.stage === 'showdown') {
      hand.cardsRevealed = true;
      hand.revealVotes = hand.players.map(player => player.id);
    }
    return;
  }

  let next = nextActivePlayerAfter(hand, playerId);
  while (next && !playerNeedsAction(hand, next.id, actedPlayers)) {
    next = nextActivePlayerAfter(hand, next.id);
  }
  hand.currentPlayerId = next?.id;
}

function normalizedBetAmount(amount: unknown) {
  return typeof amount === 'number' && Number.isFinite(amount) ? Math.floor(amount) : undefined;
}

export function recordPlayerMove(hand: DealtHand, playerId: string, move: PlayerMove, amount?: number) {
  normalizeHand(hand);

  if (hand.stage === 'showdown') {
    throw new Error('hand is already at showdown');
  }

  const player = hand.players.find(p => p.id === playerId);
  if (!player) throw new Error('player not found');
  if (player.folded) throw new Error('player already folded');
  if (player.stack <= 0) throw new Error('player is all in');
  if (hand.currentPlayerId !== playerId) throw new Error('not your turn');

  const actingPlayer = player;
  const playerBet = hand.roundBets[playerId] ?? 0;
  const betUnit = hand.blinds?.big ?? INITIAL_BIG_BLIND;
  const requestedBet = normalizedBetAmount(amount);

  function addToPot(amount: number) {
    const paid = Math.min(amount, actingPlayer.stack);
    actingPlayer.stack -= paid;
    hand.roundBets[playerId] = (hand.roundBets[playerId] ?? 0) + paid;
    hand.totalContributions[playerId] = (hand.totalContributions[playerId] ?? 0) + paid;
    hand.potCoins += paid;
    return paid;
  }

  if (move === 'check') {
    if (playerBet < hand.currentBet) throw new Error('call or fold required');
  } else if (move === 'bet') {
    if (hand.currentBet !== 0) throw new Error('bet is only allowed before a bet is open');
    const maxBet = Math.min(actingPlayer.stack, Math.max(hand.potCoins, betUnit));
    const targetBet = Math.min(Math.max(requestedBet ?? betUnit, Math.min(betUnit, actingPlayer.stack)), maxBet);
    const paid = addToPot(targetBet);
    hand.currentBet = playerBet + paid;
  } else if (move === 'call') {
    if (playerBet >= hand.currentBet) throw new Error('nothing to call');
    addToPot(hand.currentBet - playerBet);
  } else if (move === 'raise') {
    if (hand.currentBet === 0) throw new Error('raise requires an open bet');
    if (hand.raiseCount >= MAX_RAISES_PER_STREET) throw new Error('raise cap reached');
    const callAmount = Math.max(hand.currentBet - playerBet, 0);
    if (actingPlayer.stack <= callAmount) throw new Error('insufficient chips to raise');
    const maxRaiseTo = Math.min(playerBet + actingPlayer.stack, hand.currentBet + hand.potCoins + callAmount);
    const minRaiseTo = Math.min(hand.currentBet + betUnit, maxRaiseTo);
    const nextBet = Math.min(Math.max(requestedBet ?? minRaiseTo, minRaiseTo), maxRaiseTo);
    addToPot(nextBet - playerBet);
    hand.currentBet = nextBet;
    hand.raiseCount += 1;
  }

  hand.actions.push({
    playerId,
    move,
    amount: ['bet', 'call', 'raise'].includes(move) ? hand.roundBets[playerId] : undefined,
    stage: hand.stage,
    at: Date.now(),
  });

  if (move === 'fold') {
    player.folded = true;
  }

  setNextTurnOrAdvance(hand, playerId);
  hand.revision = (hand.revision ?? 0) + 1;

  return hand;
}

function combinations<T>(items: T[], count: number): T[][] {
  if (count === 0) return [[]];
  if (items.length < count) return [];

  const [first, ...rest] = items;
  return [
    ...combinations(rest, count - 1).map(combo => [first, ...combo]),
    ...combinations(rest, count),
  ];
}

function cardRank(card: string) {
  return card.slice(0, -1).toUpperCase();
}

function cardSuit(card: string) {
  return card.slice(-1).toLowerCase();
}

function rankValue(card: string) {
  return RANK_VALUE[cardRank(card)];
}

function compareScore(a: number[], b: number[]) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function straightHigh(values: number[]) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);

  for (let i = 0; i <= unique.length - 5; i++) {
    const window = unique.slice(i, i + 5);
    if (window[0] - window[4] === 4) return window[0];
  }

  return 0;
}

function comboCodes(cards: Array<string | ComboCard>) {
  return cards.map(card => typeof card === 'string' ? card : card.code);
}

function evaluateHighFive(cards: ComboCard[]) {
  const codes = comboCodes(cards);
  const values = codes.map(rankValue).sort((a, b) => b - a);
  const flush = codes.every(card => cardSuit(card) === cardSuit(codes[0]));
  const straight = straightHigh(values);
  const counts = new Map<number, number>();

  values.forEach(value => counts.set(value, (counts.get(value) ?? 0) + 1));
  const grouped = [...counts.entries()].sort((a, b) => {
    const countDiff = b[1] - a[1];
    return countDiff || b[0] - a[0];
  });

  if (flush && straight) return { score: [8, straight], rank: 'straight flush', cards };
  if (grouped[0][1] === 4) {
    const kicker = grouped.find(([, count]) => count === 1)?.[0] ?? 0;
    return { score: [7, grouped[0][0], kicker], rank: 'four of a kind', cards };
  }
  if (grouped[0][1] === 3 && grouped[1]?.[1] === 2) {
    return { score: [6, grouped[0][0], grouped[1][0]], rank: 'full house', cards };
  }
  if (flush) return { score: [5, ...values], rank: 'flush', cards };
  if (straight) return { score: [4, straight], rank: 'straight', cards };
  if (grouped[0][1] === 3) {
    const kickers = grouped.filter(([, count]) => count === 1).map(([value]) => value).sort((a, b) => b - a);
    return { score: [3, grouped[0][0], ...kickers], rank: 'three of a kind', cards };
  }
  if (grouped[0][1] === 2 && grouped[1]?.[1] === 2) {
    const pairs = grouped.filter(([, count]) => count === 2).map(([value]) => value).sort((a, b) => b - a);
    const kicker = grouped.find(([, count]) => count === 1)?.[0] ?? 0;
    return { score: [2, ...pairs, kicker], rank: 'two pair', cards };
  }
  if (grouped[0][1] === 2) {
    const kickers = grouped.filter(([, count]) => count === 1).map(([value]) => value).sort((a, b) => b - a);
    return { score: [1, grouped[0][0], ...kickers], rank: 'pair', cards };
  }

  return { score: [0, ...values], rank: 'high card', cards };
}

function lowValue(card: string) {
  const value = rankValue(card);
  return value === 14 ? 1 : value;
}

function evaluateLowFive(cards: ComboCard[]) {
  const values = comboCodes(cards).map(lowValue);
  const unique = new Set(values);
  if (unique.size !== 5 || values.some(value => value > 8)) return undefined;

  const score = [...unique].sort((a, b) => b - a);
  return {
    score,
    rank: score.join('-'),
    cards,
  };
}

function bestOmahaHands(hole: string[], board: string[]) {
  const holeCombos = combinations(hole.map(code => ({ code, source: 'hole' as const })), 2);
  const boardCombos = combinations(board.map(code => ({ code, source: 'board' as const })), 3);
  let bestHigh: ReturnType<typeof evaluateHighFive> | undefined;
  let bestLow: ReturnType<typeof evaluateLowFive> | undefined;

  for (const holeCombo of holeCombos) {
    for (const boardCombo of boardCombos) {
      const cards = [...holeCombo, ...boardCombo];
      const high = evaluateHighFive(cards);
      const low = evaluateLowFive(cards);

      if (!bestHigh || compareScore(high.score, bestHigh.score) > 0) {
        bestHigh = high;
      }
      if (low && (!bestLow || compareScore(low.score, bestLow.score) < 0)) {
        bestLow = low;
      }
    }
  }

  return { high: bestHigh, low: bestLow };
}

export function evaluatePlayerCombo(hole: string[], board: string[]): PlayerCombo | undefined {
  if (board.length < 3) return undefined;

  const best = bestOmahaHands(hole, board);
  return {
    highCards: best.high?.cards.map(card => card.code),
    highCombo: best.high?.cards,
    highRank: best.high?.rank,
    lowCards: best.low?.cards.map(card => card.code),
    lowCombo: best.low?.cards,
    lowRank: best.low?.rank,
  };
}

export function evaluateOmahaHiLo(hand: DealtHand): HiLoResult | undefined {
  normalizeHand(hand);
  if (hand.fullCommunity.length < 5) return undefined;

  const contenders = hand.players.filter(player => !player.folded);
  const playerResults = hand.players.map(player => {
    const best = bestOmahaHands(player.hole, hand.fullCommunity);
    return {
      id: player.id,
      folded: player.folded,
      highCards: best.high?.cards.map(card => card.code),
      highCombo: best.high?.cards,
      highRank: best.high?.rank,
      lowCards: best.low?.cards.map(card => card.code),
      lowCombo: best.low?.cards,
      lowRank: best.low?.rank,
      highScore: best.high?.score,
      lowScore: best.low?.score,
    };
  });

  const contributions = hand.totalContributions;
  const layers = contributionLayers(hand);
  const pointTotals = new Map(hand.players.map(player => [player.id, { high: 0, low: 0, uncontested: 0 }]));
  const sidePots: HiLoResult['sidePots'] = layers.map(layer => {
    const { amount } = layer;
    let eligibleResults = playerResults.filter(result => (
      layer.eligiblePlayerIds.includes(result.id)
    ));
    // A legacy or malformed hand can contain unmatched chips from a player who
    // later folded. Keep those chips payable instead of silently losing them.
    if (!eligibleResults.length) {
      eligibleResults = playerResults.filter(result => !result.folded);
    }

    if (eligibleResults.length === 1) {
      const winnerId = eligibleResults[0].id;
      const points = pointTotals.get(winnerId);
      if (points) points.uncontested += amount;
      return {
        amount,
        eligiblePlayerIds: [winnerId],
        highWinners: [],
        lowWinners: [],
        noLow: true,
        uncontestedWinnerId: winnerId,
        players: hand.players.map(player => {
          const contributed = layer.contributions[player.id] ?? 0;
          const payout = player.id === winnerId ? amount : 0;
          return {
            id: player.id,
            contributed,
            high: 0,
            low: 0,
            payout,
            net: payout - contributed,
            eligible: player.id === winnerId,
          };
        }),
      };
    }

    const bestHighScore = eligibleResults
      .map(result => result.highScore)
      .filter((score): score is number[] => Boolean(score))
      .sort((a, b) => compareScore(b, a))[0];
    const bestLowScore = eligibleResults
      .map(result => result.lowScore)
      .filter((score): score is number[] => Boolean(score))
      .sort(compareScore)[0];
    const highWinners = bestHighScore
      ? eligibleResults.filter(result => result.highScore && compareScore(result.highScore, bestHighScore) === 0).map(result => result.id)
      : eligibleResults.map(result => result.id);
    const lowWinners = bestLowScore
      ? eligibleResults.filter(result => result.lowScore && compareScore(result.lowScore, bestLowScore) === 0).map(result => result.id)
      : [];
    const noLow = !bestLowScore;
    const highPool = noLow ? amount : amount / 2;
    const lowPool = noLow ? 0 : amount / 2;
    const highShare = highWinners.length ? highPool / highWinners.length : 0;
    const lowShare = lowWinners.length ? lowPool / lowWinners.length : 0;
    highWinners.forEach(id => {
      const points = pointTotals.get(id);
      if (points) points.high += highShare;
    });
    lowWinners.forEach(id => {
      const points = pointTotals.get(id);
      if (points) points.low += lowShare;
    });
    return {
      amount,
      eligiblePlayerIds: eligibleResults.map(result => result.id),
      highWinners,
      lowWinners,
      noLow,
      players: hand.players.map(player => {
        const contributed = layer.contributions[player.id] ?? 0;
        const high = highWinners.includes(player.id) ? highShare : 0;
        const low = lowWinners.includes(player.id) ? lowShare : 0;
        const payout = high + low;
        return {
          id: player.id,
          contributed,
          high,
          low,
          payout,
          net: payout - contributed,
          eligible: eligibleResults.some(result => result.id === player.id),
        };
      }),
    };
  });

  // Hands created before contribution tracking may not contain enough history
  // to reconstruct the pot. Preserve their previous whole-pot settlement.
  const trackedPot = sidePots.reduce((sum, pot) => sum + pot.amount, 0);
  if (trackedPot < hand.potCoins && contenders.length) {
    const remainder = hand.potCoins - trackedPot;
    const activeResults = playerResults.filter(result => !result.folded);
    if (activeResults.length === 1) {
      const winnerId = activeResults[0].id;
      pointTotals.get(winnerId)!.uncontested += remainder;
      sidePots.push({
        amount: remainder,
        eligiblePlayerIds: [winnerId],
        highWinners: [],
        lowWinners: [],
        noLow: true,
        uncontestedWinnerId: winnerId,
        players: hand.players.map(player => ({
          id: player.id,
          high: 0,
          low: 0,
          payout: player.id === winnerId ? remainder : 0,
          eligible: player.id === winnerId,
        })),
      });
    } else {
      const bestHighScore = activeResults
        .map(result => result.highScore)
        .filter((score): score is number[] => Boolean(score))
        .sort((a, b) => compareScore(b, a))[0];
      const bestLowScore = activeResults
        .map(result => result.lowScore)
        .filter((score): score is number[] => Boolean(score))
        .sort(compareScore)[0];
      const highWinners = bestHighScore
        ? activeResults.filter(result => result.highScore && compareScore(result.highScore, bestHighScore) === 0).map(result => result.id)
        : contenders.map(player => player.id);
      const lowWinners = bestLowScore
        ? activeResults.filter(result => result.lowScore && compareScore(result.lowScore, bestLowScore) === 0).map(result => result.id)
        : [];
      const noLow = !bestLowScore;
      const highPool = noLow ? remainder : remainder / 2;
      highWinners.forEach(id => pointTotals.get(id)!.high += highPool / highWinners.length);
      lowWinners.forEach(id => pointTotals.get(id)!.low += (remainder / 2) / lowWinners.length);
      sidePots.push({
        amount: remainder,
        eligiblePlayerIds: activeResults.map(result => result.id),
        highWinners,
        lowWinners,
        noLow,
        players: hand.players.map(player => {
          const high = highWinners.includes(player.id) ? highPool / highWinners.length : 0;
          const low = lowWinners.includes(player.id) ? (remainder / 2) / lowWinners.length : 0;
          return {
            id: player.id,
            high,
            low,
            payout: high + low,
            eligible: activeResults.some(result => result.id === player.id),
          };
        }),
      });
    }
  }

  // A layer funded by only one player is an uncalled-chip return, not a won
  // poker pot. Keep its payout for legacy hands, but do not show that player as
  // a HIGH/LOW winner merely for receiving their own chips back.
  const contestedPots = sidePots.filter(pot => (
    pot.players.filter(player => (player.contributed ?? 0) > 0).length > 1
  ));
  const winnerPots = contestedPots.length ? contestedPots : sidePots;
  const highWinners = [...new Set(winnerPots.flatMap(pot => pot.highWinners))];
  const lowWinners = [...new Set(winnerPots.flatMap(pot => pot.lowWinners))];
  const noLow = winnerPots.every(pot => pot.noLow);

  return {
    potCoins: hand.potCoins,
    highWinners,
    lowWinners,
    noLow,
    sidePots,
    points: hand.players.map(player => {
      const high = pointTotals.get(player.id)?.high ?? 0;
      const low = pointTotals.get(player.id)?.low ?? 0;
      return {
        id: player.id,
        high,
        low,
        ...(pointTotals.get(player.id)?.uncontested
          ? { uncontested: pointTotals.get(player.id)!.uncontested }
          : {}),
        total: high + low + (pointTotals.get(player.id)?.uncontested ?? 0),
      };
    }),
    players: playerResults.map(({ highScore, lowScore, ...result }) => result),
  };
}

export function createDeck() {
  const deck: string[] = [];
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
  return deck;
}

function normalizeSeed(seed?: number) {
  return (seed ?? Date.now()) >>> 0;
}

export function shuffle(seed?: number) {
  let x = normalizeSeed(seed);
  return () => {
    x = (x + 0x6D2B79F5) >>> 0;
    let t = x;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dealCodeFor(players: number, seed: number) {
  return `${SHUFFLE_VERSION}-P${players}-S${normalizeSeed(seed).toString(36).toUpperCase()}`;
}

export function parseDealCode(dealCode: string) {
  const match = /^OMA1-P(\d+)-S([0-9A-Z]+)$/i.exec(dealCode.trim());
  if (!match) throw new Error('invalid deal code');
  const players = Number(match[1]);
  const seed = Number.parseInt(match[2], 36) >>> 0;
  if (!Number.isInteger(players) || players < 1) throw new Error('invalid player count in deal code');
  return { version: SHUFFLE_VERSION, players, seed };
}

function payFromStack(player: PlayerHand, amount: number) {
  const paid = Math.min(Math.max(amount, 0), player.stack);
  player.stack -= paid;
  return paid;
}

function applyBlinds(hand: DealtHand) {
  const blindInfo = blindLevelForHand(hand.handNumber);
  const livePlayers = hand.players.filter(player => player.stack > 0);
  hand.blinds = {
    ...blindInfo,
    smallBlindPlayerId: livePlayers[0]?.id,
    bigBlindPlayerId: livePlayers[Math.min(1, livePlayers.length - 1)]?.id,
  };
  hand.potCoins = 0;
  hand.roundBets = {};
  hand.totalContributions = {};
  hand.currentBet = 0;
  hand.raiseCount = 0;

  if (livePlayers.length >= 2) {
    const smallBlindIndex = (hand.handNumber - 1) % livePlayers.length;
    const bigBlindIndex = (smallBlindIndex + 1) % livePlayers.length;
    const smallBlind = livePlayers[smallBlindIndex];
    const bigBlind = livePlayers[bigBlindIndex];
    const dealer = livePlayers.length === 2
      ? smallBlind
      : livePlayers[(smallBlindIndex - 1 + livePlayers.length) % livePlayers.length];
    const smallPaid = payFromStack(smallBlind, blindInfo.small);
    const bigPaid = payFromStack(bigBlind, blindInfo.big);

    hand.blinds.dealerPlayerId = dealer.id;
    hand.blinds.smallBlindPlayerId = smallBlind.id;
    hand.blinds.bigBlindPlayerId = bigBlind.id;
    hand.roundBets[smallBlind.id] = smallPaid;
    hand.roundBets[bigBlind.id] = bigPaid;
    hand.totalContributions[smallBlind.id] = smallPaid;
    hand.totalContributions[bigBlind.id] = bigPaid;
    hand.potCoins = smallPaid + bigPaid;
    hand.currentBet = Math.max(smallPaid, bigPaid);
    hand.currentPlayerId = nextActivePlayerAfter(hand, bigBlind.id)?.id ?? firstActivePlayer(hand)?.id;
  } else {
    hand.potCoins = 0;
    finishHand(hand);
  }
}

export function stacksAfterPayout(hand: DealtHand) {
  normalizeHand(hand);
  const stacks = new Map(hand.players.map(player => [player.id, player.stack]));
  if (hand.stage !== 'showdown') return stacks;

  const result = evaluateOmahaHiLo(hand);
  result?.points.forEach(score => {
    stacks.set(score.id, (stacks.get(score.id) ?? 0) + score.total);
  });

  return stacks;
}

export function netResultsAfterPayout(hand: DealtHand, startingStacks: Map<string, number>) {
  const settledStacks = stacksAfterPayout(hand);
  return hand.players.map((player) => ({
    id: player.id,
    total: (settledStacks.get(player.id) ?? 0) - (startingStacks.get(player.id) ?? STARTING_STACK),
  }));
}

export function dealHand(players = 2, rngSeed?: number, playerNames: string[] = [], playerBots: boolean[] = []): DealtHand {
  if (!Number.isInteger(players) || players < 1) {
    throw new Error('players must be a positive integer');
  }
  if (players > MAX_PLAYERS) {
    throw new Error(`table supports at most ${MAX_PLAYERS} players`);
  }
  if (players * CARDS_PER_PLAYER + COMMUNITY_CARDS > 52) {
    throw new Error('too many players for one deck');
  }

  const dealSeed = normalizeSeed(rngSeed);
  const deck = createDeck();
  const rand = shuffle(dealSeed);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const playersHands: PlayerHand[] = [];
  for (let p = 0; p < players; p++) {
    const isBot = Boolean(playerBots[p]);
    playersHands.push({
      id: `P${p+1}`,
      name: normalizedPlayerName(playerNames[p], p, isBot),
      token: uuidv4(),
      hole: deck.splice(0, CARDS_PER_PLAYER),
      folded: false,
      isBot,
      stack: STARTING_STACK,
    });
  }
  const fullCommunity = deck.splice(0, COMMUNITY_CARDS);
  const hand = {
    id: uuidv4(),
    partyId: uuidv4(),
    handNumber: 1,
    revision: 0,
    players: playersHands,
    community: [],
    fullCommunity,
    stage: 'preflop' as GameStage,
    currentPlayerId: undefined,
    currentBet: 0,
    roundBets: {},
    totalContributions: {},
    raiseCount: 0,
    blinds: { ...blindLevelForHand(1) },
    revealVotes: [],
    cardsRevealed: false,
    actions: [],
    rngSeed: dealSeed,
    dealSeed,
    dealCode: dealCodeFor(players, dealSeed),
    potCoins: 0,
    created: Date.now(),
  };
  applyBlinds(hand);
  return hand;
}

export function dealHandFromCode(dealCode: string, playerNames: string[] = []) {
  const parsed = parseDealCode(dealCode);
  return dealHand(parsed.players, parsed.seed, playerNames);
}

export function nextPartyHand(previous: DealtHand): DealtHand {
  normalizeHand(previous);
  const hand = dealHand(
    previous.players.length,
    undefined,
    previous.players.map(player => player.name ?? ''),
    previous.players.map(player => Boolean(player.isBot)),
  );
  hand.partyId = previous.partyId;
  hand.partyCode = previous.partyCode;
  hand.handNumber = previous.handNumber + 1;
  hand.previousHandId = previous.id;
  hand.blinds = { ...blindLevelForHand(hand.handNumber) };
  const stacks = stacksAfterPayout(previous);
  hand.players = hand.players.map((player, index) => ({
    ...player,
    id: previous.players[index]?.id ?? player.id,
    isBot: Boolean(previous.players[index]?.isBot),
    stack: stacks.get(previous.players[index]?.id ?? player.id) ?? STARTING_STACK,
    folded: (stacks.get(previous.players[index]?.id ?? player.id) ?? STARTING_STACK) <= 0,
  }));
  hand.enteredPlayerIds = hand.players.filter(player => player.isBot).map(player => player.id);
  applyBlinds(hand);
  return hand;
}

export function replayHandLayout(source: DealtHand): DealtHand {
  normalizeHand(source);
  const hand = dealHand(source.players.length);
  hand.partyId = source.partyId;
  hand.partyCode = source.partyCode;
  hand.handNumber = source.handNumber + 1;
  hand.previousHandId = source.id;
  hand.replayOfHandId = source.id;
  hand.players = source.players.map((player) => ({
    id: player.id,
    name: player.name,
    isBot: Boolean(player.isBot),
    token: uuidv4(),
    hole: [...player.hole],
    folded: false,
    stack: player.stack,
  }));
  hand.community = [];
  hand.fullCommunity = [...source.fullCommunity];
  hand.enteredPlayerIds = hand.players.filter(player => player.isBot).map(player => player.id);
  applyBlinds(hand);
  return hand;
}
