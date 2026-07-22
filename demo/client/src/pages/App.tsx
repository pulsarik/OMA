import React, { useEffect, useState } from 'react';

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
  points: Array<{
    id: string;
    high: number;
    low: number;
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

type ShowdownSummary = Pick<HiLoResult, 'potCoins' | 'highWinners' | 'lowWinners' | 'noLow' | 'points'>;

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
    points: Array<{
      id: string;
      high: number;
      low: number;
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

const suitSymbols: Record<string, string> = {
  s: '\u2660',
  h: '\u2665',
  d: '\u2666',
  c: '\u2663',
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

const pipLayouts: Record<number, Array<{ x: number; y: number; rotate?: boolean }>> = {
  2: [
    { x: 50, y: 24 },
    { x: 50, y: 76, rotate: true },
  ],
  3: [
    { x: 50, y: 22 },
    { x: 50, y: 50 },
    { x: 50, y: 78, rotate: true },
  ],
  4: [
    { x: 32, y: 24 },
    { x: 68, y: 24 },
    { x: 32, y: 76, rotate: true },
    { x: 68, y: 76, rotate: true },
  ],
  5: [
    { x: 32, y: 23 },
    { x: 68, y: 23 },
    { x: 50, y: 50 },
    { x: 32, y: 77, rotate: true },
    { x: 68, y: 77, rotate: true },
  ],
  6: [
    { x: 32, y: 22 },
    { x: 68, y: 22 },
    { x: 32, y: 50 },
    { x: 68, y: 50 },
    { x: 32, y: 78, rotate: true },
    { x: 68, y: 78, rotate: true },
  ],
  7: [
    { x: 32, y: 20 },
    { x: 68, y: 20 },
    { x: 50, y: 35 },
    { x: 32, y: 50 },
    { x: 68, y: 50 },
    { x: 32, y: 80, rotate: true },
    { x: 68, y: 80, rotate: true },
  ],
  8: [
    { x: 32, y: 20 },
    { x: 68, y: 20 },
    { x: 50, y: 35 },
    { x: 32, y: 50 },
    { x: 68, y: 50 },
    { x: 50, y: 65, rotate: true },
    { x: 32, y: 80, rotate: true },
    { x: 68, y: 80, rotate: true },
  ],
  9: [
    { x: 32, y: 18 },
    { x: 68, y: 18 },
    { x: 32, y: 38 },
    { x: 68, y: 38 },
    { x: 50, y: 50 },
    { x: 32, y: 62, rotate: true },
    { x: 68, y: 62, rotate: true },
    { x: 32, y: 82, rotate: true },
    { x: 68, y: 82, rotate: true },
  ],
  10: [
    { x: 32, y: 16 },
    { x: 68, y: 16 },
    { x: 50, y: 28 },
    { x: 32, y: 40 },
    { x: 68, y: 40 },
    { x: 32, y: 60, rotate: true },
    { x: 68, y: 60, rotate: true },
    { x: 50, y: 72, rotate: true },
    { x: 32, y: 84, rotate: true },
    { x: 68, y: 84, rotate: true },
  ],
};

function rankNumber(rank: string) {
  if (rank === 'T') return 10;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  if (rank === 'A') return 14;
  return Number(rank);
}

function Card({ code, scale = CARD_SCALE }: { code: string; scale?: number }) {
  const rank = code.slice(0, -1).toUpperCase();
  const suit = code.slice(-1).toLowerCase();
  const isRed = suit === 'h' || suit === 'd';
  const color = isRed ? '#c21f32' : '#111827';
  const label = rankLabels[rank] ?? rank;
  const symbol = suitSymbols[suit] ?? suit;
  const value = rankNumber(rank);
  const isFace = value >= 11 && value <= 13;
  const isAce = value === 14;
  const pips = pipLayouts[value] ?? [];
  const cornerStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'grid',
    justifyItems: 'center',
    gap: 0,
    fontWeight: 800,
    lineHeight: 0.86,
    letterSpacing: 0,
  };

  return (
    <div
      title={code}
      style={{
        width: 92,
        height: 132,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        border: '1px solid #c7c7c7',
        borderRadius: 12,
        background: '#fdfdfd',
        color,
        boxShadow: '0 2px 4px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.9)',
        boxSizing: 'border-box',
        fontFamily: 'Georgia, Times New Roman, serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ ...cornerStyle, top: 9, left: 7, fontSize: label === '10' ? 18 : 22 }}>
        <span>{label}</span>
        <span style={{ fontSize: 18 }}>{symbol}</span>
      </div>
      <div
        style={{
          ...cornerStyle,
          right: 7,
          bottom: 9,
          fontSize: label === '10' ? 18 : 22,
          transform: 'rotate(180deg)',
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: 18 }}>{symbol}</span>
      </div>
      {isAce && (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 58 }}>
          {symbol}
        </div>
      )}
      {isFace && (
        <div
          style={{
            position: 'absolute',
            left: 22,
            top: 18,
            width: 48,
            height: 96,
            border: '2px solid #315f9f',
            background: 'linear-gradient(135deg, #fef3c7 0%, #ffffff 38%, #dbeafe 39%, #ffffff 72%, #fee2e2 73%)',
            display: 'grid',
            gridTemplateRows: '1fr 1fr',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'grid', placeItems: 'center', fontSize: 28, borderBottom: '1px solid #315f9f' }}>
            {label}{symbol}
          </div>
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              fontSize: 28,
              transform: 'rotate(180deg)',
            }}
          >
            {label}{symbol}
          </div>
        </div>
      )}
      {!isAce && !isFace && pips.map((pip, index) => (
        <span
          key={index}
          style={{
            position: 'absolute',
            left: `${pip.x}%`,
            top: `${pip.y}%`,
            transform: `translate(-50%, -50%)${pip.rotate ? ' rotate(180deg)' : ''}`,
            fontSize: 28,
            lineHeight: 1,
          }}
        >
          {symbol}
        </span>
      ))}
    </div>
  );
}

