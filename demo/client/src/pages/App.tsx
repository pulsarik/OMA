import React, { useEffect, useState } from 'react';
import { callAction, isAllInWager } from '../callAction';

const isLocalVite = window.location.hostname === 'localhost' && window.location.port !== '4000';
const SERVER_URL = isLocalVite ? 'http://localhost:4000' : window.location.origin;
const WS_URL = isLocalVite
  ? 'ws://localhost:4000'
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

type ActionLog = {
  playerId: string;
  move: string;
  amount?: number;
  stage: string;
  at: number;
};

type HiLoResult = {
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

type ShowdownSummary = Pick<HiLoResult, 'potCoins' | 'highWinners' | 'lowWinners' | 'noLow' | 'sidePots' | 'points'>;

type PartyScore = {
  partyId: string;
  partyCode?: string;
  totals: Array<{
    id: string;
    total: number;
  }>;
  hands: Array<{
    id: string;
    handCode?: string;
    handNumber: number;
    stage: string;
    replayOfHandId?: string;
    players: Array<{
      id: string;
      folded: boolean;
      participated: boolean;
    }>;
    points: Array<{
      id: string;
      high: number;
      low: number;
      uncontested?: number;
      total: number;
    }>;
    net: Array<{
      id: string;
      total: number;
    }>;
  }>;
};

type BlindInfo = {
  level: number;
  small: number;
  big: number;
  smallBlindPlayerId?: string;
  bigBlindPlayerId?: string;
};

type PotBreakdown = {
  amount: number;
  eligiblePlayerIds: string[];
};

function sourceHandLabel(score: PartyScore | undefined, sourceHandId: string | undefined) {
  if (!score || !sourceHandId) return undefined;
  const hand = score.hands.find((item) => item.id === sourceHandId);
  return hand ? handLabel(hand.handCode, hand.handNumber, hand.id) : undefined;
}

function shortId(id: string | undefined) {
  return id ? id.slice(0, 8) : '-';
}

function partyLabel(partyCode: string | undefined, partyId: string | undefined) {
  return partyCode ?? shortId(partyId);
}

function handLabel(handCode: string | undefined, handNumber: number | undefined, handId?: string) {
  if (handCode) return handCode;
  if (handNumber) return `#${handNumber}`;
  return shortId(handId);
}

function playerLabel(players: Array<{ id: string; name?: string }> | undefined, id: string | undefined) {
  if (!id) return '-';
  return tablePlayerName(players?.find((player) => player.id === id)?.name, id);
}

function playerBlindLabel(blinds: BlindInfo | undefined, playerId: string, stage: string) {
  if (!blinds || stage !== 'preflop') return undefined;
  if (blinds.smallBlindPlayerId === playerId) return `1× BLIND ${formatPoints(blinds.small)}`;
  if (blinds.bigBlindPlayerId === playerId) return `2× BLIND ${formatPoints(blinds.big)}`;
  return undefined;
}

function tablePlayerName(name: string | undefined, id: string) {
  return (name ?? id).replace(/_bot$/i, '');
}

type ComboCard = {
  code: string;
  source: 'hole' | 'board';
};

type PlayerCombo = {
  highCards?: string[];
  highCombo?: ComboCard[];
  highRank?: string;
  lowCards?: string[];
  lowCombo?: ComboCard[];
  lowRank?: string;
};

type PlayerMove = 'check' | 'bet' | 'call' | 'raise' | 'fold';
type BetSizeOption = 'blind' | 'quarter' | 'half' | 'pot';

const BET_SIZE_OPTIONS: Array<{ value: BetSizeOption; label: string }> = [
  { value: 'blind', label: 'Blind' },
  { value: 'quarter', label: '1/4 pot' },
  { value: 'half', label: '1/2 pot' },
  { value: 'pot', label: 'Pot' },
];

const MAX_PLAYERS = 10;
const DEFAULT_PLAYER_NAMES = ['Dima', 'Anna', 'Ivan', 'Maria', 'Pavel', 'Elena', 'Alex', 'Sofia', 'Nikolai', 'Olga'];

type PlayerView = {
  handId: string;
  partyId: string;
  partyCode?: string;
  handCode?: string;
  dealCode?: string;
  handNumber: number;
  revision: number;
  replayOfHandId?: string;
  playerId: string;
  playerName?: string;
  isBot?: boolean;
  stack: number;
  potCoins: number;
  potBreakdown: PotBreakdown[];
  totalContributions: Record<string, number>;
  currentBet: number;
  roundBets: Record<string, number>;
  raiseCount: number;
  maxRaises: number;
  blinds?: BlindInfo;
  hole: string[];
  folded: boolean;
  players: Array<{
    id: string;
    name?: string;
    isBot?: boolean;
    stack?: number;
    folded: boolean;
    cardCount: number;
    hole?: string[];
  }>;
  stage: string;
  currentPlayerId?: string;
  revealVotes: string[];
  cardsRevealed: boolean;
  nextHandId?: string;
  nextReplayHandId?: string;
  nextPlayerLink?: {
    id: string;
    name?: string;
    handCode?: string;
    replayOfHandId?: string;
    url: string;
  };
  showdownSummary?: ShowdownSummary;
  partyScore?: PartyScore;
  result?: HiLoResult;
  currentCombo?: PlayerCombo;
  community: string[];
  actions: ActionLog[];
  created: number;
};

type FullHandView = {
  id: string;
  partyId?: string;
  partyCode?: string;
  handCode?: string;
  dealCode?: string;
  handNumber?: number;
  replayOfHandId?: string;
  potCoins?: number;
  totalContributions?: Record<string, number>;
  currentBet?: number;
  roundBets?: Record<string, number>;
  raiseCount?: number;
  maxRaises?: number;
  blinds?: BlindInfo;
  players: Array<{
    id: string;
    name?: string;
    isBot?: boolean;
    hole: string[];
    stack?: number;
    folded?: boolean;
  }>;
  community: string[];
  fullCommunity?: string[];
  stage?: string;
  currentPlayerId?: string;
  revealVotes?: string[];
  cardsRevealed?: boolean;
  nextHandId?: string;
  nextReplayHandId?: string;
  result?: HiLoResult;
  actions?: ActionLog[];
  created: number;
};

type DealMessage = {
  type: string;
  data?: {
    id: string;
    partyId?: string;
    partyCode?: string;
    handCode?: string;
    dealCode?: string;
    handNumber?: number;
    replayOfHandId?: string;
    playerLinks?: Array<{
      id: string;
      name?: string;
      isBot?: boolean;
      url: string;
    }>;
  };
};

type VersionInfo = {
  commit: string;
  shortCommit: string;
  buildTimeGmt?: string;
};

type LobbyView = {
  id: string;
  hostMemberId: string;
  maxPlayers: number;
  status: 'waiting' | 'started';
  handId?: string;
  members: Array<{
    id: string;
    name: string;
    isBot: boolean;
    isHost: boolean;
  }>;
};

const rankLabels: Record<string, string> = {
  T: '10',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
};

const CARD_SCALE = 0.8;
const CARD_WIDTH = 92 * CARD_SCALE;
const CARD_HEIGHT = 132 * CARD_SCALE;
const COMPACT_CARD_SCALE = 0.72;
const COMPACT_CARD_WIDTH = 92 * COMPACT_CARD_SCALE;
const COMPACT_CARD_HEIGHT = 132 * COMPACT_CARD_SCALE;
const COMBO_CARD_SCALE = 0.48;
const COMBO_CARD_WIDTH = 92 * COMBO_CARD_SCALE;
const COMBO_CARD_HEIGHT = 132 * COMBO_CARD_SCALE;
const SIDE_COMBO_CARD_SCALE = 0.35;
const SIDE_COMBO_CARD_WIDTH = 92 * SIDE_COMBO_CARD_SCALE;
const SIDE_COMBO_CARD_HEIGHT = 132 * SIDE_COMBO_CARD_SCALE;
const CARD_IMAGE_MAX_RETRIES = 3;

const PLAYER_PAGE_STYLES = `
  :root {
    color-scheme: light;
    --ink: #17211b;
    --muted: #65736a;
    --felt-dark: #03452f;
    --felt: #087344;
    --felt-light: #15945a;
    --gold: #fbbf24;
    --danger: #dc2626;
    --surface: #ffffff;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: #edf3ef; color: var(--ink); }
  button { min-height: 42px; font: inherit; cursor: pointer; }
  button:disabled { cursor: not-allowed; }
  .poker-page {
    width: min(100%, 1480px);
    min-height: 100vh;
    margin: 0 auto;
    padding: clamp(8px, 1.4vw, 20px);
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .game-tile, .stats-tile {
    border: 1px solid #d8e2dc;
    background: rgba(255,255,255,.9);
    box-shadow: 0 12px 32px rgba(31,54,42,.11);
  }
  .view-tabs {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    margin: 0 14px -1px;
  }
  .view-tab {
    min-height: 38px;
    border: 1px solid #cbd5e1;
    border-bottom-color: #d8e2dc;
    border-radius: 12px 12px 0 0;
    background: #dfe7e2;
    color: #526159;
    padding: 8px 18px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .05em;
  }
  .view-tab.is-active {
    border-color: #d8e2dc;
    border-bottom-color: #fff;
    background: #fff;
    color: #065f46;
  }
  .view-tab:disabled {
    cursor: not-allowed;
    opacity: .45;
  }
  .game-tile {
    border-radius: clamp(24px, 3vw, 36px);
    padding: clamp(7px, 1vw, 12px);
  }
  .stats-tile {
    border-color: #cbd5e1;
    border-radius: 22px;
    background: linear-gradient(180deg, #ffffff, #f4f7fb);
    padding: clamp(12px, 2vw, 22px);
  }
  .stats-tile .result-panel {
    margin: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    padding: 0;
    box-shadow: none;
  }
  .game-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 34px;
    margin-bottom: 8px;
  }
  .deal-chip {
    border: 1px solid #cbd5cf;
    border-radius: 999px;
    background: rgba(255,255,255,.78);
    color: #526159;
    padding: 4px 9px;
    font: 700 12px/1.2 ui-monospace, SFMono-Regular, Consolas, monospace;
  }
  .deal-footer { margin: 12px 4px 2px; text-align: center; }
  .poker-table {
    position: relative;
    overflow: hidden;
    display: grid;
    gap: clamp(10px, 1.5vw, 20px);
    min-height: 780px;
    border: 5px solid #73552d;
    border-radius: clamp(28px, 5vw, 72px);
    background:
      radial-gradient(ellipse at 48% 42%, rgba(67,188,124,.22), transparent 58%),
      repeating-linear-gradient(17deg, rgba(255,255,255,.018) 0 1px, transparent 1px 4px),
      repeating-linear-gradient(103deg, rgba(0,22,12,.028) 0 1px, transparent 1px 5px),
      linear-gradient(145deg, var(--felt-light), var(--felt) 46%, var(--felt-dark));
    box-shadow:
      inset 0 0 0 3px rgba(255,255,255,.1),
      inset 0 0 62px rgba(0,23,13,.34),
      inset 0 18px 28px rgba(255,255,255,.035),
      0 12px 32px rgba(31,54,42,.22);
    padding: clamp(14px, 2vw, 28px);
    color: #fff;
  }
  .poker-table::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(255,255,255,.2) 0 .55px, transparent .8px),
      radial-gradient(circle at 72% 64%, rgba(0,25,14,.3) 0 .65px, transparent .9px),
      radial-gradient(circle at 42% 78%, rgba(255,255,255,.12) 0 .45px, transparent .75px);
    background-position: 0 0, 2px 1px, 1px 3px;
    background-size: 5px 5px, 7px 7px, 6px 6px;
    mix-blend-mode: soft-light;
    opacity: .34;
    pointer-events: none;
  }
  .poker-table.is-crowded {
    gap: 10px;
    padding: 14px 18px;
  }
  .poker-table.is-crowded .opponents-row { gap-block: 10px; }
  .poker-table.is-crowded .table-center {
    min-height: 110px;
    padding: 8px;
  }
  .opponents-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: flex-start;
    gap: 20px 8px;
  }
  .player-seat-wrap { flex: 0 1 360px; min-width: 0; }
  .player-seat {
    transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease;
  }
  .player-seat.is-thinking {
    transform: translateY(-3px);
  }
  .player-meta {
    min-width: 70px;
    border-radius: 12px;
    padding: 4px 6px;
  }
  .player-meta.is-thinking { background: rgba(69, 43, 4, .62); }
  .player-name { text-shadow: 0 1px 3px rgba(0,0,0,.7); }
  .table-center {
    grid-template-columns: minmax(90px, 1fr) auto minmax(90px, 1fr);
    grid-template-areas: "stage board pot";
    align-items: center;
    align-self: center;
    min-height: 132px;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 28px;
    background: rgba(1, 46, 30, .26);
    padding: 12px;
  }
  .table-center.has-showdown {
    grid-template-columns: minmax(220px, 1fr) auto auto minmax(140px, 1fr);
    grid-template-areas: "status board new-deal pot";
  }
  .table-showdown {
    grid-area: status;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    justify-self: start;
    gap: 10px;
  }
  .table-center.has-showdown .table-stage { display: none; }
  .table-stage { grid-area: stage; justify-self: start; }
  .table-board { grid-area: board; justify-self: center; }
  .table-new-deal { grid-area: new-deal; justify-self: start; margin-left: 10px; }
  .table-pot { grid-area: pot; justify-self: end; }
  .hero-zone {
    display: grid;
    grid-template-columns: auto auto auto;
    grid-template-areas: "high hero low";
    justify-content: center;
    align-items: end;
    gap: clamp(6px, 1vw, 12px);
  }
  .hero-seat { grid-area: hero; align-self: end; }
  .combo-side {
    align-self: center;
    width: 190px;
    min-width: 0;
    border: 1px solid rgba(255,255,255,.32);
    border-radius: 12px;
    background: rgba(2,44,30,.52);
    padding: 7px;
    color: #fff;
    opacity: .98;
  }
  .combo-side.high { grid-area: high; justify-self: end; }
  .combo-side.low { grid-area: low; justify-self: start; }
  .combo-side-title {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .07em;
  }
  .combo-side-rank { color: #ecfdf5; font-size: 13px; letter-spacing: 0; text-align: right; }
  .side-combo-cards { display: flex; justify-content: center; gap: 3px; }
  .side-combo-card { border-top: 2px solid rgba(255,255,255,.58); border-radius: 5px; }
  .side-combo-card.is-hand { border-top-color: #fbbf24; }
  .compact-card-row { display: flex; gap: 8px; flex-wrap: nowrap; justify-content: center; }
  .compact-card-frame { width: ${COMPACT_CARD_WIDTH}px; height: ${COMPACT_CARD_HEIGHT}px; }
  .board-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
  .action-dock {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
    margin: 10px auto 0;
    border: 1px solid rgba(148,163,184,.55);
    border-radius: 16px;
    background: rgba(255,255,255,.94);
    padding: 10px;
    box-shadow: 0 10px 30px rgba(15,23,42,.18);
    backdrop-filter: blur(12px);
  }
  .bet-sizes, .main-actions { display: flex; align-items: center; justify-content: center; gap: 7px; flex-wrap: wrap; }
  .bet-size-button, .action-button {
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background: #fff;
    padding: 8px 12px;
    font-weight: 800;
  }
  .bet-size-button.is-selected { border: 2px solid #087443; background: #dcfce7; color: #065f46; }
  .action-button.primary { border-color: #047857; background: #087443; color: #fff; min-width: 120px; }
  .action-button.danger { border-color: #fecaca; background: #fff1f2; color: #9f1239; }
  .action-button:disabled, .bet-size-button:disabled { opacity: .42; }
  .turn-status { text-align: center; color: #92400e; font-weight: 900; letter-spacing: .02em; }
  .game-notice { margin: 8px 4px; color: #526159; font-size: 13px; font-weight: 750; text-align: center; }
  .result-panel {
    border: 1px solid #dce5df;
    border-radius: 16px;
    background: var(--surface);
    box-shadow: 0 6px 20px rgba(31,54,42,.08);
  }
  .party-summary {
    border: 1px solid #dce5df;
    border-radius: 16px;
    background: #fff;
    padding: clamp(10px, 2vw, 18px);
    box-shadow: 0 6px 20px rgba(31,54,42,.08);
  }
  .party-metrics { margin-top: 12px; overflow-x: auto; }
  .party-metrics .result-points { min-width: 920px; }
  .result-panel { margin-top: 12px; padding: clamp(10px, 2vw, 18px); }
  .winner-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .winner-card { border: 1px solid #dce5df; border-radius: 14px; background: #f8fbf9; padding: 10px; overflow: auto; }
  .result-points { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; }
  .result-points th, .result-points td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
  .all-hands { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr)); gap: 12px; margin-top: 12px; }
  .hand-detail { border: 1px solid #dce5df; border-radius: 14px; background: #fff; padding: 10px; overflow: auto; }
  @media (max-width: 900px) {
    .poker-table { min-height: 0; }
    .table-center.has-showdown {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "status status"
        "board new-deal"
        "pot pot";
    }
    .table-showdown { justify-self: center; justify-content: center; }
    .table-new-deal { margin-left: 8px; }
    .table-center.has-showdown .table-pot { justify-self: center; }
  }
  @media (min-width: 761px) and (max-height: 900px) {
    .poker-page { padding: 4px 6px 8px; }
    .view-tabs { margin-inline: 10px; }
    .view-tab { min-height: 32px; padding: 5px 13px; }
    .game-tile { border-radius: 20px; padding: 4px; }
    .poker-table,
    .poker-table.is-crowded {
      min-height: 0;
      gap: 8px;
      border-width: 3px;
      border-radius: 34px;
      padding: 10px 14px;
    }
    .opponents-row,
    .poker-table.is-crowded .opponents-row {
      gap: 8px 6px;
    }
    .opponents-row .player-seat-wrap { flex-basis: calc((100% - 12px) / 3); }
    .player-seat { padding: 4px !important; }
    .compact-card-row,
    .board-row { gap: 4px !important; }
    .compact-card-frame {
      width: 53.36px !important;
      height: 76.56px !important;
    }
    .compact-card { transform: scale(.58) !important; }
    .table-center,
    .poker-table.is-crowded .table-center {
      min-height: 92px;
      border-radius: 20px;
      padding: 6px;
    }
    .hero-zone { gap: 5px; }
    .combo-side { width: 170px; padding: 5px; }
    .combo-side-title { margin-bottom: 4px; }
  }
  @media (max-width: 760px) {
    .poker-page { padding: 6px; padding-bottom: 8px; }
    .view-tabs { margin-inline: 10px; }
    .view-tab { min-height: 36px; padding: 7px 13px; }
    .game-tile { border-radius: 22px; padding: 5px; }
    .stats-tile { border-radius: 18px; padding: 10px; }
    .poker-table { min-height: 0; border-width: 3px; border-radius: 28px; padding: 12px 8px; }
    .winner-grid { grid-template-columns: 1fr; }
    .action-dock { border-radius: 14px; }
    .bet-sizes { flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; padding-bottom: 2px; }
    .bet-size-button { flex: 0 0 auto; }
    .main-actions .action-button { flex: 1 1 90px; }
    .hero-zone { gap: 6px; }
    .combo-side { width: 184px; padding: 6px 5px; }
  }
  @media (max-width: 560px) {
    .table-center {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "stage pot"
        "board board";
      gap: 8px;
    }
    .table-center.has-showdown {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "status status"
        "board board"
        "new-deal new-deal"
        "pot pot";
    }
    .table-showdown { justify-self: center; justify-content: center; }
    .table-new-deal { justify-self: center; margin-left: 0; }
    .table-center.has-showdown .table-pot { justify-self: center; }
    .table-board { grid-column: 1 / -1; }
    .hero-zone {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "high low"
        "hero hero";
      align-items: center;
    }
    .combo-side.high, .combo-side.low { justify-self: center; }
  }
`;

function rankNumber(rank: string) {
  if (rank === 'T') return 10;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  if (rank === 'A') return 14;
  return Number(rank);
}

function Card({ code, scale = CARD_SCALE, className }: { code: string; scale?: number; className?: string }) {
  const rank = code.slice(0, -1).toUpperCase();
  const suit = code.slice(-1).toLowerCase();
  const assetCode = `${rank}${suit.toUpperCase()}`;
  const [attempt, setAttempt] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const retryTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const suitSymbol: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const isRed = suit === 'h' || suit === 'd';

  useEffect(() => {
    setAttempt(0);
    setImageLoaded(false);
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [assetCode]);

  const retrySuffix = attempt ? `?retry=${attempt}` : '';

  return (
    <div
      title={code}
      className={className}
      style={{
        position: 'relative',
        width: 92,
        height: 132,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        borderRadius: 12,
        background: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.28)',
        overflow: 'hidden',
      }}
    >
      <div
        data-testid={`card-fallback-${code}`}
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          alignContent: 'center',
          justifyItems: 'center',
          background: 'linear-gradient(145deg, #fff, #f1f5f9)',
          color: isRed ? '#dc2626' : '#111827',
          fontWeight: 900,
        }}
      >
        <span style={{ fontSize: 34, lineHeight: 1 }}>{rankLabels[rank] ?? rank}</span>
        <span style={{ fontSize: 30, lineHeight: 1 }}>{suitSymbol[suit] ?? suit.toUpperCase()}</span>
      </div>
      <img
        src={`/cards/revk/${assetCode}.svg${retrySuffix}`}
        alt={code}
        data-testid={`card-face-${code}`}
        data-load-state={imageLoaded ? 'loaded' : 'loading'}
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageLoaded(false);
          if (attempt >= CARD_IMAGE_MAX_RETRIES) return;
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => {
            setAttempt(current => current + 1);
          }, 250 * (attempt + 1));
        }}
        style={{
          position: 'relative',
          display: 'block',
          width: '100%',
          height: '100%',
          opacity: imageLoaded ? 1 : 0,
        }}
      />
    </div>
  );
}

