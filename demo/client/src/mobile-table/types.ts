// Read-only view contract. No dealing, scoring or betting rules live here.
export type Language = 'ru' | 'en';
export type Move = 'check' | 'call' | 'bet' | 'raise' | 'fold';
export type BetSize = 'blind' | 'quarter' | 'half' | 'pot';
export type ComboCard = { code: string; source: 'hole' | 'board' };
export type Combination = {
  highRank?: string; lowRank?: string;
  highCombo?: ComboCard[]; lowCombo?: ComboCard[];
};
export type Seat = {
  id: string; name?: string; stack?: number; isBot?: boolean;
  folded: boolean; cardCount: number; hole?: string[];
  connected?: boolean; disconnected?: boolean;
};
export type Payout = { id: string; high: number; low: number; total: number; uncontested?: number };
export type Summary = {
  highWinners: string[]; lowWinners: string[]; noLow: boolean;
  points: Payout[];
  sidePots: Array<{
    amount: number; eligiblePlayerIds: string[];
    highWinners: string[]; lowWinners: string[]; noLow: boolean;
    uncontestedWinnerId?: string;
    players: Array<{ id: string; high: number; low: number; payout: number; contributed?: number; net?: number; eligible: boolean }>;
  }>;
};
export type TableState = {
  handId: string; handCode?: string; handNumber: number; partyCode?: string;
  isReplay?: boolean; replayOfHandId?: string; replayCode?: string;
  playerId: string; playerName?: string; stack: number; hole: string[]; folded: boolean; isBot?: boolean;
  players: Seat[]; stage: string; community: string[]; currentPlayerId?: string;
  potCoins: number; currentBet: number; totalContributions: Record<string, number>; roundBets: Record<string, number>;
  potBreakdown: Array<{ amount: number; eligiblePlayerIds: string[] }>;
  blinds?: { small: number; big: number; smallBlindPlayerId?: string; bigBlindPlayerId?: string; dealerPlayerId?: string };
  partyTotals: Array<{ id: string; total: number }>;
  actions: Array<{ playerId: string; move: string; amount?: number; stage: string; at: number }>;
  waitingForPlayers: Array<{ id: string; name?: string }>;
  result?: Summary & { players: Array<Combination & { id: string; folded: boolean }> };
  showdownSummary?: Summary;
  currentCombo?: Combination;
  partyFinishedEarly: boolean;
};
export type TableControls = {
  canAct: boolean; canCall: boolean; canRaise: boolean;
  callAmount: number; callIsAllIn: boolean; wagerTarget: number; wagerIsAllIn: boolean;
  betSize: BetSize; raiseCount: number; maxRaises?: number;
  pending: boolean; connected: boolean; creatingDeal: boolean;
  turnSeconds?: number; turnDurationMs?: number;
  notice?: string | null; sessionWarning?: string;
};
export type MobileTableProps = {
  player: TableState; controls: TableControls; dealerId?: string; tableName?: string;
  onMove: (move: Move, amount?: number, size?: BetSize) => void;
  onBetSize: (size: BetSize) => void;
  onNext?: () => void; onStats: () => void; statsAvailable: boolean;
  onAbout: () => void; onRestart?: () => void; onExit?: () => void;
  winnerName?: string; isHost: boolean;
};
