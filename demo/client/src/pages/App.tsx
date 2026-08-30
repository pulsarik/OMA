import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { callAction, isAllInWager } from '../callAction';
import { findTournamentWinner } from '../tournamentStatus';
import { CityIcon } from '../components/CityIcon';
import { CityInfo } from '../components/CityInfo';
import { TableEmblem } from '../components/TableEmblem';
import { WalletHistoryChart } from '../components/WalletHistoryChart';
import { playerSeriesStyle } from '../components/playerSeriesStyles';
import {
  aggressiveHandPercent,
  buildWalletHistory,
  COMBINATION_RANKS,
  countPlayerCombinations,
  advantageRealizationPercent,
} from '../partyStatistics';
import { APP_SHELL_STYLES, PLAYER_PAGE_STYLES } from './appStyles';
import { useReliableWebSocket } from '../useReliableWebSocket';
import { problemContext } from '../problemContext';
import './wireframe-actions.css';
import { WIREFRAME_LAYOUT } from './wireframeLayout';
import { WireframeTable } from './WireframeTable';

const isLocalVite = window.location.hostname === 'localhost' && window.location.port !== '4000';
const SERVER_URL = isLocalVite ? 'http://localhost:4000' : window.location.origin;
const WS_URL = isLocalVite
  ? 'ws://localhost:4000'
  : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;
const VoiceChat = React.lazy(() => import('../components/VoiceChat').then(module => ({
  default: module.VoiceChat,
})));

type UiLanguage = 'en' | 'ru';

const PLAYER_NAME_COOKIE = 'omaha-player-name';
const TABLE_SEATS_COOKIE = 'omaha-table-seats';
const PLAYER_NAME_MAX_LENGTH = 30;
const DEFAULT_TABLE_SEATS = 4;
const MIN_TABLE_SEATS = 2;
const MAX_TABLE_SEATS = 10;
const DESKTOP_TABLE_LAYOUT_MIN_WIDTH = 761;
const MOBILE_TABLE_LAYOUT_MAX_WIDTH = 560;

function storedPlayerName() {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${PLAYER_NAME_COOKIE}=`));
  if (!cookie) return '';

  try {
    return decodeURIComponent(cookie.slice(PLAYER_NAME_COOKIE.length + 1)).trim().slice(0, PLAYER_NAME_MAX_LENGTH);
  } catch {
    return '';
  }
}

function rememberPlayerName(name: string) {
  const normalizedName = name.trim().slice(0, PLAYER_NAME_MAX_LENGTH);
  if (!normalizedName) return;
  document.cookie = `${PLAYER_NAME_COOKIE}=${encodeURIComponent(normalizedName)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function storedLanguage(): UiLanguage {
  return 'en';
}

function ui(en: string, ru: string) {
  return storedLanguage() === 'ru' ? ru : en;
}

function localizedServerMessage(message: string) {
  if (storedLanguage() !== 'ru') return message;
  const messages: Record<string, string> = {
    'invalid replay code': 'Введите код повтора в формате ABC123.',
    'server overloaded: no table names available': 'Сервер перегружен: сейчас нет свободных названий столов. Попробуйте позже.',
    'enter a 4-digit PIN': 'Введите PIN из 4 цифр.',
    'table not found': 'Стол не найден.',
    'incorrect table PIN': 'Неверный PIN выбранного стола.',
    'incorrect table PIN; PIN changed after 5 failed attempts': 'Неверный PIN. После 5 неудачных попыток PIN стола был автоматически изменён.',
    'lobby is full': 'За этим столом нет свободных мест.',
    'lobby not found': 'Стол не найден.',
    'game already started': 'Игра за этим столом уже началась.',
    'player not found': 'Игрок больше не находится за столом.',
    'host seat is fixed': 'Место ведущего закреплено.',
    'invalid seat': 'Такого места за столом нет.',
    'invalid lobby credentials': 'Не удалось восстановить место за столом.',
    'host only': 'Это действие доступно только ведущему.',
    'finish is available after the deal': 'Завершить стол можно только после окончания текущей раздачи.',
    'next deal already started': 'Новая раздача уже началась.',
    'table already finished': 'Стол уже завершён.',
    'finish vote in progress': 'Сначала завершите голосование об окончании стола.',
    'no finish vote in progress': 'Голосование об окончании стола уже завершено.',
    'table is no longer on this deal': 'Стол уже перешёл к другой раздаче.',
  };
  return messages[message] ?? message;
}

type ActionLog = {
  playerId: string;
  move: string;
  amount?: number;
  betSize?: BetSizeOption;
  stage: string;
  at: number;
  botReason?: {
    summary: string;
    factors: string[];
    equity: number;
    scoopRate: number;
    potOdds: number;
  };
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
  replayCode?: string;
  isReplay?: boolean;
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
      highRank?: string;
      lowRank?: string;
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
    wallets?: Array<{
      id: string;
      total: number;
    }>;
    actions?: Array<{
      playerId: string;
      move: string;
    }>;
  }>;
};

type PartyTotal = {
  id: string;
  total: number;
};

type BlindInfo = {
  level: number;
  small: number;
  big: number;
  dealerPlayerId?: string;
  smallBlindPlayerId?: string;
  bigBlindPlayerId?: string;
};

type PotBreakdown = {
  amount: number;
  eligiblePlayerIds: string[];
};

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
  if (blinds.smallBlindPlayerId === playerId) return `SB ${formatPoints(blinds.small)}`;
  if (blinds.bigBlindPlayerId === playerId) return `BB ${formatPoints(blinds.big)}`;
  return undefined;
}

function localizedStage(stage: string) {
  const stages: Record<string, string> = {
    preflop: 'префлоп',
    flop: 'флоп',
    turn: 'тёрн',
    river: 'ривер',
    showdown: 'шоудаун',
  };
  return storedLanguage() === 'ru' ? stages[stage] ?? stage : stage;
}

function localizedMove(move: string) {
  const moves: Record<string, string> = {
    check: 'чек',
    bet: 'ставка',
    call: 'колл',
    raise: 'рейз',
    fold: 'фолд',
  };
  return storedLanguage() === 'ru' ? moves[move] ?? move : move;
}