function CardBack({ scale = CARD_SCALE, className }: { scale?: number; className?: string }) {
  return (
    <div
      data-testid="card-back"
      className={className}
      style={{
        width: 92,
        height: 132,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        borderRadius: 12,
        boxShadow: '0 3px 9px rgba(0,0,0,0.22)',
        overflow: 'hidden',
      }}
    >
      <img
        src="/cards/revk/BACK.svg"
        alt=""
        aria-hidden="true"
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}

function CardRow({ cards }: { cards: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {cards.map((card) => (
        <div key={card} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
          <Card code={card} />
        </div>
      ))}
    </div>
  );
}

function CompactCardRow({ cards, testId }: { cards: string[]; testId?: string }) {
  return (
    <div data-testid={testId} className="compact-card-row">
      {cards.map((card) => (
        <div key={card} className="compact-card-frame">
          <Card code={card} scale={COMPACT_CARD_SCALE} className="compact-card" />
        </div>
      ))}
    </div>
  );
}

function comboRankValue(card: ComboCard) {
  return rankNumber(card.code.slice(0, -1).toUpperCase());
}

function comboRankLabel(card: ComboCard) {
  const rank = card.code.slice(0, -1).toUpperCase();
  return rankLabels[rank] ?? rank;
}

function highComboGroups(combo: ComboCard[]) {
  const byRank = new Map<string, ComboCard[]>();
  combo.forEach((card) => {
    const rank = card.code.slice(0, -1).toUpperCase();
    byRank.set(rank, [...(byRank.get(rank) ?? []), card]);
  });

  return [...byRank.values()].sort((a, b) => {
    const countDiff = b.length - a.length;
    return countDiff || comboRankValue(b[0]) - comboRankValue(a[0]);
  });
}

function groupName(cards: ComboCard[]) {
  if (cards.length === 4) return 'four';
  if (cards.length === 3) return 'three';
  if (cards.length === 2) return 'pair';
  return comboRankLabel(cards[0]);
}

function ComboCardRow({ combo, tone = 'neutral' }: { combo?: ComboCard[]; tone?: 'high' | 'low' | 'neutral' }) {
  if (!combo) return null;
  const borderColor = tone === 'high' ? '#b91c1c' : tone === 'low' ? '#047857' : '#94a3b8';
  const background = tone === 'high' ? '#fff5f5' : tone === 'low' ? '#ecfdf5' : '#f8fafc';
  const label = tone === 'high' ? 'High' : tone === 'low' ? 'Low' : 'Combo';
  const groups = tone === 'high' ? highComboGroups(combo) : combo.map((card) => [card]);

  return (
    <div
      style={{
        border: `2px solid ${borderColor}`,
        borderRadius: 8,
        background,
        padding: '5px 7px',
        margin: '3px 0 6px',
        width: 'fit-content',
        maxWidth: '100%',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 3, fontSize: 13 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: 7 }}>
        {groups.map((group) => {
          const framed = tone === 'high' && group.length > 1;

          return (
            <div
              key={group.map((card) => `${card.source}-${card.code}`).join('-')}
              style={{
                border: framed ? `2px solid ${borderColor}` : '2px solid transparent',
                borderRadius: 7,
                padding: framed ? '4px 5px 3px' : 0,
                background: framed ? 'rgba(255,255,255,0.72)' : 'transparent',
                display: 'grid',
                gap: 3,
                justifyItems: 'center',
              }}
            >
              {framed ? <span style={{ fontSize: 10, fontWeight: 700, color: borderColor }}>{groupName(group)}</span> : null}
              <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end' }}>
                {group.map((card) => (
                  <div
                    key={`${card.source}-${card.code}`}
                    title={card.source === 'board' ? 'board card' : 'hole card'}
                    style={{
                      display: 'grid',
                      gap: 2,
                      justifyItems: 'center',
                      transform: card.source === 'board' ? 'translateY(-6px)' : 'translateY(0)',
                    }}
                  >
                    <div style={{ width: COMBO_CARD_WIDTH, height: COMBO_CARD_HEIGHT }}>
                      <Card code={card.code} scale={COMBO_CARD_SCALE} />
                    </div>
                    <span
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: 999,
                        padding: '1px 5px',
                        background: '#fff',
                        color: '#334155',
                        fontSize: 10,
                        lineHeight: 1,
                      }}
                    >
                      {card.source === 'board' ? 'board' : 'hand'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SideComboCards({ combo }: { combo: ComboCard[] }) {
  return (
    <div className="side-combo-cards">
      {combo.map((card, index) => (
        <div
          key={`${card.source}-${card.code}-${index}`}
          className={`side-combo-card${card.source === 'hole' ? ' is-hand' : ''}`}
          title={`${card.code} · ${card.source === 'hole' ? 'hand' : 'board'}`}
          style={{ width: SIDE_COMBO_CARD_WIDTH, height: SIDE_COMBO_CARD_HEIGHT }}
        >
          <Card code={card.code} scale={SIDE_COMBO_CARD_SCALE} />
        </div>
      ))}
    </div>
  );
}

function CardBackRow({ count, compact = false, testId }: { count: number; compact?: boolean; testId?: string }) {
  const width = compact ? COMPACT_CARD_WIDTH : CARD_WIDTH;
  const height = compact ? COMPACT_CARD_HEIGHT : CARD_HEIGHT;
  const scale = compact ? COMPACT_CARD_SCALE : CARD_SCALE;

  return (
    <div
      data-testid={testId}
      className={compact ? 'compact-card-row' : undefined}
      style={compact ? undefined : { display: 'flex', gap: 6, flexWrap: 'nowrap', justifyContent: 'center' }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={compact ? 'compact-card-frame' : undefined}
          style={compact ? undefined : { width, height }}
        >
          <CardBack scale={scale} className={compact ? 'compact-card' : undefined} />
        </div>
      ))}
    </div>
  );
}

function BoardRow({ cards, compact = false }: { cards: string[]; compact?: boolean }) {
  const hiddenCount = Math.max(5 - cards.length, 0);
  const width = compact ? COMPACT_CARD_WIDTH : CARD_WIDTH;
  const height = compact ? COMPACT_CARD_HEIGHT : CARD_HEIGHT;
  const scale = compact ? COMPACT_CARD_SCALE : CARD_SCALE;

  return (
    <div
      className={compact ? 'board-row' : undefined}
      style={compact ? undefined : { display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}
    >
      {cards.map((card) => (
        <div
          key={card}
          className={compact ? 'compact-card-frame' : undefined}
          style={compact ? undefined : { width, height }}
        >
          <Card code={card} scale={scale} className={compact ? 'compact-card' : undefined} />
        </div>
      ))}
      {Array.from({ length: hiddenCount }).map((_, index) => (
        <div
          key={`hidden-${index}`}
          className={compact ? 'compact-card-frame' : undefined}
          style={compact ? undefined : { width, height }}
        >
          <CardBack scale={scale} className={compact ? 'compact-card' : undefined} />
        </div>
      ))}
    </div>
  );
}

function CoinStack({ value, title = 'coins', compact = false }: { value: number; title?: string; compact?: boolean }) {
  const chipValues = [
    { value: 100, color: '#111827', edge: '#020617', text: '#fff' },
    { value: 20, color: '#7c3aed', edge: '#4c1d95', text: '#fff' },
    { value: 10, color: '#2563eb', edge: '#1e3a8a', text: '#fff' },
    { value: 5, color: '#dc2626', edge: '#7f1d1d', text: '#fff' },
    { value: 1, color: '#f59e0b', edge: '#92400e', text: '#111827' },
  ];
  let rest = Math.max(0, Math.round(value));
  const chips = chipValues.flatMap((chip) => {
    const count = Math.floor(rest / chip.value);
    rest -= count * chip.value;
    return Array.from({ length: count }, () => chip);
  });
  const visibleChips = chips.length ? chips.slice(-18) : [{ value: 0, color: '#94a3b8', edge: '#475569', text: '#fff' }];

  return (
    <div
      data-testid="coin-stack"
      title={`${formatPoints(value)} ${title}`}
      style={{
        display: 'grid',
        justifyItems: 'center',
        gap: 2,
        minWidth: compact ? 28 : 34,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.45)',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      <div style={{ display: 'grid', alignItems: 'end', minHeight: compact ? 38 : 72 }}>
        {visibleChips.map((chip, index) => (
          <span
            key={index}
            data-chip-index={index}
            data-chip-value={chip.value}
            style={{
              gridArea: '1 / 1',
              position: 'relative',
              width: compact ? 20 : 24,
              height: compact ? 7 : 8,
              border: `1px solid ${chip.edge}`,
              borderRadius: '50%',
              background: chip.value === 0
                ? 'linear-gradient(#cbd5e1, #64748b)'
                : `linear-gradient(#fff 0 12%, ${chip.color} 13% 72%, ${chip.edge} 73%)`,
              boxShadow: `0 1px 0 ${chip.edge}`,
              transform: `translate(${index % 2 === 0 ? (compact ? -2 : -3) : (compact ? 2 : 3)}px, ${-index * (compact ? 2 : 3)}px)`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          border: '1px solid rgba(255,255,255,0.45)',
          borderRadius: 999,
          background: 'rgba(15,23,42,0.72)',
          padding: '1px 6px',
          lineHeight: 1.2,
        }}
      >
        {formatPoints(value)}
      </span>
    </div>
  );
}

function PotDisplay({
  value,
  currentBet,
  breakdown,
}: {
  value: number;
  currentBet: number;
  breakdown?: PotBreakdown[];
}) {
  const visiblePots = breakdown?.length && breakdown.length > 1 ? breakdown : [];
  return (
    <div
      style={{
        display: 'grid',
        alignItems: 'center',
        justifyContent: 'center',
        justifyItems: 'center',
        gap: 5,
        minHeight: 44,
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <CoinStack value={value} title="pot" compact />
        {currentBet > 0 ? (
          <span
            style={{
              border: '1px solid rgba(255,255,255,0.5)',
              borderRadius: 999,
              padding: '2px 8px',
              background: 'rgba(15,23,42,0.5)',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            bet {formatPoints(currentBet)}
          </span>
        ) : null}
      </div>
      {visiblePots.length ? (
        <div
          data-testid="side-pot-breakdown"
          style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', maxWidth: 280 }}
        >
          {visiblePots.map((pot, index) => (
            <span
              key={`${index}-${pot.amount}`}
              title={`Eligible: ${pot.eligiblePlayerIds.join(', ')}`}
              style={{
                border: '1px solid rgba(255,255,255,0.44)',
                borderRadius: 999,
                background: index === 0 ? 'rgba(5,150,105,0.78)' : 'rgba(30,64,175,0.72)',
                padding: '2px 7px',
                fontSize: 10,
                fontWeight: 900,
                whiteSpace: 'nowrap',
              }}
            >
              {index === 0 ? 'Main' : `Side ${index}`} {formatPoints(pot.amount)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StreetBadge({ stage }: { stage: string }) {
  return (
    <span
      style={{
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: 999,
        background: 'rgba(15,23,42,0.62)',
        color: '#fff',
        padding: '4px 12px',
        fontSize: 14,
        fontWeight: 900,
        letterSpacing: 0,
        textTransform: 'uppercase',
      }}
    >
      {stage}
    </span>
  );
}

function PlayerSeat({
  id,
  name,
  folded,
  isYou,
  isBot,
  hole,
  cardCount,
  compact = false,
  score = 0,
  action,
  resultPlayer,
  isHighWinner = false,
  isLowWinner = false,
  isCurrentTurn = false,
  blindLabel,
}: {
  id: string;
  name?: string;
  folded: boolean;
  isYou: boolean;
  isBot?: boolean;
  hole?: string[];
  cardCount: number;
  compact?: boolean;
  score?: number;
  action?: ActionLog;
  resultPlayer?: HiLoResult['players'][number];
  isHighWinner?: boolean;
  isLowWinner?: boolean;
  isCurrentTurn?: boolean;
  blindLabel?: string;
}) {
  const shouldShowCards = Boolean(hole?.length);
  const actionLabel = action
    ? `${action.move.toUpperCase()}${action.amount ? ` ${formatPoints(action.amount)}` : ''}`
    : undefined;
  const isYourTurn = isCurrentTurn && isYou && !isBot;
  const bubbleLabel = isCurrentTurn ? isYourTurn ? 'YOUR TURN' : 'THINKING...' : actionLabel;
  const hasWinningHand = !folded && (isHighWinner || isLowWinner);
  const winnerBorder = isHighWinner && isLowWinner
    ? 'linear-gradient(90deg, #dc2626 0 50%, #2563eb 50%)'
    : isHighWinner
      ? 'linear-gradient(#dc2626, #dc2626)'
      : 'linear-gradient(#2563eb, #2563eb)';

  return (
    <div
      data-testid={isCurrentTurn ? `active-player-${id}` : undefined}
      data-player-seat={id}
      className="player-seat-wrap"
      style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}
    >
      <section
        className={`player-seat${isCurrentTurn ? ' is-thinking' : ''}`}
        style={{
          border: isCurrentTurn ? '3px solid #facc15' : isYou ? '2px solid #16a34a' : '1px solid #d1d5db',
          borderRadius: 8,
          padding: compact ? 6 : 10,
          background: folded ? '#f3f4f6' : isCurrentTurn ? '#fffbeb' : '#fff',
          opacity: folded ? 0.62 : 1,
          width: compact ? 'fit-content' : undefined,
          minWidth: compact ? undefined : 180,
          margin: '0 auto',
          position: 'relative',
          boxShadow: isCurrentTurn
            ? '0 0 0 4px rgba(250,204,21,0.35), 0 0 22px rgba(250,204,21,0.95)'
            : undefined,
        }}
      >
        {compact && !isYou ? (
          <span
            title={`${tablePlayerName(name, id)}: ${formatPoints(score)} coins`}
            style={{
              position: 'absolute',
              top: -18,
              left: 8,
              zIndex: 3,
              border: '1px solid #fbbf24',
              borderRadius: 999,
              background: '#172033',
              color: '#fff',
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 900,
              lineHeight: 1,
              boxShadow: '0 2px 7px rgba(15,23,42,.28)',
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <span data-testid={`player-name-${id}`}>{tablePlayerName(name, id)}</span>
            <strong data-testid={`player-score-${id}`} style={{ color: '#fde68a' }}>{formatPoints(score)}</strong>
          </span>
        ) : null}
        {isBot ? (
          <span
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              border: '1px solid #bbf7d0',
              borderRadius: 999,
              background: '#dcfce7',
              color: '#166534',
              padding: '2px 6px',
              fontSize: 11,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            BOT
          </span>
        ) : null}
        {bubbleLabel ? (
          <div
            title={isCurrentTurn
              ? isYourTurn ? 'Your turn' : `${tablePlayerName(name, id)} is thinking`
              : `Last action: ${actionLabel}`}
            style={{
              position: 'absolute',
              top: -18,
              right: 8,
              zIndex: 2,
              border: isCurrentTurn ? '2px solid #f59e0b' : '1px solid #cbd5e1',
              borderRadius: 8,
              background: isCurrentTurn ? '#facc15' : action?.move === 'fold' ? '#fee2e2' : '#fff',
              color: isCurrentTurn ? '#422006' : action?.move === 'fold' ? '#7f1d1d' : '#0f172a',
              padding: '5px 9px',
              fontSize: compact ? 13 : 14,
              fontWeight: 900,
              lineHeight: 1,
              boxShadow: isCurrentTurn
                ? '0 3px 12px rgba(250,204,21,0.55)'
                : '0 2px 7px rgba(15,23,42,0.2)',
              whiteSpace: 'nowrap',
            }}
          >
            {bubbleLabel}
            <span
              style={{
                position: 'absolute',
                right: 10,
                bottom: -6,
                width: 10,
                height: 10,
                borderRight: isCurrentTurn ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                borderBottom: isCurrentTurn ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                background: isCurrentTurn ? '#facc15' : action?.move === 'fold' ? '#fee2e2' : '#fff',
                transform: 'rotate(45deg)',
              }}
            />
          </div>
        ) : null}
        {blindLabel && !isYou ? (
          <span
            data-testid={`player-blind-${id}`}
            style={{
              position: 'absolute',
              top: bubbleLabel ? 18 : -18,
              right: 8,
              zIndex: 3,
              border: `2px solid ${blindLabel.startsWith('2Ã—') ? '#fca5a5' : '#fde68a'}`,
              borderRadius: 999,
              background: blindLabel.startsWith('2Ã—') ? '#b91c1c' : '#f59e0b',
              color: '#fff',
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 900,
              lineHeight: 1,
              boxShadow: '0 2px 7px rgba(0,0,0,.28)',
              textShadow: '0 1px 2px rgba(0,0,0,.45)',
              whiteSpace: 'nowrap',
            }}
          >
            {blindLabel}
          </span>
        ) : null}
        <div
          style={{
            position: 'relative',
            padding: hasWinningHand ? 4 : 0,
            border: hasWinningHand ? '3px solid transparent' : undefined,
            borderRadius: hasWinningHand ? 10 : undefined,
            background: hasWinningHand
              ? `linear-gradient(#fff, #fff) padding-box, ${winnerBorder} border-box`
              : undefined,
            boxShadow: isHighWinner && isLowWinner
              ? '0 0 14px rgba(220,38,38,.48), 0 0 22px rgba(37,99,235,.42)'
              : isHighWinner
                ? '0 0 16px rgba(220,38,38,.58)'
                : isLowWinner
                  ? '0 0 16px rgba(37,99,235,.58)'
                  : undefined,
          }}
        >
          {shouldShowCards ? (
            <CompactCardRow cards={hole ?? []} testId={`player-cards-${id}`} />
          ) : (
            <CardBackRow count={cardCount} compact={compact} testId={`player-cards-${id}`} />
          )}
          {hasWinningHand ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: -14,
                zIndex: 3,
                display: 'flex',
                gap: 4,
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
              }}
            >
              {isHighWinner ? (
                <span
                  data-testid={`winner-high-${id}`}
                  style={{
                    borderRadius: 999,
                    background: '#dc2626',
                    color: '#fff',
                    padding: '3px 7px',
                    fontSize: 10,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  ★ HIGH
                </span>
              ) : null}
              {isLowWinner ? (
                <span
                  data-testid={`winner-low-${id}`}
                  style={{
                    borderRadius: 999,
                    background: '#2563eb',
                    color: '#fff',
                    padding: '3px 7px',
                    fontSize: 10,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  ★ LOW
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        {resultPlayer ? (
          <div
            data-testid={`player-result-${id}`}
            style={{
              display: 'grid',
              gap: 2,
              marginTop: hasWinningHand ? 18 : 5,
              color: '#0f172a',
              fontSize: 11,
              fontWeight: 800,
              lineHeight: 1.15,
              textAlign: 'center',
            }}
          >
            {folded ? (
              <span
                data-testid={`player-ineligible-${id}`}
                style={{
                  borderRadius: 999,
                  background: '#e5e7eb',
                  color: '#7f1d1d',
                  padding: '3px 7px',
                  marginBottom: 2,
                  fontSize: 10,
                  fontWeight: 900,
                }}
              >
                FOLDED — NOT ELIGIBLE
              </span>
            ) : null}
            <span>High: {resultPlayer.highRank ?? '-'}</span>
            <span>Low: {resultPlayer.lowRank ?? 'none'}</span>
          </div>
        ) : null}
      </section>
      {compact && isYou ? (
        <div
          className={`player-meta${isCurrentTurn ? ' is-thinking' : ''}`}
          style={{ display: 'grid', gap: 4, justifyItems: 'center', alignSelf: 'stretch', alignContent: 'end' }}
        >
          <CoinStack value={score} />
          <span
            data-testid={`player-name-${id}`}
            title={tablePlayerName(name, id)}
            className="player-name"
            style={{
              maxWidth: 90,
              overflow: 'hidden',
              color: '#fff',
              fontSize: 12,
              fontWeight: 900,
              lineHeight: 1.15,
              textAlign: 'center',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tablePlayerName(name, id)}{isYou ? ' (you)' : ''}
          </span>
          {blindLabel ? (
            <span
              data-testid={`player-blind-${id}`}
              style={{
                border: `2px solid ${blindLabel.startsWith('2×') ? '#fca5a5' : '#fde68a'}`,
                borderRadius: 999,
                background: blindLabel.startsWith('2×') ? '#b91c1c' : '#f59e0b',
                color: '#fff',
                padding: '4px 8px',
                fontSize: 12,
                fontWeight: 900,
                lineHeight: 1.15,
                boxShadow: '0 2px 7px rgba(0,0,0,.28)',
                textShadow: '0 1px 2px rgba(0,0,0,.45)',
                whiteSpace: 'nowrap',
              }}
            >
              {blindLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function HandBanner({ player }: { player: PlayerView }) {
  const replaySource = sourceHandLabel(player.partyScore, player.replayOfHandId);
  const isReplay = Boolean(player.replayOfHandId);

  return (
    <div
      style={{
        border: `1px solid ${isReplay ? '#f59e0b' : 'rgba(255,255,255,0.45)'}`,
        borderRadius: 8,
        background: isReplay ? 'rgba(245, 158, 11, 0.9)' : 'rgba(15, 23, 42, 0.28)',
        color: '#fff',
        padding: '5px 10px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.14)',
      }}
    >
      <strong style={{ display: 'block', fontSize: 14, lineHeight: 1.1 }}>
        Party hand {handLabel(player.handCode, player.handNumber, player.handId)}
      </strong>
      {isReplay ? (
        <span style={{ display: 'block', marginTop: 2, fontSize: 12 }}>
          Replay of {replaySource ?? '?'}
        </span>
      ) : null}
    </div>
  );
}

function formatPoints(value: unknown) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return String(value ?? '-');
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(2);
}

function betSizeFactor(size: BetSizeOption) {
  if (size === 'quarter') return 0.25;
  if (size === 'half') return 0.5;
  if (size === 'pot') return 1;
  return 0;
}

function betTargetAmount(size: BetSizeOption, pot: number, bigBlind: number, stack: number) {
  if (size === 'blind') return Math.min(bigBlind, stack);
  const amount = Math.ceil(pot * betSizeFactor(size));
  return Math.min(Math.max(amount, Math.min(bigBlind, stack)), stack);
}

function raiseTargetAmount(
  size: BetSizeOption,
  pot: number,
  currentBet: number,
  playerBet: number,
  bigBlind: number,
  stack: number,
) {
  const callAmount = Math.max(currentBet - playerBet, 0);
  const maxRaiseTo = Math.min(playerBet + stack, currentBet + pot + callAmount);
  const minRaiseTo = Math.min(currentBet + bigBlind, maxRaiseTo);
  if (size === 'blind') return minRaiseTo;

  const raiseSize = Math.ceil((pot + callAmount) * betSizeFactor(size));
  return Math.min(Math.max(currentBet + raiseSize, minRaiseTo), maxRaiseTo);
}

function totalScore(score: PartyScore | undefined, playerId: string) {
  return score?.totals.find((item) => item.id === playerId)?.total ?? 0;
}

function latestActionForPlayer(actions: ActionLog[] | undefined, playerId: string, stage: string) {
  return [...(actions ?? [])].reverse().find((action) => (
    action.playerId === playerId && action.stage === stage
  ));
}

function playerResult(result: HiLoResult | undefined, id: string) {
  return result?.players.find((player) => player.id === id);
}

function playerPoints(result: HiLoResult | undefined, id: string) {
  return result?.points.find((score) => score.id === id);
}

function summaryPoints(summary: ShowdownSummary | undefined, id: string) {
  return summary?.points.find((score) => score.id === id);
}

function isContestedPot(pot: HiLoResult['sidePots'][number]) {
  return pot.players.filter(player => (player.contributed ?? 0) > 0).length > 1;
}

function playerWinParts(summary: ShowdownSummary | undefined, playerId: string) {
  if (!summary) return [];
  const parts: string[] = [];
  if (summary.highWinners.includes(playerId)) parts.push('High');
  if (summary.lowWinners.includes(playerId)) parts.push('Low');
  return parts;
}

function ShowdownStatus({ player }: { player: PlayerView }) {
  const activePlayers = player.players.filter((seat) => !seat.folded);
  const foldedWinnerId = activePlayers.length === 1 ? activePlayers[0].id : undefined;
  const score = playerPoints(player.result, player.playerId);
  const summaryScore = summaryPoints(player.showdownSummary, player.playerId);
  const hasResult = player.cardsRevealed && score;
  const hasSummary = player.stage === 'showdown' && summaryScore;
  const knownFoldResult = player.folded || Boolean(foldedWinnerId);
  const contributed = player.totalContributions?.[player.playerId] ?? 0;
  const payout = score?.total ?? summaryScore?.total ?? (foldedWinnerId === player.playerId ? player.potCoins : 0);
  const net = payout - contributed;
  const winParts = playerWinParts(player.showdownSummary, player.playerId);
  const sharedWin = Boolean(
    player.showdownSummary
    && (
      (player.showdownSummary.highWinners.includes(player.playerId)
        && player.showdownSummary.highWinners.length > 1)
      || (player.showdownSummary.lowWinners.includes(player.playerId)
        && player.showdownSummary.lowWinners.length > 1)
    )
  );
  const isSplitPot = Boolean(
    player.showdownSummary
    && !player.showdownSummary.noLow
    && (
      player.showdownSummary.highWinners.some((id) => !player.showdownSummary?.lowWinners.includes(id))
      || player.showdownSummary.lowWinners.some((id) => !player.showdownSummary?.highWinners.includes(id))
    )
  );

  if (player.stage !== 'showdown' && !knownFoldResult && !hasSummary) return null;

  const background = hasResult || hasSummary || knownFoldResult
    ? net > 0
      ? 'rgba(22, 163, 74, 0.94)'
      : net < 0
        ? 'rgba(127, 29, 29, 0.94)'
        : 'rgba(51, 65, 85, 0.94)'
    : 'rgba(15, 23, 42, 0.82)';
  const title = hasResult || hasSummary || knownFoldResult
    ? net > 0
      ? sharedWin
        ? `You tied${winParts.length ? ` ${winParts.join(' + ')}` : ''}`
        : winParts.length
        ? `${isSplitPot ? 'Split pot: ' : ''}You won ${winParts.join(' + ')}`
        : 'You won'
      : net < 0
        ? 'You lost'
        : 'Break even'
    : 'Showdown';
  const winners = player.showdownSummary
    ? `High: ${player.showdownSummary.highWinners.map((id) => playerLabel(player.players, id)).join(', ')} | Low: ${
      player.showdownSummary.noLow
        ? 'none'
        : player.showdownSummary.lowWinners.map((id) => playerLabel(player.players, id)).join(', ')
    }`
    : undefined;
  const personalPots = player.showdownSummary?.sidePots
    .filter(isContestedPot)
    .map((pot, index) => ({
      label: index === 0 ? 'Main' : `Side ${index}`,
      result: pot.players.find(result => result.id === player.playerId),
    })) ?? [];

  return (
    <div
      style={{
        display: 'inline-grid',
        gap: 4,
        justifyItems: 'center',
        minWidth: 220,
        border: '2px solid rgba(255,255,255,0.72)',
        borderRadius: 12,
        background,
        color: '#fff',
        padding: '12px 18px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.24)',
      }}
    >
      <strong style={{ fontSize: 28, lineHeight: 1.05 }}>
        {title}
      </strong>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', fontSize: 13 }}>
        <span data-testid="showdown-contributed">Contributed: {formatPoints(contributed)}</span>
        <span data-testid="showdown-payout">Payout: {formatPoints(payout)}</span>
        <strong data-testid="showdown-net">
          Net: {net > 0 ? '+' : ''}{formatPoints(net)}
        </strong>
      </div>
      {payout > 0 && net <= 0 && winParts.length ? (
        <span style={{ fontSize: 12, opacity: 0.9 }}>Won {winParts.join(' + ')}, but finished with a net loss</span>
      ) : null}
      {personalPots.length > 1 ? (
        <div
          data-testid="personal-pot-results"
          style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center', marginTop: 2 }}
        >
          {personalPots.map(({ label, result }) => (
            <span
              key={label}
              style={{
                border: '1px solid rgba(255,255,255,.42)',
                borderRadius: 999,
                background: 'rgba(15,23,42,.3)',
                padding: '2px 7px',
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              {label}:{' '}
              {!result?.eligible
                ? result?.contributed
                  ? `not eligible · ${formatPoints(result.net ?? -result.contributed)}`
                  : 'not eligible'
                : result.net === undefined
                  ? `payout ${formatPoints(result.payout)}`
                  : `${result.net > 0 ? '+' : ''}${formatPoints(result.net)}`}
            </span>
          ))}
        </div>
      ) : null}
      {winners ? (
        <span style={{ fontSize: 13, opacity: 0.9 }}>
          {winners}
        </span>
      ) : null}
    </div>
  );
}

function PlayerComboSide({ combo, kind }: { combo?: PlayerCombo; kind: 'high' | 'low' }) {
  if (!combo) return null;
  const isHigh = kind === 'high';
  const rank = isHigh ? combo.highRank : combo.lowRank;
  const cards = isHigh ? combo.highCombo : combo.lowCombo;

  return (
    <aside className={`combo-side ${kind}`} data-testid={`${kind}-combo-side`}>
      <div className="combo-side-title">
        <span>{isHigh ? 'HI' : 'LO'}</span>
        <span className="combo-side-rank">{rank ?? 'none'}</span>
      </div>
      {cards ? (
        <div className="combo-side-cards">
          <SideComboCards combo={cards} />
        </div>
      ) : null}
    </aside>
  );
}

function ReplayControls({ score, onReplayHand, canReplay }: {
  score?: PartyScore;
  onReplayHand: (handId: string) => void;
  canReplay: boolean;
}) {
  const [handNumber, setHandNumber] = useState('');
  if (!score || !canReplay) return null;
  const requestedHandText = handNumber.trim().toUpperCase();
  const requestedHand = score.hands.find((hand) => (
    hand.handCode?.toUpperCase() === requestedHandText || hand.handNumber === Number(requestedHandText)
  ));
  const latestHands = [...score.hands].sort((a, b) => b.handNumber - a.handNumber).slice(0, 5);

  return (
    <div
      style={{
        marginTop: 12,
        border: '1px solid #d1d5db',
        borderRadius: 6,
        background: '#f8fafc',
        padding: '6px 8px',
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
        fontSize: 13,
      }}
    >
      <span style={{ color: '#475569', fontWeight: 700 }}>Replay</span>
      <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        Hand
        <input
          placeholder="HA0001"
          type="text"
          value={handNumber}
          onChange={(event) => setHandNumber(event.target.value)}
          style={{ width: 76, padding: '2px 5px' }}
        />
      </label>
      <button
        disabled={!requestedHand}
        onClick={() => requestedHand && onReplayHand(requestedHand.id)}
      >
        Replay
      </button>
      {handNumber && !requestedHand ? (
        <span style={{ color: '#b91c1c' }}>not found</span>
      ) : null}
      <span style={{ color: '#475569' }}>Latest:</span>
      {latestHands.map((hand) => (
        <button
          key={hand.id}
          onClick={() => onReplayHand(hand.id)}
          title={hand.replayOfHandId ? 'This hand is already a replay' : 'Replay this hand layout'}
        >
          {handLabel(hand.handCode, hand.handNumber, hand.id)}{hand.replayOfHandId ? 'R' : ''}
        </button>
      ))}
    </div>
  );
}

function PartyStatistics({ score, players }: {
  score?: PartyScore;
  players: Array<{ id: string; name?: string }>;
}) {
  if (!score) return null;
  const completedHands = score.hands
    .filter((hand) => hand.stage === 'showdown')
    .sort((a, b) => b.handNumber - a.handNumber);
  const percentage = (count: number, hands: number) => (
    hands ? `${Math.round((count / hands) * 100)}%` : '0%'
  );
  const metrics = players.map((player) => {
    const hands = completedHands.filter((hand) => (
      hand.players.some((seat) => seat.id === player.id && seat.participated)
    ));
    const netResults = hands.map((hand) => hand.net.find((result) => result.id === player.id)?.total ?? 0);
    const folds = hands.filter((hand) => hand.players.find((seat) => seat.id === player.id)?.folded).length;
    const wins = netResults.filter((net) => net > 0).length;
    const losses = netResults.filter((net) => net < 0).length;
    const net = netResults.reduce((total, result) => total + result, 0);
    return {
      ...player,
      hands: hands.length,
      foldPercent: percentage(folds, hands.length),
      winPercent: percentage(wins, hands.length),
      lossPercent: percentage(losses, hands.length),
      net,
      average: hands.length ? net / hands.length : 0,
      maxWin: Math.max(0, ...netResults),
      maxLoss: Math.min(0, ...netResults),
      stack: score.totals.find((total) => total.id === player.id)?.total ?? 0,
    };
  });

  return (
    <section className="party-summary" data-testid="party-statistics">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Cumulative statistics</h2>
        <strong
          data-testid="completed-hand-count"
          style={{ borderRadius: 999, background: '#ecfdf5', color: '#065f46', padding: '6px 10px' }}
        >
          {completedHands.length} {completedHands.length === 1 ? 'hand' : 'hands'}
        </strong>
      </div>

      <div className="party-metrics">
        <table className="result-points" data-testid="party-totals">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Player</th>
              <th>Hands</th>
              <th>Fold</th>
              <th>Win</th>
              <th>Loss</th>
              <th>Net</th>
              <th>Avg/hand</th>
              <th>Max win</th>
              <th>Max loss</th>
              <th>Stack</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((player) => (
              <tr key={player.id} data-testid={`party-total-${player.id}`}>
                <td style={{ fontWeight: 800 }}>{playerLabel(players, player.id)}</td>
                <td data-testid={`party-hands-${player.id}`} style={{ textAlign: 'right' }}>{player.hands}</td>
                <td data-testid={`party-fold-${player.id}`} style={{ textAlign: 'right' }}>{player.foldPercent}</td>
                <td data-testid={`party-win-${player.id}`} style={{ textAlign: 'right', color: '#047857', fontWeight: 800 }}>{player.winPercent}</td>
                <td data-testid={`party-loss-${player.id}`} style={{ textAlign: 'right', color: '#b91c1c', fontWeight: 800 }}>{player.lossPercent}</td>
                <td data-testid={`party-net-${player.id}`} style={{ textAlign: 'right', fontWeight: 900 }}>{formatPoints(player.net)}</td>
                <td data-testid={`party-average-${player.id}`} style={{ textAlign: 'right' }}>{formatPoints(player.average)}</td>
                <td data-testid={`party-max-win-${player.id}`} style={{ textAlign: 'right', color: '#047857' }}>{formatPoints(player.maxWin)}</td>
                <td data-testid={`party-max-loss-${player.id}`} style={{ textAlign: 'right', color: '#b91c1c' }}>{formatPoints(player.maxLoss)}</td>
                <td data-testid={`party-stack-${player.id}`} style={{ textAlign: 'right', fontWeight: 900 }}>{formatPoints(player.stack)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ResultView({ result, players, contributions = {}, currentPlayerId }: {
  result?: HiLoResult;
  players: Array<{ id: string; name?: string }>;
  contributions?: Record<string, number>;
  currentPlayerId?: string;
}) {
  const [showAllHands, setShowAllHands] = useState(false);
  if (!result) return null;
  const displayName = (id: string) => playerLabel(players, id);
  const highWinnerResults = result.highWinners
    .map((id) => playerResult(result, id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));
  const lowWinnerResults = result.lowWinners
    .map((id) => playerResult(result, id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));
  const uncontestedWinnerIds = [...new Set(
    result.sidePots
      .map(pot => pot.uncontestedWinnerId)
      .filter((id): id is string => Boolean(id)),
  )];
  const contestedPots = result.sidePots.filter(isContestedPot);
  const potWinnerLine = (ids: string[], pool: number) => ids.length
    ? `${ids.map(displayName).join(', ')} · ${formatPoints(pool / ids.length)} each`
    : 'No qualifying low';

  return (
    <section className="result-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <span style={{ color: '#64748b', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Hand complete
          </span>
          <h2 style={{ margin: '2px 0 0' }}>Results</h2>
        </div>
        <strong style={{ borderRadius: 999, background: '#ecfdf5', color: '#065f46', padding: '6px 10px' }}>
          Pot {formatPoints(result.potCoins)} coins
        </strong>
      </div>

      <div className="winner-grid">
        <section className="winner-card">
          {!highWinnerResults.length && uncontestedWinnerIds.length ? (
            <h3 style={{ margin: 0, color: '#991b1b' }}>
              Uncontested winner{uncontestedWinnerIds.length > 1 ? 's' : ''}: {uncontestedWinnerIds.map(displayName).join(', ')}
            </h3>
          ) : null}
          {highWinnerResults.map((winner) => (
            <div key={winner.id}>
              <h3 style={{ margin: '0 0 6px', color: '#991b1b' }}>
                High winner{highWinnerResults.length > 1 ? 's' : ''}: {displayName(winner.id)} - {winner.highRank}
              </h3>
              {winner.highCombo ? <ComboCardRow combo={winner.highCombo} tone="high" /> : null}
            </div>
          ))}
        </section>

        <section className="winner-card">
          {result.noLow ? (
            <h3 style={{ margin: 0, color: '#047857' }}>Low winner: No qualifying low</h3>
          ) : lowWinnerResults.map((winner) => (
            <div key={winner.id}>
              <h3 style={{ margin: '0 0 6px', color: '#047857' }}>
                Low winner{lowWinnerResults.length > 1 ? 's' : ''}: {displayName(winner.id)} - {winner.lowRank}
              </h3>
              {winner.lowCombo ? <ComboCardRow combo={winner.lowCombo} tone="low" /> : null}
            </div>
          ))}
        </section>
      </div>

      {contestedPots.length > 1 ? (
        <div
          data-testid="showdown-side-pots"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: 8,
            marginTop: 12,
          }}
        >
          {contestedPots.map((pot, index) => {
            const highPool = pot.noLow ? pot.amount : pot.amount / 2;
            const lowPool = pot.noLow ? 0 : pot.amount / 2;
            const personalResult = currentPlayerId
              ? pot.players.find(player => player.id === currentPlayerId)
              : undefined;
            return (
              <section
                key={`${index}-${pot.amount}`}
                style={{
                  border: `1px solid ${index === 0 ? '#a7f3d0' : '#bfdbfe'}`,
                  borderRadius: 12,
                  background: index === 0 ? '#f0fdf4' : '#eff6ff',
                  padding: '9px 10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ color: index === 0 ? '#047857' : '#1d4ed8' }}>
                    {index === 0 ? 'Main pot' : `Side pot ${index}`}
                  </strong>
                  <strong>{formatPoints(pot.amount)}</strong>
                </div>
                <div style={{ marginTop: 5, color: '#64748b', fontSize: 12 }}>
                  Eligible: {pot.eligiblePlayerIds.map(displayName).join(', ')}
                </div>
                {pot.uncontestedWinnerId ? (
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    <strong>Uncontested:</strong>{' '}
                    {displayName(pot.uncontestedWinnerId)} · {formatPoints(pot.amount)}
                  </div>
                ) : (
                  <>
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      <strong style={{ color: '#991b1b' }}>High:</strong>{' '}
                      {potWinnerLine(pot.highWinners, highPool)}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 13 }}>
                      <strong style={{ color: '#047857' }}>Low:</strong>{' '}
                      {pot.noLow ? 'No qualifying low' : potWinnerLine(pot.lowWinners, lowPool)}
                    </div>
                  </>
                )}
                {currentPlayerId ? (
                  <div
                    data-testid={`personal-pot-${index}`}
                    style={{
                      marginTop: 7,
                      borderTop: '1px solid rgba(100,116,139,.25)',
                      paddingTop: 6,
                      color: personalResult?.eligible ? '#0f172a' : '#64748b',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {!personalResult?.eligible
                      ? `You: not eligible${
                        personalResult?.contributed
                          ? ` · contributed ${formatPoints(personalResult.contributed)} · net ${formatPoints(personalResult.net ?? -personalResult.contributed)}`
                          : ''
                      }`
                      : personalResult.net === undefined
                        ? `You: payout ${formatPoints(personalResult.payout)}`
                        : `You: contributed ${formatPoints(personalResult.contributed ?? 0)} · payout ${formatPoints(personalResult.payout)} · net ${personalResult.net > 0 ? '+' : ''}${formatPoints(personalResult.net)}`}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      <h3 style={{ margin: '14px 0 6px' }}>Points</h3>
      <table className="result-points">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Player</th>
            <th>High</th>
            <th>Low</th>
            <th>Returned</th>
            <th>Contributed</th>
            <th>Payout</th>
            <th>Net</th>
          </tr>
        </thead>
        <tbody>
          {result.points.map((score) => {
            const contributed = contributions[score.id] ?? 0;
            const net = score.total - contributed;
            return (
              <tr key={score.id}>
                <td>{displayName(score.id)}</td>
                <td style={{ textAlign: 'right' }}>{formatPoints(score.high)}</td>
                <td style={{ textAlign: 'right' }}>{formatPoints(score.low)}</td>
                <td style={{ textAlign: 'right' }}>{formatPoints(score.uncontested ?? 0)}</td>
                <td style={{ textAlign: 'right' }}>{formatPoints(contributed)}</td>
                <td style={{ textAlign: 'right', fontWeight: 900 }}>{formatPoints(score.total)}</td>
                <td
                  data-testid={`result-net-${score.id}`}
                  style={{ textAlign: 'right', fontWeight: 900, color: net > 0 ? '#047857' : net < 0 ? '#b91c1c' : '#475569' }}
                >
                  {net > 0 ? '+' : ''}{formatPoints(net)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        type="button"
        aria-expanded={showAllHands}
        onClick={() => setShowAllHands((shown) => !shown)}
        style={{ marginTop: 12, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', padding: '7px 12px', fontWeight: 800 }}
      >
        {showAllHands ? 'Hide all hands' : 'Show all hands'}
      </button>
      {showAllHands ? (
        <div className="all-hands">
          {result.players.map((player) => (
            <section className="hand-detail" key={player.id}>
              <h3 style={{ margin: '0 0 5px' }}>{displayName(player.id)}{player.folded ? ' - folded' : ''}</h3>
              <p style={{ margin: '0 0 4px' }}>High: {player.highRank}</p>
              {player.highCombo ? <ComboCardRow combo={player.highCombo} tone="high" /> : null}
              <p style={{ margin: '0 0 4px' }}>Low: {player.lowRank ?? 'no low'}</p>
              {player.lowCombo ? <ComboCardRow combo={player.lowCombo} tone="low" /> : null}
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PlayerPage() {
  const [player, setPlayer] = useState<PlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [newDealLinks, setNewDealLinks] = useState<Array<{ id: string; url: string }>>([]);
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);
  const [betSize, setBetSize] = useState<BetSizeOption>('blind');
  const [activeView, setActiveView] = useState<'table' | 'stats'>('table');
  const [, , handId, playerId, token] = window.location.pathname.split('/');

  useEffect(() => {
    setActiveView('table');
  }, [handId]);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/player/${handId}/${playerId}/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((nextPlayer) => setPlayer((currentPlayer) => (
        currentPlayer
        && currentPlayer.handId === nextPlayer.handId
        && currentPlayer.revision > nextPlayer.revision
          ? currentPlayer
          : nextPlayer
      )))
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load hand'));

    const socket = new WebSocket(WS_URL);
    socket.onopen = () => {
      setSocketReady(true);
      socket.send(JSON.stringify({ action: 'join_player', handId, playerId, token }));
    };
    socket.onclose = () => {
      setSocketReady(false);
    };
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'player_state') {
        setPlayer((currentPlayer) => (
          currentPlayer
          && currentPlayer.handId === message.data.handId
          && currentPlayer.revision > message.data.revision
            ? currentPlayer
            : message.data
        ));
        setNotice(null);
      }
      if (message.type === 'hand_dealt' && message.data?.playerLinks) {
        setIsCreatingDeal(false);
        setNewDealLinks(message.data.playerLinks);
        const samePlayerLink = message.data.playerLinks.find((link: { id: string; url: string }) => (
          link.id === playerId
        ));

        if (samePlayerLink) {
          setNotice('New deal created. Opening your new hand.');
          window.location.href = samePlayerLink.url;
        } else {
          setNotice('New deal created.');
        }
      }
      if (message.type === 'hand_updated' && message.data?.id === handId) {
        socket.send(JSON.stringify({ action: 'join_player', handId, playerId, token }));
      }
      if (message.type === 'error') {
        setIsCreatingDeal(false);
        setError(message.message);
      }
    };
    setWs(socket);

    return () => {
      setSocketReady(false);
      socket.close();
    };
  }, [handId, playerId, token]);

  function sendMove(move: PlayerMove, amount?: number) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setNotice('Connecting to server. Try again in a moment.');
      return;
    }

    setNotice(`${move[0].toUpperCase()}${move.slice(1)} sent.`);
    ws.send(JSON.stringify({ action: 'player_move', handId, playerId, token, move, amount }));
  }

  function startNewDeal() {
    if (isCreatingDeal) return;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setNotice('Connecting to server. Try again in a moment.');
      return;
    }

    setIsCreatingDeal(true);
    setNewDealLinks([]);
    setNotice('Creating new deal.');
    ws.send(JSON.stringify({ action: 'new_deal', handId }));
    window.setTimeout(() => {
      setIsCreatingDeal((stillCreating) => {
        if (stillCreating) {
          setNotice('New deal is taking longer than expected. Try again.');
        }
        return false;
      });
    }, 10_000);
  }

  function replayDeal(sourceHandId = handId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setNotice('Connecting to server. Try again in a moment.');
      return;
    }

    setNewDealLinks([]);
    setNotice('Creating replay deal.');
    ws.send(JSON.stringify({ action: 'replay_deal', handId: sourceHandId }));
  }

  if (error) return <div style={{ padding: 12 }}>Error: {error}</div>;
  if (!player) return <div style={{ padding: 12 }}>Loading...</div>;

  const canAct = socketReady && player.stage !== 'showdown' && !player.isBot && !player.folded && player.currentPlayerId === player.playerId;
  const currentBet = player.currentBet ?? 0;
  const yourRoundBet = player.roundBets?.[player.playerId] ?? 0;
  const bigBlind = player.blinds?.big ?? 4;
  const raiseCount = player.raiseCount ?? 0;
  const maxRaises = player.maxRaises ?? 3;
  const callAmount = Math.max(currentBet - yourRoundBet, 0);
  const call = callAction(callAmount, player.stack);
  const betAmount = betTargetAmount(betSize, player.potCoins, bigBlind, player.stack);
  const raiseTo = raiseTargetAmount(betSize, player.potCoins, currentBet, yourRoundBet, bigBlind, player.stack);
  const betIsAllIn = isAllInWager(betAmount, yourRoundBet, player.stack);
  const raiseIsAllIn = isAllInWager(raiseTo, yourRoundBet, player.stack);
  const canCall = canAct && yourRoundBet < currentBet;
  const canRaise = canAct && currentBet > 0 && raiseCount < maxRaises && call.canRaise;
  const hasContinuation = Boolean(player.nextHandId || player.nextReplayHandId);
  const remainingPlayers = player.players.filter((seat) => {
    const settledStack = player.partyScore?.totals.find((total) => total.id === seat.id)?.total;
    return (settledStack ?? seat.stack ?? 0) > 0;
  });
  const tournamentWinner = remainingPlayers.length === 1 ? remainingPlayers[0] : undefined;
  const canContinue = socketReady && player.stage === 'showdown' && !hasContinuation && !tournamentWinner;
  const showActionDock = canAct;
  const completedPartyHands = player.partyScore?.hands.filter((hand) => hand.stage === 'showdown') ?? [];
  const showStatsTile = Boolean(
    tournamentWinner || completedPartyHands.length || newDealLinks.length
  );
  const isStatsView = activeView === 'stats' && showStatsTile;
  const otherPlayers = player.players.filter((seat) => seat.id !== player.playerId);
  const statusPillStyle: React.CSSProperties = {
    border: '1px solid #d1d5db',
    borderRadius: 999,
    padding: '3px 8px',
    background: '#fff',
    fontSize: 12,
    lineHeight: 1.2,
  };

  return (
    <div className="poker-page">
      <style>{PLAYER_PAGE_STYLES}</style>
      <nav className="view-tabs" role="tablist" aria-label="Game views">
        <button
          id="table-tab"
          type="button"
          role="tab"
          aria-controls="table-panel"
          aria-selected={!isStatsView}
          className={`view-tab${!isStatsView ? ' is-active' : ''}`}
          onClick={() => setActiveView('table')}
        >
          TABLE
        </button>
        <button
          id="stats-tab"
          type="button"
          role="tab"
          aria-controls="stats-panel"
          aria-selected={isStatsView}
          className={`view-tab${isStatsView ? ' is-active' : ''}`}
          disabled={!showStatsTile}
          onClick={() => setActiveView('stats')}
        >
          STATISTICS
        </button>
      </nav>

      {!isStatsView ? <section
        id="table-panel"
        role="tabpanel"
        aria-labelledby="table-tab"
        className="game-tile"
        data-testid="game-tile"
      >
      {!socketReady ? (
        <div className="game-toolbar">
          <span
            style={{
              ...statusPillStyle,
              borderColor: '#dc2626',
              background: '#fef2f2',
              color: '#b91c1c',
              fontWeight: 800,
            }}
          >
            disconnected
          </span>
        </div>
      ) : null}

      <div
        className={`poker-table${otherPlayers.length >= 5 ? ' is-crowded' : ''}`}
        data-testid="poker-table"
      >
        {player.replayOfHandId ? <HandBanner player={player} /> : null}
        <div
          className="opponents-row"
          data-testid="opponents-grid"
          data-opponent-count={otherPlayers.length}
        >
          {otherPlayers.map((seat) => (
            <PlayerSeat
              key={seat.id}
              id={seat.id}
              name={seat.name}
              folded={seat.folded}
              isYou={false}
              isBot={seat.isBot}
              hole={seat.hole}
              cardCount={seat.cardCount}
              compact
              score={totalScore(player.partyScore, seat.id)}
              action={latestActionForPlayer(player.actions, seat.id, player.stage)}
              resultPlayer={player.cardsRevealed ? playerResult(player.result, seat.id) : undefined}
              isHighWinner={Boolean(player.cardsRevealed && player.showdownSummary?.highWinners.includes(seat.id))}
              isLowWinner={Boolean(player.cardsRevealed && player.showdownSummary?.lowWinners.includes(seat.id))}
              isCurrentTurn={player.stage !== 'showdown' && player.currentPlayerId === seat.id}
              blindLabel={playerBlindLabel(player.blinds, seat.id, player.stage)}
            />
          ))}
        </div>

        <section
          className={`table-center${player.stage === 'showdown' ? ' has-showdown' : ''}`}
          style={{
            textAlign: 'center',
            display: 'grid',
            gap: 4,
          }}
        >
          {player.stage === 'showdown' ? (
            <div className="table-showdown">
              <ShowdownStatus player={player} />
            </div>
          ) : null}
          <div className="table-stage" data-testid="table-stage"><StreetBadge stage={player.stage} /></div>
          <div className="table-board" data-testid="table-board"><BoardRow cards={player.community} compact /></div>
          {canContinue || player.nextPlayerLink ? (
            <div className="table-new-deal" data-testid="table-new-deal">
              {canContinue ? (
                <button
                  className="action-button primary"
                  disabled={isCreatingDeal}
                  onClick={startNewDeal}
                >
                  {isCreatingDeal ? 'Creating…' : 'New deal'}
                </button>
              ) : null}
              {player.nextPlayerLink ? (
                <button
                  className="action-button primary"
                  onClick={() => { window.location.href = player.nextPlayerLink!.url; }}
                >
                  New deal
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="table-pot" data-testid="table-pot">
            <PotDisplay value={player.potCoins} currentBet={currentBet} breakdown={player.potBreakdown} />
          </div>
        </section>

        <div className="hero-zone">
          <PlayerComboSide combo={player.currentCombo} kind="high" />
          <div className="hero-seat" style={{ display: 'flex', justifyContent: 'center' }}>
            <PlayerSeat
              id={player.playerId}
              name={player.playerName}
              folded={player.folded}
              isYou
              isBot={player.isBot}
              hole={player.hole}
              cardCount={player.hole.length}
              compact
              score={totalScore(player.partyScore, player.playerId)}
              resultPlayer={player.cardsRevealed ? playerResult(player.result, player.playerId) : undefined}
              isHighWinner={Boolean(
                player.cardsRevealed && player.showdownSummary?.highWinners.includes(player.playerId)
              )}
              isLowWinner={Boolean(
                player.cardsRevealed && player.showdownSummary?.lowWinners.includes(player.playerId)
              )}
              blindLabel={playerBlindLabel(player.blinds, player.playerId, player.stage)}
              isCurrentTurn={player.stage !== 'showdown' && player.currentPlayerId === player.playerId}
            />
          </div>
          <PlayerComboSide combo={player.currentCombo} kind="low" />
        </div>
      </div>

      {showActionDock ? <div className="action-dock">
        {canAct && (currentBet === 0 || raiseCount < maxRaises) ? (
          <div className="bet-sizes">
            <span style={{ color: '#64748b', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Bet size</span>
            {BET_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setBetSize(option.value)}
                className={`bet-size-button${betSize === option.value ? ' is-selected' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        <div className="main-actions">
        {canAct && callAmount === 0 ? (
          <>
            <button className="action-button primary" onClick={() => sendMove('check')}>Check</button>
            {currentBet === 0 ? (
              <button className="action-button" onClick={() => sendMove('bet', betAmount)}>
                {betIsAllIn ? 'Bet all-in' : 'Bet'} {formatPoints(betAmount)}
              </button>
            ) : null}
            {currentBet > 0 && raiseCount < maxRaises ? (
              <button className="action-button" disabled={!canRaise} onClick={() => sendMove('raise', raiseTo)}>
                {raiseIsAllIn ? 'Raise all-in to' : 'Raise to'} {formatPoints(raiseTo)} ({raiseCount}/{maxRaises})
              </button>
            ) : null}
            <button
              className="action-button danger"
              onClick={() => sendMove('fold')}
            >
              Fold
            </button>
          </>
        ) : null}
        {canAct && callAmount > 0 ? (
          <>
            <button className="action-button primary" disabled={!canCall} onClick={() => sendMove('call')}>
              {call.isAllIn ? 'All-in' : 'Call'} {formatPoints(call.amount)}
            </button>
            {raiseCount < maxRaises ? (
              <button className="action-button" disabled={!canRaise} onClick={() => sendMove('raise', raiseTo)}>
                {raiseIsAllIn ? 'Raise all-in to' : 'Raise to'} {formatPoints(raiseTo)} ({raiseCount}/{maxRaises})
              </button>
            ) : null}
            <button
              className="action-button danger"
              onClick={() => sendMove('fold')}
            >
              Fold
            </button>
          </>
        ) : null}
        </div>
      </div> : null}
      {notice ? (
        <p className="game-notice">
          {notice}
        </p>
      ) : null}
      </section> : null}

      {isStatsView ? <section
        id="stats-panel"
        role="tabpanel"
        aria-labelledby="stats-tab"
        className="stats-tile"
        data-testid="stats-tile"
      >
      {tournamentWinner ? (
        <p style={{ fontWeight: 800 }}>
          Tournament winner: {tablePlayerName(tournamentWinner.name, tournamentWinner.id)}
        </p>
      ) : null}
      <PartyStatistics score={player.partyScore} players={player.players} />
      {player.cardsRevealed ? (
        <ResultView
          result={player.result}
          players={player.players}
          contributions={player.totalContributions}
          currentPlayerId={player.playerId}
        />
      ) : null}

      {newDealLinks.length ? (
        <section style={{ marginTop: 18, border: '1px solid #d1d5db', borderRadius: 8, padding: 12 }}>
          <h2>New deal</h2>
          <ul>
            {newDealLinks.map((link) => (
              <li key={link.id}>
                {link.id}:{' '}
                <a href={link.url} target="_blank" rel="noreferrer">
                  open page
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ReplayControls
        score={player.partyScore}
        canReplay={canContinue}
        onReplayHand={replayDeal}
      />
      </section> : null}

      {player.dealCode ? (
        <footer className="deal-footer" data-testid="deal-footer">
          <span className="deal-chip">DEAL {player.dealCode}</span>
        </footer>
      ) : null}

    </div>
  );
}

function DebugPage() {
  const [hand, setHand] = useState<FullHandView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const [, , handId] = window.location.pathname.split('/');

    fetch(`${SERVER_URL}/admin/hands/${handId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(setHand)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load hand'));
  }, []);

  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>;
  if (!hand) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <style>{PLAYER_PAGE_STYLES}</style>
      <h1>Debug hand</h1>
      <p title={hand.id}>Hand: {handLabel(hand.handCode, hand.handNumber, hand.id)}</p>
      <p title={hand.partyId}>Party: {partyLabel(hand.partyCode, hand.partyId)}</p>
      <p>Pot: {formatPoints(hand.potCoins ?? 2)} coins</p>
      <p>Stage: {hand.stage ?? 'showdown'}</p>
      <p>Turn: {hand.currentPlayerId ?? '-'}</p>
      <h2>Board</h2>
      <CardRow cards={hand.fullCommunity ?? hand.community} />

      <h2>Players</h2>
      <div style={{ display: 'grid', gap: 18 }}>
        {hand.players.map((player) => (
          <section key={player.id}>
            <h3>{player.id}</h3>
            {player.folded ? <p>Folded</p> : null}
            <CardRow cards={player.hole} />
          </section>
        ))}
      </div>

      {hand.cardsRevealed ? (
        <ResultView result={hand.result} players={hand.players} contributions={hand.totalContributions} />
      ) : null}

      <h2>Actions</h2>
      {hand.actions?.length ? (
        <ul>
          {hand.actions.map((action) => (
            <li key={`${action.stage}-${action.playerId}-${action.at}`}>
              {action.stage}: {action.playerId} {action.move}
            </li>
          ))}
        </ul>
      ) : (
        <p>No actions yet.</p>
      )}
    </div>
  );
}

function LobbyCardFan({ empty = false }: { empty?: boolean }) {
  return (
    <div style={{ position: 'relative', width: 58, height: 42, opacity: empty ? 0.28 : 1 }}>
      {[-18, 0, 18].map((rotation, index) => (
        <img
          key={rotation}
          src="/cards/revk/BACK.svg"
          alt=""
          style={{
            position: 'absolute',
            left: 17 + index * 3,
            bottom: 0,
            width: 27,
            height: 39,
            borderRadius: 3,
            boxShadow: '0 2px 5px rgba(15,23,42,.32)',
            transformOrigin: '50% 90%',
            transform: `rotate(${rotation}deg) translateY(${Math.abs(rotation) / 6}px)`,
          }}
        />
      ))}
    </div>
  );
}

function LobbyTable({
  lobby,
  memberId,
  canRemoveBots = false,
  onRemoveBot,
}: {
  lobby: LobbyView;
  memberId?: string | null;
  canRemoveBots?: boolean;
  onRemoveBot?: (memberId: string) => void;
}) {
  const seats = Array.from({ length: lobby.maxPlayers }, (_, index) => lobby.members[index]);

  return (
    <div style={{ overflowX: 'auto', padding: '4px 0 10px' }}>
      <div
        data-testid="lobby-table"
        style={{
          position: 'relative',
          width: '100%',
          minWidth: 620,
          height: 440,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '58px 42px',
            border: '8px solid #53351f',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at center, #16845c 0%, #08734d 55%, #07543b 100%)',
            boxShadow: 'inset 0 0 0 3px rgba(255,255,255,.14), inset 0 0 45px rgba(0,0,0,.28), 0 14px 28px rgba(15,23,42,.2)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 18,
              border: '1px solid rgba(255,255,255,.18)',
              borderRadius: '50%',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeContent: 'center',
              justifyItems: 'center',
              color: '#fff',
              textAlign: 'center',
              textShadow: '0 2px 4px rgba(0,0,0,.35)',
            }}
          >
            <strong style={{ fontSize: 20, letterSpacing: '.12em' }}>OMAHA HI-LO</strong>
            <span style={{ marginTop: 5, fontSize: 12, fontWeight: 800, opacity: 0.82 }}>WAITING FOR PLAYERS</span>
            <span style={{ marginTop: 7, border: '1px solid rgba(255,255,255,.4)', borderRadius: 999, padding: '3px 10px', fontWeight: 900 }}>
              {lobby.members.length} / {lobby.maxPlayers}
            </span>
          </div>
        </div>

        {seats.map((seat, index) => {
          const angle = (Math.PI / 2) + ((Math.PI * 2 * index) / seats.length);
          const left = 50 + 42 * Math.cos(angle);
          const top = 50 + 38 * Math.sin(angle);
          const isYou = seat?.id === memberId;

          return (
            <div
              key={seat?.id ?? `empty-${index}`}
              data-lobby-seat={index + 1}
              data-lobby-member-id={seat?.id}
              style={{
                position: 'absolute',
                left: `${left}%`,
                top: `${top}%`,
                width: 112,
                display: 'grid',
                justifyItems: 'center',
                transform: 'translate(-50%, -50%)',
                zIndex: 2,
              }}
            >
              <LobbyCardFan empty={!seat} />
              <div
                style={{
                  width: '100%',
                  minHeight: 38,
                  marginTop: -2,
                  border: `2px solid ${isYou ? '#fbbf24' : seat ? '#dbe4df' : 'rgba(255,255,255,.55)'}`,
                  borderRadius: 10,
                  background: seat ? '#fff' : 'rgba(15,23,42,.72)',
                  color: seat ? '#172033' : '#e2e8f0',
                  padding: '5px 7px',
                  textAlign: 'center',
                  boxShadow: '0 4px 10px rgba(15,23,42,.2)',
                  fontSize: 12,
                }}
              >
                <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {seat ? tablePlayerName(seat.name, seat.id) : 'BOT ON START'}
                </strong>
                <span style={{ fontSize: 10, fontWeight: 800, color: seat ? '#64748b' : '#cbd5e1' }}>
                  {seat ? `${seat.isHost ? 'HOST · ' : ''}${seat.isBot ? 'BOT' : isYou ? 'YOU' : 'READY'}` : `SEAT ${index + 1}`}
                </span>
              </div>
              {seat?.isBot && canRemoveBots && onRemoveBot ? (
                <button
                  onClick={() => onRemoveBot(seat.id)}
                  style={{ minHeight: 24, marginTop: 3, padding: '2px 7px', borderRadius: 999, fontSize: 10 }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LobbyPage() {
  const [, , lobbyId] = window.location.pathname.split('/');
  const memberHint = new URLSearchParams(window.location.search).get('member');
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [botName, setBotName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const storageKey = memberHint ? `omaha-lobby-${lobbyId}-${memberHint}` : undefined;

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => {
      setSocketReady(true);
      const saved = storageKey ? window.localStorage.getItem(storageKey) : null;
      if (saved) {
        try {
          const credentials = JSON.parse(saved);
          ws.send(JSON.stringify({ action: 'join_lobby', lobbyId, ...credentials }));
        } catch {
          window.localStorage.removeItem(storageKey);
          ws.send(JSON.stringify({ action: 'view_lobby', lobbyId }));
        }
      } else {
        ws.send(JSON.stringify({ action: 'view_lobby', lobbyId }));
      }
    };
    ws.onclose = () => setSocketReady(false);
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'lobby_joined') {
        const credentials = {
          memberId: message.data.memberId,
          token: message.data.token,
        };
        const personalStorageKey = `omaha-lobby-${lobbyId}-${message.data.memberId}`;
        window.localStorage.setItem(personalStorageKey, JSON.stringify(credentials));
        window.history.replaceState(null, '', `/lobby/${lobbyId}?member=${message.data.memberId}`);
        setMemberId(message.data.memberId);
        setLobby(message.data.lobby);
        setNotice(null);
      } else if (message.type === 'lobby_updated') {
        setLobby(message.data);
      } else if (message.type === 'lobby_started' && message.data?.playerUrl) {
        window.location.href = message.data.playerUrl;
      } else if (message.type === 'error') {
        setNotice(message.message);
      }
    };
    setSocket(ws);
    return () => ws.close();
  }, [lobbyId, storageKey]);

  function send(action: string, extra: Record<string, unknown> = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setNotice('Connecting to server. Try again in a moment.');
      return;
    }
    socket.send(JSON.stringify({ action, lobbyId, ...extra }));
  }

  function join() {
    if (!name.trim()) {
      setNotice('Enter your name.');
      return;
    }
    send('join_lobby', { name: name.trim() });
  }

  const isHost = Boolean(lobby && memberId === lobby.hostMemberId);
  const inviteUrl = `${window.location.origin}/lobby/${lobbyId}`;

  return (
    <div style={{ minHeight: '100vh', padding: 20, fontFamily: 'system-ui, sans-serif', background: '#edf3ef' }}>
      <main style={{ width: 'min(100%, 760px)', margin: '0 auto', display: 'grid', gap: 14 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <a href="/" style={{ color: '#047857', fontWeight: 800, textDecoration: 'none' }}>← Omaha Hi-Lo</a>
            <h1 style={{ margin: '5px 0 0' }}>Table lobby</h1>
          </div>
          <span style={{ color: socketReady ? '#166534' : '#64748b', fontWeight: 800 }}>
            {socketReady ? 'connected' : 'connecting...'}
          </span>
        </header>

        {!memberId ? (
          <section style={{ padding: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#fff', display: 'grid', gap: 12 }}>
            <h2 style={{ margin: 0 }}>Join the table</h2>
            {lobby ? (
              <>
                <strong>Players already here</strong>
                <LobbyTable lobby={lobby} />
                {lobby.status === 'waiting' ? <p style={{ margin: 0 }}>Enter your name and wait for the host to start.</p> : <p style={{ margin: 0 }}>This game has already started.</p>}
              </>
            ) : <p style={{ margin: 0 }}>Loading lobby…</p>}
            <label style={{ display: 'grid', gap: 6, fontWeight: 800 }}>
              Your name
              <input
                aria-label="Your name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') join();
                }}
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
              />
            </label>
            <button
              onClick={join}
              disabled={!socketReady || !lobby || lobby.status !== 'waiting' || lobby.members.length >= lobby.maxPlayers}
              style={{ padding: '9px 14px', fontWeight: 900 }}
            >
              Take a seat
            </button>
          </section>
        ) : lobby ? (
          <>
            <nav role="tablist" aria-label="Lobby views" style={{ display: 'flex', gap: 4, margin: '0 12px -15px', zIndex: 1 }}>
              <button role="tab" aria-selected="true" style={{ padding: '8px 18px', borderRadius: '12px 12px 0 0', border: '1px solid #cbd5e1', borderBottomColor: '#fff', background: '#fff', fontWeight: 900 }}>
                LOBBY
              </button>
            </nav>
            <section style={{ padding: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#fff', display: 'grid', gap: 14 }}>
              <div>
                <strong>Invite friends</strong>
                <div style={{ display: 'flex', gap: 8, marginTop: 7 }}>
                  <input aria-label="Invite link" readOnly value={inviteUrl} style={{ minWidth: 0, flex: 1, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }} />
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(inviteUrl);
                      setNotice('Invite link copied.');
                    }}
                    style={{ fontWeight: 800 }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <LobbyTable
                lobby={lobby}
                memberId={memberId}
                canRemoveBots={isHost && lobby.status === 'waiting'}
                onRemoveBot={(botMemberId) => send('lobby_remove_bot', { memberId: botMemberId })}
              />

              {isHost && lobby.status === 'waiting' ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    aria-label="Bot name"
                    placeholder="Bot name (optional)"
                    value={botName}
                    onChange={(event) => setBotName(event.target.value)}
                    style={{ flex: 1, minWidth: 170, padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8 }}
                  />
                  <button
                    onClick={() => {
                      send('lobby_add_bot', { name: botName.trim() });
                      setBotName('');
                    }}
                    disabled={lobby.members.length >= lobby.maxPlayers}
                    style={{ fontWeight: 800 }}
                  >
                    Add bot
                  </button>
                  <button
                    onClick={() => send('lobby_start')}
                    style={{ padding: '9px 16px', background: '#047857', color: '#fff', border: 0, borderRadius: 8, fontWeight: 900 }}
                  >
                    Start game · fill with bots
                  </button>
                </div>
              ) : null}
              {!isHost && lobby.status === 'waiting' ? <p style={{ margin: 0 }}>Waiting for the host to start the game…</p> : null}
              {notice ? <p role="status" style={{ margin: 0, color: notice.includes('copied') ? '#166534' : '#b45309' }}>{notice}</p> : null}
            </section>
          </>
        ) : <p>Loading lobby…</p>}
      </main>
    </div>
  );
}

function HomePage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [homeSocketReady, setHomeSocketReady] = useState(false);
  const [homeTab, setHomeTab] = useState<'lobby' | 'quick'>('lobby');
  const [hostName, setHostName] = useState('Dima');
  const [lobbySeats, setLobbySeats] = useState(4);
  const [messages, setMessages] = useState<DealMessage[]>([]);
  const [players, setPlayers] = useState(2);
  const [playersText, setPlayersText] = useState('2');
  const [playerNames, setPlayerNames] = useState<string[]>(['Dima', 'Anna_bot']);
  const [playerBots, setPlayerBots] = useState<boolean[]>([false, true]);
  const [homeReplayQuery, setHomeReplayQuery] = useState('');
  const [homeReplayError, setHomeReplayError] = useState<string | null>(null);
  const [homeNotice, setHomeNotice] = useState<string | null>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);

  useEffect(() => {
    let stopped = false;
    let reconnectTimer: number | undefined;
    let socket: WebSocket;

    function connect() {
      socket = new WebSocket(WS_URL);
      setWs(socket);
      socket.onopen = () => {
        setHomeSocketReady(true);
        setHomeNotice(null);
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages((current) => [...current, message]);
        if (message.type === 'hand_dealt' && message.data?.playerLinks) {
          setHomeNotice(null);
          setHomeReplayError(null);
        }
        if (message.type === 'error') {
          if (message.message === 'hand not found') {
            setHomeReplayError('Hand not found.');
          } else {
            setHomeNotice(message.message);
          }
        }
        if (message.type === 'lobby_joined') {
          const lobbyId = message.data.lobby.id;
          const memberId = message.data.memberId;
          window.localStorage.setItem(`omaha-lobby-${lobbyId}-${memberId}`, JSON.stringify({
            memberId: message.data.memberId,
            token: message.data.token,
          }));
          window.location.href = `/lobby/${lobbyId}?member=${memberId}`;
        }
      };
      socket.onclose = () => {
        setHomeSocketReady(false);
        if (!stopped) {
          reconnectTimer = window.setTimeout(connect, 1000);
        }
      };
      socket.onerror = () => {
        setHomeSocketReady(false);
      };
    }

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  useEffect(() => {
    setPlayerNames((current) => Array.from({ length: players }, (_, index) => (
      current[index] ?? DEFAULT_PLAYER_NAMES[index] ?? `Player ${index + 1}`
    )));
    setPlayerBots((current) => Array.from({ length: players }, (_, index) => Boolean(current[index])));
  }, [players]);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/version`)
      .then((res) => res.ok ? res.json() : undefined)
      .then((data) => {
        if (data?.shortCommit) setVersion(data);
      })
      .catch(() => undefined);
  }, []);

  const latestDeal = [...messages].reverse().find((message) => (
    message.type === 'hand_dealt' && message.data?.playerLinks
  ));

  function createDeal() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setHomeNotice('Connecting to server. Try again in a moment.');
      return;
    }

    setHomeNotice('Creating new deal.');
    ws.send(JSON.stringify({
      action: 'deal',
      players,
      playerNames: playerNames.map((name, index) => name.trim() || `Player ${index + 1}`),
      playerBots,
    }));
  }

  function createLobbyCommand() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setHomeNotice('Connecting to server. Try again in a moment.');
      return;
    }
    if (!hostName.trim()) {
      setHomeNotice('Enter your name.');
      return;
    }
    setHomeNotice('Creating lobby.');
    ws.send(JSON.stringify({
      action: 'create_lobby',
      name: hostName.trim(),
      maxPlayers: lobbySeats,
    }));
  }

  function updatePlayersText(value: string) {
    if (!/^\d*$/.test(value)) return;
    setPlayersText(value);
    if (!value) return;

    setPlayers(Math.min(Math.max(Number(value), 1), MAX_PLAYERS));
  }

  function normalizePlayersText() {
    setPlayersText(String(players));
  }

  function replayLatestDeal() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setHomeNotice('Connecting to server. Try again in a moment.');
      return;
    }
    if (!latestDeal?.data?.id) {
      setHomeNotice('Create a deal first.');
      return;
    }

    setHomeNotice('Creating replay deal.');
    ws.send(JSON.stringify({ action: 'replay_deal', handId: latestDeal.data.id }));
  }

  function replayDealByQuery() {
    const handQuery = homeReplayQuery.trim();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setHomeNotice('Connecting to server. Try again in a moment.');
      return;
    }
    if (!handQuery) {
      setHomeReplayError('Enter a hand number first.');
      return;
    }

    setHomeReplayError(null);
    setHomeNotice('Looking up replay deal.');
    ws.send(JSON.stringify({ action: 'replay_deal', handQuery }));
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 20,
        fontFamily: 'system-ui, sans-serif',
        background: '#f8fafc',
        color: '#0f172a',
      }}
    >
      <main style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 28 }}>Omaha Hi-Lo</h1>
          <div style={{ display: 'grid', justifyItems: 'end', gap: 2 }}>
            <span
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: 999,
                padding: '4px 10px',
                background: '#fff',
                fontSize: 13,
              }}
            >
              {homeSocketReady ? 'connected' : 'connecting...'}
            </span>
            {version ? (
              <small title={version.commit} style={{ color: '#64748b', fontSize: 11 }}>
                commit {version.shortCommit}{version.buildTimeGmt ? ` · ${version.buildTimeGmt}` : ''}
              </small>
            ) : null}
          </div>
        </header>

        <nav role="tablist" aria-label="Home views" style={{ display: 'flex', gap: 4, margin: '0 12px -17px', zIndex: 1 }}>
          <button
            role="tab"
            aria-selected="true"
            style={{ padding: '8px 18px', borderRadius: '12px 12px 0 0', border: '1px solid #cbd5e1', borderBottomColor: '#fff', background: '#fff', fontWeight: 900 }}
          >
            LOBBY
          </button>
        </nav>

        {homeTab === 'lobby' ? (
          <section style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff', padding: 18, display: 'grid', gap: 14 }}>
            <div>
              <h2 style={{ margin: 0 }}>Create a table</h2>
              <p style={{ margin: '6px 0 0', color: '#475569' }}>
                Choose the total table size. Invite friends, then start whenever you want — every free seat will become a bot.
              </p>
            </div>
            <label style={{ display: 'grid', gap: 6, fontWeight: 800 }}>
              Your name
              <input
                aria-label="Host name"
                value={hostName}
                onChange={(event) => setHostName(event.target.value)}
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 800 }}>
              Seats at the table · total
              <select
                aria-label="Seats at the table"
                value={lobbySeats}
                onChange={(event) => setLobbySeats(Number(event.target.value))}
                style={{ padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}
              >
                {Array.from({ length: 9 }, (_, index) => index + 2).map(value => (
                  <option key={value} value={value}>{value} players</option>
                ))}
              </select>
            </label>
            <button
              onClick={createLobbyCommand}
              disabled={!homeSocketReady}
              style={{ padding: '10px 16px', border: 0, borderRadius: 8, background: '#047857', color: '#fff', fontWeight: 900 }}
            >
              Create lobby
            </button>
            {homeNotice ? <span role="status" style={{ color: '#475569' }}>{homeNotice}</span> : null}
          </section>
        ) : (
          <>
        <section
          style={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#fff',
            padding: 14,
            display: 'grid',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 700 }}>
              Players
              <input
                min={1}
                max={MAX_PLAYERS}
                type="number"
                value={playersText}
                onChange={(event) => updatePlayersText(event.target.value)}
                onBlur={normalizePlayersText}
                style={{ width: 58, padding: '5px 7px' }}
              />
            </label>
            <button
              onClick={createDeal}
              disabled={!homeSocketReady}
              style={{ padding: '7px 12px', fontWeight: 800 }}
            >
              New deal
            </button>
            {homeNotice ? <span style={{ color: '#475569' }}>{homeNotice}</span> : null}
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {playerNames.map((name, index) => (
              <label
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '42px minmax(140px, 1fr) 78px',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <strong>P{index + 1}</strong>
                <input
                  value={name}
                  onChange={(event) => setPlayerNames((current) => current.map((item, itemIndex) => (
                    itemIndex === index ? event.target.value : item
                  )))}
                  placeholder={`Player ${index + 1}`}
                  style={{ padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 6 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const becomingBot = !playerBots[index];
                    setPlayerBots((current) => current.map((item, itemIndex) => (
                      itemIndex === index ? becomingBot : item
                    )));
                    setPlayerNames((current) => current.map((item, itemIndex) => {
                      if (itemIndex !== index) return item;
                      if (becomingBot) return item.toLowerCase().endsWith('_bot') ? item : `${item}_bot`;
                      return item.replace(/_bot$/i, '');
                    }));
                  }}
                  style={{
                    padding: '7px 9px',
                    border: `1px solid ${playerBots[index] ? '#16a34a' : '#cbd5e1'}`,
                    borderRadius: 6,
                    background: playerBots[index] ? '#dcfce7' : '#fff',
                    color: playerBots[index] ? '#166534' : '#334155',
                    fontWeight: 800,
                  }}
                >
                  {playerBots[index] ? 'Bot' : 'Human'}
                </button>
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <strong style={{ color: '#475569' }}>Replay</strong>
            <input
              placeholder="OMA1-P2-S..."
              value={homeReplayQuery}
              onChange={(event) => {
                setHomeReplayQuery(event.target.value);
                setHomeReplayError(null);
              }}
              style={{ width: 150, padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 6 }}
            />
            <button
              onClick={replayDealByQuery}
              disabled={!homeSocketReady || !homeReplayQuery.trim()}
              style={{ padding: '7px 12px', fontWeight: 800 }}
            >
              Replay hand
            </button>
            {homeReplayError ? <span style={{ color: '#b91c1c', fontWeight: 700 }}>{homeReplayError}</span> : null}
          </div>
        </section>

        {latestDeal?.data?.playerLinks ? (
          <section
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: '#fff',
              padding: 14,
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <strong>Game links</strong>
              <span style={{ color: '#475569' }}>
                {partyLabel(latestDeal.data.partyCode, latestDeal.data.partyId)}
                {' / '}
                {handLabel(latestDeal.data.handCode, latestDeal.data.handNumber, latestDeal.data.id)}
                {latestDeal.data.dealCode ? ` / ${latestDeal.data.dealCode}` : ''}
              </span>
              <button
                onClick={replayLatestDeal}
                disabled={!homeSocketReady}
                style={{ padding: '5px 9px', fontWeight: 700 }}
              >
                Replay deal
              </button>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {latestDeal.data.playerLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    alignItems: 'center',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '9px 11px',
                    color: '#0f172a',
                    textDecoration: 'none',
                    background: '#f8fafc',
                  }}
                >
                  <strong>{link.name ?? link.id}</strong>
                  <span style={{ color: link.isBot ? '#166534' : '#2563eb' }}>
                    {link.isBot ? 'Bot' : 'Open'}
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}
          </>
        )}
      </main>
    </div>
  );
}

function currentProblemContext() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  if (parts[0] === 'player') {
    return {
      page: 'player',
      handId: parts[1],
      playerId: parts[2],
      viewport,
    };
  }
  if (parts[0] === 'debug') {
    return {
      page: 'debug',
      handId: parts[1],
      viewport,
    };
  }
  if (parts[0] === 'lobby') {
    return {
      page: 'lobby',
      lobbyId: parts[1],
      viewport,
    };
  }
  return { page: 'home', viewport };
}

function ReportProblemButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function close() {
    if (isSaving) return;
    setIsOpen(false);
    setDescription('');
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedDescription = description.trim();
    if (!normalizedDescription || isSaving) return;

    setIsSaving(true);
    setStatus(null);
    try {
      const response = await fetch(`${SERVER_URL}/api/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: normalizedDescription,
          ...currentProblemContext(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Could not save the problem');
      }
      setStatus(`Problem #${result.id} saved`);
      setDescription('');
      setIsOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not save the problem');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      {status ? (
        <div
          role="status"
          style={{
            position: 'fixed',
            right: 18,
            bottom: 72,
            zIndex: 1001,
            maxWidth: 320,
            padding: '9px 12px',
            border: '1px solid #94a3b8',
            borderRadius: 8,
            background: '#fff',
            color: status.startsWith('Problem #') ? '#166534' : '#b91c1c',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
            fontFamily: 'system-ui, sans-serif',
            fontWeight: 700,
          }}
        >
          {status}
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Report a problem"
        onClick={() => {
          setStatus(null);
          setIsOpen(true);
        }}
        style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          zIndex: 1000,
          padding: '10px 14px',
          border: '1px solid #991b1b',
          borderRadius: 999,
          background: '#b91c1c',
          color: '#fff',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.22)',
          fontFamily: 'system-ui, sans-serif',
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        Report a problem
      </button>
      {isOpen ? (
        <div
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            display: 'grid',
            placeItems: 'center',
            padding: 20,
            background: 'rgba(15, 23, 42, 0.55)',
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="problem-dialog-title"
            onSubmit={submit}
            style={{
              width: 'min(460px, 100%)',
              display: 'grid',
              gap: 14,
              padding: 20,
              borderRadius: 12,
              background: '#fff',
              color: '#0f172a',
              boxShadow: '0 20px 50px rgba(15, 23, 42, 0.3)',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            <h2 id="problem-dialog-title" style={{ margin: 0, fontSize: 22 }}>
              Report a problem
            </h2>
            <label style={{ display: 'grid', gap: 7, fontWeight: 700 }}>
              Description
              <textarea
                autoFocus
                required
                maxLength={2000}
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What went wrong?"
                style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  resize: 'vertical',
                  padding: '10px 12px',
                  border: '1px solid #94a3b8',
                  borderRadius: 8,
                  font: 'inherit',
                  fontWeight: 400,
                }}
              />
            </label>
            {status ? <p role="alert" style={{ margin: 0, color: '#b91c1c' }}>{status}</p> : null}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" disabled={isSaving} onClick={close}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !description.trim()}
                style={{ fontWeight: 800 }}
              >
                {isSaving ? 'Saving…' : 'OK'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export default function App() {
  let page: React.ReactNode;
  if (window.location.pathname.startsWith('/player/')) page = <PlayerPage />;
  else if (window.location.pathname.startsWith('/debug/')) page = <DebugPage />;
  else if (window.location.pathname.startsWith('/lobby/')) page = <LobbyPage />;
  else page = <HomePage />;

  return (
    <>
      {page}
      <ReportProblemButton />
    </>
  );
}
