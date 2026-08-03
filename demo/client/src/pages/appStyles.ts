const COMPACT_CARD_SCALE = 0.72;
const OPPONENT_CARD_WIDTH = 92 * COMPACT_CARD_SCALE * 0.9;
const OPPONENT_CARD_HEIGHT = 132 * COMPACT_CARD_SCALE * 0.9;
const FOCAL_CARD_WIDTH = 92 * COMPACT_CARD_SCALE * 1.1;
const FOCAL_CARD_HEIGHT = 132 * COMPACT_CARD_SCALE * 1.1;

export const APP_SHELL_STYLES = `
  html, body, #root { min-height: 100%; }
  body { min-height: 100dvh; }
  .portrait-orientation-guard { display: none; }

  @media (max-width: 560px) {
    .lobby-page {
      min-height: 100dvh !important;
      padding:
        max(10px, env(safe-area-inset-top))
        max(10px, env(safe-area-inset-right))
        max(14px, env(safe-area-inset-bottom))
        max(10px, env(safe-area-inset-left)) !important;
    }
    .lobby-main { gap: 10px !important; }
    .lobby-page header { align-items: flex-start !important; }
    .lobby-page header h1 { font-size: 28px; }
    .lobby-panel { gap: 10px !important; padding: 12px !important; }
    .lobby-panel > div:first-child { padding: 12px !important; }
    .lobby-table-scroll { overflow: visible !important; padding-bottom: 4px !important; }
    .lobby-table-layout {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      width: 100% !important;
      min-width: 0 !important;
      height: auto !important;
    }
    .lobby-felt, .lobby-card-fan { display: none !important; }
    .lobby-seat {
      position: static !important;
      width: auto !important;
      min-width: 0;
      transform: none !important;
      justify-items: stretch !important;
      align-content: start;
    }
    .lobby-seat-card { margin-top: 0 !important; }
    .lobby-seat label { width: 100%; }
    .lobby-seat select,
    .lobby-seat button {
      width: 100%;
      max-width: none !important;
      min-height: 44px !important;
      font-size: 12px !important;
    }
    .lobby-host-actions input,
    .lobby-host-actions button { min-height: 44px; }
    .lobby-host-actions button:last-child { flex: 1 0 100%; }
  }

  @media (orientation: landscape) and (max-height: 600px) and (max-width: 1000px) and (pointer: coarse) {
    body { overflow: hidden; }
    .portrait-orientation-guard {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding:
        max(20px, env(safe-area-inset-top))
        max(20px, env(safe-area-inset-right))
        max(20px, env(safe-area-inset-bottom))
        max(20px, env(safe-area-inset-left));
      background: radial-gradient(circle at 50% 10%, #147a58, #064630 52%, #022c20);
      color: #fff;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      text-align: center;
    }
    .portrait-orientation-card {
      width: min(100%, 420px);
      border: 1px solid rgba(255,255,255,.24);
      border-radius: 24px;
      background: rgba(255,255,255,.1);
      padding: 22px;
      box-shadow: 0 24px 70px rgba(1,35,25,.34);
      backdrop-filter: blur(12px);
    }
    .portrait-orientation-icon {
      position: relative;
      display: block;
      width: 42px;
      height: 68px;
      margin: 0 auto 14px;
      border: 3px solid currentColor;
      border-radius: 9px;
      box-shadow: 0 0 0 7px rgba(255,255,255,.08);
    }
    .portrait-orientation-icon::after {
      content: "";
      position: absolute;
      left: 50%;
      bottom: 5px;
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
      transform: translateX(-50%);
    }
    .portrait-orientation-card strong {
      display: block;
      font-size: clamp(20px, 5vw, 28px);
      line-height: 1.1;
    }
    .portrait-orientation-card p {
      margin: 8px 0 0;
      color: rgba(255,255,255,.78);
      font-size: 14px;
      line-height: 1.45;
    }
  }
`;