function CardBack({ scale = CARD_SCALE }: { scale?: number }) {
  return (
    <div
      style={{
        width: 92,
        height: 132,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        border: '1px solid #1f2937',
        borderRadius: 12,
        background:
          'radial-gradient(circle at center, rgba(255,255,255,0.22) 0 2px, transparent 3px), repeating-linear-gradient(45deg, #1e3a8a, #1e3a8a 8px, #2563eb 8px, #2563eb 16px)',
        backgroundSize: '16px 16px, auto',
        boxShadow: '0 3px 9px rgba(0,0,0,0.22)',
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

function CompactCardRow({ cards }: { cards: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
      {cards.map((card) => (
        <div key={card} style={{ width: COMPACT_CARD_WIDTH, height: COMPACT_CARD_HEIGHT }}>
          <Card code={card} scale={COMPACT_CARD_SCALE} />
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

function CardBackRow({ count, compact = false }: { count: number; compact?: boolean }) {
  const width = compact ? COMPACT_CARD_WIDTH : CARD_WIDTH;
  const height = compact ? COMPACT_CARD_HEIGHT : CARD_HEIGHT;
  const scale = compact ? COMPACT_CARD_SCALE : CARD_SCALE;

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} style={{ width, height }}>
          <CardBack scale={scale} />
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
    <div style={{ display: 'flex', gap: compact ? 8 : 10, flexWrap: 'wrap', justifyContent: 'center' }}>
      {cards.map((card) => (
        <div key={card} style={{ width, height }}>
          <Card code={card} scale={scale} />
        </div>
      ))}
      {Array.from({ length: hiddenCount }).map((_, index) => (
        <div key={`hidden-${index}`} style={{ width, height }}>
          <CardBack scale={scale} />
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
  const hiddenCount = Math.max(chips.length - visibleChips.length, 0);

  return (
    <div
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
            style={{
              gridArea: '1 / 1',
              width: compact ? 20 : 24,
              height: compact ? 7 : 8,
              border: `1px solid ${chip.edge}`,
              borderRadius: '50%',
              background: chip.value === 0
                ? 'linear-gradient(#cbd5e1, #64748b)'
                : `linear-gradient(#fff 0 12%, ${chip.color} 13% 72%, ${chip.edge} 73%)`,
              boxShadow: `0 1px 0 ${chip.edge}`,
              transform: `translateY(${-index * (compact ? 2 : 3)}px)`,
            }}
          >
            {index === visibleChips.length - 1 && hiddenCount ? (
              <span style={{ position: 'absolute', marginLeft: 27, marginTop: -3, fontSize: 10 }}>
                +{hiddenCount}
              </span>
            ) : null}
          </span>
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

function PotDisplay({ value, currentBet }: { value: number; currentBet: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        minHeight: 44,
        color: '#fff',
      }}
    >
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
  isCurrentTurn = false,
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
  isCurrentTurn?: boolean;
}) {
  const shouldShowCards = Boolean(hole?.length);
  const actionLabel = action
    ? `${action.move.toUpperCase()}${action.amount ? ` ${formatPoints(action.amount)}` : ''}`
    : undefined;
  const bubbleLabel = isCurrentTurn ? 'THINKING...' : actionLabel;

  return (
    <div
      data-testid={isCurrentTurn ? `active-player-${id}` : undefined}
      style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}
    >
      <section
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
            title={isCurrentTurn ? `${tablePlayerName(name, id)} is thinking` : `Last action: ${actionLabel}`}
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
        {shouldShowCards ? <CompactCardRow cards={hole ?? []} /> : <CardBackRow count={cardCount} compact={compact} />}
        {resultPlayer && !resultPlayer.folded ? (
          <div
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
            <span>High: {resultPlayer.highRank ?? '-'}</span>
            <span>Low: {resultPlayer.lowRank ?? 'none'}</span>
          </div>
        ) : null}
      </section>
      {compact ? (
        <div style={{ display: 'grid', gap: 4, justifyItems: 'center', alignSelf: 'stretch', alignContent: 'end' }}>
          <CoinStack value={score} />
          <span
            data-testid={`player-name-${id}`}
            title={tablePlayerName(name, id)}
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

function latestActionForPlayer(actions: ActionLog[] | undefined, playerId: string) {
  return [...(actions ?? [])].reverse().find((action) => action.playerId === playerId);
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

  const won = hasResult || hasSummary
    ? (score?.total ?? summaryScore?.total ?? 0) > 0
    : foldedWinnerId === player.playerId;
  const background = hasResult
    ? won ? 'rgba(22, 163, 74, 0.94)' : 'rgba(127, 29, 29, 0.94)'
    : hasSummary
      ? won ? 'rgba(22, 163, 74, 0.94)' : 'rgba(127, 29, 29, 0.94)'
    : knownFoldResult
      ? won ? 'rgba(22, 163, 74, 0.94)' : 'rgba(127, 29, 29, 0.94)'
    : 'rgba(15, 23, 42, 0.82)';
  const title = hasResult || hasSummary || knownFoldResult
    ? won
      ? sharedWin
        ? `You tied${winParts.length ? ` ${winParts.join(' + ')}` : ''}`
        : winParts.length
        ? `${isSplitPot ? 'Split pot: ' : ''}You won ${winParts.join(' + ')}`
        : 'You won'
      : 'You lost'
    : 'Showdown';
  const detail = hasResult
    ? `${formatPoints(score.total)} of ${formatPoints(player.potCoins)} coins`
    : hasSummary
      ? `${formatPoints(summaryScore.total)} of ${formatPoints(player.showdownSummary?.potCoins ?? player.potCoins)} coins`
    : knownFoldResult
      ? won ? `${formatPoints(player.potCoins)} coins` : 'Folded'
      : 'Cards revealed';
  const winners = player.showdownSummary
    ? `High: ${player.showdownSummary.highWinners.map((id) => playerLabel(player.players, id)).join(', ')} | Low: ${
      player.showdownSummary.noLow
        ? 'none'
        : player.showdownSummary.lowWinners.map((id) => playerLabel(player.players, id)).join(', ')
    }`
    : undefined;

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
      <span style={{ fontSize: 15, opacity: 0.94 }}>
        {detail}
      </span>
      {winners ? (
        <span style={{ fontSize: 13, opacity: 0.9 }}>
          {winners}
        </span>
      ) : null}
    </div>
  );
}

function CurrentComboStrip({ combo }: { combo?: PlayerCombo }) {
  if (!combo) return null;

  return (
    <section
      style={{
        marginTop: 12,
        border: '1px solid #d1d5db',
        borderRadius: 8,
        background: '#fff',
        padding: 8,
        display: 'grid',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <strong>Now</strong>
        <span>High: {combo.highRank}</span>
        <span>
          Low: {combo.lowRank ?? 'none'}
          {!combo.lowRank ? (
            <small style={{ marginLeft: 6, color: '#64748b' }}>
              needs 2 hand + 3 board, all different A-8
            </small>
          ) : null}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {combo.highCombo ? <ComboCardRow combo={combo.highCombo} tone="high" /> : null}
        {combo.lowCombo ? <ComboCardRow combo={combo.lowCombo} tone="low" /> : null}
      </div>
    </section>
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

function ResultView({ result, players }: {
  result?: HiLoResult;
  players: Array<{ id: string; name?: string }>;
}) {
  if (!result) return null;
  const displayName = (id: string) => playerLabel(players, id);
  const highWinnerResults = result.highWinners
    .map((id) => playerResult(result, id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));
  const lowWinnerResults = result.lowWinners
    .map((id) => playerResult(result, id))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  return (
    <section style={{ marginTop: 12, border: '1px solid #d1d5db', borderRadius: 8, padding: 10 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Winners</h2>
        <span>Pot: {formatPoints(result.potCoins)} coins</span>
      </div>

      <div style={{ display: 'grid', gap: 8, marginBottom: 10 }}>
        <section style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
          {highWinnerResults.map((winner) => (
            <div key={winner.id}>
              <h3 style={{ margin: '0 0 6px' }}>
                High winner{highWinnerResults.length > 1 ? 's' : ''}: {displayName(winner.id)} - {winner.highRank}
              </h3>
              {winner.highCombo ? <ComboCardRow combo={winner.highCombo} tone="high" /> : null}
            </div>
          ))}
        </section>

        <section style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 8 }}>
          {result.noLow ? (
            <h3 style={{ margin: 0 }}>Low winner: No qualifying low</h3>
          ) : lowWinnerResults.map((winner) => (
            <div key={winner.id}>
              <h3 style={{ margin: '0 0 6px' }}>
                Low winner{lowWinnerResults.length > 1 ? 's' : ''}: {displayName(winner.id)} - {winner.lowRank}
              </h3>
              {winner.lowCombo ? <ComboCardRow combo={winner.lowCombo} tone="low" /> : null}
            </div>
          ))}
        </section>
      </div>

      <h3 style={{ margin: '8px 0 6px' }}>Points</h3>
      <table style={{ borderCollapse: 'collapse', marginBottom: 10 }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'left' }}>Player</th>
            <th style={{ border: '1px solid #d1d5db', padding: 6 }}>High</th>
            <th style={{ border: '1px solid #d1d5db', padding: 6 }}>Low</th>
            <th style={{ border: '1px solid #d1d5db', padding: 6 }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {result.points.map((score) => (
            <tr key={score.id}>
              <td style={{ border: '1px solid #d1d5db', padding: 6 }}>{displayName(score.id)}</td>
              <td style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'right' }}>{formatPoints(score.high)}</td>
              <td style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'right' }}>{formatPoints(score.low)}</td>
              <td style={{ border: '1px solid #d1d5db', padding: 6, textAlign: 'right' }}>{formatPoints(score.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={{ margin: '8px 0 6px' }}>All hands</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {result.players.map((player) => (
          <section key={player.id}>
            <h3 style={{ margin: '0 0 5px' }}>{displayName(player.id)}{player.folded ? ' - folded' : ''}</h3>
            <p style={{ margin: '0 0 4px' }}>High: {player.highRank}</p>
            {player.highCombo ? <ComboCardRow combo={player.highCombo} tone="high" /> : null}
            <p style={{ margin: '0 0 4px' }}>Low: {player.lowRank ?? 'no low'}</p>
            {player.lowCombo ? <ComboCardRow combo={player.lowCombo} tone="low" /> : null}
          </section>
        ))}
      </div>
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
  const [betSize, setBetSize] = useState<BetSizeOption>('blind');
  const [, , handId, playerId, token] = window.location.pathname.split('/');

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
        if (message.data.stage !== 'showdown') {
          const turnName = playerLabel(message.data.players, message.data.currentPlayerId);
          setNotice(
            message.data.currentPlayerId === message.data.playerId
              ? 'Your turn.'
              : `${turnName} — THINKING...`,
          );
        } else {
          setNotice(null);
        }
      }
      if (message.type === 'hand_dealt' && message.data?.playerLinks) {
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
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setNotice('Connecting to server. Try again in a moment.');
      return;
    }

    setNewDealLinks([]);
    setNotice('Creating new deal.');
    ws.send(JSON.stringify({ action: 'new_deal', handId }));
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
  const showActionControls = player.stage !== 'showdown' && !player.isBot && !player.folded;
  const currentBet = player.currentBet ?? 0;
  const yourRoundBet = player.roundBets?.[player.playerId] ?? 0;
  const bigBlind = player.blinds?.big ?? 4;
  const raiseCount = player.raiseCount ?? 0;
  const maxRaises = player.maxRaises ?? 3;
  const callAmount = Math.max(currentBet - yourRoundBet, 0);
  const betAmount = betTargetAmount(betSize, player.potCoins, bigBlind, player.stack);
  const raiseTo = raiseTargetAmount(betSize, player.potCoins, currentBet, yourRoundBet, bigBlind, player.stack);
  const canCall = canAct && yourRoundBet < currentBet;
  const canRaise = canAct && currentBet > 0 && raiseCount < maxRaises;
  const hasContinuation = Boolean(player.nextHandId || player.nextReplayHandId);
  const remainingPlayers = player.players.filter((seat) => {
    const settledStack = player.partyScore?.totals.find((total) => total.id === seat.id)?.total;
    return (settledStack ?? seat.stack ?? 0) > 0;
  });
  const tournamentWinner = remainingPlayers.length === 1 ? remainingPlayers[0] : undefined;
  const canContinue = socketReady && player.stage === 'showdown' && !hasContinuation && !tournamentWinner;
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
    <div style={{ padding: 10, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        {player.dealCode ? <span style={statusPillStyle}>deal: {player.dealCode}</span> : null}
        {!socketReady ? (
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
        ) : null}
      </div>

      <div
        style={{
          border: '2px solid #15803d',
          borderRadius: 18,
          background: '#166534',
          padding: 10,
          color: '#fff',
          display: 'grid',
          gap: 8,
        }}
      >
        {player.replayOfHandId ? <HandBanner player={player} /> : null}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
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
              action={latestActionForPlayer(player.actions, seat.id)}
              resultPlayer={player.cardsRevealed ? playerResult(player.result, seat.id) : undefined}
              isCurrentTurn={player.stage !== 'showdown' && player.currentPlayerId === seat.id}
            />
          ))}
        </div>

        <section
          style={{
            borderRadius: 12,
            background: 'rgba(255,255,255,0.12)',
            padding: 8,
            textAlign: 'center',
            display: 'grid',
            gap: 4,
            justifyItems: 'center',
          }}
        >
          <ShowdownStatus player={player} />
          <StreetBadge stage={player.stage} />
          <PotDisplay value={player.potCoins} currentBet={currentBet} />
          <BoardRow cards={player.community} compact />
        </section>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
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
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {showActionControls && (currentBet === 0 || raiseCount < maxRaises) ? (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', opacity: canAct ? 1 : 0.62 }}>
            <span style={{ color: '#475569', fontSize: 13, fontWeight: 700 }}>Bet size</span>
            {BET_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={!canAct}
                onClick={() => setBetSize(option.value)}
                style={{
                  border: betSize === option.value ? '2px solid #166534' : '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: betSize === option.value ? '#dcfce7' : '#fff',
                  padding: '4px 7px',
                  fontWeight: betSize === option.value ? 800 : 600,
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
        {showActionControls && callAmount === 0 && currentBet === 0 ? (
          <span style={{ color: '#64748b', fontSize: 13 }}>No bet to call</span>
        ) : null}
        {showActionControls && callAmount === 0 ? (
          <>
            <button disabled={!canAct} onClick={() => sendMove('check')}>Check</button>
            {currentBet === 0 ? (
              <button disabled={!canAct} onClick={() => sendMove('bet', betAmount)}>Bet {formatPoints(betAmount)}</button>
            ) : null}
            {currentBet > 0 && raiseCount < maxRaises ? (
              <button disabled={!canRaise} onClick={() => sendMove('raise', raiseTo)}>
                Raise to {formatPoints(raiseTo)} ({raiseCount}/{maxRaises})
              </button>
            ) : null}
            <button
              disabled={!canAct}
              onClick={() => sendMove('fold')}
              style={{ marginLeft: 8, color: '#7f1d1d' }}
            >
              Fold
            </button>
          </>
        ) : null}
        {showActionControls && callAmount > 0 ? (
          <>
            <button disabled={!canCall} onClick={() => sendMove('call')}>
              Call {formatPoints(callAmount)}
            </button>
            {raiseCount < maxRaises ? (
              <button disabled={!canRaise} onClick={() => sendMove('raise', raiseTo)}>
                Raise to {formatPoints(raiseTo)} ({raiseCount}/{maxRaises})
              </button>
            ) : null}
            <button
              disabled={!canAct}
              onClick={() => sendMove('fold')}
              style={{ marginLeft: 8, color: '#7f1d1d' }}
            >
              Fold
            </button>
          </>
        ) : null}
        {!canAct && player.stage !== 'showdown' ? (
          <span style={{ color: '#92400e', fontWeight: 900 }}>
            {playerLabel(player.players, player.currentPlayerId)} — THINKING...
          </span>
        ) : null}
        {player.stage === 'showdown' ? (
          canContinue ? <button onClick={startNewDeal}>New deal</button> : null
        ) : null}
        {player.nextPlayerLink ? (
          <button onClick={() => { window.location.href = player.nextPlayerLink!.url; }}>
            New deal
          </button>
        ) : null}
      </div>
      <CurrentComboStrip combo={player.currentCombo} />
      {tournamentWinner ? (
        <p style={{ fontWeight: 800 }}>
          Tournament winner: {tablePlayerName(tournamentWinner.name, tournamentWinner.id)}
        </p>
      ) : null}
      {notice ? (
        <p style={{ fontWeight: 700 }}>
          {notice}
        </p>
      ) : null}
      {player.cardsRevealed ? <ResultView result={player.result} players={player.players} /> : null}

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

      {hand.cardsRevealed ? <ResultView result={hand.result} players={hand.players} /> : null}

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

export default function App() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [homeSocketReady, setHomeSocketReady] = useState(false);
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

  if (window.location.pathname.startsWith('/player/')) {
    return <PlayerPage />;
  }

  if (window.location.pathname.startsWith('/debug/')) {
    return <DebugPage />;
  }

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
      </main>
    </div>
  );
}