function localizedRank(rank: string | undefined) {
  if (!rank || storedLanguage() !== 'ru') return rank;
  const ranks: Record<string, string> = {
    'straight flush': 'стрит-флеш',
    'four of a kind': 'каре',
    'full house': 'фулл-хаус',
    flush: 'флеш',
    straight: 'стрит',
    'three of a kind': 'сет',
    'two pair': 'две пары',
    pair: 'пара',
    'high card': 'старшая карта',
  };
  return ranks[rank] ?? rank;
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
type PendingPlayerCommand = {
  action: 'player_move';
  commandId: string;
  handId: string;
  playerId: string;
  token: string;
  move: PlayerMove;
  amount?: number;
  betSize?: BetSizeOption;
};

function newCommandId() {
  return window.crypto.randomUUID?.()
    ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const BET_SIZE_OPTIONS: Array<{ value: BetSizeOption; label: string }> = [
  { value: 'blind', label: 'Blind' },
  { value: 'quarter', label: '1/4 pot' },
  { value: 'half', label: '1/2 pot' },
  { value: 'pot', label: 'Pot limit' },
];

function localizedBetSize(option: { value: BetSizeOption; label: string }) {
  if (storedLanguage() !== 'ru') return option.label;
  if (option.value === 'blind') return 'Блайнд';
  if (option.value === 'quarter') return '1/4 банка';
  if (option.value === 'half') return '1/2 банка';
  return 'Пот-лимит';
}

const MAX_PLAYERS = 10;
const DEFAULT_PLAYER_NAMES = ['Dima', 'Anna', 'Ivan', 'Maria', 'Pavel', 'Elena', 'Alex', 'Sofia', 'Nikolai', 'Olga'];

type EarlyFinishRequest = {
  status: 'pending' | 'rejected' | 'approved';
  requestedAt: number;
  requestedByPlayerId: string;
  requiredPlayerIds: string[];
  approvals: string[];
  rejectedByPlayerId?: string;
  completedAt?: number;
};

type PlayerView = {
  handId: string;
  partyId: string;
  partyCode?: string;
  replayCode?: string;
  isReplay?: boolean;
  handCode?: string;
  dealCode?: string;
  handNumber: number;
  revision: number;
  replayOfHandId?: string;
  playerId: string;
  playerName?: string;
  isBot?: boolean;
  voiceEnabled?: boolean;
  stack: number;
  potCoins: number;
  potBreakdown: PotBreakdown[];
  totalContributions: Record<string, number>;
  currentBet: number;
  roundBets: Record<string, number>;
  raiseCount: number;
  maxRaises?: number;
  lastFullRaise?: number;
  actedSinceLastFullRaise?: string[];
  turnDeadline?: number;
  turnDurationMs?: number;
  blinds?: BlindInfo;
  hole: string[];
  folded: boolean;
  players: Array<{
    id: string;
    name?: string;
    isBot?: boolean;
    botStyle?: 'normal' | 'aggressive' | 'cautious';
    stack?: number;
    connected?: boolean;
    disconnected?: boolean;
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
  waitingForPlayers: Array<{
    id: string;
    name?: string;
  }>;
  earlyFinishRequest?: EarlyFinishRequest;
  partyFinishedEarly: boolean;
  partyFinishedAt?: number;
  partyTotals: PartyTotal[];
  completedHandCount: number;
  showdownSummary?: ShowdownSummary;
  result?: HiLoResult;
  currentCombo?: PlayerCombo;
  community: string[];
  actions: ActionLog[];
  created: number;
  session: {
    lastActivity: number;
    warningAfterMs: number;
    expiresAfterMs: number;
    serverNow: number;
  };
};

function withLocalTurnDeadline(nextPlayer: PlayerView): PlayerView {
  if (
    typeof nextPlayer.turnDeadline !== 'number'
    || typeof nextPlayer.session?.serverNow !== 'number'
  ) return nextPlayer;

  return {
    ...nextPlayer,
    turnDeadline: Date.now() + Math.max(0, nextPlayer.turnDeadline - nextPlayer.session.serverNow),
  };
}

type FullHandView = {
  id: string;
  partyId?: string;
  partyCode?: string;
  replayCode?: string;
  isReplay?: boolean;
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
  lastFullRaise?: number;
  actedSinceLastFullRaise?: string[];
  turnDeadline?: number;
  turnDurationMs?: number;
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
    replayCode?: string;
    isReplay?: boolean;
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

type PlayerPageProps = {
  playerUrl?: string;
  isLobbyHost?: boolean;
  onPlayerUrl?: (url: string) => void;
  onRestartGame?: () => void;
  onExitGame?: () => void;
};

function playerAccessFromUrl(url: string) {
  const pathname = new URL(url, window.location.origin).pathname;
  const [, , handId, playerId, token] = pathname.split('/');
  return { handId, playerId, token };
}

type LobbyView = {
  id: string;
  pin: string;
  tableName: string;
  hostMemberId: string;
  maxPlayers: number;
  status: 'waiting' | 'started';
  replayCode?: string;
  isReplay?: boolean;
  handId?: string;
  session: {
    lastActivity: number;
    warningAfterMs: number;
    expiresAfterMs: number;
    serverNow: number;
  };
    members: Array<{
      id: string;
      name: string;
      isBot: boolean;
      isHost: boolean;
      seat: number;
    }>;
};

type OpenLobbyView = Omit<LobbyView, 'members' | 'pin'> & {
  members: Array<{
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
const OPPONENT_CARD_SCALE = COMPACT_CARD_SCALE * 0.9;
const OPPONENT_CARD_WIDTH = 92 * OPPONENT_CARD_SCALE;
const OPPONENT_CARD_HEIGHT = 132 * OPPONENT_CARD_SCALE;
const FOCAL_CARD_SCALE = COMPACT_CARD_SCALE * 1.1;
const FOCAL_CARD_WIDTH = 92 * FOCAL_CARD_SCALE;
const FOCAL_CARD_HEIGHT = 132 * FOCAL_CARD_SCALE;
const COMBO_CARD_SCALE = 0.48;
const COMBO_CARD_WIDTH = 92 * COMBO_CARD_SCALE;
const COMBO_CARD_HEIGHT = 132 * COMBO_CARD_SCALE;
const SIDE_COMBO_CARD_SCALE = 0.35;
const SIDE_COMBO_CARD_WIDTH = 92 * SIDE_COMBO_CARD_SCALE;
const SIDE_COMBO_CARD_HEIGHT = 132 * SIDE_COMBO_CARD_SCALE;
const SIMPLE_CARD_BACK_BACKGROUND = 'url("/cards/card-back-qz.jpg") center / cover no-repeat, #f7f0dd';

function rankNumber(rank: string) {
  if (rank === 'T') return 10;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  if (rank === 'A') return 14;
  return Number(rank);
}

function cardTextureVariant(code: string) {
  return [...code].reduce((total, character) => total + character.charCodeAt(0), 0) % 5 + 1;
}

function Card({ code, scale = CARD_SCALE, className }: { code: string; scale?: number; className?: string }) {
  const rank = code.slice(0, -1).toUpperCase();
  const suit = code.slice(-1).toLowerCase();
  const suitSymbol: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const isRed = suit === 'h' || suit === 'd';
  const textureVariant = cardTextureVariant(code);

  return (
    <div
      title={code}
      role="img"
      aria-label={code}
      data-testid={`card-face-${code}`}
      data-card-style="simple"
      className={`card-face card-face--texture-${textureVariant}${className ? ` ${className}` : ''}`}
      style={{
        width: 92,
        height: 132,
        transform: `scale(calc(${scale} * var(--card-table-scale, var(--table-scale, 1))))`,
        transformOrigin: 'top left',
        borderRadius: 12,
        color: isRed ? '#dc2626' : '#111827',
        boxShadow: '0 2px 4px rgba(0,0,0,0.28)',
        overflow: 'hidden',
        display: 'grid',
        alignContent: 'center',
        justifyItems: 'center',
        fontWeight: 900,
      }}
    >
      <span className="card-rank" style={{ fontSize: 48, lineHeight: 0.95 }}>{rankLabels[rank] ?? rank}</span>
      <span className="card-suit" style={{ fontSize: 44, lineHeight: 0.95 }}>{suitSymbol[suit] ?? suit.toUpperCase()}</span>
    </div>
  );
}

function CardBack({ scale = CARD_SCALE, className }: { scale?: number; className?: string }) {
  return (
    <div
      data-testid="card-back"
      data-card-style="simple"
      className={className}
      style={{
        position: 'relative',
        width: 92,
        height: 132,
        transform: `scale(calc(${scale} * var(--card-table-scale, var(--table-scale, 1))))`,
        transformOrigin: 'top left',
        borderRadius: 12,
        background: SIMPLE_CARD_BACK_BACKGROUND,
        border: '1px solid rgba(15,23,42,.72)',
        boxShadow: '0 3px 9px rgba(0,0,0,0.22)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    />
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

function CompactCardRow({
  cards,
  testId,
  focal = false,
  expandable = false,
  expandedTitle,
  winnerBorder,
  decisionActions = [],
  boardCards = [],
}: {
  cards: string[];
  testId?: string;
  focal?: boolean;
  expandable?: boolean;
  expandedTitle?: string;
  winnerBorder?: string;
  decisionActions?: ActionLog[];
  boardCards?: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const frameClass = focal ? 'focal-card-frame' : 'opponent-card-frame';
  const cardClass = focal ? 'focal-card' : 'opponent-card';
  const scale = focal ? FOCAL_CARD_SCALE : OPPONENT_CARD_SCALE;
  const expansionLabel = ui('Show opponent cards larger', 'Показать карты соперника крупнее');
  const winnerGlow = winnerBorder?.includes('#dc2626') && winnerBorder.includes('#2563eb')
    ? '0 0 0 1px rgba(255,255,255,.8), 0 0 10px rgba(220,38,38,.42), 0 0 16px rgba(37,99,235,.34)'
    : winnerBorder?.includes('#dc2626')
      ? '0 0 0 1px rgba(255,255,255,.8), 0 0 14px rgba(220,38,38,.5)'
      : '0 0 0 1px rgba(255,255,255,.8), 0 0 14px rgba(37,99,235,.5)';

  return (
    <>
      <div
        data-testid={testId}
        className={`compact-card-row${expandable ? ' is-expandable' : ''}${winnerBorder ? ' has-winner-border' : ''}`}
        data-winner-border={winnerBorder ? 'red-blue' : undefined}
        style={winnerBorder ? {
          border: '3px solid transparent',
          borderRadius: 10,
          background: `linear-gradient(#fff, #fff) padding-box, ${winnerBorder} border-box`,
          padding: 4,
          boxShadow: winnerGlow,
        } : undefined}
        role={expandable ? 'button' : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-label={expandable ? expansionLabel : undefined}
        aria-expanded={expandable ? expanded : undefined}
        onClick={expandable ? () => setExpanded(true) : undefined}
        onKeyDown={expandable ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded(true);
          }
        } : undefined}
      >
        {cards.map((card, index) => (
          <div
            key={card}
            className={`${frameClass} deal-card`}
            data-hand-card-index={index}
            style={{
              '--deal-delay': `${index * 90}ms`,
              ...(focal ? {} : {
                animation: 'none',
                transform: 'none',
                rotate: 'none',
                marginLeft: 0,
              }),
            } as React.CSSProperties}
          >
            <Card code={card} scale={scale} className={cardClass} />
          </div>
        ))}
      </div>
      {expanded ? createPortal(
        <div
          className="opponent-hand-overlay"
          data-testid="opponent-hand-overlay"
          role="presentation"
          onClick={() => setExpanded(false)}
        >
          <section
            className="opponent-hand-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={expandedTitle
              ? ui(`${expandedTitle}'s cards`, `Карты игрока ${expandedTitle}`)
              : ui('Opponent cards', 'Карты соперника')}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="opponent-hand-close"
              aria-label={ui('Close enlarged cards', 'Закрыть увеличенные карты')}
              onClick={() => setExpanded(false)}
            >
              ×
            </button>
            {expandedTitle ? (
              <strong className="opponent-hand-name" data-testid="opponent-hand-name">
                {expandedTitle}
              </strong>
            ) : null}
            <div className="opponent-hand-expanded-row">
              {cards.map((card, index) => (
                <div
                  key={card}
                  className="opponent-hand-expanded-frame deal-card"
                  style={{ '--deal-delay': `${index * 90}ms` } as React.CSSProperties}
                >
                  <Card code={card} scale={0.7} />
                </div>
              ))}
            </div>
            {decisionActions.length ? (
              <div className="bot-decision-log" data-testid="bot-decision-log" style={{ marginTop: 16, width: 'min(100%, 560px)', textAlign: 'left', color: '#e2e8f0' }}>
                <strong style={{ display: 'block', marginBottom: 8, fontSize: 15 }}>{ui('How the bot decided', 'Как бот принимал решения')}</strong>
                {decisionActions.map((action) => (
                  <div key={`${action.stage}-${action.at}`} className="bot-decision-entry" style={{ padding: '8px 10px', marginTop: 6, borderRadius: 8, background: 'rgba(255,255,255,.1)', fontSize: 12, lineHeight: 1.4 }}>
                    <div style={{ marginBottom: 5, color: '#f8fafc' }}>
                      <div><strong>{ui('Hand', 'Рука')}:</strong> <PrintedCards cards={cards} /></div>
                      {decisionBoardForStage(action.stage, boardCards).length ? (
                        <div><strong>{localizedStage(action.stage)}:</strong> <PrintedCards cards={decisionBoardForStage(action.stage, boardCards)} /></div>
                      ) : null}
                    </div>
                    <div>
                      <strong>{localizedStage(action.stage)} · {localizedMove(action.move).toUpperCase()}</strong>
                      {action.amount ? ` ${formatPoints(action.amount)}` : ''}
                    </div>
                    {action.botReason ? (
                      <div style={{ marginTop: 4 }}>{botPlainReason(action, cards, boardCards.slice(0, action.stage === 'flop' ? 3 : action.stage === 'turn' ? 4 : action.stage === 'river' || action.stage === 'showdown' ? 5 : 0))}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>,
        document.body,
      ) : null}
    </>
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

function CardBackRow({
  count,
  compact = false,
  focal = false,
  testId,
}: {
  count: number;
  compact?: boolean;
  focal?: boolean;
  testId?: string;
}) {
  const width = compact ? focal ? FOCAL_CARD_WIDTH : OPPONENT_CARD_WIDTH : CARD_WIDTH;
  const height = compact ? focal ? FOCAL_CARD_HEIGHT : OPPONENT_CARD_HEIGHT : CARD_HEIGHT;
  const scale = compact ? focal ? FOCAL_CARD_SCALE : OPPONENT_CARD_SCALE : CARD_SCALE;
  const frameClass = focal ? 'focal-card-frame' : 'opponent-card-frame';
  const cardClass = focal ? 'focal-card' : 'opponent-card';

  return (
    <div
      data-testid={testId}
      className={compact ? 'compact-card-row' : undefined}
      style={compact ? undefined : { display: 'flex', gap: 6, flexWrap: 'nowrap', justifyContent: 'center' }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={compact ? `${frameClass} deal-card` : 'deal-card'}
          data-hand-card-index={compact ? index : undefined}
          style={{
            ...(compact ? {} : { width, height }),
            '--deal-delay': `${index * 90}ms`,
            ...(compact && !focal ? {
              animation: 'none',
              transform: 'none',
              rotate: 'none',
              marginLeft: 0,
            } : {}),
          } as React.CSSProperties}
        >
          <CardBack scale={scale} className={compact ? cardClass : undefined} />
        </div>
      ))}
    </div>
  );
}

function BoardRow({ cards, compact = false }: { cards: string[]; compact?: boolean }) {
  const width = compact ? FOCAL_CARD_WIDTH : CARD_WIDTH;
  const height = compact ? FOCAL_CARD_HEIGHT : CARD_HEIGHT;
  const scale = compact ? FOCAL_CARD_SCALE : CARD_SCALE;
  const gap = compact ? 8 : 10;
  const boardWidth = width * 5 + gap * 4;

  return (
    <div
      className={compact ? 'board-row' : undefined}
      style={compact
        ? {
            minWidth: `calc(${boardWidth}px * var(--table-scale, 1))`,
            minHeight: `calc(${height}px * var(--table-scale, 1))`,
          }
        : { display: 'flex', gap, flexWrap: 'wrap', justifyContent: 'center' }}
    >
      {cards.map((card, index) => (
        <div
          key={card}
          className={compact ? 'focal-card-frame deal-card' : 'deal-card'}
          style={{
            ...(compact ? {} : { width, height }),
            '--deal-delay': `${Math.min(index, 2) * 90}ms`,
          } as React.CSSProperties}
        >
          <Card code={card} scale={scale} className={compact ? 'focal-card' : undefined} />
        </div>
      ))}
    </div>
  );
}

function CoinStack({ value, title = 'coins', compact = false, horizontal = false }: { value: number; title?: string; compact?: boolean; horizontal?: boolean }) {
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
      className={`coin-stack${compact ? ' is-compact' : ''}`}
      title={`${formatPoints(value)} ${title}`}
      style={{
        display: horizontal ? 'flex' : 'grid',
        justifyItems: 'center',
        alignItems: 'center',
        gap: 2,
        minWidth: compact ? 28 : 34,
        color: '#fff',
        textShadow: '0 1px 2px rgba(0,0,0,0.45)',
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      <div className="coin-stack-pile" style={{ display: 'grid', alignItems: 'end', minHeight: compact ? 36 : 72 }}>
        {visibleChips.map((chip, index) => (
          <span
            key={index}
            data-chip-index={index}
            data-chip-value={chip.value}
            className="coin-chip"
            style={{
              gridArea: '1 / 1',
              position: 'relative',
              width: compact ? 22 : 28,
              height: compact ? 8 : 10,
              border: `1px solid ${chip.edge}`,
              borderRadius: '50%',
              color: chip.text,
              background: chip.value === 0
                ? 'linear-gradient(#cbd5e1, #64748b)'
                : `linear-gradient(#fff 0 12%, ${chip.color} 13% 72%, ${chip.edge} 73%)`,
              boxShadow: `0 2px 0 ${chip.edge}, 0 3px 4px rgba(0,0,0,.2)`,
              transform: `translate(${index % 2 === 0 ? (compact ? -2 : -3) : (compact ? 2 : 3)}px, ${-index * (compact ? 2 : 3)}px)`,
            }}
          />
        ))}
      </div>
      <span
        className={compact ? 'coin-stack-total' : undefined}
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
  showCurrentBet = true,
  breakdown,
  players,
  contributions,
  roundBets,
  currentPlayerId,
}: {
  value: number;
  currentBet: number;
  showCurrentBet?: boolean;
  breakdown?: PotBreakdown[];
  players: Array<{ id: string; name?: string }>;
  contributions: Record<string, number>;
  roundBets: Record<string, number>;
  currentPlayerId: string;
}) {
  const potDetailsRef = useRef<HTMLDetailsElement>(null);
  const visiblePots = breakdown?.length && breakdown.length > 1 ? breakdown : [];
  const contributingPlayers = players
    .map((player) => ({
      ...player,
      total: contributions[player.id] ?? 0,
      round: roundBets[player.id] ?? 0,
    }))
    .filter((player) => player.total > 0 || player.round > 0);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const details = potDetailsRef.current;
      if (details?.open && event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

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
      <details ref={potDetailsRef} className="pot-details">
        <summary className="pot-summary" aria-label={`${ui('Pot', 'Банк')} ${formatPoints(value)}. ${ui('Show contributions', 'Показать взносы')}`}>
          <CoinStack value={value} title={ui('pot', 'банк')} compact horizontal />
          {showCurrentBet ? <span className="pot-current-bet" aria-hidden={currentBet <= 0}>
            {currentBet > 0 ? <>
              {ui('bet', 'ставка')} {formatPoints(currentBet)}
            </> : '\u00a0'}
          </span> : null}
        </summary>
        <div className="pot-popover" data-testid="pot-contributions">
          <div className="pot-popover-title">
            <strong>{ui('Pot', 'Банк')} {formatPoints(value)}</strong>
            <span>{ui('In pot', 'В банке')}</span>
            <span>{ui('This round', 'Этот круг')}</span>
          </div>
          {contributingPlayers.map((seat) => (
            <div className="pot-contribution-row" key={seat.id}>
              <span>
                {seat.id === currentPlayerId ? ui('You', 'Вы') : tablePlayerName(seat.name, seat.id)}
              </span>
              <strong>{formatPoints(seat.total)}</strong>
              <span>{formatPoints(seat.round)}</span>
            </div>
          ))}
          {visiblePots.length ? (
            <div className="pot-side-breakdown" data-testid="side-pot-breakdown">
              <strong>Pot breakdown / Разбивка банков</strong>
              {visiblePots.map((pot, index) => (
                <div className="pot-side-row" key={`${index}-${pot.amount}`}>
                  <span>{index === 0 ? 'Main pot / Основной банк' : `Side pot ${index} / Побочный банк ${index}`}</span>
                  <strong>{formatPoints(pot.amount)}</strong>
                  <small>Eligible / Участники: {pot.eligiblePlayerIds.join(', ')}</small>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </details>
      {false && visiblePots.length ? (
        <div
          data-testid="side-pot-breakdown"
          style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', maxWidth: 280 }}
        >
          {visiblePots.map((pot, index) => (
            <span
              key={`${index}-${pot.amount}`}
              title={`${ui('Eligible', 'Участвуют')}: ${pot.eligiblePlayerIds.join(', ')}`}
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
              {index === 0 ? ui('Main', 'Основной') : `${ui('Side', 'Побочный')} ${index}`} {formatPoints(pot.amount)}
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
      {localizedStage(stage)}
    </span>
  );
}

type SeatBubblePlacement = 'top' | 'right' | 'bottom' | 'left';

function AdaptiveSeatBubble({
  label,
  title,
  emphasized,
  foldedAction,
  compact,
  testId,
}: {
  label: string;
  title: string;
  emphasized: boolean;
  foldedAction: boolean;
  compact: boolean;
  testId?: string;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ left: number; top: number; placement: SeatBubblePlacement }>();

  useEffect(() => {
    const bubble = bubbleRef.current;
    const seat = bubble?.closest<HTMLElement>('.player-seat');
    const table = bubble?.closest<HTMLElement>('.poker-table');
    if (!bubble || !seat || !table) return;

    const placeBubble = () => {
      const tableBox = table.getBoundingClientRect();
      const seatBox = seat.getBoundingClientRect();
      const bubbleWidth = bubble.offsetWidth;
      const bubbleHeight = bubble.offsetHeight;
      const gap = 8;
      const padding = 6;
      const candidates: Array<{ placement: SeatBubblePlacement; left: number; top: number }> = [
        { placement: 'top', left: seatBox.left + (seatBox.width - bubbleWidth) / 2, top: seatBox.top - bubbleHeight - gap },
        { placement: 'right', left: seatBox.right + gap, top: seatBox.top + (seatBox.height - bubbleHeight) / 2 },
        { placement: 'bottom', left: seatBox.left + (seatBox.width - bubbleWidth) / 2, top: seatBox.bottom + gap },
        { placement: 'left', left: seatBox.left - bubbleWidth - gap, top: seatBox.top + (seatBox.height - bubbleHeight) / 2 },
      ];
      const obstacles = [
        seat,
        ...Array.from(table.querySelectorAll<HTMLElement>('.player-seat')).filter(candidate => candidate !== seat),
        ...Array.from(table.querySelectorAll<HTMLElement>('.table-center')),
        ...Array.from(table.querySelectorAll<HTMLElement>('.seat-action-bubble'))
          .filter(candidate => candidate !== bubble && getComputedStyle(candidate).visibility !== 'hidden'),
      ].map(element => element.getBoundingClientRect());
      const overlapArea = (a: DOMRect, b: DOMRect) => (
        Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      );

      const ranked = candidates.map((candidate, preference) => {
        const left = Math.min(
          Math.max(candidate.left, tableBox.left + padding),
          tableBox.right - padding - bubbleWidth,
        );
        const top = Math.min(
          Math.max(candidate.top, tableBox.top + padding),
          tableBox.bottom - padding - bubbleHeight,
        );
        const rect = new DOMRect(left, top, bubbleWidth, bubbleHeight);
        const clampedDistance = Math.abs(left - candidate.left) + Math.abs(top - candidate.top);
        const collisions = obstacles.reduce((total, obstacle) => total + overlapArea(rect, obstacle), 0);
        return {
          ...candidate,
          left,
          top,
          score: (collisions > 0 ? collisions * 100000 : 0) + clampedDistance + preference,
        };
      }).sort((a, b) => a.score - b.score);
      const best = ranked[0];
      setLayout({
        placement: best.placement,
        left: best.left - seatBox.left,
        top: best.top - seatBox.top,
      });
    };

    placeBubble();
    const delayedPlacement = window.setTimeout(placeBubble, 60);
    const resizeObserver = new ResizeObserver(placeBubble);
    resizeObserver.observe(table);
    resizeObserver.observe(seat);
    window.addEventListener('resize', placeBubble);
    return () => {
      resizeObserver.disconnect();
      window.clearTimeout(delayedPlacement);
      window.removeEventListener('resize', placeBubble);
    };
  }, [label]);

  return (
    <div
      ref={bubbleRef}
      className={`seat-action-bubble placement-${layout?.placement ?? 'top'}${foldedAction ? ' is-folded-action' : ''}`}
      data-testid={testId}
      title={title}
      style={{
        left: layout?.left ?? 0,
        top: layout?.top ?? 0,
        visibility: layout ? 'visible' : 'hidden',
        border: emphasized ? '2px solid #f59e0b' : '1px solid #cbd5e1',
        background: emphasized ? '#facc15' : foldedAction ? '#fee2e2' : '#fff',
        color: emphasized ? '#422006' : foldedAction ? '#7f1d1d' : '#0f172a',
        fontSize: compact ? 13 : 14,
        boxShadow: emphasized
          ? '0 3px 12px rgba(250,204,21,0.55)'
          : '0 2px 7px rgba(15,23,42,0.2)',
      }}
    >
      {label}
      <span className="seat-action-tail" aria-hidden="true" />
    </div>
  );
}

function WireframeHand({
  id,
  hole,
  cardCount,
  isYou,
  name,
  stack,
  resultPlayer,
  isThinking = false,
  isWaitingForNextDeal = false,
  lastAction,
  folded = false,
  eliminated = false,
  isHighWinner = false,
  isLowWinner = false,
  isAllIn = false,
  blindLabel,
  isDealer = false,
  turnSeconds,
  decisionActions = [],
  boardCards = [],
}: {
  id: string;
  hole?: string[];
  cardCount: number;
  isYou: boolean;
  name?: string;
  stack?: number;
  resultPlayer?: HiLoResult['players'][number];
  isThinking?: boolean;
  isWaitingForNextDeal?: boolean;
  lastAction?: ActionLog;
  folded?: boolean;
  eliminated?: boolean;
  isHighWinner?: boolean;
  isLowWinner?: boolean;
  isAllIn?: boolean;
  blindLabel?: string;
  isDealer?: boolean;
  turnSeconds?: number;
  decisionActions?: ActionLog[];
  boardCards?: string[];
}) {
  const actionLabel = lastAction
    ? `${localizedMove(lastAction.move).toUpperCase()}${lastAction.amount ? ` ${formatPoints(lastAction.amount)}` : ''}`
    : undefined;
  const winnerBorder = isHighWinner && isLowWinner
    ? 'linear-gradient(90deg, #dc2626 0 50%, #2563eb 50%)'
    : isHighWinner
      ? 'linear-gradient(#dc2626, #dc2626)'
      : isLowWinner
        ? 'linear-gradient(#2563eb, #2563eb)'
        : undefined;
  return (
    <div
      className={`wireframe-hand${isYou ? '' : ' wireframe-opponent-hand'}${isThinking ? ' is-thinking' : ''}${folded ? ' is-folded' : ''}${eliminated ? ' is-eliminated' : ''}`}
      data-player-seat={id}
      data-testid={isYou ? `wireframe-hand-${id}` : `opponent-hand-zone-${id}`}
    >
      <div className="seat-topline" data-testid={`${isYou ? 'player' : 'opponent'}-info-${id}`}>
          <span
            className="seat-name-score"
            title={`${tablePlayerName(name, id)}: ${formatPoints(stack ?? 0)}`}
            style={{
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              justifySelf: 'start',
              width: 'fit-content',
              maxWidth: '100%',
              padding: '3px 7px',
              border: '1px solid #facc15',
              borderRadius: 999,
              background: '#172033',
              color: '#fff',
              fontSize: 11,
              fontWeight: 900,
              lineHeight: 1,
              boxShadow: '0 2px 7px rgba(15,23,42,.28)',
              animation: isThinking ? 'thinking-name-pulse 1.15s ease-in-out infinite' : undefined,
              whiteSpace: 'nowrap',
              boxSizing: 'border-box',
            }}
          >
            <span data-testid={`player-name-${id}`}>{tablePlayerName(name, id)}</span>
            <strong data-testid={`player-score-${id}`} style={{ color: '#fde68a' }}>{formatPoints(stack ?? 0)}</strong>
          </span>
           {isYou && (blindLabel || isDealer) ? (
             <div className="wireframe-seat-positions wireframe-hero-position" aria-label={ui('Table positions', 'Позиции за столом')}>
              {isDealer ? <span className="position-badge dealer" data-testid={`player-dealer-${id}`}>D</span> : null}
              {blindLabel ? (
                <span className={`position-badge ${blindLabel.startsWith('BB') ? 'big-blind' : 'small-blind'}`} data-testid={`player-blind-${id}`}>
                  {blindLabel.split(' ')[0]}
                </span>
               ) : null}
             </div>
           ) : null}
           {isYou && (isHighWinner || isLowWinner) ? (
             <div className="seat-result-badges hero-result-badges" aria-label={ui('Winning hands', 'Выигрышные комбинации')}>
               {isHighWinner ? <span className="winner-badge high winner-badge-label" data-testid={`winner-high-${id}`} title={ui('High winner', 'Победитель хай')}>HIGH</span> : null}
               {isLowWinner ? <span className="winner-badge low winner-badge-label" data-testid={`winner-low-${id}`} title={ui('Low winner', 'Победитель лоу')}>LOW</span> : null}
             </div>
           ) : null}
           {!isYou && (isHighWinner || isLowWinner) ? (
            <div className="seat-result-badges" aria-label={ui('Winning hands', 'Выигрышные комбинации')}>
              {isHighWinner ? <span className="winner-badge high winner-badge-label" data-testid={`winner-high-${id}`} title={ui('High winner', 'Победитель хай')}>HIGH</span> : null}
              {isLowWinner ? <span className="winner-badge low winner-badge-label" data-testid={`winner-low-${id}`} title={ui('Low winner', 'Победитель лоу')}>LOW</span> : null}
            </div>
          ) : null}
      </div>
      {isAllIn && !eliminated ? (
        <span
          className="wireframe-all-in-badge"
          data-testid={`player-all-in-${id}`}
          aria-label={ui('All-in player', 'Игрок пошёл олл-ин')}
          title={ui('All in', 'Олл-ин')}
        >
          {ui('ALL IN', 'ОЛЛ-ИН')}
        </span>
      ) : null}
      {hole?.length ? (
        <CompactCardRow
          cards={hole}
          testId={`player-cards-${id}`}
          focal={isYou}
          expandable={!isYou}
          expandedTitle={!isYou ? name : undefined}
          winnerBorder={winnerBorder}
          decisionActions={decisionActions}
          boardCards={boardCards}
        />
      ) : (
        <CardBackRow count={cardCount} compact={true} focal={isYou} testId={`player-cards-${id}`} />
      )}
      {eliminated ? (
        <span
          className="eliminated-badge"
          data-testid={`player-eliminated-${id}`}
          title={ui('This player is out of chips', 'Игрок выбыл')}
        >
          {ui('OUT', 'ВЫБЫЛ')}
        </span>
      ) : null}
      {resultPlayer && (resultPlayer.highRank || resultPlayer.lowRank) ? (
        <div className="wireframe-hand-combination" data-testid={`player-result-${id}`}>
          {resultPlayer.highRank ? <span>{ui('High', 'Хай')}: {localizedRank(resultPlayer.highRank)}</span> : null}
          {resultPlayer.lowRank ? <span>{ui('Low', 'Лоу')}: {localizedRank(resultPlayer.lowRank)}</span> : null}
        </div>
      ) : null}
      <div className="wireframe-opponent-footer">
        <div className="wireframe-opponent-action-slot">
          {isWaitingForNextDeal ? (
            <span
              className="wireframe-opponent-thinking wireframe-opponent-action"
              data-testid={`waiting-for-player-${id}`}
            >
              {ui('WAITING', 'ЖДЁМ')}
            </span>
          ) : actionLabel ? (
            <span
              className="wireframe-opponent-thinking wireframe-opponent-action"
              data-testid={`opponent-betting-action-${id}`}
            >
              {actionLabel}
            </span>
          ) : !isYou && isThinking ? (
            <span className="wireframe-opponent-thinking">{ui('THINKING…', 'ДУМАЕТ…')}</span>
          ) : null}
        </div>
        {!isYou && (blindLabel || isDealer) ? (
          <div className="wireframe-seat-positions" aria-label={ui('Table positions', 'Позиции за столом')}>
            {isDealer ? <span className="position-badge dealer" data-testid={`player-dealer-${id}`}>D</span> : null}
            {blindLabel ? (
              <span className={`position-badge ${blindLabel.startsWith('BB') ? 'big-blind' : 'small-blind'}`} data-testid={`player-blind-${id}`}>
                {blindLabel.split(' ')[0]}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function storedTableSeats() {
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${TABLE_SEATS_COOKIE}=`));
  if (!cookie) return DEFAULT_TABLE_SEATS;

  const seats = Number.parseInt(cookie.slice(TABLE_SEATS_COOKIE.length + 1), 10);
  return Number.isInteger(seats) && seats >= MIN_TABLE_SEATS && seats <= MAX_TABLE_SEATS
    ? seats
    : DEFAULT_TABLE_SEATS;
}

function rememberTableSeats(seats: number) {
  if (!Number.isInteger(seats) || seats < MIN_TABLE_SEATS || seats > MAX_TABLE_SEATS) return;
  document.cookie = `${TABLE_SEATS_COOKIE}=${seats}; Max-Age=31536000; Path=/; SameSite=Lax`;
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
  isWaitingForNextDeal = false,
  isBetting = false,
  blindLabel,
  isDealer = false,
  wireframeZone = false,
  disconnected = false,
  turnSeconds,
  eliminated = false,
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
  isWaitingForNextDeal?: boolean;
  isBetting?: boolean;
  blindLabel?: string;
  isDealer?: boolean;
  wireframeZone?: boolean;
  disconnected?: boolean;
  turnSeconds?: number;
  eliminated?: boolean;
}) {
  const shouldShowCards = Boolean(hole?.length);
  const actionBetSize = action?.betSize
    ? BET_SIZE_OPTIONS.find((option) => option.value === action.betSize)
    : undefined;
  const actionLabel = action
    ? `${localizedMove(action.move).toUpperCase()}${action.amount ? ` ${formatPoints(action.amount)}` : ''}${actionBetSize ? ` (${localizedBetSize(actionBetSize)})` : ''}`
    : undefined;
  const isYourTurn = isCurrentTurn && isYou && !isBot;
  const suppressUpperBettingAction = compact && !isYou && isBetting && Boolean(actionLabel);
  const bubbleLabel = isWaitingForNextDeal
    ? ui('WAITING', 'ЖДЁМ')
    : disconnected
      ? ui('OFFLINE', 'НЕ В СЕТИ')
      : isCurrentTurn
        ? isYourTurn ? ui('YOUR TURN', 'ВАШ ХОД') : ui('THINKING…', 'ДУМАЕТ…')
        : actionLabel;
  const hasWinningHand = !folded && (isHighWinner || isLowWinner);
  const hasCombination = Boolean(resultPlayer && !isYou && (resultPlayer.highRank || resultPlayer.lowRank));
  const showWinnerFrame = hasWinningHand && (!compact || isYou);
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
      style={{
        display: 'flex',
        gap: 6,
        alignItems: 'center',
        justifyContent: 'center',
        ...(wireframeZone && compact && !isYou
          ? {
            width: WIREFRAME_LAYOUT.opponent.width,
            minWidth: WIREFRAME_LAYOUT.opponent.width,
            maxWidth: WIREFRAME_LAYOUT.opponent.width,
            height: WIREFRAME_LAYOUT.opponent.height,
            flex: `0 0 ${WIREFRAME_LAYOUT.opponent.width}px`,
            transform: 'none',
            zoom: 1,
          }
          : {}),
      }}
    >
      <section
        className={`player-seat${compact && !isYou ? ' is-opponent opponent-hand-zone' : ''}${isCurrentTurn ? ' is-thinking' : ''}${eliminated ? ' is-eliminated' : ''}`}
        data-testid={compact && !isYou ? `opponent-hand-zone-${id}` : undefined}
        style={{
          borderRadius: 8,
          background: compact && !isYou
            ? 'transparent'
            : folded ? '#f3f4f6' : isCurrentTurn ? '#fffbeb' : '#fff',
          opacity: eliminated ? 0.82 : folded ? 0.38 : 1,
          filter: eliminated ? 'grayscale(.35)' : folded ? 'grayscale(1)' : undefined,
          width: wireframeZone && compact && !isYou
            ? WIREFRAME_LAYOUT.opponent.width
            : compact ? 'fit-content' : undefined,
          minWidth: wireframeZone && compact && !isYou
            ? WIREFRAME_LAYOUT.opponent.width
            : compact ? undefined : 180,
          maxWidth: wireframeZone && compact && !isYou
            ? WIREFRAME_LAYOUT.opponent.width
            : undefined,
          height: wireframeZone && compact && !isYou ? WIREFRAME_LAYOUT.opponent.height : undefined,
          padding: wireframeZone && compact && !isYou ? 0 : compact && !isYou ? '6px 6px 8px' : compact ? 6 : 10,
          // border: wireframeZone && compact && !isYou ? '1px solid #87918a' : isYou ? '2px solid #16a34a' : compact && !isYou ? 'none' : '1px solid #d1d5db',
          margin: '0 auto',
          position: 'relative',
          boxSizing: 'border-box',
          boxShadow: isCurrentTurn && (isYou || !compact)
            ? '0 0 0 4px rgba(250,204,21,0.35), 0 0 22px rgba(250,204,21,0.95)'
            : undefined,
        }}
      >
        {compact && !isYou && !wireframeZone ? (
          <div className="seat-topline">
            <span
              className="seat-name-score"
            title={`${tablePlayerName(name, id)}: ${formatPoints(score)} ${ui('coins', 'фишек')}`}
            style={{
              position: 'relative',
              zIndex: 3,
              border: `1px solid ${isCurrentTurn ? '#facc15' : '#fbbf24'}`,
              borderRadius: 999,
              background: '#172033',
              color: '#fff',
              padding: '4px 8px',
              fontSize: 12,
              fontWeight: 900,
              lineHeight: 1,
              boxShadow: '0 2px 7px rgba(15,23,42,.28)',
              animation: isCurrentTurn ? 'thinking-name-pulse 1.15s ease-in-out infinite' : undefined,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
              width: 'fit-content',
              margin: '0 0 5px',
              whiteSpace: 'nowrap',
            }}
          >
            <span data-testid={`player-name-${id}`}>{tablePlayerName(name, id)}</span>
            <strong data-testid={`player-score-${id}`} style={{ color: '#fde68a' }}>{formatPoints(score)}</strong>
            </span>
            <div className="seat-topline-right" aria-label={ui('Table status', 'Статус за столом')}>
              {hasWinningHand ? (
                <div className="seat-result-badges">
                  {isHighWinner ? <span className="winner-badge high winner-badge-label" data-testid={`winner-high-${id}`} title={ui('High winner', 'Победитель хай')}>HIGH</span> : null}
                  {isLowWinner ? <span className="winner-badge low winner-badge-label" data-testid={`winner-low-${id}`} title={ui('Low winner', 'Победитель лоу')}>LOW</span> : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {!wireframeZone && (!compact || isYou) ? <div className="seat-position-badges" aria-label={ui('Table positions', 'Позиции за столом')}>
          {!wireframeZone && isDealer ? <span className="position-badge dealer" data-testid={`player-dealer-${id}`}>D</span> : null}
          {!wireframeZone && blindLabel ? (
            <span className={`position-badge ${blindLabel.startsWith('BB') ? 'big-blind' : 'small-blind'}`} data-testid={`player-blind-${id}`}>
              {blindLabel}
            </span>
          ) : null}
        </div> : null}
        {wireframeZone && isYou && hasWinningHand ? (
          <div className="seat-result-badges hero-result-badges" aria-label="Winning hands">
            {isHighWinner ? <span className="winner-badge high winner-badge-label" title="High winner">HIGH</span> : null}
            {isLowWinner ? <span className="winner-badge low winner-badge-label" title="Low winner">LOW</span> : null}
          </div>
        ) : null}
        {!wireframeZone && isCurrentTurn && typeof turnSeconds === 'number' ? (
          <span className="turn-countdown" data-testid={`turn-countdown-${id}`}>{turnSeconds}s</span>
        ) : null}
        {/*
          <span
            className="eliminated-badge"
            data-testid={`player-eliminated-${id}`}
            title={ui('This player is out of chips', 'У этого игрока закончились фишки')}
          >
            {ui('OUT', 'ВЫБЫЛ')}
          </span>
        */}
        {!wireframeZone && bubbleLabel && (!isCurrentTurn || isWaitingForNextDeal) && !suppressUpperBettingAction && !(compact && !isYou && hasWinningHand) ? (
          <AdaptiveSeatBubble
            label={isWaitingForNextDeal ? bubbleLabel : actionLabel ?? bubbleLabel}
            compact={compact}
            emphasized={isCurrentTurn || isWaitingForNextDeal}
            foldedAction={action?.move === 'fold'}
            testId={isWaitingForNextDeal ? `waiting-for-player-${id}` : undefined}
            title={isWaitingForNextDeal
              ? ui(
                  `Waiting for ${tablePlayerName(name, id)} to start the new deal`,
                  `Ждём, когда ${tablePlayerName(name, id)} начнёт новую раздачу`,
                )
              : isCurrentTurn
                ? isYourTurn ? ui('Your turn', 'Ваш ход') : `${tablePlayerName(name, id)} ${ui('is thinking', 'думает')}`
                : `${ui('Last action', 'Последнее действие')}: ${actionLabel}`}
          />
        ) : null}
        <div
          className="opponent-hand-content"
          style={{
            position: 'relative',
            display: 'block',
            width: 'max-content',
            margin: '0 auto',
            padding: showWinnerFrame ? 4 : 0,
            border: showWinnerFrame ? '3px solid transparent' : undefined,
            borderRadius: showWinnerFrame ? 10 : undefined,
            background: showWinnerFrame
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
          <div className="opponent-hand-card-area">
            {shouldShowCards ? (
              <CompactCardRow
                cards={hole ?? []}
                testId={`player-cards-${id}`}
                focal={isYou}
                expandable={!isYou}
                expandedTitle={!isYou ? tablePlayerName(name, id) : undefined}
                winnerBorder={hasWinningHand ? winnerBorder : undefined}
              />
            ) : (
              <CardBackRow count={cardCount} compact={compact} focal={isYou} testId={`player-cards-${id}`} />
            )}
            {!wireframeZone && eliminated ? (
              <span
                className="eliminated-badge"
                data-testid={`player-eliminated-${id}`}
                title={ui('This player is out of chips', 'Игрок выбыл')}
              >
                {ui('OUT', 'ВЫБЫЛ')}
              </span>
            ) : null}
            {compact && !isYou && (blindLabel || isDealer) ? (
              <div className="seat-card-positions" aria-label={ui('Table positions', 'Позиции за столом')}>
                {!wireframeZone && isDealer ? <span className="position-badge dealer" data-testid={`player-dealer-${id}`}>D</span> : null}
                {!wireframeZone && blindLabel ? (
                  <span className={`position-badge ${blindLabel.startsWith('BB') ? 'big-blind' : 'small-blind'}`} data-testid={`player-blind-${id}`}>
                    {blindLabel}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
          {!wireframeZone && hasWinningHand && (!compact || isYou) ? (
            <div
              style={{
                position: compact && !isYou ? 'static' : 'absolute',
                left: compact && !isYou ? undefined : '50%',
                bottom: compact && !isYou ? undefined : -30,
                zIndex: 3,
                display: 'flex',
                justifyContent: 'center',
                gap: 4,
                alignSelf: 'center',
                marginTop: compact && !isYou ? 5 : undefined,
                transform: compact && !isYou ? undefined : 'translateX(-50%)',
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
                    fontSize: 9,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {ui('HIGH', 'ХАЙ')}
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
                    fontSize: 9,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {ui('LOW', 'ЛОУ')}
                </span>
              ) : null}
            </div>
          ) : null}
          {!wireframeZone && compact && !isYou && isBetting && actionLabel ? (
            <div
              className="seat-betting-action"
              data-testid={`opponent-betting-action-${id}`}
              aria-label={actionLabel}
            >
              {actionLabel}
            </div>
          ) : !wireframeZone && hasCombination ? (
            <div
              className="seat-combination"
              data-testid={`player-result-${id}`}
              style={{
                display: 'grid',
                gap: 2,
                marginTop: 5,
                color: '#0f172a',
                fontSize: 11,
                fontWeight: 800,
                lineHeight: 1.15,
                textAlign: 'center',
              }}
            >
            {resultPlayer.highRank ? (
              <span>{ui('High', 'Хай')}: {localizedRank(resultPlayer.highRank)}</span>
            ) : null}
            {resultPlayer.lowRank ? (
              <span>{ui('Low', 'Лоу')}: {localizedRank(resultPlayer.lowRank)}</span>
            ) : null}
            </div>
          ) : null}
        </div>
      </section>
      {compact && isYou && !wireframeZone ? (
        <div
          className={`player-meta${isCurrentTurn ? ' is-thinking' : ''}`}
          style={{ display: 'grid', gap: 4, justifyItems: 'center', alignSelf: 'stretch', alignContent: 'end' }}
        >
          <CoinStack value={score} compact />
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
            {tablePlayerName(name, id)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function HandBanner({ player }: { player: PlayerView }) {
  const replayCode = player.replayCode ?? '?';

  return (
    <div
      className="replay-indicator"
      role="status"
      aria-label={ui(`Replay party ${replayCode}`, `Повтор партии ${replayCode}`)}
    >
      <span className="replay-indicator__dot" aria-hidden="true">●</span>
      <span className="replay-indicator__icon" aria-hidden="true">↺</span>
      <span>{ui('REPLAY', 'ПОВТОР')}</span>
      <span className="replay-indicator__code">· {replayCode}</span>
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
  minimumRaiseIncrement: number,
  stack: number,
) {
  const callAmount = Math.max(currentBet - playerBet, 0);
  const maxRaiseTo = Math.min(playerBet + stack, currentBet + pot + callAmount);
  const minRaiseTo = Math.min(currentBet + minimumRaiseIncrement, maxRaiseTo);
  if (size === 'blind') return minRaiseTo;

  const raiseSize = Math.ceil((pot + callAmount) * betSizeFactor(size));
  return Math.min(Math.max(currentBet + raiseSize, minRaiseTo), maxRaiseTo);
}

function totalScore(totals: PartyTotal[] | undefined, playerId: string) {
  return totals?.find((item) => item.id === playerId)?.total ?? 0;
}

function latestActionForPlayer(actions: ActionLog[] | undefined, playerId: string, stage: string) {
  return [...(actions ?? [])].reverse().find((action) => (
    action.playerId === playerId
    && action.stage === stage
  ));
}

function botPlainReason(action: ActionLog, cards: string[], board: string[]) {
  const ranks = cards.map(card => card[0]);
  const lowRanks = ranks.filter(rank => ['A', '2', '3', '4', '5', '6', '7', '8'].includes(rank));
  const hasAceTwo = ranks.includes('A') && ranks.includes('2');
  const pairs = ranks.filter((rank, index) => ranks.indexOf(rank) !== index);
  const signals = [
    hasAceTwo ? ui('A-2 gives the hand a strong low potential.', 'A-2 дают руке сильный потенциал для лоу.') : undefined,
    pairs.length ? ui(`A pair of ${pairs[0]} gives a chance to make a high hand.`, `Пара ${pairs[0]} даёт шанс собрать хай.`) : undefined,
    lowRanks.length >= 3 ? ui('Several low cards support a low combination.', 'Несколько маленьких карт помогают собрать лоу.') : undefined,
    board.filter(card => ['A', '2', '3', '4', '5', '6', '7', '8'].includes(card[0])).length >= 2
      ? ui('The board has low cards, so the low half of the pot is relevant.', 'На доске есть маленькие карты, поэтому важна нижняя половина банка.')
      : undefined,
  ].filter((signal): signal is string => Boolean(signal));
  const signalText = signals[0] ?? ui('The hand did not have a clear strong combination.', 'У руки не было очевидной сильной комбинации.');

  if (action.move === 'fold') {
    return ui(`The hand did not improve enough to continue. ${signalText} The bot gave up the hand to avoid paying more.`, `Рука недостаточно усилилась для продолжения. ${signalText} Бот выбрал фолд, чтобы не вкладывать больше фишек.`);
  }
  if (action.move === 'call') {
    return ui(`The bot continued because there was still a realistic way to win. ${signalText} It chose a call to see the next card without building a large pot.`, `Бот продолжил, потому что у руки ещё был реальный путь к победе. ${signalText} Он выбрал колл, чтобы увидеть следующую карту и не разгонять банк.`);
  }
  if (action.move === 'check') {
    return ui(`There was no bet to call. ${signalText} The bot checked to keep the pot small and wait for improvement.`, `Ставки для колла не было. ${signalText} Бот сделал чек, чтобы сохранить небольшой банк и дождаться усиления.`);
  }
  return ui(`The bot saw enough potential to put more chips into the pot. ${signalText} The bet was meant to get value from weaker hands and protect the draw.`, `Бот увидел достаточно сильный потенциал, чтобы вложить больше фишек. ${signalText} Ставка нужна, чтобы добрать с более слабых рук и защитить своё усиление.`);
}

function PrintedCards({ cards }: { cards: string[] }) {
  const suits: Record<string, { symbol: string; color: string }> = {
    s: { symbol: '♠', color: '#111827' },
    c: { symbol: '♣', color: '#111827' },
    h: { symbol: '♥', color: '#dc2626' },
    d: { symbol: '♦', color: '#dc2626' },
  };
  return (
    <span>
      {cards.map((card, index) => {
        const suit = suits[card.slice(-1).toLowerCase()];
        return (
          <span key={`${card}-${index}`} style={{ whiteSpace: 'nowrap', color: suit?.color ?? 'inherit' }}>
            {index ? ' ' : ''}{card.slice(0, -1)}{suit?.symbol ?? card.slice(-1)}
          </span>
        );
      })}
    </span>
  );
}

function decisionBoardForStage(stage: string, board: string[]) {
  const count = stage === 'flop' ? 3 : stage === 'turn' ? 4 : stage === 'river' || stage === 'showdown' ? 5 : 0;
  return board.slice(0, count);
}

const BETTING_STREETS = ['preflop', 'flop', 'turn', 'river'];
const STREET_CHANGE_PAUSE_MS = 1_000;

function isBettingStreetAdvance(previousStage: string, nextStage: string) {
  return BETTING_STREETS.indexOf(nextStage) === BETTING_STREETS.indexOf(previousStage) + 1;
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
  if (summary.highWinners.includes(playerId)) parts.push(ui('High', 'хай'));
  if (summary.lowWinners.includes(playerId)) parts.push(ui('Low', 'лоу'));
  return parts;
}

function ShowdownStatus({
  player,
  newDealAction,
}: {
  player: PlayerView;
  newDealAction?: React.ReactNode;
}) {
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
        ? `${ui('You tied', 'Ничья')} · ${ui('payout', 'выплата')} ${formatPoints(payout)}${winParts.length ? ` · ${winParts.join(' + ')}` : ''}`
        : winParts.length
        ? `${isSplitPot ? `${ui('Split pot', 'Раздел банка')}: ` : ''}${ui('You won', 'Вы выиграли')} ${formatPoints(payout)} · ${winParts.join(' + ')}`
        : `${ui('You won', 'Вы выиграли')} ${formatPoints(payout)}`
      : net < 0
        ? ui('You lost', 'Вы проиграли')
        : ui('Break even', 'Без прибыли и убытка')
    : ui('Showdown', 'Шоудаун');
  const winners = player.showdownSummary
    ? [
      ...[...new Set(
        player.showdownSummary.sidePots
          .map((pot) => pot.uncontestedWinnerId)
          .filter((id): id is string => Boolean(id)),
      )].map((id) => (
        `${ui('Winner', 'Победитель')}: ${playerLabel(player.players, id)} · ${ui('uncontested', 'без вскрытия')}`
      )),
      player.showdownSummary.highWinners.length
        ? `${ui('High', 'Хай')}: ${player.showdownSummary.highWinners.map((id) => playerLabel(player.players, id)).join(', ')}`
        : undefined,
      !player.showdownSummary.noLow && player.showdownSummary.lowWinners.length
        ? `${ui('Low', 'Лоу')}: ${player.showdownSummary.lowWinners.map((id) => playerLabel(player.players, id)).join(', ')}`
        : undefined,
    ].filter(Boolean).join(' | ')
    : undefined;
  const personalPots = player.showdownSummary?.sidePots
    .filter(isContestedPot)
    .map((pot, index) => ({
      label: index === 0 ? ui('Main', 'Основной') : `${ui('Side', 'Побочный')} ${index}`,
      result: pot.players.find(result => result.id === player.playerId),
    })) ?? [];

  return (
    <div
      className="showdown-status"
      style={{
        display: 'inline-grid',
        gap: 6,
        justifyItems: 'center',
        minWidth: 220,
        border: '2px solid rgba(255,255,255,0.72)',
        borderRadius: 12,
        background,
        color: '#fff',
        padding: '12px 14px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.24)',
      }}
    >
      <strong style={{ fontSize: 24, lineHeight: 1.1 }}>
        {title}
      </strong>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', fontSize: 13, lineHeight: 1.2 }}>
        <span data-testid="showdown-contributed">{ui('Contributed', 'Внесено')}: {formatPoints(contributed)}</span>
        <span data-testid="showdown-payout">{ui('Payout', 'Выплата')}: {formatPoints(payout)}</span>
        <strong data-testid="showdown-net">
          {ui('Net', 'Итог')}: {net > 0 ? '+' : ''}{formatPoints(net)}
        </strong>
      </div>
      {newDealAction ? (
        <div className="showdown-new-deal" data-testid="showdown-new-deal">
          {newDealAction}
        </div>
      ) : null}
      {payout > 0 && net <= 0 && winParts.length ? (
        <span className="showdown-extra-result" style={{ fontSize: 12, opacity: 0.9 }}>
          {ui(`Won ${winParts.join(' + ')}, but finished with a net loss`, `Выиграна часть «${winParts.join(' + ')}», но итог раздачи отрицательный`)}
        </span>
      ) : null}
      {personalPots.length > 1 ? (
        <div
          className="showdown-personal-pots"
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
                  ? `${ui('not eligible', 'не участвует')} · ${formatPoints(result.net ?? -result.contributed)}`
                  : ui('not eligible', 'не участвует')
                : result.net === undefined
                  ? `${ui('payout', 'выплата')} ${formatPoints(result.payout)}`
                  : `${result.net > 0 ? '+' : ''}${formatPoints(result.net)}`}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PlayerComboSide({ combo, kind }: { combo?: PlayerCombo; kind: 'high' | 'low' }) {
  if (!combo) return null;
  const isHigh = kind === 'high';
  const rank = isHigh ? combo.highRank : combo.lowRank;
  const cards = isHigh ? combo.highCombo : combo.lowCombo;
  if (!rank || !cards) return null;

  return (
    <aside className={`combo-side ${kind}`} data-testid={`${kind}-combo-side`}>
      <div className="combo-side-title">
        <span>{isHigh ? ui('HI', 'ХАЙ') : ui('LO', 'ЛОУ')}</span>
        <span className="combo-side-rank">{localizedRank(rank)}</span>
      </div>
      <div className="combo-side-cards">
        <SideComboCards combo={cards} />
      </div>
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
      <span style={{ color: '#475569', fontWeight: 700 }}>{ui('Replay', 'Повторить')}</span>
      <label style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {ui('Hand', 'Раздача')}
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
        {ui('Replay', 'Повторить')}
      </button>
      {handNumber && !requestedHand ? (
        <span style={{ color: '#b91c1c' }}>{ui('not found', 'не найдено')}</span>
      ) : null}
      <span style={{ color: '#475569' }}>{ui('Latest', 'Последние')}:</span>
      {latestHands.map((hand) => (
        <button
          key={hand.id}
          onClick={() => onReplayHand(hand.id)}
          title={hand.replayOfHandId
            ? ui('This hand is already a replay', 'Эта раздача уже является повтором')
            : ui('Replay this hand layout', 'Повторить расклад этой раздачи')}
        >
          {handLabel(hand.handCode, hand.handNumber, hand.id)}{hand.replayOfHandId ? 'R' : ''}
        </button>
      ))}
    </div>
  );
}

function PartyStatistics({ score, players, currentPlayerId, isFinal }: {
  score?: PartyScore;
  currentPlayerId?: string;
  players: Array<{
    id: string;
    name?: string;
    isBot?: boolean;
    botStyle?: 'normal' | 'aggressive' | 'cautious';
  }>;
  isFinal: boolean;
}) {
  if (!score) return null;
  const [expandedCombination, setExpandedCombination] = useState<string | null>(null);
  const [showRealizationHelp, setShowRealizationHelp] = useState(false);
  const completedHands = score.hands
    .filter((hand) => hand.stage === 'showdown')
    .sort((a, b) => b.handNumber - a.handNumber);
  const chronologicalHands = [...completedHands].sort((a, b) => a.handNumber - b.handNumber);
  const walletHistory = buildWalletHistory(players.map((player) => player.id), chronologicalHands);
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
      aggressivePercent: `${aggressiveHandPercent(player.id, hands)}%`,
      realizationPercent: `${advantageRealizationPercent(player.id, hands)}%`,
      foldPercent: percentage(folds, hands.length),
      winPercent: percentage(wins, hands.length),
      lossPercent: percentage(losses, hands.length),
      net,
      average: hands.length ? net / hands.length : 0,
      maxWin: Math.max(0, ...netResults),
      maxLoss: Math.min(0, ...netResults),
      stack: score.totals.find((total) => total.id === player.id)?.total ?? 0,
      combinations: countPlayerCombinations(player.id, hands),
      botStyle: player.isBot ? player.botStyle : undefined,
    };
  });

  return (
    <section className="party-summary" data-testid="party-statistics">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>{ui('Cumulative statistics', 'Общая статистика')}</h2>
          {score.replayCode ? (
            <div data-testid="replay-code" style={{ marginTop: 5, color: score.isReplay ? '#b45309' : '#475569', fontWeight: 800 }}>
              {score.isReplay ? ui('REPLAY', 'ПОВТОР') : ui('Replay code', 'Код повтора')}: <code>{score.replayCode}</code>
            </div>
          ) : null}
        </div>
        <strong
          data-testid="completed-hand-count"
          style={{ borderRadius: 999, background: '#ecfdf5', color: '#065f46', padding: '6px 10px' }}
        >
          {completedHands.length} {storedLanguage() === 'ru' ? 'раздач' : completedHands.length === 1 ? 'hand' : 'hands'}
        </strong>
      </div>

      <WalletHistoryChart
        series={walletHistory}
        playerName={(playerId) => playerLabel(players, playerId)}
        formatValue={formatPoints}
        title={ui('Wallet history', 'История кошелька')}
        handLabel={ui('Hand', 'Раздача')}
        walletLabel={ui('Wallet', 'Кошелек')}
      />

      <div className="party-metrics">
        <div className="party-metrics-scroll" data-testid="party-metrics-scroll">
          <table className="result-points" data-testid="party-totals">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>{ui('Player', 'Игрок')}</th>
              <th className="party-combination-heading" title={ui('Advantage realization', 'Реализация преимущества')}>
                <button
                  type="button"
                  className="party-combination-button"
                  aria-expanded={showRealizationHelp}
                  aria-label={ui('Explain advantage realization', 'Объяснить реализацию преимущества')}
                  onClick={() => setShowRealizationHelp((current) => !current)}
                >
                  {ui('Realization', 'Реализация')}
                </button>
                {showRealizationHelp ? (
                  <span className="party-combination-popover">
                    {ui(
                      'Percentage of advantaged hands that produced a positive net result.',
                      'Процент раздач с преимуществом, которые дали положительный итог.',
                    )}
                  </span>
                ) : null}
              </th>
              <th>{ui('Hands', 'Раздачи')}</th>
              <th title={ui('Hands with at least one bet or raise', 'Раздачи хотя бы с одной ставкой или рейзом')}>
                {ui('Bet/Raise', 'Бет/рейз')}
              </th>
              <th>{ui('Fold', 'Фолд')}</th>
              <th>{ui('Win', 'Победа')}</th>
              <th>{ui('Loss', 'Проигрыш')}</th>
              <th>{ui('Net', 'Итог')}</th>
              <th>{ui('Avg/hand', 'Среднее')}</th>
              <th>{ui('Max win', 'Макс. выигрыш')}</th>
              <th>{ui('Max loss', 'Макс. проигрыш')}</th>
              <th>{ui('Stack', 'Стек')}</th>
              {COMBINATION_RANKS.map((combination) => (
                <th
                  key={combination.key}
                  className="party-combination-heading"
                  title={ui(`${combination.en} hands`, `Раздачи с комбинацией «${combination.ru}»`)}
                >
                  <button
                    type="button"
                    className="party-combination-button"
                    aria-expanded={expandedCombination === combination.key}
                    onClick={() => setExpandedCombination((current) => current === combination.key ? null : combination.key)}
                  >
                    {combination.short}
                  </button>
                  {expandedCombination === combination.key ? (
                    <span className="party-combination-popover">{combination.en}</span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((player, playerIndex) => (
              <tr key={player.id} data-testid={`party-total-${player.id}`}>
                <td style={{ fontWeight: 800, textAlign: 'left' }}>
                  <span className="party-player-name">
                    <span
                      className="party-player-color"
                      data-testid={`party-player-color-${player.id}`}
                      style={{ backgroundColor: playerSeriesStyle(playerIndex).color }}
                      title={ui('Player color on the chart', 'Цвет игрока на графике')}
                      aria-hidden="true"
                    />
                    <span
                      style={player.id === currentPlayerId
                        ? { color: '#047857', background: '#ecfdf5', borderRadius: 6, padding: '3px 6px' }
                        : undefined}
                    >
                      {playerLabel(players, player.id)}
                    </span>
                  </span>
                  {isFinal && player.isBot ? (
                    <span
                      data-testid={`bot-style-${player.id}`}
                      style={{
                        display: 'inline-block',
                        marginLeft: 7,
                        borderRadius: 999,
                        padding: '2px 7px',
                        background: player.botStyle === 'aggressive'
                          ? '#fee2e2'
                          : player.botStyle === 'cautious' ? '#dbeafe' : '#fef3c7',
                        color: player.botStyle === 'aggressive'
                          ? '#991b1b'
                          : player.botStyle === 'cautious' ? '#1d4ed8' : '#92400e',
                        fontSize: 11,
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {player.botStyle === 'normal'
                        ? ui('Normal', 'Normal')
                        : player.botStyle === 'aggressive'
                        ? ui('Aggressive', 'Наглый')
                        : ui('Cautious', 'Осторожный')}
                    </span>
                  ) : null}
                </td>
                <td data-testid={`party-realization-${player.id}`} style={{ textAlign: 'right', fontWeight: 800 }}>{player.realizationPercent}</td>
                <td data-testid={`party-hands-${player.id}`} style={{ textAlign: 'right' }}>{player.hands}</td>
                <td data-testid={`party-aggression-${player.id}`} style={{ textAlign: 'right', color: '#7c3aed', fontWeight: 800 }}>{player.aggressivePercent}</td>
                <td data-testid={`party-fold-${player.id}`} style={{ textAlign: 'right' }}>{player.foldPercent}</td>
                <td data-testid={`party-win-${player.id}`} style={{ textAlign: 'right', color: '#047857', fontWeight: 800 }}>{player.winPercent}</td>
                <td data-testid={`party-loss-${player.id}`} style={{ textAlign: 'right', color: '#b91c1c', fontWeight: 800 }}>{player.lossPercent}</td>
                <td data-testid={`party-net-${player.id}`} style={{ textAlign: 'right', fontWeight: 900 }}>{formatPoints(player.net)}</td>
                <td data-testid={`party-average-${player.id}`} style={{ textAlign: 'right' }}>{formatPoints(player.average)}</td>
                <td data-testid={`party-max-win-${player.id}`} style={{ textAlign: 'right', color: '#047857' }}>{formatPoints(player.maxWin)}</td>
                <td data-testid={`party-max-loss-${player.id}`} style={{ textAlign: 'right', color: '#b91c1c' }}>{formatPoints(player.maxLoss)}</td>
                <td data-testid={`party-stack-${player.id}`} style={{ textAlign: 'right', fontWeight: 900 }}>{formatPoints(player.stack)}</td>
                {COMBINATION_RANKS.map((combination) => (
                  <td
                    key={combination.key}
                    data-testid={`party-combination-${combination.key}-${player.id}`}
                    style={{ textAlign: 'right' }}
                  >
                    {player.combinations[combination.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
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
  // At showdown every revealed player's combinations are useful context, so
  // keep the old hand-details panel open by default.
  const [showAllHands, setShowAllHands] = useState(true);
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
    ? `${ids.map(displayName).join(', ')} · ${formatPoints(pool / ids.length)} ${ui('each', 'каждому')}`
    : ui('No qualifying low', 'Нет подходящего лоу');

  return (
    <section className="result-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <span style={{ color: '#64748b', fontSize: 12, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {ui('Hand complete', 'Раздача завершена')}
          </span>
          <h2 style={{ margin: '2px 0 0' }}>{ui('Results', 'Результаты')}</h2>
        </div>
        <strong style={{ borderRadius: 999, background: '#ecfdf5', color: '#065f46', padding: '6px 10px' }}>
          {ui('Pot', 'Банк')} {formatPoints(result.potCoins)} {ui('coins', 'фишек')}
        </strong>
      </div>

      <div className="winner-grid" style={result.noLow ? { gridTemplateColumns: '1fr' } : undefined}>
        <section className="winner-card">
          {!highWinnerResults.length && uncontestedWinnerIds.length ? (
            <h3 style={{ margin: 0, color: '#991b1b' }}>
              {ui('Uncontested winner', 'Победитель без вскрытия')}: {uncontestedWinnerIds.map(displayName).join(', ')}
            </h3>
          ) : null}
          {highWinnerResults.map((winner) => (
            <div key={winner.id}>
              <h3 style={{ margin: '0 0 6px', color: '#991b1b' }}>
                {ui('High winner', 'Победитель хай')}: {displayName(winner.id)} — {localizedRank(winner.highRank)}
              </h3>
              {winner.highCombo ? <ComboCardRow combo={winner.highCombo} tone="high" /> : null}
            </div>
          ))}
        </section>

        {!result.noLow ? (
          <section className="winner-card">
            {lowWinnerResults.map((winner) => (
            <div key={winner.id}>
              <h3 style={{ margin: '0 0 6px', color: '#047857' }}>
                {ui('Low winner', 'Победитель лоу')}: {displayName(winner.id)} — {localizedRank(winner.lowRank)}
              </h3>
              {winner.lowCombo ? <ComboCardRow combo={winner.lowCombo} tone="low" /> : null}
            </div>
            ))}
          </section>
        ) : null}
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
                    {index === 0 ? ui('Main pot', 'Основной банк') : `${ui('Side pot', 'Побочный банк')} ${index}`}
                  </strong>
                  <strong>{formatPoints(pot.amount)}</strong>
                </div>
                <div style={{ marginTop: 5, color: '#64748b', fontSize: 12 }}>
                  {ui('Eligible', 'Участвуют')}: {pot.eligiblePlayerIds.map(displayName).join(', ')}
                </div>
                {pot.uncontestedWinnerId ? (
                  <div style={{ marginTop: 6, fontSize: 13 }}>
                    <strong>{ui('Uncontested', 'Без вскрытия')}:</strong>{' '}
                    {displayName(pot.uncontestedWinnerId)} · {formatPoints(pot.amount)}
                  </div>
                ) : (
                  <>
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      <strong style={{ color: '#991b1b' }}>{ui('High', 'Хай')}:</strong>{' '}
                      {potWinnerLine(pot.highWinners, highPool)}
                    </div>
                    <div style={{ marginTop: 3, fontSize: 13 }}>
                      <strong style={{ color: '#047857' }}>{ui('Low', 'Лоу')}:</strong>{' '}
                      {pot.noLow ? ui('No qualifying low', 'Нет подходящего лоу') : potWinnerLine(pot.lowWinners, lowPool)}
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
                      ? `${ui('You', 'Вы')}: ${ui('not eligible', 'не участвуете')}${
                        personalResult?.contributed
                          ? ` · ${ui('contributed', 'внесено')} ${formatPoints(personalResult.contributed)} · ${ui('net', 'итог')} ${formatPoints(personalResult.net ?? -personalResult.contributed)}`
                          : ''
                      }`
                      : personalResult.net === undefined
                        ? `${ui('You', 'Вы')}: ${ui('payout', 'выплата')} ${formatPoints(personalResult.payout)}`
                        : `${ui('You', 'Вы')}: ${ui('contributed', 'внесено')} ${formatPoints(personalResult.contributed ?? 0)} · ${ui('payout', 'выплата')} ${formatPoints(personalResult.payout)} · ${ui('net', 'итог')} ${personalResult.net > 0 ? '+' : ''}${formatPoints(personalResult.net)}`}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      <h3 style={{ margin: '14px 0 6px' }}>{ui('Points', 'Очки')}</h3>
      <div className="result-points-scroll" data-testid="result-points-scroll">
        <table className="result-points">
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>{ui('Player', 'Игрок')}</th>
            <th>{ui('High', 'Хай')}</th>
            <th>{ui('Low', 'Лоу')}</th>
            <th>{ui('Returned', 'Возврат')}</th>
            <th>{ui('Contributed', 'Внесено')}</th>
            <th>{ui('Payout', 'Выплата')}</th>
            <th>{ui('Net', 'Итог')}</th>
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
      </div>

      <button
        type="button"
        aria-expanded={showAllHands}
        onClick={() => setShowAllHands((shown) => !shown)}
        style={{ marginTop: 12, border: '1px solid #cbd5e1', borderRadius: 10, background: '#fff', padding: '7px 12px', fontWeight: 800 }}
      >
        {showAllHands ? ui('Hide all hands', 'Скрыть все руки') : ui('Show all hands', 'Показать все руки')}
      </button>
      {showAllHands ? (
        <div className="all-hands">
          {result.players.map((player) => (
            <section className="hand-detail" data-testid={`hand-detail-${player.id}`} key={player.id}>
              <h3 style={{ margin: '0 0 5px' }}>{displayName(player.id)}{player.folded ? ` — ${ui('folded', 'фолд')}` : ''}</h3>
              {player.highRank ? (
                <>
                  <p style={{ margin: '0 0 4px' }}>{ui('High', 'Хай')}: {localizedRank(player.highRank)}</p>
                  {player.highCombo ? <ComboCardRow combo={player.highCombo} tone="high" /> : null}
                </>
              ) : null}
              {player.lowRank ? (
                <>
                  <p style={{ margin: '0 0 4px' }}>{ui('Low', 'Лоу')}: {localizedRank(player.lowRank)}</p>
                  {player.lowCombo ? <ComboCardRow combo={player.lowCombo} tone="low" /> : null}
                </>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PlayerPage({
  playerUrl,
  isLobbyHost = false,
  onPlayerUrl,
  onRestartGame,
  onExitGame,
}: PlayerPageProps = {}) {
  const [player, setPlayer] = useState<PlayerView | null>(null);
  const [partyScore, setPartyScore] = useState<PartyScore | null>(null);
  const [partyScoreLoading, setPartyScoreLoading] = useState(false);
  const [partyScoreRetryVersion, setPartyScoreRetryVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newDealLinks, setNewDealLinks] = useState<Array<{ id: string; url: string }>>([]);
  const [isCreatingDeal, setIsCreatingDeal] = useState(false);
  const [betSize, setBetSize] = useState<BetSizeOption>('blind');
  const [activeView, setActiveView] = useState<'table' | 'voice' | 'stats'>('table');
  const [sessionDeadline, setSessionDeadline] = useState<number | null>(null);
  const [sessionWarningRemainingMs, setSessionWarningRemainingMs] = useState(60 * 60_000);
  const [sessionNow, setSessionNow] = useState(Date.now());
  const [tableScale, setTableScale] = useState(1);
  const [cardScale, setCardScale] = useState(1);
  const [isMobileTable, setIsMobileTable] = useState(() => window.innerWidth <= 760);
  const [isTabletPortraitTable, setIsTabletPortraitTable] = useState(
    () => window.innerWidth >= 761 && window.innerWidth <= 820,
  );
  const [streetPause, setStreetPause] = useState<{ actions: ActionLog[]; version: number } | null>(null);
  const [pendingCommand, setPendingCommand] = useState<PendingPlayerCommand | null>(null);
  const pendingCommandRef = useRef<PendingPlayerCommand | null>(null);
  const playerRef = useRef<PlayerView | null>(null);
  const streetPauseTimerRef = useRef<number | null>(null);
  const streetPauseVersionRef = useRef(0);
  const retryPendingAfterSyncRef = useRef(false);
  const joinedPlayerSocketRef = useRef<WebSocket | null>(null);
  const partyScoreRequestRef = useRef<string | null>(null);
  const { handId, playerId, token } = playerAccessFromUrl(playerUrl ?? window.location.pathname);
  const pendingCommandStorageKey = `omaha-pending-command-${handId}-${playerId}`;

  function updatePendingCommand(command: PendingPlayerCommand | null) {
    pendingCommandRef.current = command;
    setPendingCommand(command);
    if (command) {
      window.sessionStorage.setItem(pendingCommandStorageKey, JSON.stringify(command));
    } else {
      window.sessionStorage.removeItem(pendingCommandStorageKey);
    }
  }

  function applySessionTiming(timing: PlayerView['session'] | undefined) {
    if (!timing) return;
    const elapsedAtReceipt = Math.max(0, timing.serverNow - timing.lastActivity);
    setSessionDeadline(Date.now() + Math.max(0, timing.expiresAfterMs - elapsedAtReceipt));
    setSessionWarningRemainingMs(Math.max(0, timing.expiresAfterMs - timing.warningAfterMs));
  }

  function applyPlayerState(nextPlayer: PlayerView) {
    const previousPlayer = playerRef.current;
    if (
      previousPlayer
      && previousPlayer.handId === nextPlayer.handId
      && previousPlayer.revision > nextPlayer.revision
    ) return;

    if (
      previousPlayer
      && previousPlayer.handId === nextPlayer.handId
      && previousPlayer.stage !== nextPlayer.stage
      && isBettingStreetAdvance(previousPlayer.stage, nextPlayer.stage)
    ) {
      const pausedActions = nextPlayer.players
        .filter((seat) => seat.id !== playerId)
        .map((seat) => [...nextPlayer.actions].reverse().find((action) => (
          action.stage === previousPlayer.stage && action.playerId === seat.id
        )))
        .filter((action): action is ActionLog => Boolean(action));
      const pauseVersion = streetPauseVersionRef.current + 1;
      streetPauseVersionRef.current = pauseVersion;
      setStreetPause({ actions: pausedActions, version: pauseVersion });
      if (streetPauseTimerRef.current !== null) window.clearTimeout(streetPauseTimerRef.current);
      streetPauseTimerRef.current = window.setTimeout(() => {
        setStreetPause((current) => current?.version === pauseVersion ? null : current);
        streetPauseTimerRef.current = null;
      }, STREET_CHANGE_PAUSE_MS);
    }

    playerRef.current = nextPlayer;
    setPlayer(nextPlayer);
  }

  useEffect(() => {
    setActiveView('table');
    setIsCreatingDeal(false);
    const savedCommand = window.sessionStorage.getItem(pendingCommandStorageKey);
    if (!savedCommand) {
      updatePendingCommand(null);
      return;
    }
    try {
      const command = JSON.parse(savedCommand) as PendingPlayerCommand;
      if (
        command.action !== 'player_move'
        || typeof command.commandId !== 'string'
        || command.handId !== handId
        || command.playerId !== playerId
        || command.token !== token
      ) {
        throw new Error('invalid pending command');
      }
      updatePendingCommand(command);
    } catch {
      updatePendingCommand(null);
    }
  }, [handId, playerId, token, pendingCommandStorageKey]);

  useEffect(() => {
    if (player?.partyFinishedEarly) setActiveView('stats');
  }, [player?.partyFinishedEarly]);

  useEffect(() => {
    if (activeView !== 'stats' || !player) return;
    const requestKey = `${player.handId}:${player.completedHandCount}:${player.partyFinishedEarly ? 'final' : 'live'}`;
    if (partyScoreRequestRef.current === requestKey) return;

    partyScoreRequestRef.current = requestKey;
    const controller = new AbortController();
    setPartyScore(null);
    setPartyScoreLoading(true);
    fetch(`${SERVER_URL}/api/player/${handId}/${playerId}/${token}/score`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<PartyScore>;
      })
      .then((nextScore) => {
        if (!controller.signal.aborted) setPartyScore(nextScore);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        partyScoreRequestRef.current = null;
        setNotice(err instanceof Error ? err.message : ui('Could not load statistics', 'Не удалось загрузить статистику'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setPartyScoreLoading(false);
      });
    return () => controller.abort();
  }, [activeView, handId, partyScoreRetryVersion, player?.completedHandCount, player?.handId, player?.partyFinishedEarly, playerId, token]);

  useEffect(() => {
    const timer = window.setInterval(() => setSessionNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (streetPauseTimerRef.current !== null) window.clearTimeout(streetPauseTimerRef.current);
  }, []);

  useEffect(() => {
    const updateTableScale = () => {
      const isCoarsePortrait = window.matchMedia('(pointer: coarse) and (orientation: portrait)').matches;
      setIsMobileTable(window.innerWidth <= 760);
      setIsTabletPortraitTable(window.innerWidth >= 761 && window.innerWidth <= 820);
      if (window.innerWidth <= 430 || isCoarsePortrait) {
        setTableScale(1);
        setCardScale(1);
        return;
      }
      const widthScale = window.innerWidth / 1280;
      // visualViewport follows the actually usable area when browser chrome
      // or the on-screen keyboard changes the viewport height.
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const heightScale = viewportHeight / 780;
      // Scale the base wireframe uniformly in both directions. Extra space
      // may enlarge it; insufficient space may shrink it.
      const viewportScale = Math.max(0.6, Math.min(widthScale, heightScale));
      setTableScale(viewportScale);
      setCardScale(viewportScale);
    };
    updateTableScale();
    window.addEventListener('resize', updateTableScale);
    window.visualViewport?.addEventListener('resize', updateTableScale);
    return () => {
      window.removeEventListener('resize', updateTableScale);
      window.visualViewport?.removeEventListener('resize', updateTableScale);
    };
  }, [player?.players.length]);

  useEffect(() => {
    if (sessionDeadline !== null && sessionNow >= sessionDeadline) {
      setError(ui('This table expired after 2 hours without activity.', 'Стол удалён после 2 часов без активности.'));
    }
  }, [sessionDeadline, sessionNow]);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/player/${handId}/${playerId}/${token}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((nextPlayer) => {
        applySessionTiming(nextPlayer.session);
        const localizedPlayer = withLocalTurnDeadline(nextPlayer);
        applyPlayerState(localizedPlayer);
      })
      .catch((err) => setError(err instanceof Error ? err.message : ui('Could not load hand', 'Не удалось загрузить раздачу')));
  }, [handId, playerId, token]);

  const { socket: ws, connected: socketReady } = useReliableWebSocket(WS_URL, {
    onOpen: (socket) => {
      joinedPlayerSocketRef.current = null;
      const client = {
        platform: navigator.platform,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio,
      };
      retryPendingAfterSyncRef.current = Boolean(pendingCommandRef.current);
      socket.send(JSON.stringify({ action: 'join_player', handId, playerId, token, client }));
    },
    onMessage: (event, socket) => {
      const message = JSON.parse(event.data);
      if (message.type === 'player_state') {
        joinedPlayerSocketRef.current = socket;
        applySessionTiming(message.data.session);
        const localizedPlayer = withLocalTurnDeadline(message.data);
        applyPlayerState(localizedPlayer);
        setNotice(null);
        if (
          retryPendingAfterSyncRef.current
          && pendingCommandRef.current
          && socket.readyState === WebSocket.OPEN
        ) {
          retryPendingAfterSyncRef.current = false;
          socket.send(JSON.stringify(pendingCommandRef.current));
          setNotice(ui(
            'Restoring confirmation of your last action…',
            'Восстанавливаем подтверждение последнего действия…',
          ));
        }
      }
      if (message.type === 'session_activity') {
        applySessionTiming(message.data);
      }
      if (message.type === 'session_expired') {
        setError(ui('This table expired after 2 hours without activity.', 'Стол удалён после 2 часов без активности.'));
      }
      if (message.type === 'hand_dealt' && message.data?.playerLinks) {
        setIsCreatingDeal(false);
        setNewDealLinks(message.data.playerLinks);
        const samePlayerLink = message.data.playerLinks.find((link: { id: string; url: string }) => (
          link.id === playerId
        ));

        if (samePlayerLink) {
          setNotice(ui('New deal created. Opening your new hand.', 'Новая раздача создана. Открываем вашу руку.'));
          if (onPlayerUrl) onPlayerUrl(samePlayerLink.url);
          else window.location.href = samePlayerLink.url;
        } else {
          setNotice(ui('New deal created.', 'Новая раздача создана.'));
        }
      }
      if (message.type === 'hand_updated' && message.data?.id === handId) {
        joinedPlayerSocketRef.current = null;
        socket.send(JSON.stringify({ action: 'join_player', handId, playerId, token }));
      }
      if (
        message.type === 'command_ack'
        && pendingCommandRef.current?.commandId === message.commandId
      ) {
        updatePendingCommand(null);
        setNotice(ui('Action confirmed.', 'Действие подтверждено.'));
      }
      if (message.type === 'error') {
        setIsCreatingDeal(false);
        if (message.commandId && pendingCommandRef.current?.commandId === message.commandId) {
          updatePendingCommand(null);
          setNotice(localizedServerMessage(message.message));
        } else {
          setError(localizedServerMessage(message.message));
        }
      }
    },
  });

  useEffect(() => {
    if (!socketReady) {
      partyScoreRequestRef.current = null;
      return;
    }
    setPartyScoreRetryVersion((version) => version + 1);
  }, [socketReady]);

  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      joinedPlayerSocketRef.current = null;
      ws.send(JSON.stringify({ action: 'join_player', handId, playerId, token }));
    }
  }, [ws, handId, playerId, token]);

  useEffect(() => {
    if (!ws) return undefined;
    let lastInteraction = Date.now();
    let lastActivitySent = 0;
    const sendActivity = () => {
      const now = Date.now();
      lastInteraction = now;
      if (
        joinedPlayerSocketRef.current === ws
        && ws.readyState === WebSocket.OPEN
        && now - lastActivitySent >= 5_000
      ) {
        lastActivitySent = now;
        ws.send(JSON.stringify({ action: 'player_activity' }));
      }
    };
    const interactionEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll'] as const;
    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, sendActivity, { passive: true });
    });
    const activityTimer = window.setInterval(() => {
      const now = Date.now();
      if (
        document.visibilityState === 'visible'
        && now - lastInteraction <= 30_000
        && joinedPlayerSocketRef.current === ws
        && ws.readyState === WebSocket.OPEN
      ) {
        lastActivitySent = now;
        ws.send(JSON.stringify({ action: 'player_activity' }));
      }
    }, 10_000);

    return () => {
      window.clearInterval(activityTimer);
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, sendActivity);
      });
    };
  }, [ws]);

  function sendMove(move: PlayerMove, amount?: number, moveBetSize?: BetSizeOption) {
    if (pendingCommandRef.current) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setNotice(ui('Connecting to server. Try again in a moment.', 'Подключаемся к серверу. Попробуйте ещё раз через несколько секунд.'));
      return;
    }

    const command: PendingPlayerCommand = {
      action: 'player_move',
      commandId: newCommandId(),
      handId,
      playerId,
      token,
      move,
      amount,
      betSize: moveBetSize,
    };
    updatePendingCommand(command);
    setNotice(`${localizedMove(move)} — ${ui('waiting for confirmation', 'ждём подтверждения')}.`);
    ws.send(JSON.stringify(command));
  }

  function startNewDeal() {
    if (isCreatingDeal) return;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setNotice(ui('Connecting to server. Try again in a moment.', 'Подключаемся к серверу. Попробуйте ещё раз через несколько секунд.'));
      return;
    }

    setIsCreatingDeal(true);
    setNewDealLinks([]);
    setNotice(ui('Creating new deal.', 'Создаём новую раздачу.'));
    ws.send(JSON.stringify({ action: 'new_deal', handId }));
    window.setTimeout(() => {
      setIsCreatingDeal((stillCreating) => {
        if (stillCreating) {
          setNotice(ui('New deal is taking longer than expected. Try again.', 'Новая раздача создаётся дольше обычного. Попробуйте ещё раз.'));
        }
        return false;
      });
    }, 10_000);
  }

  function replayDeal(sourceHandId = handId) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setNotice(ui('Connecting to server. Try again in a moment.', 'Подключаемся к серверу. Попробуйте ещё раз через несколько секунд.'));
      return;
    }

    setNewDealLinks([]);
    setNotice(ui('Creating replay deal.', 'Создаём повтор раздачи.'));
    ws.send(JSON.stringify({ action: 'replay_deal', handId: sourceHandId }));
  }

  if (error) return <div style={{ padding: 12 }}>{ui('Error', 'Ошибка')}: {error}</div>;
  if (!player) return <div style={{ padding: 12 }}>{ui('Loading…', 'Загрузка…')}</div>;

  const sessionRemainingMs = sessionDeadline === null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, sessionDeadline - sessionNow);
  const showSessionWarning = sessionRemainingMs <= sessionWarningRemainingMs;
  const sessionRemainingSeconds = Math.ceil(sessionRemainingMs / 1_000);
  const sessionHours = Math.floor(sessionRemainingSeconds / 3_600);
  const sessionMinutes = Math.floor((sessionRemainingSeconds % 3_600) / 60);
  const sessionSeconds = sessionRemainingSeconds % 60;
  const sessionCountdown = sessionHours
    ? `${sessionHours}:${String(sessionMinutes).padStart(2, '0')}:${String(sessionSeconds).padStart(2, '0')}`
    : `${sessionMinutes}:${String(sessionSeconds).padStart(2, '0')}`;
  const isYourTurn = socketReady && player.stage !== 'showdown' && !player.isBot && !player.folded && player.currentPlayerId === player.playerId;
  const canAct = isYourTurn && !pendingCommand && !streetPause;
  const currentBet = player.currentBet ?? 0;
  const yourRoundBet = player.roundBets?.[player.playerId] ?? 0;
  const bigBlind = player.blinds?.big ?? 4;
  const raiseCount = player.raiseCount ?? 0;
  const maxRaises = typeof player.maxRaises === 'number' && player.maxRaises < 1_000
    ? player.maxRaises
    : undefined;
  const minimumRaiseIncrement = player.lastFullRaise ?? bigBlind;
  const callAmount = Math.max(currentBet - yourRoundBet, 0);
  const call = callAction(callAmount, player.stack);
  const betAmount = betTargetAmount(betSize, player.potCoins, bigBlind, player.stack);
  const raiseTo = raiseTargetAmount(betSize, player.potCoins, currentBet, yourRoundBet, minimumRaiseIncrement, player.stack);
  const wagerTarget = currentBet > 0 ? raiseTo : betAmount;
  const betSizeFraction = betSizeFactor(betSize);
  const potAfterCall = player.potCoins + callAmount;
  const nominalRaiseSize = Math.ceil(potAfterCall * betSizeFraction);
  const selectedBetSize = BET_SIZE_OPTIONS.find((option) => option.value === betSize);
  const selectedBetSizeLabel = selectedBetSize ? localizedBetSize(selectedBetSize) : '';
  const betIsAllIn = isAllInWager(wagerTarget, yourRoundBet, player.stack);
  const raiseIsAllIn = isAllInWager(wagerTarget, yourRoundBet, player.stack);
  const canCall = canAct && yourRoundBet < currentBet;
  const raiseCapAvailable = maxRaises === undefined || raiseCount < maxRaises;
  const bettingReopened = !player.actedSinceLastFullRaise?.includes(player.playerId);
  const canRaise = canAct && currentBet > 0 && raiseCapAvailable && bettingReopened && call.canRaise;
  const hasContinuation = Boolean(player.nextHandId || player.nextReplayHandId);
  const tournamentWinner = findTournamentWinner(
    player.stage,
    player.players,
    player.partyTotals,
  );
  const canContinue = socketReady
    && player.stage === 'showdown'
    && !hasContinuation
    && !tournamentWinner
    && !player.partyFinishedEarly;
  const showActionDock = socketReady
    && player.stage !== 'showdown'
    && !player.folded
    && !streetPause;
  const showStatsTile = Boolean(
    tournamentWinner || player.partyFinishedEarly || player.stage === 'showdown'
      || player.completedHandCount > 0 || newDealLinks.length
  );
  const voiceAvailable = Boolean(
    player.voiceEnabled && (sessionDeadline === null || sessionNow < sessionDeadline)
  );
  const isVoiceView = activeView === 'voice';
  const isStatsView = activeView === 'stats' && showStatsTile;
  const isTableView = !isVoiceView && !isStatsView;
  const playerSeatIndex = player.players.findIndex(seat => seat.id === player.playerId);
  const otherPlayers = playerSeatIndex < 0
    ? player.players.filter(seat => seat.id !== player.playerId)
    : [
        ...player.players.slice(playerSeatIndex + 1),
        ...player.players.slice(0, playerSeatIndex),
      ];
  const smallBlindIndex = player.players.findIndex(seat => seat.id === player.blinds?.smallBlindPlayerId);
  const inferredDealerId = smallBlindIndex >= 0
    ? player.players.length === 2
      ? player.blinds?.smallBlindPlayerId
      : player.players[(smallBlindIndex - 1 + player.players.length) % player.players.length]?.id
    : undefined;
  const dealerPlayerId = player.blinds?.dealerPlayerId ?? inferredDealerId;
  const heroSeat = player.players.find((seat) => (
      seat.hole?.length === player.hole.length
      && seat.hole?.every((card, index) => card === player.hole[index])
    ))
    ?? player.players.find((seat) => seat.id === player.playerId)
    ?? player.players.find((seat) => seat.name && seat.name === player.playerName);
  const heroPositionId = heroSeat?.id ?? player.playerId;
  const turnSeconds = typeof player.turnDeadline === 'number'
    ? Math.max(0, Math.ceil((player.turnDeadline - sessionNow) / 1_000))
    : undefined;
  const turnElapsedMs = typeof player.turnDeadline === 'number' && typeof player.turnDurationMs === 'number'
    ? player.turnDurationMs - (player.turnDeadline - sessionNow)
    : 0;
  const showTurnCountdown = player.stage !== 'showdown'
    && player.currentPlayerId === player.playerId
    && typeof turnSeconds === 'number'
    && turnElapsedMs >= 10_000;
  const opponentNodes = otherPlayers.map((seat) => (
    <WireframeHand
      key={`${seat.id}-${player.handId}`}
      id={seat.id}
      hole={seat.hole}
      cardCount={seat.cardCount}
      isYou={false}
      name={seat.name}
      stack={seat.stack}
      resultPlayer={player.stage === 'showdown' ? player.result?.players.find(result => result.id === seat.id) : undefined}
      isThinking={player.stage !== 'showdown' && player.currentPlayerId === seat.id}
      isWaitingForNextDeal={player.waitingForPlayers.some(waiting => waiting.id === seat.id)}
      lastAction={streetPause?.actions.find((action) => action.playerId === seat.id)
        ?? latestActionForPlayer(player.actions, seat.id, player.stage)}
      folded={seat.folded}
      eliminated={totalScore(player.partyTotals, seat.id) <= 0}
      isHighWinner={player.stage === 'showdown' && Boolean(player.result?.highWinners.includes(seat.id))}
      isLowWinner={player.stage === 'showdown' && Boolean(player.result?.lowWinners.includes(seat.id))}
      isAllIn={seat.stack === 0 && !seat.folded}
      blindLabel={playerBlindLabel(player.blinds, seat.id, player.stage)}
      isDealer={dealerPlayerId === seat.id}
      decisionActions={player.stage === 'showdown'
        ? player.actions.filter((action) => action.playerId === seat.id && Boolean(action.botReason))
        : []}
      boardCards={player.stage === 'showdown' ? player.community : []}
    />
  ));
  const submitWager = (move: 'bet' | 'raise') => {
    sendMove(move, wagerTarget, betSize);
  };
  const statusPillStyle: React.CSSProperties = {
    border: '1px solid #d1d5db',
    borderRadius: 999,
    padding: '3px 8px',
    background: '#fff',
    fontSize: 12,
    lineHeight: 1.2,
  };
  const potDisplay = (showCurrentBet: boolean) => (
    <PotDisplay
      value={player.potCoins}
      currentBet={currentBet}
      showCurrentBet={showCurrentBet}
      breakdown={player.potBreakdown}
      players={player.players}
      contributions={player.totalContributions ?? {}}
      roundBets={player.roundBets ?? {}}
      currentPlayerId={player.playerId}
    />
  );

  return (
    <>
      <div className="poker-page">
        <style>{PLAYER_PAGE_STYLES}</style>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 5 }}>
      </div>
      <nav className="view-tabs" role="tablist" aria-label={ui('Game views', 'Разделы игры')}>
        <button
          id="table-tab"
          type="button"
          role="tab"
          aria-controls="table-panel"
          aria-selected={isTableView}
          className={`view-tab${isTableView ? ' is-active' : ''}`}
          onClick={() => setActiveView('table')}
        >
          {ui('TABLE', 'СТОЛ')}
        </button>
        <button
            id="voice-tab"
            type="button"
            role="tab"
            aria-controls="voice-panel"
            aria-selected={isVoiceView}
            className={`view-tab${isVoiceView ? ' is-active' : ''}`}
            onClick={() => setActiveView('voice')}
          >
            {ui('VOICE', 'ГОЛОС')}
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
          {ui('STATISTICS', 'СТАТИСТИКА')}
        </button>
      </nav>

      {isTableView ? <section
        id="table-panel"
        role="tabpanel"
        aria-labelledby="table-tab"
        className="game-tile"
        data-testid="game-tile"
      >
      {showSessionWarning ? (
        <p className="session-warning" role="alert" data-testid="session-expiry-warning">
          {ui('No activity. This table will be deleted in', 'Нет активности. Стол будет удалён через')} {sessionCountdown}.
        </p>
      ) : null}
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
            {ui('disconnected', 'нет соединения')}
          </span>
        </div>
      ) : null}

      <WireframeTable
        opponents={opponentNodes}
        opponentCount={otherPlayers.length}
      >
        <section className="opponents-zone" data-testid="opponents-zone" aria-label={ui('Opponents', 'Ð¡Ð¾Ð¿ÐµÑ€Ð½Ð¸ÐºÐ¸')}>
          {player.isReplay || player.replayOfHandId ? <HandBanner player={player} /> : null}
        <div
          className="wireframe-opponents-row"
          data-testid="opponents-grid"
          data-opponent-count={otherPlayers.length}
          style={{ '--card-table-scale': cardScale } as React.CSSProperties}
        >
          {opponentNodes}
        </div>
        </section>

        <section
          className="wireframe-results-zone results-zone"
          data-testid="results-zone"
          aria-label={ui('Game results', 'Итоги игры')}
        >
          {player.stage === 'showdown' ? (
            <ShowdownStatus
              player={player}
              newDealAction={canContinue ? (
                <button
                  className="action-button primary"
                  disabled={isCreatingDeal}
                  onClick={startNewDeal}
                >
                  {isCreatingDeal ? ui('Creating…', 'Создаём…') : ui('New deal', 'Новая раздача')}
                </button>
              ) : player.nextPlayerLink ? (
                <button
                  className="action-button primary"
                  onClick={() => {
                    if (onPlayerUrl) onPlayerUrl(player.nextPlayerLink!.url);
                    else window.location.href = player.nextPlayerLink!.url;
                  }}
                >
                  {ui('New deal', 'Новая раздача')}
                </button>
              ) : undefined}
            />
          ) : (
            <div className="table-pot" data-testid="table-pot">
              {potDisplay(false)}
            </div>
          )}
        </section>

        <section
          className="wireframe-flop-zone flop-zone"
          data-testid="flop-zone"
          aria-label={ui('Flop and board', 'Флоп и доска')}
        >
          <TableEmblem />
          <div className="table-stage" data-testid="table-stage"><StreetBadge stage={player.stage} /></div>
          <div className="table-board" data-testid="table-board"><BoardRow cards={player.community} compact /></div>
          {player.stage === 'showdown' ? (
            <div className="table-pot" data-testid="table-pot">
              {potDisplay(true)}
            </div>
          ) : null}
        </section>

        <div
          className="wireframe-player-zone hero-zone"
          style={isTabletPortraitTable ? { columnGap: 24 } : undefined}
        >
          <PlayerComboSide combo={player.currentCombo} kind="high" />
          <div
            className="wireframe-hero-slot"
            style={{
              display: 'flex',
              justifyContent: 'center',
              '--card-table-scale': cardScale,
            } as React.CSSProperties}
          >
            <WireframeHand
              key={`${player.playerId}-${player.handId}`}
              id={player.playerId}
              isYou
              name={player.playerName}
              hole={player.hole}
              cardCount={player.hole.length}
              stack={player.stack}
              isHighWinner={player.stage === 'showdown' && Boolean(player.result?.highWinners.includes(player.playerId))}
              isLowWinner={player.stage === 'showdown' && Boolean(player.result?.lowWinners.includes(player.playerId))}
              isAllIn={player.stack === 0 && !player.folded}
              eliminated={totalScore(player.partyTotals, player.playerId) <= 0}
              blindLabel={playerBlindLabel(player.blinds, heroPositionId, player.stage)}
              isDealer={dealerPlayerId === heroPositionId}
              isThinking={player.stage !== 'showdown' && player.currentPlayerId === player.playerId}
              turnSeconds={turnSeconds}
            />
          </div>
          <PlayerComboSide combo={player.currentCombo} kind="low" />
        </div>

        <section
          className="wireframe-actions-zone actions-zone"
          data-testid="actions-zone"
          aria-label={ui('Actions and buttons', 'Действия и кнопки')}
        >
          {showTurnCountdown ? (
            <div
              className="turn-timer-badge"
              data-testid={`turn-countdown-${player.playerId}`}
              aria-label={ui('Time remaining', 'Оставшееся время')}
            >
              <span className="turn-timer-icon" aria-hidden="true">◷</span>
              <span>{turnSeconds}s</span>
            </div>
          ) : null}
          {showActionDock ? <div
            className="action-dock"
            onPointerDownCapture={(event) => {
              // A press that starts while controls are unavailable must not
              // become a click after the turn changes.
              if (!canAct) event.preventDefault();
            }}
          >
            {pendingCommand ? (
              <strong role="status">
                {ui('Waiting for server confirmation…', 'Ждём подтверждения сервера…')}
              </strong>
            ) : null}
            {canAct ? (
              <>
            {(currentBet === 0 || raiseCapAvailable) ? (
              <div className="bet-sizes">
                <span style={{ color: '#64748b', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>{ui('Bet size', 'Размер ставки')}</span>
                {BET_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={!canAct}
                    onClick={() => setBetSize(option.value)}
                    className={`bet-size-button${betSize === option.value ? ' is-selected' : ''}`}
                  >
                    {localizedBetSize(option)}
                  </button>
                ))}
              </div>
            ) : null}
            <fieldset className="main-actions" disabled={!canAct}>
            {callAmount === 0 ? (
              <>
                <button className="action-button primary" onClick={() => sendMove('check')}>{ui('Check', 'Чек')}</button>
                {currentBet === 0 ? (
                  <button className="action-button" onClick={() => submitWager('bet')}>
                    {betIsAllIn ? ui('Bet all-in', 'Олл-ин') : ui('Bet', 'Ставка')} {formatPoints(wagerTarget)}
                  </button>
                ) : null}
                {currentBet > 0 && raiseCapAvailable ? (
                  <button className="action-button" disabled={!canRaise} onClick={() => submitWager('raise')}>
                    {raiseIsAllIn ? ui('Raise all-in to', 'Рейз олл-ин до') : ui('Raise to', 'Рейз до')} {formatPoints(wagerTarget)}{maxRaises === undefined ? '' : ` (${raiseCount}/${maxRaises})`}
                  </button>
                ) : null}
                <button
                  className="action-button danger"
                  onClick={() => sendMove('fold')}
                >
                  {ui('Fold', 'Фолд')}
                </button>
              </>
            ) : null}
            {callAmount > 0 ? (
              <>
                <button className="action-button primary" disabled={!canCall} onClick={() => sendMove('call')}>
                  {call.isAllIn ? ui('All-in', 'Олл-ин') : ui('Call', 'Колл')} {formatPoints(call.amount)}
                </button>
                {raiseCapAvailable ? (
                  <button className="action-button" disabled={!canRaise} onClick={() => submitWager('raise')}>
                    {raiseIsAllIn ? ui('Raise all-in to', 'Рейз олл-ин до') : ui('Raise to', 'Рейз до')} {formatPoints(wagerTarget)}{maxRaises === undefined ? '' : ` (${raiseCount}/${maxRaises})`}
                  </button>
                ) : null}
                <button
                  className="action-button danger"
                  onClick={() => sendMove('fold')}
                >
                  {ui('Fold', 'Фолд')}
                </button>
              </>
            ) : null}
            </fieldset>
            {betSizeFraction > 0 && betSize !== 'pot' ? (
              <div className="bet-size-explanation" data-testid="bet-size-explanation">
                {currentBet > 0 ? (
                  <>
                    {ui('Pot after call', 'Банк после колла')}: <strong>{formatPoints(potAfterCall)}</strong>
                    {' · '}{selectedBetSizeLabel} = <strong>{formatPoints(nominalRaiseSize)}</strong>
                    {' · '}{ui('Raise to', 'Рейз до')} <strong>{formatPoints(raiseTo)}</strong>
                  </>
                ) : (
                  <>
                    {ui('Pot', 'Банк')}: <strong>{formatPoints(player.potCoins)}</strong>
                    {' · '}{selectedBetSizeLabel} = {ui('Bet', 'ставка')} <strong>{formatPoints(betAmount)}</strong>
                  </>
                )}
              </div>
            ) : null}
              </>
            ) : !pendingCommand ? (
              <strong role="status">
                {ui('Waiting for your turn...', '\u0416\u0434\u0451\u043c \u0432\u0430\u0448\u0435\u0433\u043e \u0445\u043e\u0434\u0430...')}
              </strong>
            ) : null}
          </div> : null}
        </section>
      </WireframeTable>
      {tournamentWinner ? (
        <section
          data-testid="game-finished-prompt"
          style={{ display: 'grid', gap: 10, marginTop: 10, padding: 14, border: '1px solid #a7f3d0', borderRadius: 12, background: '#ecfdf5' }}
        >
          <strong>
            {ui('Tournament winner', 'Победитель турнира')}: {tablePlayerName(tournamentWinner.name, tournamentWinner.id)}
          </strong>
          {isLobbyHost ? (
            <>
              <span>{ui('The game is over. What next?', 'Игра окончена. Что дальше?')}</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="action-button primary" onClick={onRestartGame}>
                  {ui('Deal 1000 to everyone again', 'Снова раздать всем по 1000')}
                </button>
                <button className="action-button" onClick={onExitGame}>
                  {ui('Exit to home page', 'Выйти на начальную страницу')}
                </button>
              </div>
            </>
          ) : (
            <span>{ui('Waiting for the host to choose what happens next.', 'Ждём решения хоста: начать заново или выйти.')}</span>
          )}
        </section>
      ) : null}

      {notice ? (
        <p className="game-notice">
          {notice}
        </p>
      ) : null}
      </section> : null}

      <section
          id="voice-panel"
          role="tabpanel"
          aria-labelledby="voice-tab"
          className="voice-panel"
          hidden={!isVoiceView}
        >
          {voiceAvailable ? <React.Suspense fallback={null}>
            <VoiceChat
              endpoint={`${SERVER_URL}/api/voice/token`}
              handId={handId}
              playerId={playerId}
              playerToken={token}
              labels={{
                title: ui('Voice chat', 'Голосовой чат'),
                join: ui('Join voice', 'Войти в голос'),
                joining: ui('Connecting…', 'Подключение…'),
                leave: ui('Leave', 'Выйти'),
                microphoneOn: ui('Mic on', 'Микрофон включён'),
                microphoneOff: ui('Mic off', 'Микрофон выключен'),
                soundOn: ui('Sound on', 'Звук включён'),
                soundOff: ui('Sound off', 'Звук выключен'),
                connected: ui('Connected', 'Подключено'),
                participant: ui('participant', 'участник'),
                participants: ui('participants', 'участников'),
                speaking: ui('Speaking', 'Говорит'),
                genericError: ui('Could not connect to voice chat', 'Не удалось подключиться к голосовому чату'),
              }}
            />
          </React.Suspense> : (
            <p role="status">
              {ui('Voice chat is currently unavailable.', 'Голосовой чат сейчас недоступен.')}
            </p>
          )}
      </section>

      {isStatsView ? <section
        id="stats-panel"
        role="tabpanel"
        aria-labelledby="stats-tab"
        className="stats-tile"
        data-testid="stats-tile"
      >
      {player.partyFinishedEarly ? (
        <section
          data-testid="early-finish-summary"
          style={{ display: 'grid', gap: 10, marginBottom: 14, padding: 14, border: '1px solid #a7f3d0', borderRadius: 12, background: '#ecfdf5' }}
        >
          <strong>{ui('Table ended early by unanimous decision. Final results', 'Стол досрочно завершён единогласным решением. Итоги')}</strong>
          {isLobbyHost ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="action-button primary" onClick={onRestartGame}>
                {ui('Deal 1000 to everyone again', 'Снова раздать всем по 1000')}
              </button>
              <button className="action-button" onClick={onExitGame}>
                {ui('Exit to home page', 'Выйти на начальную страницу')}
              </button>
            </div>
          ) : (
            <span>{ui('The final statistics are shown below.', 'Итоговая статистика показана ниже.')}</span>
          )}
        </section>
      ) : null}
      {tournamentWinner ? (
        <>
          <p style={{ fontWeight: 800 }}>
            {ui('Tournament winner', 'Победитель турнира')}: {tablePlayerName(tournamentWinner.name, tournamentWinner.id)}
          </p>
          {isLobbyHost ? (
            <section
              data-testid="host-game-finished"
              style={{ display: 'grid', gap: 10, padding: 14, border: '1px solid #a7f3d0', borderRadius: 12, background: '#ecfdf5' }}
            >
              <strong>{ui('The game is over. What next?', 'Игра окончена. Что дальше?')}</strong>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="action-button primary" onClick={onRestartGame}>
                  {ui('Deal 1000 to everyone again', 'Снова раздать всем по 1000')}
                </button>
                <button className="action-button" onClick={onExitGame}>
                  {ui('Exit to home page', 'Выйти на начальную страницу')}
                </button>
              </div>
            </section>
          ) : (
            <p>{ui('Waiting for the host to choose what happens next.', 'Ждём решения хоста: начать заново или выйти.')}</p>
          )}
        </>
      ) : null}
      <PartyStatistics
        score={partyScore ?? undefined}
        players={player.players}
        currentPlayerId={player.playerId}
        isFinal={Boolean(tournamentWinner || player.partyFinishedEarly)}
      />
      {partyScoreLoading && !partyScore ? (
        <p role="status">{ui('Loading statistics…', 'Загружаем статистику…')}</p>
      ) : null}

      {false && newDealLinks.length ? (
        <section style={{ marginTop: 18, border: '1px solid #d1d5db', borderRadius: 8, padding: 12 }}>
          <h2>{ui('New deal', 'Новая раздача')}</h2>
          <ul>
            {newDealLinks.map((link) => (
              <li key={link.id}>
                {link.id}:{' '}
                <a href={link.url} target="_blank" rel="noreferrer">
                  {ui('open page', 'открыть страницу')}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {false ? <ReplayControls
        score={partyScore ?? undefined}
        canReplay={canContinue}
        onReplayHand={replayDeal}
      /> : null}
      </section> : null}

      </div>
      <HorizontalTableWidthGuard />
    </>
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
      .catch((err) => setError(err instanceof Error ? err.message : ui('Could not load hand', 'Не удалось загрузить раздачу')));
  }, []);

  if (error) return <div style={{ padding: 20 }}>{ui('Error', 'Ошибка')}: {error}</div>;
  if (!hand) return <div style={{ padding: 20 }}>{ui('Loading…', 'Загрузка…')}</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <style>{PLAYER_PAGE_STYLES}</style>
      <h1>{ui('Debug hand', 'Отладка раздачи')}</h1>
      <p title={hand.id}>{ui('Hand', 'Раздача')}: {handLabel(hand.handCode, hand.handNumber, hand.id)}</p>
      <p title={hand.partyId}>{ui('Party', 'Партия')}: {partyLabel(hand.partyCode, hand.partyId)}</p>
      <p>{ui('Pot', 'Банк')}: {formatPoints(hand.potCoins ?? 2)} {ui('coins', 'фишек')}</p>
      <p>{ui('Stage', 'Улица')}: {localizedStage(hand.stage ?? 'showdown')}</p>
      <p>{ui('Turn', 'Ход')}: {hand.currentPlayerId ?? '-'}</p>
      <h2>{ui('Board', 'Борд')}</h2>
      <CardRow cards={hand.fullCommunity ?? hand.community} />

      <h2>{ui('Players', 'Игроки')}</h2>
      <div style={{ display: 'grid', gap: 18 }}>
        {hand.players.map((player) => (
          <section key={player.id}>
            <h3>{player.id}</h3>
            {player.folded ? <p>{ui('Folded', 'Фолд')}</p> : null}
            <CardRow cards={player.hole} />
          </section>
        ))}
      </div>

      {hand.cardsRevealed ? (
        <ResultView result={hand.result} players={hand.players} contributions={hand.totalContributions} />
      ) : null}

      <h2>{ui('Actions', 'Действия')}</h2>
      {hand.actions?.length ? (
        <ul>
          {hand.actions.map((action) => (
            <li key={`${action.stage}-${action.playerId}-${action.at}`}>
              {action.stage}: {action.playerId} {action.move}
            </li>
          ))}
        </ul>
      ) : (
        <p>{ui('No actions yet.', 'Действий пока нет.')}</p>
      )}
    </div>
  );
}

function LobbyCardFan({ empty = false }: { empty?: boolean }) {
  return (
    <div className="lobby-card-fan" style={{ position: 'relative', width: 58, height: 42, opacity: empty ? 0.28 : 1 }}>
      {[-18, 0, 18].map((rotation, index) => (
        <div
          key={rotation}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 17 + index * 3,
            bottom: 0,
            width: 27,
            height: 39,
            borderRadius: 3,
            background: SIMPLE_CARD_BACK_BACKGROUND,
            border: '2px solid #fff',
            boxSizing: 'border-box',
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
  canMoveMembers = false,
  onMoveMember,
}: {
  lobby: LobbyView;
  memberId?: string | null;
  canRemoveBots?: boolean;
  onRemoveBot?: (memberId: string) => void;
  canMoveMembers?: boolean;
  onMoveMember?: (memberId: string, seat: number) => void;
}) {
  const physicalSeats = Array.from(
    { length: lobby.maxPlayers },
    (_, index) => lobby.members.find(member => member.seat === index),
  );
  const viewerSeat = lobby.members.find(member => member.id === memberId)?.seat ?? 0;
  const seats = Array.from({ length: lobby.maxPlayers }, (_, screenSeat) => {
    const physicalSeat = (viewerSeat + screenSeat) % lobby.maxPlayers;
    return { member: physicalSeats[physicalSeat], physicalSeat };
  });

  return (
    <div className="lobby-table-scroll" style={{ overflowX: 'auto', padding: '4px 0 10px' }}>
      <div
        className="lobby-table-layout"
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
          className="lobby-felt"
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
            <strong style={{ fontSize: 20, letterSpacing: '.12em' }}>{ui('OMAHA HI-LO', 'ОМАХА ХАЙ-ЛО')}</strong>
            <span style={{ marginTop: 5, fontSize: 12, fontWeight: 800, opacity: 0.82 }}>{ui('WAITING FOR PLAYERS', 'ОЖИДАЕМ ИГРОКОВ')}</span>
            <span style={{ marginTop: 7, border: '1px solid rgba(255,255,255,.4)', borderRadius: 999, padding: '3px 10px', fontWeight: 900 }}>
              {lobby.members.length} / {lobby.maxPlayers}
            </span>
          </div>
        </div>

        {seats.map(({ member: seat, physicalSeat }, index) => {
          const angle = (Math.PI / 2) + ((Math.PI * 2 * index) / seats.length);
          const left = 50 + 42 * Math.cos(angle);
          const top = 50 + 38 * Math.sin(angle);
          const isYou = seat?.id === memberId;

          return (
            <div
              className="lobby-seat"
              key={seat?.id ?? `empty-${index}`}
              data-lobby-seat={index + 1}
              data-physical-seat={physicalSeat + 1}
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
                className="lobby-seat-card"
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
                  {seat ? tablePlayerName(seat.name, seat.id) : ui('OPEN SEAT', 'СВОБОДНОЕ МЕСТО')}
                </strong>
                <span style={{ fontSize: 10, fontWeight: 800, color: seat ? '#64748b' : '#cbd5e1' }}>
                  {seat
                    ? `${seat.isHost ? `${ui('HOST', 'ВЕДУЩИЙ')} · ` : ''}${isYou ? ui('YOU', 'ВЫ') : ui('READY', 'ГОТОВ')}`
                    : `${ui('SEAT', 'МЕСТО')} ${physicalSeat + 1}`}
                </span>
              </div>
              {seat && !seat.isHost && canMoveMembers && onMoveMember ? (
                <label style={{ display: 'grid', gap: 2, marginTop: 3, color: '#334155', fontSize: 10, fontWeight: 800 }}>
                  {ui('Move to', 'Пересадить')}
                  <select
                    aria-label={`${ui('Seat for', 'Место для')} ${tablePlayerName(seat.name, seat.id)}`}
                    value={seat.seat}
                    onChange={(event) => onMoveMember(seat.id, Number(event.target.value))}
                    style={{ maxWidth: 112, minHeight: 24, borderRadius: 6, fontSize: 11 }}
                  >
                    {Array.from({ length: lobby.maxPlayers }, (_, targetSeat) => {
                      const occupant = physicalSeats[targetSeat];
                      return (
                        <option
                          key={targetSeat}
                          value={targetSeat}
                          disabled={Boolean(occupant?.isHost)}
                        >
                          {ui('Seat', 'Место')} {targetSeat + 1}
                          {occupant && occupant.id !== seat.id
                            ? ` · ${tablePlayerName(occupant.name, occupant.id)}`
                            : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>
              ) : null}
              {seat?.isBot && canRemoveBots && onRemoveBot ? (
                <button
                  onClick={() => onRemoveBot(seat.id)}
                  style={{ minHeight: 24, marginTop: 3, padding: '2px 7px', borderRadius: 999, fontSize: 10 }}
                >
                  {ui('Remove', 'Убрать')}
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
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [name, setName] = useState(storedPlayerName);
  const [botName, setBotName] = useState('');
  const [replayCodeInput, setReplayCodeInput] = useState('');
  const [lobbyTab, setLobbyTab] = useState<'lobby' | 'replay'>('lobby');
  const [notice, setNotice] = useState<string | null>(null);
  const [sessionDeadline, setSessionDeadline] = useState<number | null>(null);
  const [sessionWarningRemainingMs, setSessionWarningRemainingMs] = useState(60 * 60_000);
  const [sessionNow, setSessionNow] = useState(Date.now());
  const [lobbyExpired, setLobbyExpired] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const activeStorageKey = `omaha-lobby-${lobbyId}-active`;
  const accessStorageKey = `omaha-lobby-${lobbyId}-access-pin`;
  const playerStorageKey = `omaha-lobby-${lobbyId}-player-url`;
  const storageKey = memberHint ? `omaha-lobby-${lobbyId}-${memberHint}` : activeStorageKey;

  function applyLobbySession(nextLobby: LobbyView | undefined) {
    const timing = nextLobby?.session;
    if (!timing) return;
    const elapsedAtReceipt = Math.max(0, timing.serverNow - timing.lastActivity);
    setSessionDeadline(Date.now() + Math.max(0, timing.expiresAfterMs - elapsedAtReceipt));
    setSessionWarningRemainingMs(Math.max(0, timing.expiresAfterMs - timing.warningAfterMs));
    setLobbyExpired(false);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setSessionNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (sessionDeadline !== null && sessionNow >= sessionDeadline) setLobbyExpired(true);
  }, [sessionDeadline, sessionNow]);

  useEffect(() => {
    if (!lobby) return;
    if (lobby.replayCode) setReplayCodeInput(lobby.replayCode);
  }, [lobby?.id, lobby?.isReplay, lobby?.replayCode]);

  const { socket, connected: socketReady } = useReliableWebSocket(WS_URL, {
    onOpen: (ws) => {
      const accessPin = window.sessionStorage.getItem(accessStorageKey) ?? undefined;
      const saved = window.sessionStorage.getItem(activeStorageKey)
        ?? window.localStorage.getItem(storageKey)
        ?? window.localStorage.getItem(activeStorageKey);
      if (saved) {
        try {
          const credentials = JSON.parse(saved);
          ws.send(JSON.stringify({ action: 'join_lobby', lobbyId, ...credentials }));
        } catch {
          window.sessionStorage.removeItem(activeStorageKey);
          window.localStorage.removeItem(storageKey);
          ws.send(JSON.stringify({ action: 'view_lobby', lobbyId, pin: accessPin }));
        }
      } else {
        ws.send(JSON.stringify({ action: 'view_lobby', lobbyId, pin: accessPin }));
      }
    },
    onMessage: (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'lobby_joined') {
        const credentials = {
          memberId: message.data.memberId,
          token: message.data.token,
        };
        const personalStorageKey = `omaha-lobby-${lobbyId}-${message.data.memberId}`;
        window.localStorage.setItem(personalStorageKey, JSON.stringify(credentials));
        window.localStorage.setItem(activeStorageKey, JSON.stringify(credentials));
        window.sessionStorage.setItem(activeStorageKey, JSON.stringify(credentials));
        window.sessionStorage.removeItem(accessStorageKey);
        window.history.replaceState(null, '', `/lobby/${lobbyId}`);
        setMemberId(message.data.memberId);
        applyLobbySession(message.data.lobby);
        setLobby(message.data.lobby);
        setNotice(null);
      } else if (message.type === 'lobby_updated') {
        applyLobbySession(message.data);
        setLobby(message.data);
      } else if (message.type === 'lobby_pin_changed') {
        setNotice(ui(
          `Security alert: after 5 incorrect attempts, the table PIN was changed to ${message.data.pin}.`,
          `Защита стола: после 5 неверных попыток установлен новый PIN — ${message.data.pin}.`,
        ));
      } else if (message.type === 'lobby_started' && message.data?.playerUrl) {
        window.sessionStorage.setItem(playerStorageKey, message.data.playerUrl);
        setPlayerUrl(message.data.playerUrl);
      } else if (message.type === 'error') {
        setNotice(localizedServerMessage(message.message));
      } else if (message.type === 'session_expired') {
        setLobbyExpired(true);
      }
    },
  });

  useEffect(() => {
    if (!socket || !memberId) return undefined;
    let lastActivitySent = 0;
    const sendActivity = () => {
      const now = Date.now();
      if (socket.readyState === WebSocket.OPEN && now - lastActivitySent >= 5_000) {
        lastActivitySent = now;
        socket.send(JSON.stringify({ action: 'lobby_activity', lobbyId }));
      }
    };
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    events.forEach(eventName => window.addEventListener(eventName, sendActivity, { passive: true }));
    return () => events.forEach(eventName => window.removeEventListener(eventName, sendActivity));
  }, [socket, memberId, lobbyId]);

  function send(action: string, extra: Record<string, unknown> = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setNotice(ui('Connecting to server. Try again in a moment.', 'Подключаемся к серверу. Попробуйте ещё раз через несколько секунд.'));
      return;
    }
    socket.send(JSON.stringify({ action, lobbyId, ...extra }));
  }

  async function copyInvitation() {
    if (!lobby) return;

    const invitation = ui(
      `Join my Omaha Hi-Lo table!\nWebsite: ${window.location.origin}\nCity: ${lobby.tableName}\nPIN: ${lobby.pin}`,
      `Присоединяйтесь к моей игре Omaha хай-ло!\nСайт: ${window.location.origin}\nГород: ${lobby.tableName}\nPIN: ${lobby.pin}`,
    );

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitation);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = invitation;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('copy failed');
      }
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 1800);
    } catch {
      setNotice(ui('Could not copy the invitation.', 'Не удалось скопировать приглашение.'));
    }
  }

  function join() {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setNotice(ui('Enter your name.', 'Введите ваше имя.'));
      return;
    }
    rememberPlayerName(normalizedName);
    send('join_lobby', {
      name: normalizedName,
      pin: window.sessionStorage.getItem(accessStorageKey) ?? undefined,
    });
  }

  const isHost = Boolean(lobby && memberId === lobby.hostMemberId);
  const hostMember = lobby?.members.find(member => member.id === lobby.hostMemberId);
  const hostDisplayName = hostMember
    ? tablePlayerName(hostMember.name, hostMember.id)
    : ui('the host', 'ведущий');
  const sessionRemainingMs = sessionDeadline === null
    ? Number.POSITIVE_INFINITY
    : Math.max(0, sessionDeadline - sessionNow);
  const showSessionWarning = sessionRemainingMs <= sessionWarningRemainingMs;
  const sessionRemainingSeconds = Math.ceil(sessionRemainingMs / 1_000);
  const sessionHours = Math.floor(sessionRemainingSeconds / 3_600);
  const sessionMinutes = Math.floor((sessionRemainingSeconds % 3_600) / 60);
  const sessionSeconds = sessionRemainingSeconds % 60;
  const sessionCountdown = sessionHours
    ? `${sessionHours}:${String(sessionMinutes).padStart(2, '0')}:${String(sessionSeconds).padStart(2, '0')}`
    : `${sessionMinutes}:${String(sessionSeconds).padStart(2, '0')}`;

  const applyPlayerUrl = useCallback((url: string) => {
    window.sessionStorage.setItem(playerStorageKey, url);
    setPlayerUrl(url);
  }, [playerStorageKey]);

  if (playerUrl) {
    return (
      <PlayerPage
        playerUrl={playerUrl}
        isLobbyHost={isHost}
        onPlayerUrl={applyPlayerUrl}
        onRestartGame={() => send('lobby_restart')}
        onExitGame={() => { window.location.href = '/'; }}
      />
    );
  }

  return (
    <div className="lobby-page" style={{ minHeight: '100vh', padding: 20, fontFamily: 'system-ui, sans-serif', background: '#edf3ef' }}>
      <main className="lobby-main" style={{ width: 'min(100%, 760px)', margin: '0 auto', display: 'grid', gap: 14 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <a href="/" style={{ color: '#047857', fontWeight: 800, textDecoration: 'none' }}>← {ui('Omaha Hi-Lo', 'Омаха хай-ло')}</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: socketReady ? '#166534' : '#64748b', fontWeight: 800 }}>
              {socketReady ? ui('connected', 'подключено') : ui('connecting…', 'подключение…')}
            </span>
          </div>
        </header>

        {lobbyExpired ? (
          <p className="session-warning" role="alert" style={{ margin: 0, border: '1px solid #f59e0b', borderRadius: 12, padding: '9px 12px', background: '#fffbeb', color: '#92400e', fontWeight: 800, textAlign: 'center' }}>
            {ui('This lobby expired after 2 hours without activity.', 'Лобби удалено после 2 часов без активности.')}
          </p>
        ) : showSessionWarning ? (
          <p className="session-warning" role="alert" style={{ margin: 0, border: '1px solid #f59e0b', borderRadius: 12, padding: '9px 12px', background: '#fffbeb', color: '#92400e', fontWeight: 800, textAlign: 'center' }}>
            {ui('No activity. This lobby will be deleted in', 'Нет активности. Лобби будет удалено через')} {sessionCountdown}.
          </p>
        ) : null}

        {!memberId ? (
          <section style={{ padding: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#fff', display: 'grid', gap: 12 }}>
            <h2 style={{ margin: 0 }}>{ui('Join the table', 'Занять место')}</h2>
            {lobby ? (
              <>
                <strong>{ui('Players already here', 'За столом уже сидят')}</strong>
                <LobbyTable lobby={lobby} />
                {lobby.status === 'waiting'
                  ? (
                    <p style={{ margin: 0 }}>
                      {storedLanguage() === 'ru'
                        ? `Введите имя и дождитесь, когда ${hostDisplayName} начнёт игру.`
                        : `Enter your name and wait for ${hostDisplayName} to start the game.`}
                    </p>
                  )
                  : <p style={{ margin: 0 }}>{ui('This game has already started.', 'Игра за этим столом уже началась.')}</p>}
              </>
            ) : <p style={{ margin: 0 }}>{ui('Loading lobby…', 'Загружаем лобби…')}</p>}
            <label style={{ display: 'grid', gap: 6, fontWeight: 800 }}>
              {ui('Your name', 'Ваше имя')}
              <input
                aria-label={ui('Your name', 'Ваше имя')}
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
              {ui('Take a seat', 'Занять место')}
            </button>
          </section>
        ) : lobby ? (
          <>
            <nav className="lobby-tabs" role="tablist" aria-label={ui('Lobby views', 'Разделы лобби')}>
              <button
                role="tab"
                aria-selected={lobbyTab === 'lobby'}
                onClick={() => setLobbyTab('lobby')}
                className={lobbyTab === 'lobby' ? 'lobby-tab lobby-tab-active' : 'lobby-tab'}
              >
                {ui('LOBBY', 'ЛОББИ')}
              </button>
              {isHost && lobby.status === 'waiting' ? (
                <button
                  role="tab"
                  aria-selected={lobbyTab === 'replay'}
                  onClick={() => setLobbyTab('replay')}
                  className={lobbyTab === 'replay' ? 'lobby-tab lobby-tab-active' : 'lobby-tab'}
                >
                  {ui('REPLAY', 'ПОВТОР')}
                </button>
              ) : null}
            </nav>
            <section className="lobby-panel" style={{ padding: 18, border: '1px solid #cbd5e1', borderRadius: 14, background: '#fff', display: 'grid', gap: 14 }}>
              {lobbyTab === 'lobby' || !isHost || lobby.status !== 'waiting' ? (
                <>
              <div className="lobby-invite-card" style={{ border: '1px solid #a7f3d0', borderRadius: 18, background: 'linear-gradient(135deg, #ecfdf5, #f8fafc)', padding: '16px 18px' }}>
                <strong style={{ display: 'block', color: '#526159', fontSize: 15 }}>
                  {ui('Tell your friends the table name and PIN', 'Сообщите друзьям название стола и PIN')}
                </strong>
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, flexWrap: 'wrap', marginTop: 11 }}>
                  <div style={{ flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 13, borderRadius: 13, background: '#08734d', padding: '11px 16px', color: '#fff' }}>
                    <CityIcon city={lobby.tableName} size={52} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 11, fontWeight: 900, letterSpacing: '.12em', opacity: .75 }}>{ui('TABLE', 'СТОЛ')}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <output
                          className="lobby-table-name"
                          aria-label={ui('Table name', 'Название стола')}
                          style={{ display: 'block', minWidth: 0, marginTop: 2, fontSize: 'clamp(27px, 5vw, 40px)', fontWeight: 900, lineHeight: 1.05 }}
                        >
                          {lobby.tableName}
                        </output>
                        <CityInfo city={lobby.tableName} language={storedLanguage()} />
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: '0 1 190px', border: '2px solid #6ee7b7', borderRadius: 13, background: '#fff', padding: '9px 16px', color: '#065f46' }}>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 900, letterSpacing: '.12em' }}>PIN</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <output
                      aria-label={ui('Table PIN', 'PIN стола')}
                      style={{ display: 'block', marginTop: 2, font: '900 clamp(27px, 5vw, 40px)/1.05 ui-monospace, SFMono-Regular, Consolas, monospace', letterSpacing: '.16em' }}
                    >
                      {lobby.pin}
                    </output>
                      <button
                        type="button"
                        aria-label={inviteCopied ? ui('Invitation copied', 'Приглашение скопировано') : ui('Copy invitation', 'Скопировать приглашение')}
                        title={inviteCopied ? ui('Invitation copied', 'Приглашение скопировано') : ui('Copy invitation', 'Скопировать приглашение')}
                        onClick={copyInvitation}
                        style={{ display: 'grid', flex: '0 0 auto', placeItems: 'center', width: 38, height: 38, padding: 0, border: '1px solid #a7f3d0', borderRadius: 9, background: inviteCopied ? '#d1fae5' : '#f0fdf4', color: '#047857', cursor: 'pointer' }}
                      >
                        {inviteCopied ? (
                          <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m5 12 4 4L19 6" />
                          </svg>
                        ) : (
                          <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="11" height="11" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <LobbyTable
                lobby={lobby}
                memberId={memberId}
                canRemoveBots={isHost && lobby.status === 'waiting'}
                onRemoveBot={(botMemberId) => send('lobby_remove_bot', { memberId: botMemberId })}
                canMoveMembers={isHost && lobby.status === 'waiting'}
                onMoveMember={(movedMemberId, seat) => send('lobby_move_member', {
                  memberId: movedMemberId,
                  seat,
                })}
              />

              {isHost && lobby.status === 'waiting' ? (
                <div className="lobby-host-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    aria-label={ui('Bot name', 'Имя бота')}
                    placeholder={ui('Bot name (optional)', 'Имя бота (необязательно)')}
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
                    {ui('Add bot', 'Добавить бота')}
                  </button>
                  <button
                    className="lobby-start-button"
                    onClick={() => send('lobby_start')}
                    style={{ padding: '9px 16px', color: '#fff', border: 0, borderRadius: 8, fontWeight: 900 }}
                  >
                    {ui('Start game · fill with bots', 'Начать игру · заполнить ботами')}
                  </button>
                </div>
              ) : null}
              {!isHost && lobby.status === 'waiting' ? (
                <p style={{ margin: 0 }}>
                  {storedLanguage() === 'ru'
                    ? `Ждём, когда ${hostDisplayName} начнёт игру…`
                    : `Waiting for ${hostDisplayName} to start the game…`}
                </p>
              ) : null}
                </>
              ) : (
                <div className="lobby-replay-panel">
                  <div>
                    <strong>{ui('Replay party', 'Переиграть партию')}</strong>
                    <p>
                      {ui('Enter a replay code to start this table from a saved party.', 'Введите код повтора, чтобы начать этот стол с сохранённой партии.')}
                    </p>
                  </div>
                  <label>
                    {ui('Replay code', 'Код повтора')}
                    <input
                      aria-label={ui('Replay code', 'Код повтора')}
                      placeholder="ABC123"
                      maxLength={6}
                      value={replayCodeInput}
                      onChange={(event) => {
                        const nextCode = event.target.value.toUpperCase();
                        setReplayCodeInput(nextCode);
                        send('lobby_set_replay', { replayCode: nextCode.trim() });
                      }}
                    />
                    <small>
                      {ui('Replay turns on automatically for a valid code. Use the same number of seats as the original party.', 'Повтор включается автоматически для правильного кода. Используйте столько же мест, сколько было в исходной партии.')}
                    </small>
                  </label>
                  <button
                    className="lobby-start-button"
                    onClick={() => send('lobby_start')}
                    style={{ padding: '9px 16px', color: '#fff', border: 0, borderRadius: 8, fontWeight: 900 }}
                  >
                    {ui('Start game · fill with bots', 'Начать игру · заполнить ботами')}
                  </button>
                </div>
              )}
              {notice ? <p role="status" style={{ margin: 0, color: notice.includes('copied') ? '#166534' : '#b45309' }}>{notice}</p> : null}
            </section>
          </>
        ) : <p>{ui('Loading lobby…', 'Загружаем лобби…')}</p>}
      </main>
    </div>
  );
}

function HomePage() {
  const [homeTab, setHomeTab] = useState<'lobby' | 'quick' | 'about'>('lobby');
  const [hostName, setHostName] = useState('Dima');
  const [lobbySeats, setLobbySeats] = useState(storedTableSeats);
  const [messages, setMessages] = useState<DealMessage[]>([]);
  const [players, setPlayers] = useState(2);
  const [playersText, setPlayersText] = useState('2');
  const [playerNames, setPlayerNames] = useState<string[]>(['Dima', 'Anna_bot']);
  const [playerBots, setPlayerBots] = useState<boolean[]>([false, true]);
  const [homeReplayQuery, setHomeReplayQuery] = useState('');
  const [homeReplayError, setHomeReplayError] = useState<string | null>(null);
  const [homeNotice, setHomeNotice] = useState<string | null>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);

  const { socket: ws, connected: homeSocketReady } = useReliableWebSocket(WS_URL, {
    onOpen: () => {
      setHomeNotice(null);
    },
    onMessage: (event) => {
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
        window.localStorage.setItem(`omaha-lobby-${lobbyId}-active`, JSON.stringify({
          memberId: message.data.memberId,
          token: message.data.token,
        }));
        window.location.href = `/lobby/${lobbyId}`;
      }
    },
  });

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
    ws.send(JSON.stringify({
      action: 'replay_deal',
      handId: latestDeal.data.id,
      adminToken: window.sessionStorage.getItem('omaha-admin-token') ?? undefined,
    }));
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
    ws.send(JSON.stringify({
      action: 'replay_deal',
      handQuery,
      adminToken: window.sessionStorage.getItem('omaha-admin-token') ?? undefined,
    }));
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
            aria-selected={homeTab === 'lobby'}
            onClick={() => setHomeTab('lobby')}
            style={{ padding: '8px 18px', borderRadius: '12px 12px 0 0', border: '1px solid #cbd5e1', borderBottomColor: homeTab === 'lobby' ? '#fff' : '#cbd5e1', background: homeTab === 'lobby' ? '#fff' : '#f1f5f9', fontWeight: 900, cursor: 'pointer' }}
          >
            LOBBY
          </button>
          <button
            role="tab"
            aria-selected={homeTab === 'about'}
            onClick={() => setHomeTab('about')}
            style={{ padding: '8px 18px', borderRadius: '12px 12px 0 0', border: '1px solid #cbd5e1', borderBottomColor: homeTab === 'about' ? '#fff' : '#cbd5e1', background: homeTab === 'about' ? '#fff' : '#f1f5f9', fontWeight: 900, cursor: 'pointer' }}
          >
            ABOUT / О ПРОЕКТЕ
          </button>
        </nav>

        {homeTab === 'about' ? (
          <section style={{ border: '1px solid #cbd5e1', borderRadius: 12, background: '#fff', padding: 18, display: 'grid', gap: 10 }}>
            <h2 style={{ margin: 0 }}>About / О проекте</h2>
            <p style={{ margin: 0, color: '#475569' }}>
              Omaha Hi-Lo is a multiplayer poker game where the pot is split between the best high and qualifying low hands.
              <br />
              Omaha Hi-Lo — многопользовательская покерная игра, где банк делится между лучшей старшей и подходящей младшей комбинациями.
            </p>
            <p style={{ margin: 0, color: '#475569' }}>
              Questions or feedback? Contact us at{' '}
              <a href="mailto:pulsarik@gmail.com">pulsarik@gmail.com</a>.
              <br />
              Вопросы или предложения? Пишите на{' '}
              <a href="mailto:pulsarik@gmail.com">pulsarik@gmail.com</a>.
            </p>
          </section>
        ) : homeTab === 'lobby' ? (
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
                onChange={(event) => {
                  const seats = Number(event.target.value);
                  setLobbySeats(seats);
                  rememberTableSeats(seats);
                }}
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
                    Open
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

const WELCOME_TEXT = {
  en: {
    language: 'Language',
    eyebrow: 'A split-pot poker game',
    title: 'Omaha Hi-Lo',
    intro: 'Make your best high hand and your best qualifying low hand. The pot is split between them.',
    differenceTitle: 'How it differs from regular poker',
    difference: 'You receive four private cards and must use exactly two of them with exactly three board cards. A qualifying low uses five different cards ranked eight or lower.',
    create: 'Create a table',
    createHint: 'Choose the table size and become the host.',
    join: 'Join an open table',
    joinHint: 'Choose a waiting table, then enter its 4-digit PIN.',
    back: 'Back',
    yourName: 'Your name',
    seats: 'Seats at the table',
    createButton: 'Create table',
    openTables: 'Open tables',
    refresh: 'Refresh',
    empty: 'No tables are waiting right now. Create the first one.',
    players: 'players',
    seatsFree: 'seats',
    pinLabel: 'Table PIN',
    pinPlaceholder: '4 digits',
    find: 'Enter table',
    enterName: 'Enter your name.',
    connecting: 'Connecting…',
    copyright: 'All rights reserved.',
  },
  ru: {
    language: 'Язык',
    eyebrow: 'Покер с разделением банка',
    title: 'Омаха хай-ло',
    intro: 'Соберите лучшую старшую и лучшую подходящую младшую комбинацию — банк делится между ними.',
    differenceTitle: 'Чем отличается от обычного покера',
    difference: 'Вы получаете четыре закрытые карты и обязаны использовать ровно две из них вместе с ровно тремя картами стола. Для лоу нужны пять разных карт достоинством не выше восьмёрки.',
    create: 'Создать стол',
    createHint: 'Выберите размер стола и станьте ведущим.',
    join: 'Войти в открытый стол',
    joinHint: 'Выберите стол, который ждёт игроков, затем введите его PIN.',
    back: 'Назад',
    yourName: 'Ваше имя',
    seats: 'Мест за столом',
    createButton: 'Создать стол',
    openTables: 'Открытые столы',
    refresh: 'Обновить',
    empty: 'Сейчас никто не ждёт игроков. Создайте первый стол.',
    players: 'игроки',
    seatsFree: 'мест',
    pinLabel: 'PIN стола',
    pinPlaceholder: '4 цифры',
    find: 'Войти за стол',
    enterName: 'Введите ваше имя.',
    connecting: 'Подключение…',
    copyright: 'Все права защищены.',
  },
} as const;

function WelcomePage() {
  const [view, setView] = useState<'choice' | 'create' | 'join'>('choice');
  const [hostName, setHostName] = useState(storedPlayerName);
  const [seats, setSeats] = useState(4);
  const [pin, setPin] = useState('');
  const [selectedLobbyId, setSelectedLobbyId] = useState<string | null>(null);
  const [openLobbies, setOpenLobbies] = useState<OpenLobbyView[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const pendingPinRef = useRef('');
  const pinInputRef = useRef<HTMLInputElement>(null);
  const t = WELCOME_TEXT.en;
  const selectedLobby = openLobbies.find(lobby => lobby.id === selectedLobbyId);

  const { socket, connected } = useReliableWebSocket(WS_URL, {
    onOpen: (ws) => {
      setNotice(null);
      ws.send(JSON.stringify({ action: 'list_open_lobbies' }));
    },
    onMessage: (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'open_lobbies') setOpenLobbies(message.data);
      if (message.type === 'lobby_found') {
        window.sessionStorage.setItem(
          `omaha-lobby-${message.data.lobbyId}-access-pin`,
          pendingPinRef.current,
        );
        window.location.href = `/lobby/${message.data.lobbyId}`;
      }
      if (message.type === 'lobby_joined') {
        const { lobby, memberId, token } = message.data;
        window.localStorage.setItem(`omaha-lobby-${lobby.id}-${memberId}`, JSON.stringify({ memberId, token }));
        window.localStorage.setItem(`omaha-lobby-${lobby.id}-active`, JSON.stringify({ memberId, token }));
        window.location.href = `/lobby/${lobby.id}`;
      }
      if (message.type === 'error') setNotice(localizedServerMessage(message.message));
    },
  });

  useEffect(() => {
    fetch(`${SERVER_URL}/api/version`)
      .then(response => response.ok ? response.json() : undefined)
      .then(data => {
        if (data?.shortCommit) setVersion(data);
      })
      .catch(() => undefined);
  }, []);

  function send(action: string, extra: Record<string, unknown> = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setNotice(t.connecting);
      return;
    }
    setNotice(null);
    socket.send(JSON.stringify({ action, ...extra }));
  }

  function createTable() {
    const normalizedName = hostName.trim();
    if (!normalizedName) {
      setNotice(t.enterName);
      return;
    }
    rememberPlayerName(normalizedName);
    send('create_lobby', { name: normalizedName, maxPlayers: seats });
  }

  function findByPin() {
    if (!selectedLobbyId) {
      setNotice('Choose a table first.');
      return;
    }
    if (pin.length !== 4) {
      setNotice('Enter a 4-digit PIN.');
      return;
    }
    pendingPinRef.current = pin;
    send('find_lobby_by_pin', { lobbyId: selectedLobbyId, pin });
  }

  const cardStyle: React.CSSProperties = {
    border: '1px solid rgba(167,243,208,.24)',
    borderRadius: 22,
    background: 'rgba(255,255,255,.96)',
    boxShadow: '0 24px 70px rgba(1,35,25,.22)',
    padding: 'clamp(18px, 4vw, 30px)',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    background: '#fff',
    padding: '11px 12px',
    font: 'inherit',
  };
  const primaryButton: React.CSSProperties = {
    border: 0,
    borderRadius: 12,
    background: '#08734d',
    color: '#fff',
    padding: '12px 16px',
    fontWeight: 900,
  };

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at 50% 0%, #147a58, #064630 48%, #022c20)', color: '#17211b', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', padding: 'clamp(14px, 4vw, 38px)' }}>
      <main style={{ width: 'min(100%, 880px)', margin: '0 auto', display: 'grid', gap: 18 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, color: '#fff' }}>
          <strong style={{ letterSpacing: '.12em' }}>OMAHA HI-LO</strong>
        </header>

        <section style={cardStyle}>
          <span style={{ color: '#08734d', fontSize: 12, fontWeight: 900, letterSpacing: '.12em', textTransform: 'uppercase' }}>{t.eyebrow}</span>
          <h1 style={{ margin: '8px 0 10px', fontSize: 'clamp(36px, 8vw, 68px)', lineHeight: .95 }}>{t.title}</h1>
          <p style={{ maxWidth: 680, margin: 0, color: '#3f5148', fontSize: 'clamp(17px, 2.5vw, 21px)', lineHeight: 1.5 }}>{t.intro}</p>
          <div style={{ marginTop: 18, borderLeft: '4px solid #fbbf24', padding: '3px 0 3px 14px' }}>
            <strong>{t.differenceTitle}</strong>
            <p style={{ margin: '5px 0 0', color: '#526159', lineHeight: 1.5 }}>{t.difference}</p>
          </div>
        </section>

        {view === 'choice' ? (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {([
              ['create', '＋', t.create, t.createHint],
              ['join', '→', t.join, t.joinHint],
            ] as const).map(([target, icon, title, hint]) => (
              <button
                key={target}
                onClick={() => setView(target)}
                style={{ ...cardStyle, minHeight: 158, display: 'grid', gridTemplateColumns: '52px 1fr', alignItems: 'center', gap: 14, border: '1px solid #d8e2dc', textAlign: 'left', cursor: 'pointer' }}
              >
                <span style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 16, background: '#e8f7ef', color: '#08734d', fontSize: 28, fontWeight: 800 }}>{icon}</span>
                <span>
                  <strong style={{ display: 'block', fontSize: 20 }}>{title}</strong>
                  <small style={{ display: 'block', marginTop: 6, color: '#65736a', fontSize: 14, lineHeight: 1.4 }}>{hint}</small>
                </span>
              </button>
            ))}
          </section>
        ) : null}

        {view === 'create' ? (
          <section style={{ ...cardStyle, display: 'grid', gap: 14 }}>
            <button onClick={() => { setView('choice'); setNotice(null); }} style={{ justifySelf: 'start', border: 0, background: 'transparent', color: '#08734d', fontWeight: 900 }}>← {t.back}</button>
            <h2 style={{ margin: 0 }}>{t.create}</h2>
            <label style={{ display: 'grid', gap: 6, fontWeight: 800 }}>{t.yourName}<input aria-label={t.yourName} autoFocus value={hostName} onChange={event => setHostName(event.target.value)} style={inputStyle} /></label>
            <label style={{ display: 'grid', gap: 6, fontWeight: 800 }}>{t.seats}
              <select aria-label={t.seats} value={seats} onChange={event => setSeats(Number(event.target.value))} style={inputStyle}>
                {Array.from({ length: 9 }, (_, index) => index + 2).map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <button onClick={createTable} disabled={!connected} style={primaryButton}>{connected ? t.createButton : t.connecting}</button>
            {notice ? <p role="status" style={{ margin: 0, color: '#b45309', fontWeight: 700 }}>{notice}</p> : null}
          </section>
        ) : null}

        {view === 'join' ? (
          <section style={{ ...cardStyle, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <button onClick={() => { setView('choice'); setNotice(null); }} style={{ border: 0, background: 'transparent', color: '#08734d', fontWeight: 900 }}>← {t.back}</button>
              <button onClick={() => send('list_open_lobbies')} disabled={!connected} style={{ border: '1px solid #cbd5e1', borderRadius: 9, background: '#fff', padding: '7px 10px', fontWeight: 800 }}>{t.refresh}</button>
            </div>
            <h2 style={{ margin: 0 }}>{t.openTables}</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {openLobbies.length ? openLobbies.map(lobby => (
                <button
                  key={lobby.id}
                  aria-pressed={selectedLobbyId === lobby.id}
                  onClick={() => {
                    setSelectedLobbyId(lobby.id);
                    setPin('');
                    setNotice(null);
                    window.setTimeout(() => pinInputRef.current?.focus(), 0);
                  }}
                  style={{
                    border: `2px solid ${selectedLobbyId === lobby.id ? '#08734d' : '#d8e2dc'}`,
                    borderRadius: 14,
                    background: selectedLobbyId === lobby.id ? '#ecfdf5' : '#f8fbf9',
                    padding: 14,
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}
                >
                  <CityIcon city={lobby.tableName} />
                  <span style={{ display: 'block', minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <strong style={{ overflow: 'hidden', fontSize: 18, textOverflow: 'ellipsis' }}>{lobby.tableName}</strong>
                      <span style={{ flex: '0 0 auto', color: '#08734d', fontWeight: 900 }}>{lobby.members.length}/{lobby.maxPlayers}</span>
                    </span>
                    <span style={{ display: 'block', marginTop: 6, overflow: 'hidden', color: '#65736a', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {lobby.members.map(member => member.name.replace(/_bot$/i, '')).join(', ')}
                    </span>
                  </span>
                </button>
              )) : <p style={{ margin: 0, color: '#65736a' }}>{t.empty}</p>}
            </div>
            {!selectedLobby && notice ? <p role="status" style={{ margin: 0, color: '#b45309', fontWeight: 700 }}>{notice}</p> : null}
          </section>
        ) : null}

        {view === 'join' && selectedLobby ? (
          <div
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedLobbyId(null);
                setPin('');
                setNotice(null);
              }
            }}
            style={{
              position: 'fixed',
              zIndex: 1000,
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              padding: 18,
              background: 'rgba(1, 35, 25, .68)',
              backdropFilter: 'blur(4px)',
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="table-pin-title"
              style={{
                width: 'min(100%, 430px)',
                border: '1px solid #a7f3d0',
                borderRadius: 22,
                background: '#fff',
                boxShadow: '0 28px 80px rgba(0, 0, 0, .34)',
                padding: 'clamp(20px, 5vw, 30px)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <CityIcon city={selectedLobby.tableName} />
                  <div>
                    <small style={{ display: 'block', color: '#65736a', fontWeight: 800 }}>
                      Selected table
                    </small>
                    <strong style={{ display: 'block', marginTop: 2, fontSize: 24 }}>{selectedLobby.tableName}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => {
                    setSelectedLobbyId(null);
                    setPin('');
                    setNotice(null);
                  }}
                  style={{ border: 0, background: 'transparent', color: '#65736a', fontSize: 26, lineHeight: 1, cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
              <h2 id="table-pin-title" style={{ margin: '24px 0 6px', fontSize: 22 }}>
                Enter the table PIN
              </h2>
              <p style={{ margin: '0 0 16px', color: '#65736a' }}>
                Ask the table creator for the four-digit PIN.
              </p>
              <input
                ref={pinInputRef}
                aria-label={t.pinLabel}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                placeholder={t.pinPlaceholder}
                value={pin}
                onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
                onKeyDown={event => {
                  if (event.key === 'Enter') findByPin();
                  if (event.key === 'Escape') {
                    setSelectedLobbyId(null);
                    setPin('');
                    setNotice(null);
                  }
                }}
                style={{
                  ...inputStyle,
                  height: 62,
                  textAlign: 'center',
                  fontFamily: 'ui-monospace, SFMono-Regular, Consolas, monospace',
                  fontSize: 30,
                  fontWeight: 900,
                  letterSpacing: '.28em',
                }}
              />
              {notice ? <p role="status" style={{ margin: '10px 0 0', color: '#b45309', fontWeight: 700 }}>{notice}</p> : null}
              <button
                onClick={findByPin}
                disabled={!connected || pin.length !== 4}
                style={{ ...primaryButton, width: '100%', marginTop: 16, opacity: connected && pin.length === 4 ? 1 : .55 }}
              >
                {t.find}
              </button>
            </section>
          </div>
        ) : null}

        <footer style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: 'rgba(255,255,255,.72)', fontSize: 12 }}>
          <span>© {new Date().getFullYear()} Omaha Hi-Lo. {t.copyright}</span>
          {version ? <span title={version.commit}>{version.shortCommit}</span> : null}
        </footer>
      </main>
    </div>
  );
}

function ReportProblemButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!status) return undefined;
    const dismiss = () => setStatus(null);
    window.addEventListener('pointerdown', dismiss, { capture: true, once: true });
    window.addEventListener('keydown', dismiss, { capture: true, once: true });
    window.addEventListener('scroll', dismiss, { capture: true, once: true });
    return () => {
      window.removeEventListener('pointerdown', dismiss, { capture: true });
      window.removeEventListener('keydown', dismiss, { capture: true });
      window.removeEventListener('scroll', dismiss, { capture: true });
    };
  }, [status]);

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
          ...problemContext(window),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || ui('Could not save the problem', 'Не удалось сохранить сообщение'));
      }
      setStatus(ui(`Problem #${result.id} saved`, `Сообщение #${result.id} сохранено`));
      setDescription('');
      setIsOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : ui('Could not save the problem', 'Не удалось сохранить сообщение'));
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
            color: status.includes(' saved') || status.includes(' сохранено') ? '#166534' : '#b91c1c',
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
        className="report-problem-button"
        aria-label={ui('Report a problem', 'Сообщить о проблеме')}
        onClick={() => {
          setStatus(null);
          setIsOpen(true);
        }}
        style={{
          position: 'fixed',
          right: 'max(12px, env(safe-area-inset-right))',
          bottom: 'max(12px, env(safe-area-inset-bottom))',
          zIndex: 1000,
          display: 'grid',
          placeItems: 'center',
          width: 48,
          height: 48,
          padding: 0,
          border: '1px solid #991b1b',
          borderRadius: '50%',
          background: '#b91c1c',
          color: '#fff',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.22)',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 26,
          fontWeight: 800,
          lineHeight: 1,
          cursor: 'pointer',
        }}
        title={ui('Report a problem', 'Сообщить о проблеме')}
      >
        <span aria-hidden="true">!</span>
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
              {ui('Report a problem', 'Сообщить о проблеме')}
            </h2>
            <label style={{ display: 'grid', gap: 7, fontWeight: 700 }}>
              {ui('Description', 'Описание')}
              <textarea
                autoFocus
                required
                maxLength={2000}
                rows={6}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={ui('What went wrong?', 'Что пошло не так?')}
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
                {ui('Cancel', 'Отмена')}
              </button>
              <button
                type="submit"
                disabled={isSaving || !description.trim()}
                style={{ fontWeight: 800 }}
              >
                {isSaving ? ui('Saving…', 'Сохраняем…') : ui('OK', 'Отправить')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function PortraitOrientationGuard() {
  return (
    <aside
      className="portrait-orientation-guard"
      role="dialog"
      aria-modal="true"
      aria-label={ui('Portrait orientation required', 'Нужна вертикальная ориентация')}
      data-testid="portrait-orientation-guard"
    >
      <div className="portrait-orientation-card">
        <span className="portrait-orientation-icon" aria-hidden="true" />
        <strong>{ui('Turn your phone upright', 'Поверните телефон вертикально')}</strong>
        <p>
          {ui(
            'The game is temporarily available in portrait orientation only.',
            'Пока игра доступна только в вертикальной ориентации.',
          )}
        </p>
      </div>
    </aside>
  );
}

function isNarrowDesktopTableViewport() {
  const width = window.innerWidth;
  const isPortraitTouchDevice = window.matchMedia('(pointer: coarse) and (orientation: portrait)').matches;
  return width > MOBILE_TABLE_LAYOUT_MAX_WIDTH
    && width < DESKTOP_TABLE_LAYOUT_MIN_WIDTH
    && !isPortraitTouchDevice;
}

function HorizontalTableWidthGuard() {
  const [isVisible, setIsVisible] = useState(isNarrowDesktopTableViewport);

  useEffect(() => {
    const updateVisibility = () => setIsVisible(isNarrowDesktopTableViewport());
    updateVisibility();
    window.addEventListener('resize', updateVisibility);
    window.visualViewport?.addEventListener('resize', updateVisibility);
    return () => {
      window.removeEventListener('resize', updateVisibility);
      window.visualViewport?.removeEventListener('resize', updateVisibility);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <aside
      className="horizontal-table-width-guard"
      role="dialog"
      aria-modal="true"
      aria-label={ui('Wider window required', 'Нужно увеличить окно')}
      data-testid="horizontal-table-width-guard"
    >
      <div className="horizontal-table-width-card">
        <span className="horizontal-table-width-icon" aria-hidden="true" />
        <strong>{ui('Make the window wider', 'Увеличьте окно')}</strong>
        <p>
          {ui(
            'The table needs more horizontal space. Widen the browser window to continue.',
            'Столу нужно больше места по ширине. Увеличьте окно браузера, чтобы продолжить.',
          )}
        </p>
      </div>
    </aside>
  );
}

export default function App() {
  useEffect(() => {
    window.localStorage.setItem('omaha-language', 'en');
    document.documentElement.lang = 'en';
  }, []);

  let page: React.ReactNode;
  if (window.location.pathname.startsWith('/player/')) page = <PlayerPage />;
  else if (window.location.pathname.startsWith('/debug/')) page = <DebugPage />;
  else if (window.location.pathname.startsWith('/lobby/')) page = <LobbyPage />;
  else page = <WelcomePage />;

  return (
    <>
      <style>{APP_SHELL_STYLES}</style>
      {page}
      <ReportProblemButton />
      <PortraitOrientationGuard />
    </>
  );
}