export const PLAYER_PAGE_STYLES = `
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
  .session-warning {
    margin: 0 0 10px;
    border: 1px solid #f59e0b;
    border-radius: 12px;
    padding: 9px 12px;
    background: #fffbeb;
    color: #92400e;
    font-size: 13px;
    font-weight: 800;
    text-align: center;
  }
  .poker-table {
    position: relative;
    overflow: hidden;
    display: grid;
    gap: clamp(10px, 1.5vw, 20px);
    height: clamp(560px, calc(100dvh - 190px), 780px);
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
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    justify-content: center;
    align-items: flex-start;
    gap: 20px 8px;
    padding: 4px clamp(4px, 3vw, 42px) 0;
  }
  .opponents-row .player-seat-wrap { width: 100%; }
  .opponents-row[data-opponent-count="1"] { grid-template-columns: minmax(0, 240px); }
  .opponents-row[data-opponent-count="2"] { grid-template-columns: repeat(2, minmax(0, 240px)); }
  .opponents-row[data-opponent-count="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .opponents-row[data-opponent-count="4"] { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .opponents-row[data-opponent-count="2"] .player-seat-wrap { transform: translateY(20px); }
  .opponents-row[data-opponent-count="3"] .player-seat-wrap:first-child,
  .opponents-row[data-opponent-count="3"] .player-seat-wrap:last-child { transform: translateY(26px); }
  .opponents-row[data-opponent-count="4"] .player-seat-wrap:first-child,
  .opponents-row[data-opponent-count="4"] .player-seat-wrap:last-child,
  .opponents-row[data-opponent-count="5"] .player-seat-wrap:first-child,
  .opponents-row[data-opponent-count="5"] .player-seat-wrap:last-child { transform: translateY(34px); }
  .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(2),
  .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(3),
  .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(2),
  .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(4) { transform: translateY(12px); }
  @media (min-width: 761px) {
    .opponents-row[data-opponent-count="6"],
    .opponents-row[data-opponent-count="7"],
    .opponents-row[data-opponent-count="8"],
    .opponents-row[data-opponent-count="9"] {
      position: relative;
      display: block;
      box-sizing: border-box;
      height: clamp(275px, 31vh, 300px);
      padding: 0;
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .player-seat-wrap {
      position: absolute;
      width: clamp(150px, 16vw, 205px);
      transform: translateX(-50%);
    }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(1) { left: 10%; top: 180px; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(2) { left: 20%; top: 88px; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(3) { left: 40%; top: 0; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(4) { left: 60%; top: 0; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(5) { left: 80%; top: 88px; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(6) { left: 90%; top: 180px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(1) { left: 10%; top: 180px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(2) { left: 18%; top: 88px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(3) { left: 30%; top: 0; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(4) { left: 50%; top: 0; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(5) { left: 70%; top: 0; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(6) { left: 82%; top: 88px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(7) { left: 90%; top: 180px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(1) { left: 10%; top: 180px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(2) { left: 12%; top: 88px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(3) { left: 20%; top: 0; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(4) { left: 40%; top: 0; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(5) { left: 60%; top: 0; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(6) { left: 80%; top: 0; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(7) { left: 88%; top: 88px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(8) { left: 90%; top: 180px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(1) { left: 10%; top: 180px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(2) { left: 10%; top: 88px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(3) { left: 10%; top: 0; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(4) { left: 30%; top: 0; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(5) { left: 50%; top: 0; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(6) { left: 70%; top: 0; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(7) { left: 90%; top: 0; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(8) { left: 90%; top: 88px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(9) { left: 90%; top: 180px; }
    .poker-table.is-oval.is-showdown .hero-seat [data-testid^="player-result-"] { display: none !important; }
  }
  .player-seat-wrap { flex: 0 1 288px; min-width: 0; }
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
  .player-name { text-shadow: 0 1px 3px rgba(0,0,0,.7); }
  .seat-topline {
    display: grid;
    grid-template-columns: minmax(34px, auto) minmax(0, 1fr) minmax(24px, auto);
    align-items: center;
    gap: 4px;
    min-height: 22px;
    margin-bottom: 5px;
  }
  .seat-topline .seat-name-score { justify-self: center; margin: 0 !important; }
  .seat-inline-positions { display: flex; justify-content: flex-end; gap: 3px; }
  .seat-inline-positions:empty { min-width: 24px; }
  .seat-action-bubble {
    position: absolute;
    z-index: 12;
    border-radius: 8px;
    padding: 5px 9px;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
    transition: left .12s ease, top .12s ease;
  }
  .seat-action-tail {
    position: absolute;
    width: 10px;
    height: 10px;
    background: inherit;
    transform: rotate(45deg);
  }
  .seat-action-bubble.placement-top .seat-action-tail { left: calc(50% - 5px); bottom: -5px; }
  .seat-action-bubble.placement-right .seat-action-tail { left: -5px; top: calc(50% - 5px); }
  .seat-action-bubble.placement-bottom .seat-action-tail { left: calc(50% - 5px); top: -5px; }
  .seat-action-bubble.placement-left .seat-action-tail { right: -5px; top: calc(50% - 5px); }
  .seat-position-badges {
    position: absolute;
    top: -12px;
    left: 5px;
    z-index: 6;
    display: flex;
    gap: 4px;
  }
  .position-badge, .turn-countdown {
    border: 2px solid rgba(255,255,255,.9);
    border-radius: 999px;
    background: #f59e0b;
    color: #fff;
    padding: 3px 7px;
    font-size: 10px;
    font-weight: 950;
    line-height: 1;
    box-shadow: 0 2px 8px rgba(0,0,0,.3);
    white-space: nowrap;
  }
  .position-badge.dealer { background: #fff; color: #0f172a; }
  .position-badge.big-blind { background: #b91c1c; }
  .turn-countdown { position: absolute; right: 5px; bottom: -11px; z-index: 7; background: #172033; }
  [data-testid^="player-result-"] {
    border: 1px solid rgba(255,255,255,.82);
    border-radius: 8px;
    background: rgba(255,255,255,.96);
    padding: 4px 6px;
    box-shadow: 0 3px 10px rgba(0,0,0,.26);
  }
  .table-center {
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
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
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    grid-template-areas: "stage board pot";
  }
  .table-showdown-center {
    display: contents;
  }
  .table-showdown {
    grid-area: stage;
    display: flex;
    align-items: center;
    justify-content: center;
    justify-self: center;
    gap: 10px;
  }
  .poker-table.is-oval .table-showdown-center {
    position: relative;
    grid-area: board;
    display: block;
    align-self: center;
    justify-self: center;
    line-height: 0;
  }
  .poker-table.is-oval .table-showdown-center .table-board { grid-area: auto; }
  .poker-table.is-oval .table-showdown {
    position: absolute;
    left: 50%;
    bottom: calc(100% + 10px);
    width: max-content;
    max-width: min(560px, calc(100vw - 32px));
    transform: translateX(-50%);
  }
  .table-center.has-showdown .table-stage { display: none; }
  .table-stage { grid-area: stage; justify-self: start; }
  .table-board { grid-area: board; justify-self: center; }
  .table-pot { grid-area: pot; justify-self: end; }
  .showdown-new-deal { margin-top: 4px; }
  .showdown-new-deal .action-button.primary {
    min-height: 38px;
    border-color: #fef3c7;
    background: linear-gradient(180deg, #fff7d6 0%, #fbbf24 58%, #f59e0b 100%);
    padding: 6px 16px;
    color: #4a2604;
    text-shadow: 0 1px 0 rgba(255,255,255,.55);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.85),
      0 3px 0 #9a5007,
      0 7px 14px rgba(42,24,5,.3);
    cursor: pointer;
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
  }
  .showdown-new-deal .action-button:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.04);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.9),
      0 4px 0 #9a5007,
      0 9px 16px rgba(42,24,5,.34);
  }
  .showdown-new-deal .action-button:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.7),
      0 1px 0 #9a5007,
      0 4px 8px rgba(42,24,5,.28);
  }
  .showdown-new-deal .action-button:disabled { cursor: wait; }
  .pot-details { position: relative; }
  .pot-details > summary { list-style: none; }
  .pot-details > summary::-webkit-details-marker { display: none; }
  .pot-summary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 12px;
    padding: 4px;
    cursor: pointer;
    transition: background .16s ease, box-shadow .16s ease;
  }
  .pot-summary:hover,
  .pot-summary:focus-visible,
  .pot-details[open] .pot-summary {
    background: rgba(255,255,255,.12);
    box-shadow: 0 0 0 1px rgba(255,255,255,.26);
    outline: none;
  }
  .pot-current-bet {
    border: 1px solid rgba(255,255,255,.5);
    border-radius: 999px;
    padding: 2px 8px;
    background: rgba(15,23,42,.5);
    font-size: 12px;
    font-weight: 800;
  }
  .pot-popover {
    position: absolute;
    right: 0;
    bottom: calc(100% + 8px);
    z-index: 20;
    width: max-content;
    min-width: 230px;
    max-width: min(300px, calc(100vw - 32px));
    border: 1px solid rgba(255,255,255,.42);
    border-radius: 14px;
    background: rgba(15,23,42,.96);
    padding: 9px 10px;
    color: #fff;
    box-shadow: 0 14px 34px rgba(0,0,0,.34);
    backdrop-filter: blur(12px);
  }
  .pot-popover-title,
  .pot-contribution-row {
    display: grid;
    grid-template-columns: minmax(80px, 1fr) auto auto;
    align-items: center;
    gap: 12px;
  }
  .pot-popover-title {
    border-bottom: 1px solid rgba(255,255,255,.2);
    padding: 1px 2px 7px;
    color: #cbd5e1;
    font-size: 10px;
    text-align: right;
    text-transform: uppercase;
  }
  .pot-popover-title strong {
    color: #fff;
    font-size: 13px;
    text-align: left;
    text-transform: none;
  }
  .pot-contribution-row {
    padding: 6px 2px 0;
    font-size: 12px;
    text-align: right;
  }
  .pot-contribution-row > :first-child {
    overflow: hidden;
    text-align: left;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .hero-zone {
    display: grid;
    grid-template-columns: 190px auto 190px;
    grid-template-areas: "high hero low";
    justify-content: center;
    align-items: end;
    column-gap: clamp(24px, 2.5vw, 42px);
    width: 100%;
  }
  .hero-seat { grid-area: hero; align-self: end; justify-self: center; }
  .combo-side {
    align-self: center;
    box-sizing: border-box;
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
  .compact-card-row.is-expandable {
    border-radius: 8px;
    cursor: zoom-in;
    outline: none;
  }
  .compact-card-row.is-expandable:focus-visible {
    box-shadow: 0 0 0 3px #fbbf24;
  }
  .opponent-hand-overlay {
    position: fixed;
    inset: 0;
    z-index: 9000;
    display: grid;
    place-items: center;
    padding:
      max(18px, env(safe-area-inset-top))
      max(18px, env(safe-area-inset-right))
      max(18px, env(safe-area-inset-bottom))
      max(18px, env(safe-area-inset-left));
    background: rgba(2, 20, 14, .74);
    backdrop-filter: blur(7px);
  }
  .opponent-hand-dialog {
    position: relative;
    width: min(100%, 340px);
    border: 1px solid rgba(255,255,255,.4);
    border-radius: 20px;
    background: rgba(3, 69, 47, .96);
    padding: 14px 14px 16px;
    box-shadow: 0 24px 70px rgba(0,0,0,.42);
  }
  .opponent-hand-name {
    display: block;
    margin: 0 34px 12px;
    overflow: hidden;
    color: #fff;
    font-size: 18px;
    line-height: 1.15;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .opponent-hand-close {
    position: absolute;
    top: 5px;
    right: 7px;
    min-width: 30px;
    min-height: 30px;
    border: 0;
    border-radius: 50%;
    background: rgba(255,255,255,.16);
    color: #fff;
    padding: 0;
    font-size: 22px;
    line-height: 1;
  }
  .opponent-hand-expanded-row {
    display: flex;
    justify-content: center;
    gap: 6px;
  }
  .opponent-hand-expanded-frame {
    width: 64.4px;
    height: 92.4px;
    flex: 0 0 auto;
  }
  .opponent-card-frame { width: ${OPPONENT_CARD_WIDTH}px; height: ${OPPONENT_CARD_HEIGHT}px; }
  .focal-card-frame { width: ${FOCAL_CARD_WIDTH}px; height: ${FOCAL_CARD_HEIGHT}px; }
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
    min-height: 94px;
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
  .bet-size-explanation {
    flex: 1 0 100%;
    order: 3;
    color: #475569;
    font-size: 12px;
    font-weight: 750;
    text-align: center;
  }
  .bet-size-explanation strong { color: #065f46; }
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
  .party-metrics .result-points { min-width: 1000px; }
  .wallet-history { margin-top: 14px; border: 1px solid #dce5df; border-radius: 14px; background: #f8fbf9; padding: 12px; }
  .wallet-history h3 { margin: 0 0 8px; }
  .wallet-history-legend { display: flex; gap: 10px 18px; flex-wrap: wrap; margin-bottom: 10px; color: #334155; font-size: 12px; font-weight: 850; }
  .wallet-history-legend span { display: inline-flex; align-items: center; gap: 6px; }
  .wallet-history-key { width: 30px; height: 14px; flex: 0 0 30px; overflow: visible; }
  .wallet-history-canvas { overflow-x: auto; }
  .wallet-history-canvas > svg { display: block; width: 100%; min-width: 620px; height: auto; color: #475569; font: 12px Inter, ui-sans-serif, system-ui, sans-serif; }
  .wallet-history .chart-grid { stroke: #cbd5d1; stroke-width: 1; }
  .wallet-history .chart-line-halo { stroke: #fff; stroke-width: 8; opacity: .9; }
  .wallet-history .chart-line { stroke-width: 4; }
  .wallet-history .chart-axis-title { fill: #334155; font-weight: 800; }
  .result-panel { margin-top: 12px; padding: clamp(10px, 2vw, 18px); }
  .winner-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .winner-card { border: 1px solid #dce5df; border-radius: 14px; background: #f8fbf9; padding: 10px; overflow: auto; }
  .result-points { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; }
  .result-points th, .result-points td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
  .all-hands { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(360px, 100%), 1fr)); gap: 12px; margin-top: 12px; }
  .hand-detail { border: 1px solid #dce5df; border-radius: 14px; background: #fff; padding: 10px; overflow: auto; }
  @media (max-width: 900px) {
    .table-center.has-showdown {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "board board"
        "pot pot";
    }
    .poker-table.is-oval .table-center.has-showdown {
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      grid-template-areas: "stage board pot";
    }
    .table-showdown { justify-self: center; justify-content: center; }
    .table-center.has-showdown .table-pot { justify-self: center; }
  }
  @media (min-width: 761px) and (max-height: 900px) {
    .poker-page { padding: 4px 6px 8px; }
    .view-tabs { margin-inline: 10px; }
    .view-tab { min-height: 32px; padding: 5px 13px; }
    .game-tile { border-radius: 20px; padding: 4px; }
    .poker-table,
    .poker-table.is-crowded {
      height: clamp(560px, calc(100vh - 150px), 750px);
      height: clamp(560px, calc(100dvh - 150px), 750px);
      gap: 8px;
      border-width: 3px;
      border-radius: 34px;
      padding: 10px 14px;
    }
    .opponents-row,
    .poker-table.is-crowded .opponents-row {
      gap: 8px 6px;
    }
    .player-seat { padding: 4px !important; }
    .compact-card-row,
    .board-row { gap: 4px !important; }
    .opponent-card-frame {
      width: 48.024px !important;
      height: 68.904px !important;
    }
    .opponent-card { transform: scale(.522) !important; }
    .focal-card-frame {
      width: 58.696px !important;
      height: 84.216px !important;
    }
    .focal-card { transform: scale(.638) !important; }
    .table-center,
    .poker-table.is-crowded .table-center {
      min-height: 92px;
      border-radius: 20px;
      padding: 6px;
    }
    .hero-zone {
      grid-template-columns: 170px auto 170px;
      column-gap: 24px;
    }
    .combo-side { width: 170px; padding: 5px 4px; }
    .combo-side-title { margin-bottom: 4px; }
    .side-combo-cards { gap: 2px; }
    .side-combo-card {
      width: 30.36px !important;
      height: 43.56px !important;
    }
    .side-combo-card > div { transform: scale(.33) !important; }
  }
  @media (max-width: 760px) {
    .poker-page { padding: 6px; padding-bottom: 8px; }
    .view-tabs { margin-inline: 10px; }
    .view-tab { min-height: 36px; padding: 7px 13px; }
    .game-tile { border-radius: 22px; padding: 5px; }
    .stats-tile { border-radius: 18px; padding: 10px; }
    .poker-table {
      height: clamp(360px, calc(100vh - 210px), 570px);
      height: clamp(360px, calc(100dvh - 210px), 570px);
      border-width: 3px;
      border-radius: 28px;
      padding: 12px 8px;
    }
    .winner-grid { grid-template-columns: 1fr; }
    .action-dock { border-radius: 14px; }
    .opponents-row {
      position: static;
      display: grid;
      height: auto;
      padding-inline: 2px;
    }
    .opponents-row[data-opponent-count="1"] { grid-template-columns: minmax(0, 104px); }
    .opponents-row[data-opponent-count="2"] { grid-template-columns: repeat(2, minmax(0, 104px)); }
    .opponents-row[data-opponent-count="3"],
    .opponents-row[data-opponent-count="4"],
    .opponents-row[data-opponent-count="5"],
    .opponents-row[data-opponent-count="6"],
    .opponents-row[data-opponent-count="7"],
    .opponents-row[data-opponent-count="8"],
    .opponents-row[data-opponent-count="9"] {
      grid-template-columns: repeat(3, minmax(0, 104px));
    }
    .opponents-row .player-seat-wrap:nth-child(n) {
      position: static;
      width: 100%;
      transform: none;
    }
    .table-showdown-center,
    .poker-table.is-oval .table-showdown-center {
      grid-area: board;
      display: grid;
      justify-items: center;
      gap: 4px;
    }
    .table-showdown,
    .poker-table.is-oval .table-showdown {
      position: static;
      grid-area: auto;
      width: auto;
      max-width: 100%;
      transform: none;
    }
    .bet-sizes { flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; padding-bottom: 2px; }
    .bet-size-button { flex: 0 0 auto; }
    .main-actions .action-button { flex: 1 1 90px; }
    .hero-zone { column-gap: 12px; }
    .combo-side { width: 184px; padding: 6px 5px; }
  }
  @media (min-width: 761px) and (max-width: 820px) {
    .hero-zone { column-gap: 12px; }
    .hero-zone .compact-card-row { gap: 4px; }
    .hero-zone .focal-card-frame {
      width: 54.004px;
      height: 77.484px;
    }
    .hero-zone .focal-card { transform: scale(.587); }
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
        "board board"
        "pot pot";
    }
    .table-showdown { justify-self: center; justify-content: center; }
    .table-center.has-showdown .table-pot { justify-self: center; }
    .table-board { grid-column: 1 / -1; }
    .hero-zone {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "high low"
        "hero hero";
      column-gap: 6px;
      row-gap: 8px;
      align-items: center;
    }
    .combo-side.high, .combo-side.low { justify-self: center; }
  }
  @media (orientation: portrait) and (max-width: 430px) {
    .poker-page {
      min-height: 100dvh;
      padding:
        max(5px, env(safe-area-inset-top))
        max(5px, env(safe-area-inset-right))
        max(8px, env(safe-area-inset-bottom))
        max(5px, env(safe-area-inset-left));
      overflow-x: hidden;
    }
    .view-tabs { margin-inline: 7px; }
    .view-tab { padding-inline: 11px; letter-spacing: .025em; }
    .poker-table,
    .poker-table.is-crowded {
      gap: 6px;
      padding: 7px 5px;
    }
    .opponents-row,
    .poker-table.is-crowded .opponents-row {
      gap: 7px 2px;
      padding-top: 18px;
    }
    .opponents-row .player-seat-wrap {
      flex: 0 1 104px;
      width: 104px;
    }
    .opponents-row .player-seat { padding: 4px !important; }
    .opponents-row .compact-card-row { gap: 0; }
    .opponents-row .opponent-card-frame {
      width: 33.12px;
      height: 47.52px;
    }
    .opponents-row .opponent-card { transform: scale(.36) !important; }
    .opponents-row .opponent-card {
      position: relative !important;
      display: block !important;
    }
    .opponents-row .opponent-card .card-rank,
    .opponents-row .opponent-card .card-suit {
      position: absolute;
      left: 6px;
      line-height: .9 !important;
    }
    .opponents-row .opponent-card .card-rank {
      top: 5px;
      font-size: 24px !important;
    }
    .opponents-row .opponent-card .card-suit {
      top: 34px;
      font-size: 26px !important;
    }
    .opponents-row .opponent-card-frame + .opponent-card-frame { margin-left: -21px; }
    .table-center,
    .poker-table.is-crowded .table-center {
      height: 142px;
      min-height: 142px;
      padding: 5px 4px;
    }
    .table-center.has-showdown {
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas:
        "board board"
        "pot pot";
      gap: 4px;
    }
    .table-center.has-showdown .table-pot {
      grid-column: 2;
      grid-row: 2;
      justify-self: end;
    }
    .table-showdown > div {
      min-width: 0 !important;
      gap: 2px !important;
      padding: 6px 8px !important;
    }
    .table-showdown > div > strong { font-size: 19px !important; }
    .opponents-row [data-testid^="player-result-"],
    .hero-seat [data-testid^="player-result-"] {
      position: absolute;
      z-index: 5;
      width: 120px;
      max-width: calc(100vw - 24px);
      border: 1px solid rgba(255,255,255,.7);
      border-radius: 8px;
      background: rgba(255,255,255,.94);
      padding: 3px 5px;
      box-shadow: 0 3px 10px rgba(0,0,0,.25);
    }
    .opponents-row [data-testid^="player-result-"] {
      top: calc(100% + 3px);
      left: 50%;
      transform: translateX(-50%);
    }
    .hero-seat [data-testid^="player-result-"] {
      right: 0;
      bottom: calc(100% + 3px);
    }
    .table-center .board-row { gap: 4px; }
    .table-center .focal-card-frame {
      width: 33.12px;
      height: 47.52px;
    }
    .table-center .focal-card { transform: scale(.36) !important; }
    .hero-zone {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-areas:
        "high low"
        "hero hero";
      row-gap: 5px;
      column-gap: 5px;
      width: 100%;
    }
    .combo-side {
      width: 100%;
      max-width: 158px;
      padding: 4px;
      justify-self: center;
    }
    .combo-side-title {
      gap: 4px;
      margin-bottom: 3px;
      font-size: 10px;
    }
    .combo-side-rank { font-size: 11px; }
    .side-combo-cards { gap: 2px; }
    .side-combo-card {
      width: 20.24px !important;
      height: 29.04px !important;
    }
    .side-combo-card > div { transform: scale(.22) !important; }
    .hero-seat .focal-card-frame {
      width: 40.48px;
      height: 58.08px;
    }
    .hero-seat .focal-card { transform: scale(.44) !important; }
    .action-dock {
      position: fixed;
      z-index: 80;
      bottom: max(4px, env(safe-area-inset-bottom));
      right: max(5px, env(safe-area-inset-right));
      left: max(5px, env(safe-area-inset-left));
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      width: auto;
      gap: 6px;
      margin-top: 6px;
      padding: 8px 6px;
      box-shadow: 0 -8px 28px rgba(15,23,42,.22);
    }
    .bet-sizes {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      width: 100%;
      gap: 4px;
      overflow: visible;
      padding: 0;
    }
    .bet-sizes > span { display: none; }
    .bet-size-button {
      width: 100%;
      min-width: 0;
      min-height: 30px;
      padding: 3px 1px;
      overflow: hidden;
      font-size: 11px;
      line-height: 1.05;
      text-overflow: clip;
      white-space: nowrap;
    }
    .main-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      width: 100%;
      gap: 6px;
    }
    .main-actions .action-button {
      width: 100%;
      min-width: 0;
      min-height: 40px;
      padding: 3px 2px;
      font-size: 12px;
      line-height: 1.08;
      overflow-wrap: anywhere;
    }
    .bet-size-explanation {
      font-size: 10px;
      line-height: 1.2;
    }
    .pot-popover {
      position: fixed;
      right: max(8px, env(safe-area-inset-right));
      bottom: max(8px, env(safe-area-inset-bottom));
      left: max(8px, env(safe-area-inset-left));
      width: auto;
      min-width: 0;
      max-width: none;
    }
  }
`;
