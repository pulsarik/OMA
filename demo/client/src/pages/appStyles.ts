const COMPACT_CARD_SCALE = 0.72;
const OPPONENT_CARD_WIDTH = 92 * COMPACT_CARD_SCALE * 0.9;
const OPPONENT_CARD_HEIGHT = 132 * COMPACT_CARD_SCALE * 0.9;
const FOCAL_CARD_WIDTH = 92 * COMPACT_CARD_SCALE * 1.1;
const FOCAL_CARD_HEIGHT = 132 * COMPACT_CARD_SCALE * 1.1;
const SIDE_COMBO_CARD_SCALE = 0.35;
const SIDE_COMBO_CARD_WIDTH = 92 * SIDE_COMBO_CARD_SCALE;
const SIDE_COMBO_CARD_HEIGHT = 132 * SIDE_COMBO_CARD_SCALE;

export const APP_SHELL_STYLES = `
  html, body, #root { min-height: 100%; }
  body { min-height: 100dvh; }
  .portrait-orientation-guard { display: none; }
  .report-problem-button { touch-action: manipulation; }

  .welcome-choice-card { transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease; }
  .welcome-choice-card:hover { transform: translateY(-2px); border-color: #08734d !important; box-shadow: 0 18px 42px rgba(1,35,25,.16) !important; }
  .welcome-choice-card:focus-visible { outline: 3px solid #fbbf24; outline-offset: 3px; }

  .lobby-tabs {
    display: flex;
    gap: 4px;
    margin: 0 12px -15px;
    position: relative;
    z-index: 1;
  }
  .lobby-tab {
    padding: 8px 18px;
    border: 1px solid #cbd5e1;
    border-radius: 12px 12px 0 0;
    background: #f1f5f9;
    color: #475569;
    font-weight: 900;
    cursor: pointer;
  }
  .lobby-tab-active {
    border-bottom-color: #fff;
    background: #fff;
    color: #172033;
  }
  .about-panel {
    display: grid;
    gap: 14px;
    border: 1px solid #d8e2dc;
    border-radius: clamp(20px, 3vw, 30px);
    background: linear-gradient(145deg, #ffffff, #f1f7f3);
    padding: clamp(18px, 4vw, 32px);
    box-shadow: 0 12px 32px rgba(31,54,42,.09);
    color: #17211b;
  }
  .about-panel__title,
  .about-panel__low h3 { margin: 0; }
  .about-panel__copy,
  .about-panel__low p { margin: 0; color: #475569; line-height: 1.55; }
  .about-panel__low {
    display: grid;
    gap: 7px;
    border-left: 4px solid #fbbf24;
    border-radius: 4px;
    background: rgba(255,255,255,.58);
    padding: 12px 14px;
  }
  .about-panel__low h3 { color: #065f46; font-size: 16px; }
  .lobby-replay-panel {
    display: grid;
    gap: 14px;
    padding: 16px;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background: #f8fafc;
  }
  .lobby-replay-panel p,
  .lobby-replay-panel small { margin: 5px 0 0; color: #64748b; }
  .lobby-replay-panel label { display: grid; gap: 6px; font-weight: 800; }
  .lobby-replay-panel input {
    width: min(100%, 260px);
    padding: 9px 10px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    font-family: ui-monospace, monospace;
    letter-spacing: .12em;
  }
  .lobby-start-button {
    position: fixed;
    z-index: 1100;
    right: max(76px, calc(64px + env(safe-area-inset-right)));
    bottom: max(16px, env(safe-area-inset-bottom));
    min-height: 48px !important;
    background: #b45309;
    box-shadow: 0 8px 22px rgba(2, 44, 32, .28);
  }
  .lobby-start-button:hover { background: #92400e; }
  .lobby-start-button:focus-visible { outline: 3px solid #fbbf24; outline-offset: 3px; }

  @media (max-width: 560px) {
    /* Keep the utility control in the top gutter on phones; the lower edge is
       occupied by page cards, tables, and the game's action dock. */
    .report-problem-button {
      top: max(2px, env(safe-area-inset-top)) !important;
      right: max(8px, env(safe-area-inset-right)) !important;
      bottom: auto !important;
      width: 44px !important;
      height: 44px !important;
    }
  }

  @media (max-width: 560px) {
    /* The home screen is a compact table rail on phones: identity + two
       primary actions fit in the first viewport, while the full rules remain
       behind About. */
    .welcome-shell {
      min-height: 100dvh !important;
      padding: max(10px, env(safe-area-inset-top)) max(10px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(10px, env(safe-area-inset-left)) !important;
    }
    .welcome-main { gap: 10px !important; }
    .welcome-header { min-height: 30px; }
    .welcome-header strong { font-size: 12px; letter-spacing: .16em !important; }
    .welcome-nav { margin: 0 4px -10px !important; }
    .welcome-nav button { padding: 7px 11px !important; font-size: 11px; }
    .welcome-intro-card {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 4px 12px;
      padding: 14px 15px !important;
      border-radius: 17px !important;
      background: linear-gradient(145deg, rgba(255,255,255,.98), rgba(232,247,239,.98)) !important;
    }
    .welcome-intro-card > span { grid-column: 1 / -1; font-size: 10px !important; letter-spacing: .16em !important; }
    .welcome-intro-card h1 { margin: 0 !important; font-size: 31px !important; line-height: .92 !important; letter-spacing: -.04em; }
    .welcome-intro-card > p { margin: 0 !important; max-width: 120px !important; font-size: 11px !important; line-height: 1.2 !important; text-align: right; }
    .welcome-difference {
      grid-column: 1 / -1;
      margin-top: 7px !important;
      border: 1px solid rgba(180,83,9,.24) !important;
      border-left: 0 !important;
      border-radius: 9px;
      background: rgba(255,251,235,.74);
      padding: 7px 9px !important;
      font-size: 11px;
    }
    .welcome-difference strong { color: #92400e; }
    .welcome-difference p { display: inline; margin: 0 0 0 4px !important; font-size: 11px; line-height: 1.2 !important; }
    .welcome-choice-grid { grid-template-columns: 1fr !important; gap: 8px !important; }
    .welcome-choice-card {
      min-height: 0 !important;
      grid-template-columns: 38px 1fr !important;
      justify-items: stretch !important;
      align-items: center;
      gap: 7px !important;
      padding: 13px 8px !important;
      border-radius: 15px !important;
      text-align: left !important;
      box-shadow: 0 10px 26px rgba(1,35,25,.12) !important;
    }
    .welcome-choice-card > span:first-child { width: 38px !important; height: 38px !important; border-radius: 12px !important; font-size: 22px !important; }
    .welcome-choice-card strong { font-size: 14px !important; }
    .welcome-choice-card small { margin-top: 3px !important; font-size: 10px !important; line-height: 1.2 !important; }
    .welcome-shell > .welcome-main > footer { font-size: 10px !important; }

    .lobby-page {
      min-height: 100dvh !important;
      padding:
        max(10px, env(safe-area-inset-top))
        max(10px, env(safe-area-inset-right))
        max(14px, env(safe-area-inset-bottom))
        max(10px, env(safe-area-inset-left)) !important;
    }
    .lobby-main { gap: 10px !important; }
    .lobby-page header {
      align-items: flex-start !important;
      padding-right: 64px !important;
    }
    .lobby-page header h1 { font-size: 28px; }
    .lobby-panel { gap: 10px !important; padding: 12px !important; }
    .lobby-panel > .lobby-invite-card { padding: 12px !important; }
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
    .lobby-host-actions { padding-bottom: 58px; }
    .lobby-start-button {
      right: max(12px, env(safe-area-inset-right));
      bottom: max(12px, env(safe-area-inset-bottom));
      left: max(12px, env(safe-area-inset-left));
      width: auto;
      min-height: 48px !important;
      flex: none !important;
      box-shadow: 0 8px 22px rgba(2, 44, 32, .28);
    }
    .lobby-table-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow-wrap: normal;
      word-break: normal;
    }
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

  .horizontal-table-width-guard {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: grid;
    place-items: center;
    min-height: 100dvh;
    padding: 20px;
    box-sizing: border-box;
    background: radial-gradient(circle at 50% 10%, #147a58, #064630 52%, #022c20);
    color: #fff;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    text-align: center;
  }
  .horizontal-table-width-card {
    width: min(100%, 420px);
    border: 1px solid rgba(255,255,255,.24);
    border-radius: 24px;
    background: rgba(255,255,255,.1);
    padding: 22px;
    box-shadow: 0 24px 70px rgba(1,35,25,.34);
    backdrop-filter: blur(12px);
  }
  .horizontal-table-width-icon {
    display: block;
    width: 68px;
    height: 42px;
    margin: 0 auto 18px;
    border: 3px solid currentColor;
    border-radius: 9px;
    box-shadow: 0 0 0 7px rgba(255,255,255,.08);
  }
  .horizontal-table-width-card strong {
    display: block;
    font-size: clamp(20px, 5vw, 28px);
    line-height: 1.1;
  }
  .horizontal-table-width-card p {
    margin: 8px 0 0;
    color: rgba(255,255,255,.78);
    font-size: 14px;
    line-height: 1.45;
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
    width: 100%;
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
  .voice-panel {
    display: grid;
    min-height: 180px;
    place-items: center;
    border: 1px solid #d8e2dc;
    border-radius: clamp(20px, 3vw, 30px);
    background: linear-gradient(145deg, #ffffff, #f1f7f3);
    padding: clamp(18px, 4vw, 46px);
    box-shadow: 0 12px 32px rgba(31,54,42,.09);
  }
  .voice-panel[hidden] { display: none; }
  .voice-chat {
    display: flex;
    width: min(100%, 560px);
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 18px;
    border: 1px solid #cfe0d5;
    border-radius: 18px;
    background: rgba(255,255,255,.88);
    box-shadow: 0 8px 24px rgba(31,54,42,.1);
    color: var(--ink);
  }
  .voice-chat__info { display: grid; min-width: 0; gap: 5px; }
  .voice-chat__title { display: flex; align-items: center; gap: 7px; font-size: 16px; }
  .voice-chat__status { overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
  .voice-chat__status-dot { display: inline-block; width: 7px; height: 7px; margin-right: 5px; border-radius: 50%; background: #16a34a; }
  .voice-chat__error { color: #b91c1c; font-size: 12px; }
  .voice-chat__actions { display: flex; flex: 0 0 auto; align-items: center; gap: 6px; }
  .voice-chat__button { min-height: 34px; border: 1px solid #cbd5e1; border-radius: 10px; background: #fff; color: #334155; padding: 6px 11px; font-size: 12px; font-weight: 800; }
  .voice-chat__button:hover { border-color: #94a3b8; background: #f8fafc; }
  .voice-chat__button--primary { border-color: #087344; background: #087344; color: #fff; }
  .voice-chat__button--primary:hover { border-color: #065f46; background: #065f46; }
  .voice-chat__button--icon { width: 36px; padding: 4px; font-size: 16px; line-height: 1; }
  @media (max-width: 560px) {
    .voice-panel { min-height: 150px; padding: 12px; }
    .voice-chat { align-items: stretch; flex-direction: column; gap: 12px; padding: 14px; }
    .voice-chat__actions { justify-content: flex-end; }
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
    height: max(560px, calc(100dvh - 190px));
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
  .replay-indicator {
    position: absolute;
    top: 11px;
    right: 18px;
    z-index: 8;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #fff1f2;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: .08em;
    line-height: 1;
    text-transform: uppercase;
    text-shadow: 0 1px 6px rgba(0, 0, 0, .7), 0 0 8px rgba(248, 113, 113, .34);
    white-space: nowrap;
  }
  .replay-indicator__dot {
    color: #ff3b30;
    font-size: 17px;
    line-height: 1;
    text-shadow: 0 0 7px rgba(255, 59, 48, .9);
    animation: replay-recording 1.35s ease-in-out infinite;
  }
  .replay-indicator__icon {
    color: #ff8a8a;
    font-size: 21px;
    line-height: 1;
  }
  .replay-indicator__code {
    color: #ffe4e6;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 14px;
    letter-spacing: .04em;
  }
  @keyframes replay-recording {
    0%, 100% { opacity: .42; }
    50% { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .replay-indicator__dot { animation: none; }
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
  .opponents-row .player-seat { min-width: 0; max-width: 100%; }
  .seat-topline .seat-name-score { min-width: 0; max-width: 100%; }
  .seat-topline .seat-name-score > span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .seat-topline .showdown-net-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    min-height: 16px;
    padding: 2px 6px;
    border: 1px solid rgba(255,255,255,.9);
    border-radius: 999px;
    font-size: 10px;
    font-weight: 950;
    line-height: 1;
    white-space: nowrap;
    box-shadow: 0 2px 6px rgba(0,0,0,.24);
  }
  .seat-topline .showdown-net-badge.is-positive {
    background: #16a34a;
    color: #fff;
  }
  .seat-topline .showdown-net-badge.is-negative {
    background: #dc2626;
    color: #fff;
  }
  .opponents-row[data-opponent-count="1"] { grid-template-columns: minmax(0, 240px); }
  .opponents-row[data-opponent-count="2"] { grid-template-columns: repeat(2, minmax(0, 240px)); }
  .opponents-row[data-opponent-count="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .opponents-row[data-opponent-count="4"] { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  @media (min-width: 761px) {
    .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"],
      [data-opponent-count="5"],
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) {
      position: relative;
      display: grid;
      box-sizing: border-box;
      height: clamp(240px, 31vh, 300px);
      min-height: 0;
      padding: 0;
    }
    .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"],
      [data-opponent-count="5"],
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .player-seat-wrap {
      position: absolute;
      width: calc(clamp(150px, 16vw, 205px) * var(--table-scale, 1));
      transform: translateX(-50%);
    }
    .opponents-row[data-opponent-count="1"] .player-seat-wrap:nth-child(1) { left: 50%; top: 0; }
    .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(1) { left: 32%; top: 46px; }
    .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(2) { left: 68%; top: 46px; }
    .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1) { left: 20%; top: 78px; }
    .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(2) { left: 50%; top: 0; }
    .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3) { left: 80%; top: 78px; }
    .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1) { left: 13%; top: 112px; }
    .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(2) { left: 38%; top: 28px; }
    .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(3) { left: 62%; top: 28px; }
    .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4) { left: 87%; top: 112px; }
    .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(1) { left: 10%; top: 142px; }
    .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(2) { left: 30%; top: 48px; }
    .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(3) { left: 50%; top: 0; }
    .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(4) { left: 70%; top: 48px; }
    .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(5) { left: 90%; top: 142px; }
    .opponents-row[data-opponent-count="6"],
    .opponents-row[data-opponent-count="7"],
    .opponents-row[data-opponent-count="8"],
    .opponents-row[data-opponent-count="9"] {
      min-height: 0;
    }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(1) { left: 8%; top: 142px; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(2) { left: 25%; top: 70px; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(3) { left: 40%; top: 16px; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(4) { left: 60%; top: 16px; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(5) { left: 75%; top: 70px; }
    .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(6) { left: 92%; top: 142px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(1) { left: 8%; top: 142px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(2) { left: 22%; top: 72px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(3) { left: 36%; top: 20px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(4) { left: 50%; top: 0; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(5) { left: 64%; top: 20px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(6) { left: 78%; top: 72px; }
    .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(7) { left: 92%; top: 142px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(1) { left: 7%; top: 142px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(2) { left: 19%; top: 72px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(3) { left: 31%; top: 20px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(4) { left: 43%; top: 0; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(5) { left: 57%; top: 0; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(6) { left: 69%; top: 20px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(7) { left: 81%; top: 72px; }
    .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(8) { left: 93%; top: 142px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(1) { left: 6%; top: 142px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(2) { left: 17%; top: 72px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(3) { left: 28%; top: 20px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(4) { left: 39%; top: 0; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(5) { left: 50%; top: 0; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(6) { left: 61%; top: 0; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(7) { left: 72%; top: 20px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(8) { left: 83%; top: 72px; }
    .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(9) { left: 94%; top: 142px; }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .player-seat-wrap {
      width: calc(clamp(120px, 10vw, 132px) * var(--table-scale, 1));
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .compact-card-row {
      gap: 1px;
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .opponent-card-frame {
      width: calc(30px * var(--card-table-scale, var(--table-scale, 1)));
      height: calc(43.125px * var(--card-table-scale, var(--table-scale, 1)));
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .opponent-card { transform: scale(calc(.326 * var(--card-table-scale, var(--table-scale, 1)))); }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .seat-action-bubble {
      max-width: min(180px, calc(100vw - 24px));
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) [data-testid^="player-result-"] {
      width: 100%;
      max-width: 100%;
      margin-top: 5px;
      text-align: center;
    }
    .poker-table.is-oval.is-showdown .hero-seat [data-testid^="player-result-"] { display: none !important; }
  }
  .poker-table:has(.replay-indicator) .opponents-row { padding-top: 30px; }
  .deal-card {
    animation: deal-card-in .42s cubic-bezier(.2,.78,.28,1) both;
    animation-delay: var(--deal-delay, 0ms);
    transform-origin: 50% 85%;
  }
  .card-face {
    position: relative;
    isolation: isolate;
    border: 1px solid rgba(123, 91, 48, .22);
  }
  .card-face::before,
  .card-face::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    border-radius: inherit;
  }
  .card-face::before {
    z-index: -1;
    opacity: .8;
    background:
      radial-gradient(ellipse at 0% 0%, rgba(117, 76, 28, .26) 0 4%, transparent 13%),
      radial-gradient(ellipse at 100% 100%, rgba(117, 76, 28, .2) 0 5%, transparent 15%),
      repeating-linear-gradient(103deg, transparent 0 19px, rgba(117, 76, 28, .045) 20px, transparent 21px 42px);
    mix-blend-mode: multiply;
  }
  .card-face::after {
    z-index: 1;
    box-shadow: inset 0 0 8px rgba(117, 76, 28, .18);
  }
  .card-face--texture-1 { background: linear-gradient(145deg, #fffaf0, #eadfc6); }
  .card-face--texture-2 {
    background:
      linear-gradient(146deg, transparent 0 38%, rgba(132, 92, 42, .09) 39%, transparent 40%),
      linear-gradient(145deg, #fff9ec, #e8d8b7);
  }
  .card-face--texture-3 {
    background:
      linear-gradient(32deg, transparent 0 68%, rgba(132, 92, 42, .1) 69%, transparent 70%),
      linear-gradient(145deg, #fbf1dc, #e4cfaa);
  }
  .card-face--texture-4 {
    background:
      linear-gradient(158deg, transparent 0 73%, rgba(132, 92, 42, .11) 74%, transparent 75%),
      linear-gradient(145deg, #fff8e7, #e9d6af);
  }
  .card-face--texture-5 {
    background:
      linear-gradient(25deg, transparent 0 24%, rgba(132, 92, 42, .075) 25%, transparent 26%),
      linear-gradient(145deg, #fdf5e3, #e2c99d);
  }
  @keyframes deal-card-in {
    from {
      opacity: 0;
      transform: translate3d(0, -38px, 0) rotate(-7deg) scale(.82);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) rotate(0) scale(1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .deal-card { animation: none; }
  }
  .player-seat-wrap { flex: 0 1 288px; min-width: 0; }
  .player-seat {
    transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease;
  }
  .player-seat.is-thinking {
    transform: translateY(-3px);
  }
  @keyframes thinking-name-pulse {
    0%, 100% {
      border-color: #facc15;
      box-shadow: 0 0 0 2px rgba(250, 204, 21, .28), 0 2px 8px rgba(250, 204, 21, .38);
    }
    50% {
      border-color: #fef08a;
      box-shadow: 0 0 0 5px rgba(250, 204, 21, .12), 0 2px 14px rgba(250, 204, 21, .72);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .player-seat.is-thinking .seat-name-score,
    .player-meta.is-thinking .player-name { animation: none; }
  }
  .player-seat.is-eliminated {
    box-shadow: inset 0 0 0 2px rgba(220,38,38,.72), 0 3px 12px rgba(15,23,42,.3);
  }
  .eliminated-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 11;
    transform: translate(-50%, -50%) rotate(-7deg);
    border: 2px solid #fff;
    border-radius: 5px;
    background: #b91c1c;
    color: #fff;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: .08em;
    box-shadow: 0 3px 10px rgba(0,0,0,.48);
    text-shadow: 0 1px 2px rgba(0,0,0,.45);
    white-space: nowrap;
    pointer-events: none;
  }
  .player-meta {
    min-width: 70px;
    border-radius: 12px;
    padding: 4px 6px;
  }
  .player-name { text-shadow: 0 1px 3px rgba(0,0,0,.7); }
  .seat-topline {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    align-items: center;
    gap: 4px;
    min-height: 22px;
    margin-bottom: 5px;
  }
  .seat-topline .seat-name-score {
    grid-column: 1;
    justify-self: center;
    min-width: 0;
    max-width: 100%;
    margin: 0 !important;
    overflow: hidden;
    justify-content: space-between;
  }
  .seat-inline-positions {
    grid-column: 2;
    display: flex;
    min-width: max-content;
    justify-content: flex-end;
    gap: 3px;
  }
  .seat-inline-positions:empty { min-width: 0; }
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
    padding: 3px 8px;
    font-size: 11px;
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
  .showdown-new-deal { margin-top: 2px; }
  .showdown-new-deal .action-button.primary {
    min-width: 96px;
    min-height: 28px;
    border-color: #fef3c7;
    background: linear-gradient(180deg, #fff7d6 0%, #fbbf24 58%, #f59e0b 100%);
    padding: 3px 10px;
    font-size: 12px;
    border-radius: 8px;
    color: #4a2604;
    text-shadow: 0 1px 0 rgba(255,255,255,.55);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.85),
      0 2px 0 #9a5007,
      0 4px 8px rgba(42,24,5,.3);
    cursor: pointer;
    transition: transform .12s ease, box-shadow .12s ease, filter .12s ease;
  }
  .showdown-new-deal .action-button:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.04);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.9),
      0 3px 0 #9a5007,
      0 7px 12px rgba(42,24,5,.34);
  }
  .showdown-new-deal .action-button:active:not(:disabled) {
    transform: translateY(2px);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,.7),
      0 1px 0 #9a5007,
      0 3px 6px rgba(42,24,5,.28);
  }
  .showdown-new-deal .action-button:disabled { cursor: wait; }
  .pot-details { position: relative; }
  .pot-details > summary { list-style: none; }
  .pot-details > summary::-webkit-details-marker { display: none; }
  .coin-stack-pile {
    position: relative;
    filter: drop-shadow(0 3px 3px rgba(0,0,0,.18));
  }
  .coin-chip {
    z-index: 1;
  }
  .pot-bank-visual {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    width: 120px;
    height: 30px;
    min-width: 110px;
    max-width: 125px;
    box-sizing: border-box;
    padding: 2px 5px;
    border: 1px solid rgba(245, 205, 112, .8);
    border-radius: 999px;
    background: rgba(2, 65, 43, .82);
    box-shadow: 0 3px 8px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.12);
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,.55);
  }
  .pot-bank-chips {
    position: relative;
    display: flex;
    align-items: center;
    flex: 0 0 42px;
    width: 42px;
    height: 19px;
  }
  .pot-bank-chip {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 18px;
    height: 18px;
    border: 1px solid;
    border-radius: 50%;
    box-shadow: 0 1px 0 rgba(0,0,0,.4), 0 2px 4px rgba(0,0,0,.24);
  }
  .pot-bank-chip::after {
    content: '';
    position: absolute;
    top: 3px;
    left: 3px;
    width: 10px;
    height: 10px;
    border: 1px solid rgba(255,255,255,.72);
    border-radius: 50%;
    background: var(--chip-color);
  }
  .pot-bank-copy {
    display: flex;
    align-items: center;
    min-width: 0;
    white-space: nowrap;
  }
  .pot-bank-label {
    color: rgba(255,255,255,.72);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .08em;
    line-height: 1;
  }
  .pot-bank-amount {
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: .01em;
    white-space: nowrap;
  }
  .pot-summary {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    width: max-content;
    max-width: 100%;
    border-radius: 16px;
    padding: 2px;
    cursor: pointer;
    transition: background .16s ease, box-shadow .16s ease;
  }
  .pot-summary:hover,
  .pot-summary:focus-visible,
  .pot-details[open] .pot-summary {
    background: rgba(255,255,255,.08);
    box-shadow: 0 0 0 2px rgba(245,216,164,.48), 0 6px 14px rgba(0,0,0,.16);
    outline: none;
  }
  .pot-current-bet {
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 2;
    min-width: 46px;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,.5);
    border-radius: 999px;
    padding: 2px 8px;
    background: rgba(15,23,42,.5);
    font-size: 12px;
    font-weight: 800;
    text-align: center;
  }
  .pot-current-bet[aria-hidden="true"] {
    visibility: hidden;
  }
  .pot-summary .coin-stack {
    grid-column: auto;
  }
  .pot-summary .pot-bank-visual {
    grid-column: auto;
  }
  .pot-summary .coin-stack-total {
    min-width: 48px;
    box-sizing: border-box;
    padding: 2px 9px;
    font-size: 16px !important;
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
    grid-template-columns: minmax(100px, 1fr) 58px 72px;
    align-items: center;
    gap: 8px;
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
  .pot-popover-title > :not(:first-child),
  .pot-contribution-row > :not(:first-child) {
    width: 100%;
    text-align: right;
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
  .pot-side-breakdown {
    display: grid;
    gap: 6px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,.2);
  }
  .pot-side-row {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 10px;
    padding: 4px 2px;
    font-size: 12px;
  }
  .pot-side-row small {
    grid-column: 1 / -1;
    color: #cbd5e1;
    font-size: 10px;
  }
  .hero-zone {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) max-content minmax(220px, 1fr);
    grid-template-areas: "high hero low";
    justify-content: center;
    align-items: end;
    column-gap: clamp(36px, 4vw, 72px);
    padding-inline: clamp(8px, 2vw, 24px);
    box-sizing: border-box;
    width: 100%;
  }
  .hero-seat {
    grid-area: hero;
    align-self: end;
    justify-self: center;
    max-width: 100%;
    min-width: 0;
  }
  .combo-side {
    align-self: center;
    box-sizing: border-box;
    width: min(calc(190px * var(--table-scale, 1)), 100%);
    min-width: 0;
    overflow: hidden;
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
    min-width: 0;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .07em;
  }
  .combo-side-rank { min-width: 0; overflow: hidden; color: #ecfdf5; font-size: 13px; letter-spacing: 0; text-align: right; text-overflow: ellipsis; white-space: nowrap; }
  .mobile-combination-guide { display: none; }
  .side-combo-cards { display: flex; justify-content: center; gap: calc(3px * var(--table-scale, 1)); }
  .side-combo-card {
    width: calc(${SIDE_COMBO_CARD_WIDTH}px * var(--table-scale, 1)) !important;
    height: calc(${SIDE_COMBO_CARD_HEIGHT}px * var(--table-scale, 1)) !important;
    border-top: 2px solid rgba(255,255,255,.58);
    border-radius: 5px;
  }
  .side-combo-card.is-hand { border-top-color: #fbbf24; }
  .compact-card-row { display: flex; gap: calc(8px * var(--table-scale, 1)); flex-wrap: nowrap; justify-content: center; }
  .opponent-hand-zone {
    display: flex !important;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    box-sizing: border-box;
    min-width: 0;
    max-width: 100%;
    overflow: visible;
  }
  .opponent-hand-zone [data-testid^="player-result-"] {
    box-sizing: border-box;
    max-width: 100%;
  }
  .opponent-hand-zone .seat-action-bubble {
    position: static;
    left: auto !important;
    top: auto !important;
    max-width: 100%;
    margin: 0 auto 5px;
    overflow: hidden;
    text-overflow: ellipsis;
    transform: none !important;
  }
  .opponent-hand-zone .seat-action-tail { display: none; }
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
    max-height: calc(100vh - 36px);
    overflow-y: auto;
    overscroll-behavior: contain;
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
  .opponent-card-frame {
    width: calc(${OPPONENT_CARD_WIDTH}px * var(--table-scale, 1));
    height: calc(${OPPONENT_CARD_HEIGHT}px * var(--table-scale, 1));
    flex: 0 0 auto;
  }
  .focal-card-frame {
    width: calc(${FOCAL_CARD_WIDTH}px * var(--table-scale, 1));
    height: calc(${FOCAL_CARD_HEIGHT}px * var(--table-scale, 1));
    flex: 0 0 auto;
  }
  .board-row { display: flex; gap: calc(8px * var(--table-scale, 1)); flex-wrap: wrap; justify-content: center; }
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
  fieldset.main-actions { border: 0; padding: 0; margin: 0; min-width: 0; }
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
  .party-metrics { min-width: 0; max-width: 100%; margin-top: 12px; }
  .party-metrics-scroll,
  .result-points-scroll {
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-inline: contain;
    -webkit-overflow-scrolling: touch;
    border: 1px solid #dce5df;
    border-radius: 12px;
  }
  .party-metrics-scroll .result-points,
  .result-points-scroll .result-points {
    width: max-content;
    min-width: 100%;
    margin: 0;
    overflow: visible;
  }
  .party-metrics-scroll .result-points { font-size: 12px; }
  .party-metrics-scroll .legacy-realization-heading,
  .party-metrics-scroll td[data-testid^="party-realization-"] ~ td[data-testid^="party-hands-"] { }
  .party-combination-heading { position: relative; }
  .party-combination-button { border: 0; padding: 0; background: transparent; color: inherit; font: inherit; font-weight: 800; cursor: pointer; }
  .party-combination-popover { position: absolute; z-index: 5; top: calc(100% + 4px); left: 50%; transform: translateX(-50%); padding: 6px 8px; border: 1px solid #cbd5d1; border-radius: 7px; background: #fff; color: #1f2937; box-shadow: 0 4px 12px rgba(31,54,42,.18); white-space: nowrap; font-size: 12px; font-weight: 700; }
  .party-metrics-scroll .result-points { min-width: 1000px; }
  .party-metrics-scroll .result-points th:first-child,
  .party-metrics-scroll .result-points td:first-child,
  .result-points-scroll .result-points th:first-child,
  .result-points-scroll .result-points td:first-child {
    position: sticky;
    left: 0;
    z-index: 1;
    background: #fff;
    box-shadow: 8px 0 10px -10px rgba(31,54,42,.55);
  }
  .party-metrics-scroll .result-points th:first-child,
  .result-points-scroll .result-points th:first-child { z-index: 2; }
  .wallet-history { margin-top: 14px; border: 1px solid #dce5df; border-radius: 14px; background: #f8fbf9; padding: 12px; }
  .wallet-history h3 { margin: 0 0 8px; }
  .wallet-history-canvas { overflow-x: auto; }
  .wallet-history-canvas > svg { display: block; width: 100%; min-width: 620px; height: auto; color: #475569; font: 12px Inter, ui-sans-serif, system-ui, sans-serif; }
  .wallet-history .chart-grid { stroke: #cbd5d1; stroke-width: 1; }
  .wallet-history .chart-line-halo { stroke: #fff; stroke-width: 6; opacity: .9; }
  .wallet-history .chart-line { stroke-width: 3; }
  .wallet-history .chart-axis-title { fill: #334155; font-weight: 800; }
  .result-panel { margin-top: 12px; padding: clamp(10px, 2vw, 18px); }
  .winner-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .winner-card { border: 1px solid #dce5df; border-radius: 14px; background: #f8fbf9; padding: 10px; overflow: auto; }
  .result-points { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; }
  .result-points th, .result-points td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
  .party-player-name { display: inline-flex; align-items: center; gap: 7px; }
  .party-player-color { width: 9px; height: 9px; flex: 0 0 9px; border: 1px solid rgba(255,255,255,.9); border-radius: 50%; box-shadow: 0 0 0 1px rgba(31,54,42,.2); }
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
      height: max(420px, calc(100dvh - 190px));
      gap: 8px;
      border-width: 3px;
      border-radius: 34px;
      padding: 10px 14px;
    }
    .opponents-row,
    .poker-table.is-crowded .opponents-row {
      gap: 8px 6px;
    }
    /* At compact heights the normal oval proportions leave the hero row
       below the viewport. Use the same scale as the cards for these strips. */
    .poker-table .opponents-row {
      height: clamp(180px, calc(31vh * var(--table-scale, 1)), 280px);
    }
    .player-seat { padding: 4px !important; }
    .compact-card-row,
    .board-row { gap: 8px !important; }
    .opponent-card-frame {
      width: calc(48.024px * var(--table-scale, 1)) !important;
      height: calc(68.904px * var(--table-scale, 1)) !important;
    }
    .opponent-card { transform: scale(calc(.522 * var(--table-scale, 1))) !important; }
    .focal-card-frame {
      width: calc(58.696px * var(--table-scale, 1)) !important;
      height: calc(84.216px * var(--table-scale, 1)) !important;
    }
    .focal-card { transform: scale(calc(.638 * var(--table-scale, 1))) !important; }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .player-seat-wrap { width: calc(clamp(120px, 10vw, 132px) * var(--table-scale, 1)); }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .compact-card-row { gap: 1px !important; }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .opponent-card-frame {
      width: calc(30px * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(43.125px * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .opponent-card { transform: scale(calc(.326 * var(--card-table-scale, var(--table-scale, 1)))) !important; }
    .table-center,
    .poker-table.is-crowded .table-center {
      min-height: clamp(84px, calc(132px * var(--table-scale, 1)), 132px);
      border-radius: 20px;
      padding: 6px;
    }
    .hero-zone {
      grid-template-columns: minmax(190px, 1fr) max-content minmax(190px, 1fr);
      column-gap: 40px;
    }
    .combo-side { width: calc(170px * var(--table-scale, 1)); padding: 5px 4px; }
    .combo-side-title { margin-bottom: 4px; }
    .side-combo-cards { gap: 2px; }
    .side-combo-card {
      width: calc(30.36px * var(--table-scale, 1)) !important;
      height: calc(43.56px * var(--table-scale, 1)) !important;
    }
    .side-combo-card > div { transform: scale(calc(.33 * var(--table-scale, 1))) !important; }

    /* Keep the result card and board together, but lift the whole showdown
       group as the viewport gets shorter so the hero cards remain visible. */
    .poker-table.is-showdown .table-showdown-center {
      transform: translateY(clamp(-72px, calc((100dvh - 900px) * .28), 0px));
    }
    .poker-table.is-showdown .showdown-status {
      transform: scale(var(--table-scale, 1));
      transform-origin: center center;
    }
  }
  @media (min-width: 761px) and (max-height: 760px) {
    .poker-table,
    .poker-table.is-crowded {
      height: clamp(420px, calc(100dvh - 190px), 560px);
    }
  }
    /* The opponent row is a measured strip: each hand owns one equal
       horizontal slot. The card mode is selected from that slot's actual
       width, rather than from hard-coded seat positions. */
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"], [data-opponent-count="6"],
      [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) {
      display: grid !important;
      grid-template-columns: repeat(var(--opponent-count, 1), minmax(0, 1fr));
      height: max-content !important;
      min-height: 0 !important;
      align-items: start;
      gap: 8px;
    }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="1"] { --opponent-count: 1; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="2"] { --opponent-count: 2; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] { --opponent-count: 3; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] { --opponent-count: 4; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] { --opponent-count: 5; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="6"] { --opponent-count: 6; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="7"] { --opponent-count: 7; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="8"] { --opponent-count: 8; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] { --opponent-count: 9; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) {
      height: clamp(240px, 31vh, 300px) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"], [data-opponent-count="6"],
      [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap {
      position: static !important;
      width: 100% !important;
      transform: none !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone {
      container: opponent-zone / inline-size;
      width: 100% !important;
      max-width: 100%;
    }
    .poker-table:not(.is-showdown) .opponent-hand-content {
      width: 100% !important;
      max-width: 100%;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .compact-card-row {
      width: 100% !important;
      justify-content: center;
      gap: 4px !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone {
      --opponent-card-scale: clamp(.24, calc((100cqw - 28px) / 276), .40);
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .compact-card-row {
      display: grid !important;
      grid-template-columns: repeat(3, max-content);
      justify-content: center;
      align-items: start;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .opponent-card-frame:last-child {
      grid-column: 2;
    }
    @container opponent-zone (min-width: 220px) {
      .opponent-hand-zone {
        --opponent-card-scale: clamp(.40, calc((100cqw - 16px) / 368), .64);
      }
      .opponent-hand-zone .compact-card-row {
        display: flex !important;
        flex-wrap: nowrap !important;
      }
      .opponent-hand-zone .opponent-card-frame:last-child {
        grid-column: auto;
      }
    }

    /* Fixed viewport fallback for browsers that do not resolve a query
       against a grid item container: five or fewer desktop slots are wide
       enough for a readable four-card row. */
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone {
      --opponent-card-scale: .50;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone .opponent-card-frame:last-child {
      grid-column: auto;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: -22px !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform-origin: 50% 88%;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone [data-hand-card-index="0"] .opponent-card {
      transform: translateY(8px) rotate(-12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone [data-hand-card-index="1"] .opponent-card {
      transform: translateY(1px) rotate(-4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone [data-hand-card-index="2"] .opponent-card {
      transform: translateY(1px) rotate(4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone [data-hand-card-index="3"] .opponent-card {
      transform: translateY(8px) rotate(12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }

    /* Final mode contract: narrow slots are a straight row; wide slots are
       the oval hand. The status bubble is out of flow in both modes. */
    .poker-table:not(.is-showdown) .opponent-hand-zone {
      position: relative;
      --opponent-card-scale: clamp(.22, calc((100cqw - 12px) / 368), .40);
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble {
      position: absolute;
      top: 28px;
      left: 50% !important;
      margin: 0;
      transform: translateX(-50%) !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
      gap: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    @container opponent-zone (min-width: 220px) {
      .opponent-hand-zone {
        --opponent-card-scale: clamp(.40, calc((100cqw - 16px) / 368), .64);
      }
      .opponent-hand-zone [data-hand-card-index="0"] .opponent-card {
        transform: translateY(8px) rotate(-12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
      .opponent-hand-zone [data-hand-card-index="1"] .opponent-card {
        transform: translateY(1px) rotate(-4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
      .opponent-hand-zone [data-hand-card-index="2"] .opponent-card {
        transform: translateY(1px) rotate(4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
      .opponent-hand-zone [data-hand-card-index="3"] .opponent-card {
        transform: translateY(8px) rotate(12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone [data-hand-card-index="0"] .opponent-card {
      transform: translateY(8px) rotate(-12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone [data-hand-card-index="1"] .opponent-card {
      transform: translateY(1px) rotate(-4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone [data-hand-card-index="2"] .opponent-card {
      transform: translateY(1px) rotate(4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone [data-hand-card-index="3"] .opponent-card {
      transform: translateY(8px) rotate(12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
  }

  @media (max-width: 760px) {
    .poker-page { padding: 6px; padding-bottom: 8px; }
    .view-tabs { margin-inline: 10px; }
    .view-tab { min-height: 36px; padding: 7px 13px; }
    .game-tile { border-radius: 22px; padding: 5px; }
    /* Keep the complete statistics card inside narrow browser windows. CSS
       zoom scales typography, spacing, borders and the chart together while
       leaving the intentionally wide metrics table horizontally scrollable. */
    .stats-tile {
      zoom: clamp(.72, calc(100vw / 900), 1);
      border-radius: 18px;
      padding: 10px;
    }
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

    /* Save room on phones while retaining the winner meaning in the title. */
    .winner-badge-label {
      width: 18px !important;
      min-width: 18px !important;
      height: 18px !important;
      min-height: 18px !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      font-size: 0 !important;
      line-height: 1 !important;
    }
    .winner-badge-label::before {
      display: block;
      font-size: 18px;
      line-height: 1;
      content: '★';
    }
    .winner-badge-label.high { color: #dc2626 !important; }
    .winner-badge-label.low { color: #2563eb !important; }
    .desktop-turn-status { display: none; }
    .mobile-combination-guide {
      display: grid;
      gap: 8px;
      margin: 8px 2px 0;
      padding: 10px;
      border: 1px solid #cbded4;
      border-radius: 14px;
      background: #f7fbf8;
      color: #163c2c;
    }
    #root .poker-page .wireframe-actions-zone .mobile-combination-guide { display: grid !important; }
    .mobile-combination-guide-heading { display: flex; align-items: center; gap: 9px; }
    .mobile-combination-guide-heading > div { display: grid; gap: 1px; }
    .mobile-combination-guide-heading small { color: #59756a; font-size: 11px; }
    .mobile-combination-guide-icon {
      display: grid;
      flex: 0 0 28px;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #d9eee3;
      color: #176044;
      font-size: 16px;
      font-weight: 900;
    }
    .mobile-combination-guide-footer { margin: 0; color: #365b4d; font-size: 11px; line-height: 1.35; }
    .mobile-combination-guide-columns { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; }
    .mobile-combination-guide-card {
      display: grid;
      gap: 4px;
      padding: 8px 9px;
      border: 1px solid #d9e4de;
      border-radius: 10px;
      background: #fff;
    }
    .mobile-combination-guide-card.high { border-left: 4px solid #d97706; }
    .mobile-combination-guide-card.low { border-left: 4px solid #0f766e; }
    .mobile-combination-guide-card-title { display: flex; align-items: center; gap: 6px; font-size: 10px; line-height: 1.2; }
    .mobile-combination-guide-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: #d97706; }
    .mobile-combination-guide-card.low .mobile-combination-guide-dot { background: #0f766e; }
    .mobile-combination-guide-card ol { display: grid; gap: 2px; margin: 0; padding-left: 20px; color: #25493b; font-size: 11px; line-height: 1.25; }
    .mobile-combination-guide-card p { margin: 1px 0 0; color: #60796e; font-size: 10px; line-height: 1.25; }
    .mobile-combination-guide-footer { color: #176044; font-weight: 800; }
    #root .poker-page .wireframe-table {
      height: clamp(390px, calc(100dvh - 350px), 424px) !important;
      max-height: clamp(390px, calc(100dvh - 350px), 424px) !important;
    }
  }
  @media (min-width: 761px) and (max-width: 820px) {
    .hero-zone {
      grid-template-columns: minmax(150px, 1fr) max-content minmax(150px, 1fr);
      column-gap: 12px;
    }
    .hero-zone .compact-card-row { gap: 4px; }
    .hero-zone .focal-card-frame {
      width: calc(54.004px * var(--table-scale, 1));
      height: calc(77.484px * var(--table-scale, 1));
    }
    .hero-zone .focal-card { transform: scale(calc(.587 * var(--table-scale, 1))); }
  }
  @media (min-width: 1100px) and (min-height: 700px) {
    .hero-zone .compact-card-row { gap: 10px !important; }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .player-seat-wrap {
      width: min(calc(clamp(144px, 11vw, 160px) * var(--table-scale, 1)), 10vw);
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .compact-card-row {
      --opponent-card-overlap: 4px;
      gap: 0 !important;
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .opponent-card-frame + .opponent-card-frame {
      margin-left: calc(-1 * var(--opponent-card-overlap));
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .opponent-card-frame {
      width: calc(34px * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(48.75px * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .opponent-card { transform: scale(calc(.37 * var(--card-table-scale, var(--table-scale, 1)))) !important; }
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
  @media (pointer: coarse) and (orientation: portrait) and (max-width: 760px) {
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
      width: calc(33.12px * var(--table-scale, 1));
      height: calc(47.52px * var(--table-scale, 1));
    }
    .opponents-row .opponent-card { transform: scale(calc(.36 * var(--table-scale, 1))) !important; }
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
    .opponents-row .opponent-card-frame + .opponent-card-frame { margin-left: calc(-21px * var(--table-scale, 1)); }
    .opponents-row .seat-action-bubble {
      right: auto !important;
      bottom: auto !important;
      max-width: 92px;
      transform: none !important;
      overflow: hidden;
      padding: 4px 7px;
      font-size: 11px !important;
      text-overflow: ellipsis;
    }
    .hero-seat .seat-action-bubble {
      top: -24px !important;
      right: auto !important;
      bottom: auto !important;
      left: 50% !important;
      transform: translateX(-50%);
    }
    .opponents-row .seat-action-tail,
    .hero-seat .seat-action-tail {
      display: none;
    }
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
    .poker-table.is-showdown .opponents-row [data-testid^="player-result-"] {
      display: grid !important;
      width: min(104px, calc(100vw - 24px));
      gap: 1px;
      font-size: 10px;
    }
    .showdown-status {
      width: min(246px, calc(100vw - 44px));
      box-sizing: border-box;
    }
    .showdown-extra-result,
    .showdown-personal-pots,
    .showdown-winners {
      display: none !important;
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
      width: calc(33.12px * var(--table-scale, 1));
      height: calc(47.52px * var(--table-scale, 1));
    }
    .table-center .focal-card { transform: scale(calc(.36 * var(--table-scale, 1))) !important; }
    .hero-zone {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-areas:
        "hero hero"
        "high low";
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
      width: calc(20.24px * var(--table-scale, 1)) !important;
      height: calc(29.04px * var(--table-scale, 1)) !important;
    }
    .side-combo-card > div { transform: scale(calc(.22 * var(--table-scale, 1))) !important; }
    .hero-seat .focal-card-frame {
      width: calc(40.48px * var(--table-scale, 1));
      height: calc(58.08px * var(--table-scale, 1));
    }
    .hero-seat .focal-card { transform: scale(calc(.44 * var(--table-scale, 1))) !important; }
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
    .pot-popover {
      position: fixed;
      right: max(8px, env(safe-area-inset-right));
      bottom: calc(146px + max(8px, env(safe-area-inset-bottom)));
      left: max(8px, env(safe-area-inset-left));
      width: auto;
      min-width: 0;
      max-width: none;
      max-height: calc(100dvh - 190px);
      overflow: auto;
    }
  }

  /* Canonical card layout: two modes, one scalable card configuration. */
  @media (min-width: 761px) {
    .poker-table {
      --opponent-card-scale: .64;
      --opponent-card-overlap: 18px;
      --focal-card-scale: .68;
      --focal-card-overlap: 5px;
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) {
      --opponent-card-scale: .46;
      --opponent-card-overlap: 30px;
    }
    .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .compact-card-row {
      --opponent-card-overlap: 30px;
    }
    .opponents-row .compact-card-row,
    .hero-seat .compact-card-row {
      gap: 0 !important;
    }
    .opponents-row .opponent-card-frame {
      width: calc(92px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(132px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .opponents-row .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .hero-seat .focal-card-frame {
      width: calc(92px * var(--focal-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(132px * var(--focal-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .hero-seat .focal-card {
      transform: scale(calc(var(--focal-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .opponents-row .opponent-card-frame + .opponent-card-frame {
      margin-left: calc(-1 * var(--opponent-card-overlap));
    }
    .hero-seat .focal-card-frame + .focal-card-frame {
      margin-left: calc(-1 * var(--focal-card-overlap));
    }

    /* During showdown all four opponent cards must remain readable. The
       compact deal mode is intentionally tighter, but cannot be used after
       the opponents' cards are revealed. */
    .poker-table.is-showdown .opponents-row {
      --opponent-card-scale: .48;
      --opponent-card-overlap: 4px;
    }
    .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) {
      --opponent-card-scale: .30;
      --opponent-card-overlap: 4px;
    }
    .poker-table.is-showdown .opponents-row .compact-card-row {
      --opponent-card-overlap: 4px;
    }
    .poker-table.is-showdown .opponents-row .opponent-card-frame {
      width: calc(92px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(132px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .poker-table.is-showdown .opponents-row .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table.is-showdown .opponents-row .opponent-card-frame + .opponent-card-frame {
      margin-left: calc(-1 * var(--opponent-card-overlap)) !important;
    }

    /* Before showdown, use the available table width instead of hiding the
       four hole cards in compact mode. Five or fewer opponents get one readable row;
       crowded tables get a small 2x2 grid. */
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"],
      [data-opponent-count="5"]
    ) {
      --opponent-card-scale: .50;
      --opponent-card-overlap: 0px;
      height: 220px;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"],
      [data-opponent-count="5"]
    ) .player-seat-wrap {
      width: 220px;
    }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="1"] .player-seat-wrap:nth-child(1) { top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="2"] .player-seat-wrap { top: 24px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1),
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3) { top: 48px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(1) { left: 8%; top: 88px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(2) { left: 29%; top: 24px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(4) { left: 71%; top: 24px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(5) { left: 92%; top: 88px; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"],
      [data-opponent-count="5"]
    ) .compact-card-row {
      gap: 4px !important;
      width: 100% !important;
      justify-content: center;
      flex-wrap: nowrap !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"],
      [data-opponent-count="5"]
    ) .opponent-hand-content {
      width: 100% !important;
      max-width: 100%;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"],
      [data-opponent-count="5"]
    ) .opponent-card-frame {
      width: calc(92px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(132px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"],
      [data-opponent-count="5"]
    ) .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"],
      [data-opponent-count="5"]
    ) .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone .seat-topline .seat-name-score {
      font-size: 10px !important;
    }
    .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone .seat-action-bubble {
      font-size: 10px !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .compact-card-row {
      flex-wrap: wrap !important;
      width: 100%;
      gap: 4px !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .opponent-hand-content {
      width: 100% !important;
      max-width: 100%;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    /* Final desktop hand contract: a narrow slot is a straight row; a wide
       slot is an oval hand. The bubble is always out of flow. */
    .poker-table:not(.is-showdown) .opponent-hand-zone {
      position: relative;
      --opponent-card-scale: clamp(.22, calc((100cqw - 12px) / 368), .40);
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble {
      position: absolute;
      top: 28px;
      left: 50% !important;
      margin: 0;
      transform: translateX(-50%) !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
      gap: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    @container opponent-zone (min-width: 220px) {
      .opponent-hand-zone {
        --opponent-card-scale: clamp(.40, calc((100cqw - 16px) / 368), .64);
      }
      .opponent-hand-zone [data-hand-card-index="0"] .opponent-card {
        transform: translateY(8px) rotate(-12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
      .opponent-hand-zone [data-hand-card-index="1"] .opponent-card {
        transform: translateY(1px) rotate(-4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
      .opponent-hand-zone [data-hand-card-index="2"] .opponent-card {
        transform: translateY(1px) rotate(4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
      .opponent-hand-zone [data-hand-card-index="3"] .opponent-card {
        transform: translateY(8px) rotate(12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
    }
  }

  @media (max-width: 760px) {
    .poker-table {
      --opponent-card-scale: .46;
      --opponent-card-overlap: 30px;
      --focal-card-scale: .44;
      --focal-card-overlap: 4px;
    }
    .hero-zone {
      grid-template-columns: 1fr 1fr;
      grid-template-areas:
        "high low"
        "hero hero";
      column-gap: 8px;
      row-gap: 8px;
      align-items: center;
    }
    .combo-side.high,
    .combo-side.low { justify-self: center; }
    .table-showdown-center,
    .poker-table.is-oval .table-showdown-center {
      display: grid;
      justify-items: center;
      gap: 8px;
    }
    .table-showdown,
    .poker-table.is-oval .table-showdown {
      position: relative !important;
      left: auto !important;
      bottom: auto !important;
      width: auto;
      max-width: 100%;
      z-index: 2;
      transform: translateY(12px) !important;
    }
    .showdown-status {
      width: min(204px, calc(100vw - 32px)) !important;
      min-width: 0 !important;
      padding: 6px 10px !important;
      gap: 3px !important;
    }
    .showdown-status > strong { font-size: 18px !important; }
    .showdown-status > div {
      gap: 6px !important;
      font-size: 10px !important;
    }
    .showdown-status .showdown-winners {
      display: none !important;
    }
    .showdown-status .showdown-new-deal .action-button.primary {
      min-height: 24px;
      padding: 2px 10px;
      font-size: 11px;
    }
    .opponents-row .compact-card-row,
    .hero-seat .compact-card-row {
      gap: 0 !important;
    }
    .opponents-row .opponent-card-frame {
      width: calc(92px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(132px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .opponents-row .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .hero-seat .focal-card-frame {
      width: calc(92px * var(--focal-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(132px * var(--focal-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .hero-seat .focal-card {
      transform: scale(calc(var(--focal-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .opponents-row .opponent-card-frame + .opponent-card-frame {
      margin-left: calc(-30px * var(--card-table-scale, var(--table-scale, 1)));
    }
    .hero-seat .focal-card-frame + .focal-card-frame {
      margin-left: calc(-1 * var(--focal-card-overlap));
    }

    .poker-table.is-showdown .opponents-row {
      --opponent-card-scale: .40;
      --opponent-card-overlap: 20px;
    }
    .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) {
      --opponent-card-scale: .30;
      --opponent-card-overlap: 18px;
    }
    .poker-table.is-showdown .opponents-row .compact-card-row {
      --opponent-card-overlap: 20px;
    }
    .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"],
      [data-opponent-count="7"],
      [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .compact-card-row {
      --opponent-card-overlap: 18px;
    }
    .poker-table.is-showdown .opponents-row .opponent-card-frame {
      width: calc(92px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(132px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .poker-table.is-showdown .opponents-row .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table.is-showdown .opponents-row .opponent-card-frame + .opponent-card-frame {
      margin-left: calc(-1 * var(--opponent-card-overlap)) !important;
    }

    /* Before showdown every opponent gets a compact 2x2 card grid. The
       debug frame is the complete readable zone, so neighboring zones must
       have a physical gap even on a narrow phone viewport. */
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"]
    ) {
      --opponent-card-scale: .32;
      --opponent-card-overlap: 0px;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"]
    ) .player-seat-wrap {
      width: 86px !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"]
    ) .opponent-hand-content {
      width: 100% !important;
      max-width: 100%;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"]
    ) .compact-card-row {
      width: 100% !important;
      justify-content: center;
      flex-wrap: wrap !important;
      gap: 4px !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"]
    ) .opponent-card-frame {
      width: calc(92px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(132px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"]
    ) .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"]
    ) .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"]
    ) {
      position: relative !important;
      display: block !important;
      height: 132px;
      padding: 0 !important;
    }
    .opponents-row:is(
      [data-opponent-count="1"],
      [data-opponent-count="2"],
      [data-opponent-count="3"],
      [data-opponent-count="4"]
    ) .player-seat-wrap {
      position: absolute !important;
      flex: none;
      width: 104px;
      transform: translateX(-50%) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(1) { left: 27%; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(2) { left: 73%; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1) { left: 14%; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(2) { left: 50%; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3) { left: 86%; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1) { left: 10%; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(2) { left: 37%; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(3) { left: 63%; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4) { left: 90%; }
    .opponents-row[data-opponent-count="1"] .player-seat-wrap:nth-child(1) { left: 50%; top: 0; }
    .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(1) { left: 32%; top: 24px; }
    .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(2) { left: 68%; top: 24px; }
    .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1) { left: 20%; top: 46px; }
    .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(2) { left: 50%; top: 0; }
    .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3) { left: 80%; top: 46px; }
    .opponents-row[data-opponent-count="4"] .player-seat-wrap { width: calc((100% - 6px) / 4); }
    .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1) { left: 12.5%; top: 56px; }
    .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(2) { left: 37.5%; top: 18px; }
    .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(3) { left: 62.5%; top: 18px; }
    .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4) { left: 87.5%; top: 56px; }
    .table-center.has-showdown {
      position: relative;
      display: block !important;
      min-height: 142px;
    }
    .table-center.has-showdown .table-showdown-center,
    .poker-table.is-oval .table-center.has-showdown .table-showdown-center {
      position: absolute;
      inset: 0;
      display: flex !important;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      gap: 4px;
      box-sizing: border-box;
      padding: 4px 42px;
    }
    .table-center.has-showdown .table-showdown,
    .poker-table.is-oval .table-center.has-showdown .table-showdown {
      position: static !important;
      width: auto;
      max-width: 100%;
      transform: none !important;
    }
    .table-center.has-showdown .table-board {
      position: static;
      width: auto;
      min-width: 0 !important;
    }
    .table-center.has-showdown .table-board .board-row {
      min-width: 0 !important;
      min-height: 48px !important;
      align-items: flex-start;
    }
    .table-center.has-showdown .table-board .focal-card-frame {
      width: calc(58.696px * var(--table-scale, 1)) !important;
      height: calc(84.216px * var(--table-scale, 1)) !important;
    }
    .table-center.has-showdown .table-board .focal-card {
      transform: scale(calc(.638 * var(--table-scale, 1))) !important;
    }
    .table-center.has-showdown .table-pot {
      position: absolute;
      top: 50%;
      right: 6px;
      z-index: 4;
      transform: translateY(-50%);
    }

    /* Mobile uses the same equal-slot rule; only the card mode changes when
       the slot falls below the 220px row threshold. */
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"],
      [data-opponent-count="3"], [data-opponent-count="4"]
    ) {
      display: grid !important;
      grid-template-columns: repeat(var(--opponent-count, 1), minmax(0, 1fr));
      height: max-content !important;
      min-height: 0 !important;
      gap: 4px !important;
      align-items: start;
    }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="1"] { --opponent-count: 1; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="2"] { --opponent-count: 2; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] { --opponent-count: 3; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] { --opponent-count: 4; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"],
      [data-opponent-count="3"], [data-opponent-count="4"]
    ) .player-seat-wrap {
      position: static !important;
      width: 100% !important;
      transform: none !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"],
      [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone {
      container: opponent-zone / inline-size;
      width: 100% !important;
      max-width: 100%;
      --opponent-card-scale: clamp(.24, calc((100cqw - 20px) / 276), .40);
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"],
      [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-content {
      width: 100% !important;
      max-width: 100%;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"],
      [data-opponent-count="3"], [data-opponent-count="4"]
    ) .compact-card-row {
      display: grid !important;
      grid-template-columns: repeat(3, max-content);
      justify-content: center;
      align-items: start;
      width: 100% !important;
      gap: 4px !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"],
      [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-card-frame:last-child { grid-column: 2; }
    @container opponent-zone (min-width: 220px) {
      .opponent-hand-zone {
        --opponent-card-scale: clamp(.40, calc((100cqw - 16px) / 368), .64);
      }
      .opponent-hand-zone .compact-card-row {
        display: flex !important;
        flex-wrap: nowrap !important;
      }
      .opponent-hand-zone .opponent-card-frame:last-child { grid-column: auto; }
    }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="1"] .opponent-hand-zone {
      --opponent-card-scale: .50;
    }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="1"] .opponent-hand-zone .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
    }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="1"] .opponent-card-frame:last-child {
      grid-column: auto;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone {
      --opponent-card-scale: .42;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
      justify-content: center !important;
      gap: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone .opponent-card-frame:last-child {
      grid-column: auto !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: -22px !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform-origin: 50% 88%;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone [data-hand-card-index="0"] .opponent-card {
      transform: translateY(7px) rotate(-12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone [data-hand-card-index="1"] .opponent-card {
      transform: translateY(1px) rotate(-4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone [data-hand-card-index="2"] .opponent-card {
      transform: translateY(1px) rotate(4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone [data-hand-card-index="3"] .opponent-card {
      transform: translateY(7px) rotate(12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone {
      position: relative;
      --opponent-card-scale: clamp(.22, calc((100cqw - 12px) / 368), .40);
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble {
      position: absolute;
      top: 28px;
      left: 50% !important;
      margin: 0;
      transform: translateX(-50%) !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
      gap: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    @container opponent-zone (min-width: 220px) {
      .opponent-hand-zone {
        --opponent-card-scale: clamp(.40, calc((100cqw - 16px) / 368), .64);
      }
      .opponent-hand-zone [data-hand-card-index="0"] .opponent-card {
        transform: translateY(7px) rotate(-12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
      .opponent-hand-zone [data-hand-card-index="1"] .opponent-card {
        transform: translateY(1px) rotate(-4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
      .opponent-hand-zone [data-hand-card-index="2"] .opponent-card {
        transform: translateY(1px) rotate(4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
      .opponent-hand-zone [data-hand-card-index="3"] .opponent-card {
        transform: translateY(7px) rotate(12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      }
    }
  }

  /* Final specificity overrides for the two card modes. */
  @media (min-width: 761px) {
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone [data-hand-card-index="0"] .opponent-card { transform: translateY(8px) rotate(-12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone [data-hand-card-index="1"] .opponent-card { transform: translateY(1px) rotate(-4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone [data-hand-card-index="2"] .opponent-card { transform: translateY(1px) rotate(4deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"]
    ) .opponent-hand-zone [data-hand-card-index="3"] .opponent-card { transform: translateY(8px) rotate(12deg) scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important; }
  }
  @media (max-width: 760px) {
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone {
      --opponent-card-scale: .20 !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
  }
  @media (min-width: 761px) {
    /* Closed hands use the same oval table seating as revealed hands. */
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"], [data-opponent-count="6"],
      [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) {
      display: block !important;
      position: relative !important;
      height: clamp(240px, 31vh, 300px) !important;
      padding: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"],
      [data-opponent-count="4"], [data-opponent-count="5"], [data-opponent-count="6"],
      [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap {
      position: absolute !important;
      width: 220px !important;
      transform: translateX(-50%) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap { width: 90px !important; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone {
      /* Four cards should use a readable desktop size instead of collapsing
         to the tiny .18 fallback that made ten-player tables unreadable. */
      --opponent-card-scale: clamp(.28, calc(100vw / 5000px), .36) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="1"] .player-seat-wrap:nth-child(1) { left: 50%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(1) { left: 32%; top: 46px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(2) { left: 68%; top: 46px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1) { left: 20%; top: 78px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(2) { left: 50%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3) { left: 80%; top: 78px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1) { left: 13%; top: 112px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(2) { left: 38%; top: 28px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(3) { left: 62%; top: 28px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4) { left: 87%; top: 112px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(1) { left: 10%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(2) { left: 30%; top: 48px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(3) { left: 50%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(4) { left: 70%; top: 48px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(5) { left: 90%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(1) { left: 8%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(2) { left: 25%; top: 70px; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(3) { left: 40%; top: 16px; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(4) { left: 60%; top: 16px; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(5) { left: 75%; top: 70px; }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"], [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(6) { left: 92%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(7) { left: 92%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(1) { left: 8%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(2) { left: 22%; top: 72px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(3) { left: 36%; top: 20px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(4) { left: 50%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(5) { left: 64%; top: 20px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(6) { left: 78%; top: 72px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(7) { left: 81%; top: 72px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(8) { left: 93%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(1) { left: 7%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(2) { left: 19%; top: 72px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(3) { left: 31%; top: 20px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(4) { left: 43%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(5) { left: 57%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(6) { left: 69%; top: 20px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(7) { left: 72%; top: 20px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(8) { left: 83%; top: 72px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(9) { left: 94%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(1) { left: 6%; top: 142px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(2) { left: 17%; top: 72px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(3) { left: 28%; top: 20px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(4) { left: 39%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(5) { left: 50%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(6) { left: 61%; top: 0; }
    .poker-table:not(.is-showdown) .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
  }
  @media (max-width: 760px) {
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) {
      display: block !important;
      position: relative !important;
      height: 132px !important;
      padding: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponents-row:is(
      [data-opponent-count="1"], [data-opponent-count="2"], [data-opponent-count="3"], [data-opponent-count="4"]
    ) .player-seat-wrap {
      position: absolute !important;
      width: 104px !important;
      transform: translateX(-50%) !important;
    }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="1"] .player-seat-wrap:nth-child(1) { left: 50%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(1) { left: 32%; top: 24px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(2) { left: 68%; top: 24px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1) { left: 20%; top: 46px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(2) { left: 50%; top: 0; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3) { left: 80%; top: 46px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1) { left: 12.5%; top: 56px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(2) { left: 37.5%; top: 18px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(3) { left: 62.5%; top: 18px; }
    .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4) { left: 87.5%; top: 56px; }
    .poker-table:not(.is-showdown) .opponent-hand-zone .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
      gap: 0 !important;
    }
    .poker-table:not(.is-showdown) .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform: scale(.20) !important;
    }
  }
  @media (min-width: 761px) {
    .poker-table:not(.is-showdown) .opponent-hand-zone [data-hand-card-index] {
      animation: none !important;
      transform: none !important;
      rotate: none !important;
    }
    #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
      rotate: none !important;
    }
  }
  @media (max-width: 760px) {
    .poker-table:not(.is-showdown) .opponent-hand-zone [data-hand-card-index] {
      animation: none !important;
      transform: none !important;
      rotate: none !important;
    }
    #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform: scale(.20) !important;
      rotate: none !important;
    }
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble.is-folded-action {
    left: 50% !important;
    right: auto !important;
    top: 6px !important;
    width: calc(50% - 9px) !important;
    box-sizing: border-box;
    text-align: center;
    margin: 0 !important;
    transform: none !important;
    z-index: 20;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble:not(.is-folded-action) {
    left: 50% !important;
    right: auto !important;
    top: 6px !important;
    width: calc(50% - 9px) !important;
    box-sizing: border-box;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    margin: 0 !important;
    transform: none !important;
    z-index: 20;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-topline {
    position: relative;
    width: 100%;
    min-width: 0;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-topline .seat-name-score {
    width: calc(50% - 9px) !important;
    max-width: calc(50% - 9px) !important;
    margin-right: auto !important;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-inline-positions {
    position: absolute;
    right: 0;
    top: -13px;
    z-index: 22;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone.is-thinking .seat-action-bubble {
    display: none !important;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone.is-thinking .seat-topline .seat-name-score {
    border: 2px solid #facc15 !important;
    box-shadow: 0 0 0 2px rgba(250, 204, 21, .35), 0 2px 8px rgba(250, 204, 21, .45);
    animation: thinking-name-pulse 1.15s ease-in-out infinite;
  }
  #root .poker-table .player-meta.is-thinking .player-name {
    display: inline-block;
    border: 2px solid #facc15;
    border-radius: 999px;
    padding: 4px 8px;
    box-sizing: border-box;
    animation: thinking-name-pulse 1.15s ease-in-out infinite;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone,
  #root .poker-table.is-showdown .opponent-hand-zone {
    --opponent-ui-scale: clamp(.55, calc(var(--opponent-card-scale) / .50), 1);
  }
  #root .poker-table .opponent-hand-zone .seat-topline .seat-name-score {
    font-size: calc(12px * var(--opponent-ui-scale)) !important;
    padding: calc(4px * var(--opponent-ui-scale)) calc(8px * var(--opponent-ui-scale)) !important;
    gap: calc(6px * var(--opponent-ui-scale));
  }
  #root .poker-table .opponent-hand-zone .seat-action-bubble {
    font-size: calc(10px * var(--opponent-ui-scale)) !important;
    padding: calc(5px * var(--opponent-ui-scale)) calc(9px * var(--opponent-ui-scale)) !important;
  }
  #root .poker-table .opponent-hand-zone .seat-inline-positions {
    gap: calc(3px * var(--opponent-ui-scale));
  }
  #root .poker-table .opponent-hand-zone .position-badge {
    font-size: calc(11px * var(--opponent-ui-scale)) !important;
    padding: calc(3px * var(--opponent-ui-scale)) calc(8px * var(--opponent-ui-scale)) !important;
    border-width: max(1px, calc(2px * var(--opponent-ui-scale)));
  }
  #root .poker-table .hero-seat .coin-stack {
    transform: scale(var(--hero-ui-scale, 1));
    transform-origin: center bottom;
  }
  #root .poker-table .hero-seat .player-name {
    font-size: calc(12px * var(--hero-ui-scale, 1)) !important;
  }
  #root .poker-table .opponents-row .opponent-hand-zone {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
  }
  @media (min-width: 761px) {
    /* A hand zone owns the full horizontal slot, not just the card width. */
    #root .poker-table .opponents-row[data-opponent-count="1"] .player-seat-wrap { width: calc(100% / 1 - 2px) !important; }
    #root .poker-table .opponents-row[data-opponent-count="2"] .player-seat-wrap { width: calc(100% / 2 - 2px) !important; }
    #root .poker-table .opponents-row[data-opponent-count="3"] .player-seat-wrap { width: calc(100% / 3 - 2px) !important; }
    #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap { width: calc(100% / 4 - 2px) !important; }
    #root .poker-table .opponents-row[data-opponent-count="5"] .player-seat-wrap { width: calc(100% / 5 - 2px) !important; }
    #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap { width: calc(100% / 6 - 2px) !important; }
    #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap { width: calc(100% / 7 - 2px) !important; }
    #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap { width: calc(100% / 8 - 2px) !important; }
    #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap { width: calc(100% / 9 - 2px) !important; }
  }
  @media (max-width: 760px) {
    #root .poker-table .opponents-row[data-opponent-count="1"] .player-seat-wrap { width: 100% !important; }
    #root .poker-table .opponents-row[data-opponent-count="2"] .player-seat-wrap { width: calc(100% / 2) !important; }
    #root .poker-table .opponents-row[data-opponent-count="3"] .player-seat-wrap { width: calc(100% / 3) !important; }
    #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap { width: calc(100% / 4) !important; }
  }
  @media (min-width: 761px) {
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="1"] .player-seat-wrap { width: calc(100% / 1 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="2"] .player-seat-wrap { width: calc(100% / 2 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="3"] .player-seat-wrap { width: calc(100% / 3 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="4"] .player-seat-wrap { width: calc(100% / 4 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="5"] .player-seat-wrap { width: calc(100% / 5 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="6"] .player-seat-wrap { width: calc(100% / 6 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="7"] .player-seat-wrap { width: calc(100% / 7 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap { width: calc(100% / 8 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap { width: calc(100% / 9 - 2px) !important; }
    /* Reveal adds the combination below the hand, but must not change the
       card geometry. Keep the same non-overlapping row as the closed hand. */
    #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-card-frame,
    #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
      transform: none !important;
      rotate: none !important;
    }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    #root .poker-table .opponents-row .opponent-hand-zone .compact-card-row {
      position: absolute !important;
      left: 50% !important;
      top: 35px !important;
      width: calc(368px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)) + 12px) !important;
      transform: translateX(-50%) !important;
      gap: 4px !important;
      justify-content: space-between !important;
    }
    #root .poker-table.is-showdown .opponents-row .opponent-hand-zone {
      position: relative !important;
      min-height: 400px !important;
      height: auto !important;
    }
    #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-hand-content [data-testid^="player-result-"],
    #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-hand-content:has([data-testid^="winner-"]) > div:has(> [data-testid^="winner-"]) {
      position: absolute !important;
      top: calc(35px + 132px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)) + 5px) !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
      overflow-wrap: anywhere;
    }
    #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone .compact-card-row {
      position: relative !important;
      left: auto !important;
      top: auto !important;
      transform: none !important;
      width: calc(368px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)) + 12px) !important;
      justify-content: space-between !important;
    }
    #root .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .opponent-hand-zone .compact-card-row {
      position: absolute !important;
      left: 50% !important;
      top: 35px !important;
      transform: translateX(-50%) !important;
    }
    #root .poker-table:not(.is-showdown) .opponents-row[data-opponent-count="9"] .opponent-hand-zone {
      position: relative !important;
      min-height: 400px !important;
    }
  }
  @media (min-width: 761px) {
    #root .poker-table .hero-seat { --hero-ui-scale: clamp(.70, calc(var(--focal-card-scale) / .68), 1); }
  }
  @media (max-width: 760px) {
    #root .poker-table .hero-seat { --hero-ui-scale: clamp(.65, calc(var(--focal-card-scale, .44) / .68), 1); }
  }
  @media (min-width: 761px) {
    /* Reveal is additive: keep the pre-showdown arc and card row geometry. */
    #root .poker-table.is-showdown .opponents-row {
      display: block !important;
      position: relative !important;
      height: clamp(240px, 31vh, 300px) !important;
      padding: 0 !important;
    }
    #root .poker-table.is-showdown .opponents-row .player-seat-wrap {
      position: absolute !important;
      width: 220px !important;
      transform: translateX(-50%) !important;
    }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap {
      width: 90px !important;
    }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone {
      --opponent-card-scale: clamp(.28, calc(100vw / 5000px), .36) !important;
    }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="1"] .player-seat-wrap:nth-child(1) { left: 50%; top: 0; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(1) { left: 32%; top: 46px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(2) { left: 68%; top: 46px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1) { left: 20%; top: 78px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(2) { left: 50%; top: 0; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3) { left: 80%; top: 78px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1) { left: 13%; top: 112px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(2) { left: 38%; top: 28px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(3) { left: 62%; top: 28px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4) { left: 87%; top: 112px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(1) { left: 10%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(2) { left: 30%; top: 48px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(3) { left: 50%; top: 0; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(4) { left: 70%; top: 48px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(5) { left: 90%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(1) { left: 8%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(2) { left: 25%; top: 70px; }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(3) { left: 40%; top: 16px; }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(4) { left: 60%; top: 16px; }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(5) { left: 75%; top: 70px; }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .player-seat-wrap:nth-child(6) { left: 92%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(7) { left: 92%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(1) { left: 8%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(2) { left: 22%; top: 72px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(3) { left: 36%; top: 20px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(4) { left: 50%; top: 0; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(5) { left: 64%; top: 20px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(6) { left: 78%; top: 72px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(7) { left: 81%; top: 72px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(8) { left: 93%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(1) { left: 7%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(2) { left: 19%; top: 72px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(3) { left: 31%; top: 20px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(4) { left: 43%; top: 0; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(5) { left: 57%; top: 0; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(6) { left: 69%; top: 20px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(7) { left: 72%; top: 20px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(8) { left: 83%; top: 72px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(9) { left: 94%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(1) { left: 6%; top: 142px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(2) { left: 17%; top: 72px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(3) { left: 28%; top: 20px; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(4) { left: 39%; top: 0; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(5) { left: 50%; top: 0; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(6) { left: 61%; top: 0; }
    #root .poker-table.is-showdown .opponent-hand-zone .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
      gap: 0 !important;
    }
    #root .poker-table.is-showdown .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="6"], [data-opponent-count="7"],
      [data-opponent-count="8"], [data-opponent-count="9"]
    ) .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
    }
    #root .poker-table.is-showdown .opponent-hand-zone [data-hand-card-index] .opponent-card {
      transform: scale(calc(var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1)))) !important;
    }
    #root .poker-table.is-showdown .opponent-hand-zone .opponent-hand-content {
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    #root .poker-table.is-showdown .opponent-hand-zone {
      padding-bottom: 100px !important;
    }
    #root .poker-table.is-showdown .opponent-hand-zone .opponent-hand-content [data-testid^="player-result-"] {
      position: absolute !important;
      top: calc(100% + 5px);
      left: 0;
      width: 100%;
      margin: 0 !important;
    }
    #root .poker-table.is-showdown .opponent-hand-zone .opponent-hand-content:has([data-testid^="winner-"]) > div:has(> [data-testid^="winner-"]) {
      position: absolute !important;
      top: calc(100% + 5px);
      left: 0;
      width: 100%;
      margin: 0 !important;
    }
    #root .poker-table:not(.is-showdown) .opponent-hand-zone .opponent-card-frame,
    #root .poker-table.is-showdown .opponent-hand-zone .opponent-card-frame {
      width: calc(92px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
      height: calc(132px * var(--opponent-card-scale) * var(--card-table-scale, var(--table-scale, 1))) !important;
    }
  }
  /* The round result is anchored to the table-center, so viewport changes do
     not make it jump between the left, right, and board areas. */
  #root .poker-table .table-center.has-showdown .table-showdown-center,
  #root .poker-table.is-oval .table-center.has-showdown .table-showdown-center {
    position: absolute !important;
    inset: 0 !important;
    grid-area: auto !important;
    display: flex !important;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    z-index: 20;
    pointer-events: none;
  }
  #root .poker-table .table-center.has-showdown .table-showdown,
  #root .poker-table.is-oval .table-center.has-showdown .table-showdown {
    position: static !important;
    left: auto !important;
    bottom: auto !important;
    transform: none !important;
    width: min(560px, calc(100% - 24px));
    max-width: calc(100% - 24px);
    pointer-events: auto;
  }
  #root .poker-table .table-center.has-showdown .table-board {
    position: relative;
    top: 16px;
  }
  #root .poker-table .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(1) { left: 25% !important; }
  #root .poker-table .opponents-row[data-opponent-count="2"] .player-seat-wrap:nth-child(2) { left: 75% !important; }
  #root .poker-table .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1) { left: 16.6667% !important; }
  #root .poker-table .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(2) { left: 50% !important; }
  #root .poker-table .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3) { left: 83.3333% !important; }
  #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1) { left: 12.5% !important; }
  #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(2) { left: 37.5% !important; }
  #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(3) { left: 62.5% !important; }
  #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4) { left: 87.5% !important; }
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(1) { left: 8.3333% !important; }
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(2) { left: 25% !important; }
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(3) { left: 41.6667% !important; }
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(4) { left: 58.3333% !important; }
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(5) { left: 75% !important; }
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(6) { left: 91.6667% !important; }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(1) { left: 7.1429% !important; }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(2) { left: 21.4286% !important; }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(3) { left: 35.7143% !important; }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(4) { left: 50% !important; }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(5) { left: 64.2857% !important; }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(6) { left: 78.5714% !important; }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(7) { left: 92.8571% !important; }
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(1) { left: 6.25% !important; }
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(2) { left: 18.75% !important; }
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(3) { left: 31.25% !important; }
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(4) { left: 43.75% !important; }
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(5) { left: 56.25% !important; }
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(6) { left: 68.75% !important; }
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(7) { left: 81.25% !important; }
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(8) { left: 93.75% !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(1) { left: 5.5556% !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(2) { left: 16.6667% !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(3) { left: 27.7778% !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(4) { left: 38.8889% !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(5) { left: 50% !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(6) { left: 61.1111% !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(7) { left: 72.2222% !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(8) { left: 83.3333% !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(9) { left: 94.4444% !important; }
  @media (min-width: 761px) {
    #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone,
    #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone .opponent-hand-content {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
    #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone .opponent-card-frame,
    #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone .opponent-card-frame + .opponent-card-frame {
      margin-left: 0 !important;
      transform: none !important;
      rotate: none !important;
    }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="6"] .player-seat-wrap { width: calc(100% / 6 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="7"] .player-seat-wrap { width: calc(100% / 7 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="8"] .player-seat-wrap { width: calc(100% / 8 - 2px) !important; }
    #root .poker-table.is-showdown .opponents-row[data-opponent-count="9"] .player-seat-wrap { width: calc(100% / 9 - 2px) !important; }
  }
  #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone [data-hand-card-index] {
    animation: none !important;
    transform: none !important;
    rotate: none !important;
  }

  /* Keep every hand as a centered, self-sized row inside its seat zone. The
     old full-width/absolute overrides made the row depend on whichever later
     media rule happened to win the cascade. */
  #root .poker-table .opponent-hand-card-area {
    position: relative;
    display: flex;
    justify-content: center;
    width: fit-content;
    max-width: 100%;
    margin: 0 auto;
  }
  #root .poker-table .opponent-hand-card-area > .compact-card-row {
    position: relative !important;
    left: auto !important;
    top: auto !important;
    width: max-content !important;
    max-width: 100%;
    margin: 0 auto !important;
    transform: none !important;
    justify-content: flex-start !important;
  }
  #root .poker-table .opponent-hand-card-area .opponent-card-frame + .opponent-card-frame {
    margin-left: 0 !important;
  }
  #root .poker-table .seat-card-positions {
    position: absolute;
    right: -4px;
    bottom: -10px;
    z-index: 8;
    display: flex;
    align-items: center;
    gap: 3px;
    justify-content: flex-end;
    pointer-events: none;
  }
  #root .poker-table .seat-card-positions .position-badge {
    font-size: calc(11px * var(--opponent-ui-scale, 1));
    padding: calc(3px * var(--opponent-ui-scale, 1)) calc(8px * var(--opponent-ui-scale, 1));
  }
  #root .poker-table [data-testid^="player-result-"] {
    overflow-wrap: normal !important;
    word-break: normal !important;
  }
  #root .poker-table [data-testid^="player-result-"] > span {
    white-space: nowrap;
  }

  /* Opponent zones use a small fixed layout: name at top-left, status or
     winner labels at top-right, cards in the exact horizontal center, and
     the evaluated combination directly below the cards. */
  #root .poker-table .opponent-hand-zone .seat-topline {
    position: absolute !important;
    top: 6px !important;
    right: 6px !important;
    left: 6px !important;
    z-index: 22;
    display: block !important;
    width: auto !important;
    min-width: 0;
    margin: 0 !important;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-topline .seat-name-score,
  #root .poker-table.is-showdown .opponent-hand-zone .seat-topline .seat-name-score {
    position: absolute !important;
    top: 0 !important;
    right: 50% !important;
    left: auto !important;
    flex: none;
    width: fit-content !important;
    max-width: calc(50% - 4px) !important;
    margin: 0 !important;
    justify-self: end !important;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-topline-right,
  #root .poker-table.is-showdown .opponent-hand-zone .seat-topline-right {
    position: absolute;
    top: 0;
    left: 50%;
    right: 0;
    display: flex;
    flex: none;
    min-width: 0;
    justify-content: flex-start;
    align-items: flex-start;
    gap: 4px;
  }
  #root .poker-table .opponent-hand-zone .seat-result-badges {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 3px;
    max-width: 100%;
  }
  #root .poker-table .opponent-hand-zone .winner-badge {
    border: 1px solid rgba(255,255,255,.9);
    border-radius: 999px;
    color: #fff;
    padding: 2px 6px;
    font-size: 9px;
    font-weight: 950;
    line-height: 1;
    white-space: nowrap;
    box-shadow: 0 2px 7px rgba(0,0,0,.28);
  }
  #root .poker-table .opponent-hand-zone .winner-badge.high { background: #dc2626; }
  #root .poker-table .opponent-hand-zone .winner-badge.low { background: #2563eb; }
  .wireframe-opponent-hand .seat-result-badges {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: 4px;
  }
  .wireframe-opponent-hand .winner-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 16px;
    border: 1px solid rgba(255,255,255,.95);
    border-radius: 999px;
    color: #fff;
    padding: 2px 7px;
    font-size: 9px;
    font-weight: 950;
    letter-spacing: .04em;
    line-height: 1;
    white-space: nowrap;
    box-shadow: 0 2px 7px rgba(0,0,0,.3), inset 0 1px 0 rgba(255,255,255,.28);
  }
  .wireframe-opponent-hand .winner-badge.high { background: #dc2626; }
  .wireframe-opponent-hand .winner-badge.low { background: #2563eb; }
  .wireframe-hand-combination {
    width: fit-content;
    max-width: 100%;
    margin: 4px auto 0;
    padding: 3px 7px;
    border-radius: 7px;
    background: #fff;
    color: #0f172a;
    font-size: 11px;
    font-weight: 800;
    line-height: 1.15;
    text-align: center;
    white-space: nowrap;
    box-shadow: 0 2px 5px rgba(0,0,0,.16);
  }
  .wireframe-hand-combination span + span { display: block; margin-top: 2px; }
  #root .poker-table .opponent-hand-zone .seat-action-bubble,
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble.is-folded-action,
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble:not(.is-folded-action) {
    position: absolute !important;
    top: 6px !important;
    right: 6px !important;
    left: auto !important;
    width: fit-content !important;
    max-width: calc(50% - 8px) !important;
    box-sizing: border-box;
    margin: 0 !important;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: right;
    transform: none !important;
    z-index: 23;
  }
  #root .poker-table .opponent-hand-zone .seat-action-bubble,
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble.is-folded-action,
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble:not(.is-folded-action) {
    left: 50% !important;
    right: auto !important;
    text-align: left;
  }
  #root .poker-table .opponent-hand-zone.is-thinking .seat-action-bubble {
    display: block !important;
    visibility: visible !important;
  }
  #root .poker-table .opponent-hand-zone .seat-combination[data-testid^="player-result-"] {
    position: relative !important;
    inset: auto !important;
    width: fit-content !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin: 5px auto 0 !important;
    transform: none !important;
    overflow-wrap: normal !important;
    word-break: normal !important;
    text-align: center;
  }
  #root .poker-table .opponent-hand-zone .seat-betting-action {
    box-sizing: border-box;
    width: fit-content;
    max-width: 100%;
    min-height: 20px;
    margin: 5px auto 0;
    border: 1px solid rgba(167, 243, 208, .55);
    border-radius: 999px;
    background: rgba(6, 78, 59, .52);
    color: #ecfdf5;
    padding: 3px 10px;
    font-size: clamp(12px, 5cqw, 20px);
    font-weight: 950;
    letter-spacing: .06em;
    line-height: 1.1;
    text-align: center;
    white-space: nowrap;
  }
  #root .poker-table .opponent-hand-zone .seat-combination > span {
    white-space: normal;
    overflow-wrap: break-word;
    word-break: normal;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-topline .seat-name-score,
  #root .poker-table.is-showdown .opponent-hand-zone .seat-topline .seat-name-score {
    font-size: clamp(11px, 4cqw, 15px) !important;
    gap: 6px !important;
    padding: 4px 8px !important;
    left: 0 !important;
    right: auto !important;
    width: 80% !important;
    max-width: 80% !important;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-topline-right,
  #root .poker-table.is-showdown .opponent-hand-zone .seat-topline-right {
    left: 80% !important;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone .seat-action-bubble,
  #root .poker-table.is-showdown .opponent-hand-zone .seat-action-bubble {
    left: 80% !important;
    right: auto !important;
    max-width: calc(20% - 8px) !important;
  }
  @media (min-width: 761px) {
    #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-hand-content [data-testid^="player-result-"] {
      left: 50% !important;
      right: auto !important;
      width: fit-content !important;
      min-width: 104px;
      max-width: calc(100% - 8px) !important;
      transform: translateX(-50%) !important;
    }
  }
  #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-hand-content .seat-combination[data-testid^="player-result-"] {
    position: relative !important;
    inset: auto !important;
    left: auto !important;
    right: auto !important;
    top: auto !important;
    bottom: auto !important;
    width: fit-content !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin: 5px auto 0 !important;
    transform: none !important;
  }
  #root .poker-table .opponent-hand-zone .opponent-hand-content {
    container: opponent-zone / inline-size;
    box-sizing: border-box;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    padding-top: max(24px, calc(30px * var(--opponent-ui-scale, 1))) !important;
  }
  #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-hand-content {
    box-sizing: border-box !important;
    padding-top: max(24px, calc(30px * var(--opponent-ui-scale, 1))) !important;
  }
  /* The four opponent cards are the visual content of the slot: the row and
     its four frames must consume the complete horizontal zone. */
  #root .poker-table .opponents-row .opponent-hand-zone .opponent-hand-card-area,
  #root .poker-table .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
    width: 100% !important;
    max-width: 100% !important;
  }
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px !important;
  }
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card-frame {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 92 / 132;
  }
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card {
    width: 100% !important;
    height: 100% !important;
    transform: none !important;
  }
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card .card-rank {
    font-size: clamp(12px, calc(48px * var(--opponent-card-scale, 1) * var(--card-table-scale, var(--table-scale, 1))), 48px) !important;
  }
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card .card-suit {
    font-size: clamp(11px, calc(44px * var(--opponent-card-scale, 1) * var(--card-table-scale, var(--table-scale, 1))), 44px) !important;
  }
  #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
    gap: 4px !important;
  }
  #root .poker-table .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
    position: relative !important;
    left: auto !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100%;
    margin: 0 auto !important;
    transform: none !important;
    justify-content: flex-start !important;
  }
  #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
    position: relative !important;
    left: auto !important;
    top: auto !important;
    width: 100% !important;
    max-width: 100%;
    margin: 0 auto !important;
    transform: none !important;
    justify-content: flex-start !important;
    gap: 4px !important;
  }
  #root .poker-table:not(.is-showdown) .opponent-hand-zone.is-thinking .seat-action-bubble {
    display: block !important;
    visibility: visible !important;
  }
  @media (prefers-reduced-motion: reduce) {
    #root .poker-table .opponent-hand-zone.is-thinking .seat-topline .seat-name-score,
    #root .poker-table .player-meta.is-thinking .player-name {
      animation: none !important;
    }
  }
  /* Keep the final cascade contract explicit: the card row is the zone's
     full width, including after the older responsive rules above. */
  #root .poker-table .opponents-row .opponent-hand-zone .opponent-hand-card-area,
  #root .poker-table .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
    width: 100% !important;
    max-width: 100% !important;
  }
  #root .poker-table:not(.is-showdown) .opponents-row[data-opponent-count] .opponent-hand-zone .opponent-hand-card-area > .compact-card-row,
  #root .poker-table.is-showdown .opponents-row[data-opponent-count] .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 4px !important;
    justify-content: stretch !important;
  }
  #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card-frame,
  #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card-frame {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 92 / 132;
  }
  #root .poker-table:not(.is-showdown) .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card,
  #root .poker-table.is-showdown .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card {
    width: 100% !important;
    height: 100% !important;
    transform: none !important;
  }
  #root .poker-table:not(.is-showdown) .opponents-row[data-opponent-count] .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card-frame:last-child,
  #root .poker-table.is-showdown .opponents-row[data-opponent-count] .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card-frame:last-child {
    grid-column: auto !important;
  }
  /* Compact cards must remain a straight row at every slot width. The old
     fan/overlap rules made small cards look round and eventually collapsed
     them into capsules. */
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 4px !important;
    flex-wrap: nowrap !important;
    justify-content: stretch !important;
    align-items: start !important;
  }
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card-frame,
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card-frame + .opponent-card-frame {
    grid-column: auto !important;
    margin-left: 0 !important;
    transform: none !important;
    rotate: none !important;
  }
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card,
  #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row [data-testid="card-back"] {
    transform: none !important;
    rotate: none !important;
    border-radius: 10% !important;
    transform-origin: center center !important;
  }
  /* At the narrow desktop widths the oval's six-to-nine absolute seats leave
     each hand too little room for its labels and cards. Switch the opponent
     seats themselves to a real grid; the hand inside each seat stays linear. */
  @media (min-width: 761px) and (max-width: 1100px) {
    #root .poker-table .opponents-row:is(
      [data-opponent-count="5"], [data-opponent-count="6"],
      [data-opponent-count="7"], [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) {
      display: grid !important;
      position: relative !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      grid-auto-rows: minmax(80px, auto);
      height: auto !important;
      min-height: 0 !important;
      align-self: start !important;
      padding: 0 !important;
      gap: 14px 8px !important;
      align-items: start !important;
    }
    #root .poker-table .opponents-row[data-opponent-count="7"],
    #root .poker-table .opponents-row[data-opponent-count="8"] {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }
    #root .poker-table .opponents-row:is(
      [data-opponent-count="5"], [data-opponent-count="6"],
      [data-opponent-count="7"], [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .player-seat-wrap {
      position: static !important;
      width: 100% !important;
      min-width: 0 !important;
      align-self: start !important;
      margin: 0 !important;
      transform: none !important;
    }
    #root .poker-table.is-showdown .opponents-row:is(
      [data-opponent-count="5"], [data-opponent-count="6"],
      [data-opponent-count="7"], [data-opponent-count="8"],
      [data-opponent-count="9"]
    ) .player-seat-wrap {
      position: static !important;
      width: 100% !important;
      min-width: 0 !important;
      align-self: start !important;
      margin: 0 !important;
      transform: none !important;
    }
    #root .poker-table .opponents-row .opponent-hand-zone,
    #root .poker-table .opponents-row .opponent-hand-content {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
    }
    #root .poker-table .opponents-row .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
      margin-top: 2px !important;
      top: 2px !important;
      transform: translateY(2px) !important;
    }
  }
  .table-center.has-showdown .table-board .board-row { align-items: flex-start; }
  .table-center.has-showdown .table-board .focal-card-frame {
    width: calc(58.696px * var(--table-scale, 1)) !important;
    height: calc(84.216px * var(--table-scale, 1)) !important;
  }
  .table-center.has-showdown .table-board .focal-card {
    transform: scale(calc(.638 * var(--table-scale, 1))) !important;
  }
  .table-center.has-showdown .table-board {
    display: flex;
    align-items: flex-end;
  }

  /* Cycle 1A: the table layout is rectangular. Keep legacy seat selectors
     inert so old state classes cannot restore oval/crowded positioning. */
  #root .poker-table.is-oval,
  #root .poker-table.is-crowded {
    position: relative !important;
  }
  #root .poker-table.is-oval .opponents-row,
  #root .poker-table.is-crowded .opponents-row,
  #root .poker-table .opponents-row {
    position: static !important;
    height: auto !important;
    min-height: 0 !important;
    transform: none !important;
  }
  #root .poker-table .opponents-row .player-seat-wrap,
  #root .poker-table.is-oval .opponents-row .player-seat-wrap,
  #root .poker-table.is-crowded .opponents-row .player-seat-wrap,
  #root .poker-table .opponents-row .player-seat,
  #root .poker-table .opponents-row .opponent-hand-zone,
  #root .poker-table .opponents-row .opponent-hand-content {
    position: static !important;
    inset: auto !important;
    transform: none !important;
  }
  #root .poker-table.is-oval .table-showdown,
  #root .poker-table.is-oval .table-showdown-center,
  #root .poker-table.is-crowded .table-showdown,
  #root .poker-table.is-crowded .table-showdown-center {
    position: static !important;
    inset: auto !important;
    transform: none !important;
  }

  /* Round-table effect: lower opponent hands by 10% for each step away from
     the centre. With an even number of opponents the two centre hands stay
     level, so the falloff remains symmetrical on both sides. */
  #root .poker-table .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3),
  #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4),
  #root .poker-table .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(5),
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(6),
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(7),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(8),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(9) {
    transform: translateY(20%) !important;
  }
  #root .poker-table .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(2),
  #root .poker-table .opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(4),
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(2),
  #root .poker-table .opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(5),
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(2),
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(6),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(2),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(7),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(2),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(8) {
    transform: translateY(10%) !important;
  }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(3),
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(5),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(3),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(6),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(3),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(7) {
    transform: translateY(10%) !important;
  }
  /* Correct the accumulated distances for the larger tables. */
  #root .poker-table .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3),
  #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4) {
    transform: translateY(10%) !important;
  }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(7),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(8) {
    transform: translateY(30%) !important;
  }
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(2),
  #root .poker-table .opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(6),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(2),
  #root .poker-table .opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(7) {
    transform: translateY(20%) !important;
  }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(1),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(9) { transform: translateY(40%) !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(2),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(8) { transform: translateY(30%) !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(3),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(7) { transform: translateY(20%) !important; }
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(4),
  #root .poker-table .opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(6) { transform: translateY(10%) !important; }

  /* The live table uses the wireframe row class. */
  #root .poker-table .wireframe-opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(1),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="3"] .player-seat-wrap:nth-child(3),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(1),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="4"] .player-seat-wrap:nth-child(4) { transform: translateY(10%) !important; }
  #root .poker-table .wireframe-opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(1),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(5),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(1),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(6) { transform: translateY(20%) !important; }
  #root .poker-table .wireframe-opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(2),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="5"] .player-seat-wrap:nth-child(4),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(2),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="6"] .player-seat-wrap:nth-child(5) { transform: translateY(10%) !important; }
  #root .poker-table .wireframe-opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(1),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(7),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(1),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(8) { transform: translateY(30%) !important; }
  #root .poker-table .wireframe-opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(2),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(6),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(2),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(7) { transform: translateY(20%) !important; }
  #root .poker-table .wireframe-opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(3),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="7"] .player-seat-wrap:nth-child(5),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(3),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="8"] .player-seat-wrap:nth-child(6) { transform: translateY(10%) !important; }
  #root .poker-table .wireframe-opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(1),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(9) { transform: translateY(40%) !important; }
  #root .poker-table .wireframe-opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(2),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(8) { transform: translateY(30%) !important; }
  #root .poker-table .wireframe-opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(3),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(7) { transform: translateY(20%) !important; }
  #root .poker-table .wireframe-opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(4),
  #root .poker-table .wireframe-opponents-row[data-opponent-count="9"] .player-seat-wrap:nth-child(6) { transform: translateY(10%) !important; }

  /* WireframeTable splits the opponents into rows and wraps each hand in a
     slot, so target the actual live-table structure as well. */
  #root .wireframe-table .wireframe-opponents-row:has(> .wireframe-opponent-slot:nth-child(2)):not(:has(> .wireframe-opponent-slot:nth-child(3))) > .wireframe-opponent-slot { transform: translateY(0) !important; }
  #root .wireframe-table .wireframe-opponents-row:has(> .wireframe-opponent-slot:nth-child(3)):not(:has(> .wireframe-opponent-slot:nth-child(4))) > .wireframe-opponent-slot:nth-child(1),
  #root .wireframe-table .wireframe-opponents-row:has(> .wireframe-opponent-slot:nth-child(3)):not(:has(> .wireframe-opponent-slot:nth-child(4))) > .wireframe-opponent-slot:nth-child(3) { transform: translateY(10%) !important; }
  #root .wireframe-table .wireframe-opponents-row:has(> .wireframe-opponent-slot:nth-child(4)):not(:has(> .wireframe-opponent-slot:nth-child(5))) > .wireframe-opponent-slot:nth-child(1),
  #root .wireframe-table .wireframe-opponents-row:has(> .wireframe-opponent-slot:nth-child(4)):not(:has(> .wireframe-opponent-slot:nth-child(5))) > .wireframe-opponent-slot:nth-child(4) { transform: translateY(10%) !important; }
  #root .wireframe-table .wireframe-opponents-row:has(> .wireframe-opponent-slot:nth-child(6)):not(:has(> .wireframe-opponent-slot:nth-child(7))) > .wireframe-opponent-slot:nth-child(1),
  #root .wireframe-table .wireframe-opponents-row:has(> .wireframe-opponent-slot:nth-child(6)):not(:has(> .wireframe-opponent-slot:nth-child(7))) > .wireframe-opponent-slot:nth-child(6) { transform: translateY(20%) !important; }
  #root .wireframe-table .wireframe-opponents-row:has(> .wireframe-opponent-slot:nth-child(6)):not(:has(> .wireframe-opponent-slot:nth-child(7))) > .wireframe-opponent-slot:nth-child(2),
  #root .wireframe-table .wireframe-opponents-row:has(> .wireframe-opponent-slot:nth-child(6)):not(:has(> .wireframe-opponent-slot:nth-child(7))) > .wireframe-opponent-slot:nth-child(5) { transform: translateY(10%) !important; }

  /* Mobile opponent seating is a flat grid. Keep the legacy oval/fan rules
     above desktop-only and prevent their vertical offsets from leaking into
     narrow viewports. */
  @media (max-width: 760px) {
    #root .poker-table .opponents-row,
    #root .poker-table .wireframe-opponents-row {
      display: grid !important;
      position: static !important;
      grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)) !important;
      grid-auto-rows: auto !important;
      height: auto !important;
      min-height: 0 !important;
      padding: 0 !important;
      gap: 8px !important;
      align-items: start !important;
    }
    #root .poker-table .opponents-row .player-seat-wrap,
    #root .poker-table .wireframe-opponents-row .player-seat-wrap,
    #root .poker-table .wireframe-opponent-slot {
      position: static !important;
      inset: auto !important;
      width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
      align-self: start !important;
      transform: none !important;
    }
    #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row {
      position: static !important;
      top: auto !important;
      left: auto !important;
      margin: 0 !important;
      transform: none !important;
    }
    #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card-frame,
    #root .poker-table .opponent-hand-zone .opponent-hand-card-area > .compact-card-row .opponent-card {
      transform: none !important;
      rotate: none !important;
    }
  }

  /* Mobile opponent status contract: keep THINKING/SHUTDOWN/WAITING in the
     reserved strip below the name and above the cards. Desktop bubbles keep
     their existing positioning and sizing. */
  @media (max-width: 760px) {
    #root .poker-table .opponent-hand-zone .seat-action-bubble {
      top: 24px !important;
      left: 50% !important;
      right: auto !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: calc(100% - 8px) !important;
      box-sizing: border-box !important;
      padding: 3px 6px !important;
      border-radius: 999px !important;
      font-size: clamp(8px, 2.8cqw, 10px) !important;
      line-height: 1 !important;
      text-align: center !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      transform: translateX(-50%) !important;
    }

    /* Keep the combination plaques in the outer halves of the mobile row;
       centering them can make their inner edges touch the hero cards at 390px. */
    #root .poker-page .wireframe-table .wireframe-player-zone > aside.combo-side.high {
      transform: translateX(-8px) !important;
    }
    #root .poker-page .wireframe-table .wireframe-player-zone > aside.combo-side.low {
      transform: translateX(8px) !important;
    }

    /* Keep the mobile rank readable in the narrow outer hint column. */
    #root .poker-page .wireframe-table .wireframe-player-zone > aside.combo-side .combo-side-title {
      gap: 3px !important;
    }
    #root .poker-page .wireframe-table .wireframe-player-zone > aside.combo-side .combo-side-rank {
      font-size: 10px !important;
      letter-spacing: -.02em !important;
    }

    #root .poker-table .opponent-hand-zone .opponent-hand-content {
      padding-top: max(44px, calc(48px * var(--opponent-ui-scale, 1))) !important;
    }

    /* Final mobile-only contract for the wireframe table. */
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-board,
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-board .board-row {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      box-sizing: border-box !important;
    }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-board .board-row {
      display: flex !important;
      flex-wrap: nowrap !important;
      gap: 2px !important;
      overflow: hidden !important;
    }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-board .board-row > .focal-card-frame {
      flex: 0 0 calc((100% - 8px) / 5) !important;
      width: calc((100% - 8px) / 5) !important;
      min-width: 0 !important;
      height: auto !important;
      max-width: none !important;
      aspect-ratio: 92 / 132 !important;
      animation: none !important;
      transform: none !important;
      margin: 0 !important;
    }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-board .board-row > .focal-card-frame > .focal-card {
      width: 100% !important;
      height: 100% !important;
      transform: none !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot .compact-card-row {
      width: calc(100% - 8px) !important;
      margin-left: 4px !important;
      margin-right: 4px !important;
      overflow: hidden !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-thinking {
      max-width: calc(100% - 8px) !important;
      font-size: 10px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      box-sizing: border-box !important;
    }
    .wireframe-opponent-thinking {
      max-width: calc(100% - 8px) !important;
      width: calc(100% - 8px) !important;
      display: flex !important;
      font-size: 10px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      box-sizing: border-box !important;
    }
    #root .poker-page .wireframe-table .wireframe-hero-slot .wireframe-hand:not(.wireframe-opponent-hand) > .compact-card-row {
      display: grid !important;
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
      grid-auto-rows: auto !important;
      gap: 2px !important;
      width: calc(100% - 4px) !important;
      margin-inline: 2px !important;
      position: relative !important;
      left: 2.5px !important;
      /* Avoid a percentage-height sizing loop: frames derive height from
         their grid-column width and the 92 / 132 aspect ratio. */
      height: auto !important;
      min-height: 0 !important;
      align-content: center !important;
      overflow: hidden !important;
    }
    #root .poker-page .wireframe-table .wireframe-hero-slot .wireframe-hand:not(.wireframe-opponent-hand) > .compact-card-row > .focal-card-frame {
      width: auto !important;
      height: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      aspect-ratio: 92 / 132 !important;
      flex: none !important;
      transform: none !important;
      rotate: none !important;
      margin: 0 !important;
    }
    #root .poker-page .wireframe-table .wireframe-player-zone .wireframe-hero-slot .wireframe-hand:not(.wireframe-opponent-hand) > .compact-card-row > .focal-card-frame {
      flex: none !important;
      width: 100% !important;
      height: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      aspect-ratio: 92 / 132 !important;
      align-self: center !important;
      transform: none !important;
      rotate: none !important;
      margin: 0 !important;
    }

    /* The page-level mobile stylesheet is injected after wireframeTable.css;
       keep the street and pot in their dedicated top side slots here too. */
    #root .poker-page .wireframe-table .wireframe-flop-zone {
      height: clamp(112px, 15dvh, 124px) !important;
      overflow: visible !important;
    }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-stage {
      top: 4px !important;
      left: 8px !important;
      right: auto !important;
      transform: none !important;
      max-width: calc(50% - 10px) !important;
      z-index: 2 !important;
    }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-pot {
      top: 4px !important;
      left: auto !important;
      right: 8px !important;
      max-width: calc(50% - 10px) !important;
      transform: none !important;
      z-index: 2 !important;
    }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-board {
      top: calc(50% + 20px) !important;
    }

    /* Match the reference hand treatment on phones: four readable, evenly
       spaced cards followed by one quiet combination plaque. */
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .compact-card-row {
      display: flex !important;
      flex-wrap: nowrap !important;
      gap: 2px !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      justify-content: center !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .compact-card-row > .opponent-card-frame {
      flex: 0 1 calc((100% - 6px) / 4) !important;
      width: calc((100% - 6px) / 4) !important;
      max-width: calc((100% - 6px) / 4) !important;
      min-width: 0 !important;
      height: auto !important;
      aspect-ratio: 92 / 132 !important;
      margin: 0 !important;
      overflow: hidden !important;
      border-radius: 7px !important;
      box-shadow: 0 2px 5px rgba(3,25,18,.28), 0 1px 1px rgba(255,255,255,.75) inset !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .compact-card-row > .opponent-card-frame > .opponent-card {
      filter: saturate(1.08) contrast(1.04) !important;
    }

    /* Keep the opponent identity readable on narrow phones. The old fixed
       percentage width caused names such as Maria to become "M..." even
       though the seat still had enough visual space. Let the plaque size to
       its content and allow it to sit above the neighbouring card gap. */
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .seat-topline {
      overflow: visible !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .seat-topline > .seat-name-score {
      width: max-content !important;
      max-width: none !important;
      min-width: max-content !important;
      justify-self: center !important;
      overflow: visible !important;
      text-overflow: clip !important;
      white-space: nowrap !important;
      font-size: clamp(10px, 2.8vw, 14px) !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .seat-topline > .seat-name-score > span:first-child {
      min-width: max-content !important;
      max-width: none !important;
      overflow: visible !important;
      text-overflow: clip !important;
      flex: 0 0 auto !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .seat-topline > .seat-name-score > strong {
      flex: 0 0 auto !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .wireframe-hand-combination {
      top: auto !important;
      bottom: 0 !important;
      max-width: calc(100% - 4px) !important;
      padding: 3px 6px !important;
      border: 1px solid rgba(15,23,42,.1) !important;
      border-radius: 999px !important;
      background: rgba(255,255,255,.94) !important;
      color: #0f172a !important;
      font-size: 9px !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      box-shadow: 0 2px 5px rgba(0,0,0,.16) !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .wireframe-hand-combination span + span {
      display: inline !important;
      margin-left: 4px !important;
      margin-top: 0 !important;
    }

    /* On mobile the cards themselves are the High/Low legend. */
    #root .poker-page .wireframe-table .combo-side,
    #root .poker-page .wireframe-table .wireframe-hand-combination {
      display: none !important;
    }
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high {
      border: 2px solid #dc2626 !important;
      border-radius: 7px !important;
      box-sizing: border-box !important;
      box-shadow: 0 0 0 1px rgba(255,255,255,.9), 0 0 7px rgba(220,38,38,.55) !important;
    }
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-low {
      border: 2px solid #2563eb !important;
      border-radius: 7px !important;
      box-sizing: border-box !important;
      box-shadow: 0 0 0 1px rgba(255,255,255,.9), 0 0 7px rgba(37,99,235,.55) !important;
    }
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high.combo-card-low {
      border-color: #dc2626 !important;
      box-shadow: 0 0 0 2px #2563eb, 0 0 7px rgba(220,38,38,.55) !important;
    }
    #root .poker-page .wireframe-table .table-board .combo-card-high {
      border: 3px solid #dc2626 !important;
      border-radius: 10px !important;
      box-shadow: 0 0 0 1px rgba(255,255,255,.9), 0 0 9px rgba(220,38,38,.62) !important;
    }
    #root .poker-page .wireframe-table .table-board .combo-card-low {
      border: 3px solid #2563eb !important;
      border-radius: 10px !important;
      box-shadow: 0 0 0 1px rgba(255,255,255,.9), 0 0 9px rgba(37,99,235,.62) !important;
    }
    #root .poker-page .wireframe-table .table-board .combo-card-high.combo-card-low {
      border-color: #dc2626 !important;
      border: 2px solid transparent !important;
      padding: 2px !important;
      background: linear-gradient(#f8fafc, #f8fafc) padding-box,
        linear-gradient(90deg, #dc2626 0 50%, #2563eb 50% 100%) border-box !important;
      box-shadow: 0 0 7px rgba(37,99,235,.22), 0 0 7px rgba(220,38,38,.22) !important;
    }

    /* Reference-scale community cards: the flop must stay compact like the
       hero hand, while River still fits in one clean row. */
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-board .board-row > .focal-card-frame {
      flex: 0 0 clamp(44px, 12vw, 48px) !important;
      width: clamp(44px, 12vw, 48px) !important;
      max-width: clamp(44px, 12vw, 48px) !important;
      height: auto !important;
      aspect-ratio: 92 / 132 !important;
    }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-board .board-row {
      width: max-content !important;
      max-width: 100% !important;
      justify-content: center !important;
      margin-inline: auto !important;
    }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-board {
      left: 50% !important;
      right: auto !important;
      width: 100% !important;
      max-width: 100% !important;
      transform: translate(-50%, -50%) !important;
    }

    /* Bright reference-style cards for phones: clean face, strong contrast,
       and the rank/suit in a predictable top-left reading position. */
    #root .poker-page .wireframe-table .card-face {
      background: #f8fafc !important;
      border: 1px solid #cbd5e1 !important;
      box-shadow: 0 2px 5px rgba(15,23,42,.28) !important;
      color: #111827;
    }
    #root .poker-page .wireframe-table .card-face::before {
      display: none !important;
    }
    #root .poker-page .wireframe-table .card-face::after {
      box-shadow: none !important;
    }
    #root .poker-page .wireframe-table .card-face .card-rank {
      position: absolute !important;
      top: 5px !important;
      left: 6px !important;
      font-size: clamp(18px, 38cqw, 32px) !important;
      line-height: .95 !important;
      justify-self: auto !important;
    }
    #root .poker-page .wireframe-table .card-face .card-suit {
      position: absolute !important;
      top: 30px !important;
      left: 6px !important;
      font-size: clamp(16px, 31cqw, 27px) !important;
      line-height: .95 !important;
      justify-self: auto !important;
    }

    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high.combo-card-low,
    #root .poker-page .wireframe-table .table-board .combo-card-high.combo-card-low {
      border: 2px solid transparent !important;
      padding: 2px !important;
      background: linear-gradient(#f8fafc, #f8fafc) padding-box,
        linear-gradient(90deg, #dc2626 0 50%, #2563eb 50% 100%) border-box !important;
      box-shadow: 0 0 7px rgba(37,99,235,.22), 0 0 7px rgba(220,38,38,.22) !important;
    }

    /* Paint the outline on the card face itself. The outer frame has a
       different transformed box, which caused the previous halo/blue ears. */
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high,
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-low,
    #root .poker-page .wireframe-table .table-board .combo-card-high,
    #root .poker-page .wireframe-table .table-board .combo-card-low {
      border: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high > .card-face,
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-low > .card-face,
    #root .poker-page .wireframe-table .table-board .combo-card-high > .card-face,
    #root .poker-page .wireframe-table .table-board .combo-card-low > .card-face {
      border: 3px solid transparent !important;
      border-radius: 12px !important;
      box-sizing: border-box !important;
    }
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high > .card-face,
    #root .poker-page .wireframe-table .table-board .combo-card-high > .card-face {
      background: linear-gradient(#f8fafc, #f8fafc) padding-box, #dc2626 border-box !important;
      box-shadow: 0 0 6px rgba(220,38,38,.42) !important;
    }
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-low > .card-face,
    #root .poker-page .wireframe-table .table-board .combo-card-low > .card-face {
      background: linear-gradient(#f8fafc, #f8fafc) padding-box, #2563eb border-box !important;
      box-shadow: 0 0 6px rgba(37,99,235,.42) !important;
    }
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high.combo-card-low > .card-face,
    #root .poker-page .wireframe-table .table-board .combo-card-high.combo-card-low > .card-face {
      background: linear-gradient(#f8fafc, #f8fafc) padding-box,
        linear-gradient(90deg, #dc2626 0 50%, #2563eb 50% 100%) border-box !important;
      box-shadow: 0 0 6px rgba(220,38,38,.25), 0 0 6px rgba(37,99,235,.25) !important;
    }

    /* Opponent slots are narrow four-card cells; keep their outline inside
       the slot while the hero and board retain the stronger 3px outline. */
    #root .poker-page .wireframe-table .wireframe-opponent-hand .compact-card-row > .combo-card-high > .card-face,
    #root .poker-page .wireframe-table .wireframe-opponent-hand .compact-card-row > .combo-card-low > .card-face {
      border-width: 2px !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-hand .compact-card-row > .combo-card-high.combo-card-low > .card-face {
      border-width: 2px !important;
    }

    /* Mobile High is yellow; Low remains blue. */
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high > .card-face,
    #root .poker-page .wireframe-table .table-board .combo-card-high > .card-face {
      background: linear-gradient(#f8fafc, #f8fafc) padding-box, #facc15 border-box !important;
      box-shadow: 0 0 6px rgba(250,204,21,.48) !important;
    }
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high.combo-card-low > .card-face,
    #root .poker-page .wireframe-table .table-board .combo-card-high.combo-card-low > .card-face {
      background: linear-gradient(#f8fafc, #f8fafc) padding-box,
        linear-gradient(90deg, #facc15 0 50%, #2563eb 50% 100%) border-box !important;
      box-shadow: 0 0 6px rgba(250,204,21,.3), 0 0 6px rgba(37,99,235,.25) !important;
    }
    #root .poker-page .wireframe-table .winner-badge.high {
      background: #facc15 !important;
      border-color: #fef08a !important;
      color: #422006 !important;
    }

    /* Keep ALL IN out of the opponent cards; the centered desktop badge is
       too large for a narrow mobile opponent slot. */
    #root .poker-page .wireframe-table .wireframe-opponent-hand .wireframe-all-in-badge {
      top: auto !important;
      right: 2px !important;
      bottom: 2px !important;
      left: auto !important;
      transform: rotate(-7deg) scale(.55) !important;
      transform-origin: bottom right !important;
      padding: 3px 6px !important;
      font-size: 10px !important;
      z-index: 24 !important;
    }

    #root .poker-page .wireframe-table .is-showdown-result .winner-badge {
      display: none !important;
    }
    #root .poker-page .wireframe-table .showdown-net-badge {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-height: 16px !important;
      padding: 2px 6px !important;
      border: 1px solid rgba(255,255,255,.9) !important;
      border-radius: 999px !important;
      font-size: 10px !important;
      font-weight: 950 !important;
      line-height: 1 !important;
      white-space: nowrap !important;
      box-shadow: 0 2px 6px rgba(0,0,0,.24) !important;
    }
    #root .poker-page .wireframe-table .showdown-net-badge.is-positive {
      background: #16a34a !important;
      color: #fff !important;
    }
    #root .poker-page .wireframe-table .showdown-net-badge.is-negative {
      background: #dc2626 !important;
      color: #fff !important;
    }

    /* Three opponents still stay in one row, so make the symbols do more of
       the work inside each narrow card instead of enlarging the slot. */
    #root .poker-page .wireframe-table .wireframe-opponent-hand .card-face .card-rank {
      top: 2px !important;
      left: 4px !important;
      font-size: 14px !important;
      letter-spacing: -.08em !important;
      white-space: nowrap !important;
      transform: scaleX(.65) !important;
      transform-origin: left top !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-hand .card-face .card-suit {
      top: 16px !important;
      left: 4px !important;
      font-size: 9px !important;
      white-space: nowrap !important;
    }

    /* One mobile card typography for board and hole cards. */
    #root .poker-page .wireframe-table .card-face .card-rank,
    #root .poker-page .wireframe-table .card-face .card-suit {
      position: absolute !important;
      left: 6px !important;
      justify-self: auto !important;
      line-height: .95 !important;
    }
    #root .poker-page .wireframe-table .card-face .card-rank {
      top: 5px !important;
      font-size: 30px !important;
    }
    #root .poker-page .wireframe-table .card-face .card-suit {
      top: 30px !important;
      font-size: 27px !important;
    }

    /* The old winner outline wrapped the whole hand. On mobile only the
       individual card outline is used, so remove that legacy outer frame. */
    #root .poker-page .wireframe-table .compact-card-row.has-winner-border {
      border: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-high,
    #root .poker-page .wireframe-table .compact-card-row > .combo-card-low,
    #root .poker-page .wireframe-table .table-board .combo-card-high,
    #root .poker-page .wireframe-table .table-board .combo-card-low {
      border: 0 !important;
      outline: none !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    /* Some opponent/card layouts place the combo marker one level deeper;
       reset every marked outer frame so only .card-face paints the outline. */
    #root .poker-page .wireframe-table .combo-card-high,
    #root .poker-page .wireframe-table .combo-card-low {
      border: 0 !important;
      outline: none !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    #root .poker-page .wireframe-table .table-board > .board-row > .focal-card-frame.combo-card-high,
    #root .poker-page .wireframe-table .table-board > .board-row > .focal-card-frame.combo-card-low,
    #root .poker-page .wireframe-table .table-board > .board-row > .focal-card-frame.combo-card-high.combo-card-low {
      border: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .compact-card-row > .opponent-card-frame.combo-card-high,
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .compact-card-row > .opponent-card-frame.combo-card-low {
      border: 0 !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    /* In showdown the action slot is the result slot. Keep the hero's net
       result centered under its hand, where Check/Bet normally appears. */
    #root .poker-page .wireframe-table .wireframe-hand:not(.wireframe-opponent-hand) > .wireframe-opponent-footer {
      position: absolute !important;
      left: 50% !important;
      bottom: 0 !important;
      width: max-content !important;
      max-width: 100% !important;
      padding: 0 !important;
      transform: translateX(-50%) !important;
      justify-content: center !important;
      z-index: 12 !important;
    }

    /* The mobile pot is a single centered overlay in the flop zone. The
       board remains in its lower band, so neither the pot nor SHOWDOWN has to
       share the board's horizontal space. */
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-pot {
      top: calc(5px * var(--wireframe-scale, 1) - 8px) !important;
      left: 50% !important;
      right: auto !important;
      width: max-content !important;
      max-width: calc(100% - 16px) !important;
      transform: translateX(-50%) !important;
      z-index: 3 !important;
    }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-pot .pot-current-bet {
      display: none !important;
    }

    /* Pocket-card index: rank over suit in the protected upper-left 60% of
       each face. This replaces the old oversized central suit treatment. */
    #root .poker-page .wireframe-table .wireframe-hand .card-face--pocket {
      position: relative !important;
      display: block !important;
      align-content: initial !important;
      justify-items: initial !important;
    }
    #root .poker-page .wireframe-table .wireframe-hand .card-face--pocket .card-corner-index {
      position: absolute !important;
      top: 7% !important;
      left: 4% !important;
      z-index: 2 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: flex-start !important;
      width: 55% !important;
      max-width: 55% !important;
      gap: 2px !important;
      line-height: .88 !important;
      white-space: nowrap !important;
      pointer-events: none !important;
    }
    #root .poker-page .wireframe-table .wireframe-hand .card-face--pocket .card-corner-index .card-rank {
      position: static !important;
      width: 100% !important;
      overflow: hidden !important;
      font-size: clamp(12px, 40cqw, 34px) !important;
      line-height: .88 !important;
      letter-spacing: -.06em !important;
      text-align: left !important;
      white-space: nowrap !important;
    }
    #root .poker-page .wireframe-table .wireframe-hand .card-face--pocket .card-corner-index .card-rank--ten {
      font-size: clamp(10px, 25cqw, 21px) !important;
      letter-spacing: -.1em !important;
    }
    #root .poker-page .wireframe-table .wireframe-hand .card-face--pocket .card-corner-index .card-suit {
      position: static !important;
      font-size: clamp(11px, 38cqw, 30px) !important;
      line-height: .88 !important;
      text-align: left !important;
    }

    /* Four pocket cards always retain a 3px gap on the 320px layout. */
    #root .poker-page .wireframe-table .wireframe-hand > .compact-card-row {
      gap: 3px !important;
    }
    #root .poker-page .wireframe-table .wireframe-hand > .compact-card-row > .focal-card-frame,
    #root .poker-page .wireframe-table .wireframe-hand > .compact-card-row > .opponent-card-frame {
      flex: 0 1 calc((100% - 9px) / 4) !important;
      width: calc((100% - 9px) / 4) !important;
      max-width: calc((100% - 9px) / 4) !important;
      margin-left: 0 !important;
    }

    /* Page-level styles are injected after wireframeTable.css. Keep the
       mobile hero face aligned to its frame so rank and suit are both visible. */
    #root .poker-page .wireframe-hero-slot,
    #root .poker-page .wireframe-player-zone,
    #root .poker-page .wireframe-hero-slot .wireframe-hand:not(.wireframe-opponent-hand),
    #root .poker-page .wireframe-hero-slot .compact-card-row {
      overflow: visible !important;
    }
    #root .poker-page .wireframe-hero-slot,
    #root .poker-page .wireframe-player-zone,
    #root .poker-page .wireframe-hero-slot .wireframe-hand:not(.wireframe-opponent-hand),
    #root .poker-page .wireframe-hero-slot .compact-card-row {
      overflow-x: visible !important;
      overflow-y: visible !important;
    }
    #root .poker-page .wireframe-hero-slot .card-face--pocket {
      width: 100% !important;
      height: 100% !important;
      transform: none !important;
      box-sizing: border-box !important;
    }
    #root .poker-page .wireframe-hero-slot .card-face--pocket .card-corner-index {
      top: 14% !important;
      left: 8% !important;
      width: 82% !important;
      max-width: 82% !important;
      gap: 0 !important;
      overflow: visible !important;
    }
    #root .poker-page .wireframe-hero-slot .card-face--pocket .card-corner-index .card-rank,
    #root .poker-page .wireframe-hero-slot .card-face--pocket .card-corner-index .card-suit {
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
      line-height: .75 !important;
      white-space: nowrap !important;
    }
    #root .poker-page .wireframe-hero-slot .card-face--pocket .card-corner-index .card-rank {
      font-size: clamp(18px, 34cqw, 34px) !important;
    }
    #root .poker-page .wireframe-hero-slot .card-face--pocket .card-corner-index .card-suit {
      font-size: clamp(16px, 30cqw, 30px) !important;
    }
  }
  @media (max-width: 760px) and (max-height: 600px) {
    #root .poker-page .wireframe-table .wireframe-player-zone .wireframe-hero-slot,
    #root .poker-page .wireframe-table .wireframe-player-zone .wireframe-hero-slot .wireframe-hand,
    #root .poker-page .wireframe-table .wireframe-player-zone .wireframe-hero-slot .compact-card-row {
      overflow: visible !important;
      overflow-x: visible !important;
      overflow-y: visible !important;
    }
  }
  @media (max-width: 760px) {
    #root .poker-page .wireframe-table .wireframe-player-zone .wireframe-hero-slot,
    #root .poker-page .wireframe-table .wireframe-player-zone .wireframe-hero-slot .wireframe-hand,
    #root .poker-page .wireframe-table .wireframe-player-zone .wireframe-hero-slot .compact-card-row {
      overflow: visible !important;
      overflow-x: visible !important;
      overflow-y: visible !important;
    }
  }

  /* One mobile card face: every card uses the same rank/suit layout, while
     its frame and Card() scale determine the rendered size. */
  @media (max-width: 760px) {
    #root .poker-page .card-face,
    #root .poker-page .wireframe-table .wireframe-hand .card-face--pocket,
    #root .poker-page .wireframe-table .wireframe-hand .focal-card,
    #root .poker-page .wireframe-table .wireframe-opponent-hand .opponent-card {
      position: relative !important;
      display: grid !important;
      align-content: center !important;
      justify-items: center !important;
      container-type: normal !important;
    }
    #root .poker-page .wireframe-table .focal-card-frame,
    #root .poker-page .wireframe-table .opponent-card-frame {
      container-type: inline-size !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-hand .opponent-card {
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      transform: none !important;
      transform-origin: top left !important;
      box-sizing: border-box !important;
    }
    #root .poker-page .card-face .card-rank,
    #root .poker-page .wireframe-table .card-face .card-rank,
    #root .poker-page .wireframe-table .wireframe-hand .focal-card .card-rank,
    #root .poker-page .wireframe-table .wireframe-opponent-hand .opponent-card .card-rank {
      position: static !important;
      top: auto !important;
      left: auto !important;
      width: auto !important;
      max-width: 100% !important;
      overflow: visible !important;
      font-size: clamp(10px, 52cqw, 48px) !important;
      line-height: .9 !important;
      letter-spacing: -.04em !important;
      text-align: center !important;
      white-space: nowrap !important;
      transform: none !important;
    }
    #root .poker-page .card-face .card-suit,
    #root .poker-page .wireframe-table .card-face .card-suit,
    #root .poker-page .wireframe-table .wireframe-hand .focal-card .card-suit,
    #root .poker-page .wireframe-table .wireframe-opponent-hand .opponent-card .card-suit {
      position: static !important;
      top: auto !important;
      left: auto !important;
      width: auto !important;
      max-width: 80% !important;
      overflow: visible !important;
      font-size: clamp(9px, 48cqw, 44px) !important;
      line-height: .9 !important;
      text-align: center !important;
      white-space: nowrap !important;
      transform: none !important;
    }
    #root .poker-page .card-face .card-rank--ten,
    #root .poker-page .wireframe-table .card-face .card-rank--ten,
    #root .poker-page .wireframe-table .wireframe-hand .focal-card .card-rank--ten,
    #root .poker-page .wireframe-table .wireframe-opponent-hand .opponent-card .card-rank--ten {
      font-size: clamp(10px, 52cqw, 48px) !important;
      letter-spacing: -.1em !important;
      transform: scaleX(.72) !important;
      transform-origin: left top !important;
    }

    /* The marker belongs to the face, never to the transformed frame. */
    #root .poker-page .wireframe-table .compact-card-row > .focal-card-frame.combo-card-high,
    #root .poker-page .wireframe-table .compact-card-row > .focal-card-frame.combo-card-low,
    #root .poker-page .wireframe-table .compact-card-row > .opponent-card-frame.combo-card-high,
    #root .poker-page .wireframe-table .compact-card-row > .opponent-card-frame.combo-card-low,
    #root .poker-page .wireframe-table .table-board .focal-card-frame.combo-card-high,
    #root .poker-page .wireframe-table .table-board .focal-card-frame.combo-card-low {
      border: 0 !important;
      outline: none !important;
      padding: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
    }
  }
  @media (min-height: 601px) and (max-width: 760px) {
    #root .poker-page .wireframe-table .wireframe-hero-slot .wireframe-hand:not(.wireframe-opponent-hand) {
      transform: translateY(-13px) !important;
    }
  }

  /* A split mobile table uses the same physical seat width in every row.
     Keep the shorter row centered instead of letting the grid stretch it. */
  @media (max-width: 760px) {
    #root .poker-page .wireframe-table .wireframe-opponents-row {
      display: flex !important;
      width: auto !important;
      max-width: none !important;
      grid-template-columns: none !important;
      gap: var(--wireframe-opponent-row-gap) !important;
      margin-inline: auto !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot {
      flex: 0 0 var(--wireframe-opponent-slot-width) !important;
      width: var(--wireframe-opponent-slot-width) !important;
      min-width: var(--wireframe-opponent-slot-width) !important;
      max-width: var(--wireframe-opponent-slot-width) !important;
    }

    /* Two opponent rows need more felt height. Otherwise the fixed compact
       table ends before the hero row and the hand spills into the guide. */
    #root .poker-page .wireframe-table[data-row-count="2"] {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
  }

  /* The multi-row mobile table must still leave the complete game controls
     in the viewport. Compact only the reserved vertical bands; card widths
     and their aspect ratio remain unchanged. */
  @media (max-width: 760px) {
    #root .poker-page .wireframe-table[data-row-count="2"] .wireframe-opponent-slot {
      height: clamp(76px, 10dvh, 96px) !important;
    }
    #root .poker-page .wireframe-table[data-row-count="2"] .wireframe-results-zone {
      height: clamp(45px, 6dvh, 56px) !important;
    }
    #root .poker-page .wireframe-table[data-row-count="2"] .wireframe-flop-zone {
      height: clamp(80px, 11dvh, 100px) !important;
    }
    #root .poker-page .wireframe-table[data-row-count="2"] .wireframe-player-zone {
      height: clamp(132px, 17dvh, 160px) !important;
    }
  }

  /* On the short 568px profile remove only decorative bottom spacing. The
     table, guide and action controls already fit; this prevents page padding
     from creating a fake scrollbar. */
  @media (max-width: 760px) and (max-height: 600px) {
    #root .poker-page { padding-bottom: 0 !important; }
    #root .poker-page .game-tile { padding-bottom: 0 !important; }
    #root .poker-page .wireframe-table-stack { padding-bottom: 0 !important; }
  }

  /* At 360px wide the compact table ends immediately above the guide. Move
     the hero hand a few pixels up so its four cards cannot touch the guide. */
  @media (min-width: 360px) and (max-width: 360px) and (min-height: 601px) {
    #root .poker-page .wireframe-table .wireframe-hero-slot .wireframe-hand:not(.wireframe-opponent-hand) {
      transform: translateY(-20px) !important;
    }
  }

  /* Optional tabletop visual refresh. The class is only added when the
     design flag is enabled, so the current production skin stays intact. */
  .poker-page--new-design {
    --new-ink: #17352b;
    --new-muted: #6d7567;
    --new-felt: #073d2d;
    --new-felt-mid: #0b6545;
    --new-brass: #c89b45;
    --new-paper: #f7f0df;
    --new-paper-deep: #eee3ca;
    position: relative;
    isolation: isolate;
    color: var(--new-ink);
    background:
      radial-gradient(circle at 50% -10%, rgba(20, 119, 79, .48), transparent 44%),
      linear-gradient(135deg, var(--new-felt), #02291e 72%);
  }
  .poker-page--new-design::before {
    position: absolute;
    z-index: -1;
    inset: 8px;
    border: 1px solid rgba(200, 155, 69, .42);
    border-radius: 18px;
    box-shadow: inset 0 0 0 5px rgba(67, 39, 16, .25), inset 0 0 48px rgba(0, 0, 0, .2);
    content: "";
    pointer-events: none;
  }
  .poker-page--new-design .view-tabs { gap: 7px; margin-inline: 22px; }
  .poker-page--new-design .view-tab {
    border: 1px solid rgba(200, 155, 69, .55);
    border-bottom-color: rgba(200, 155, 69, .4);
    border-radius: 9px 9px 0 0;
    background: rgba(4, 49, 35, .82);
    color: #e8d5a7;
    letter-spacing: .08em;
    box-shadow: 0 -2px 8px rgba(0, 0, 0, .12);
  }
  .poker-page--new-design .view-tab.is-active {
    border-color: var(--new-brass);
    border-bottom-color: var(--new-paper);
    background: var(--new-paper);
    color: var(--new-ink);
  }
  .poker-page--new-design .stats-tile,
  .poker-page--new-design .about-panel {
    border: 8px solid #5b391e;
    border-radius: 18px;
    background: var(--new-paper);
    box-shadow: 0 16px 34px rgba(0, 0, 0, .26), inset 0 0 0 1px rgba(200, 155, 69, .7);
  }
  .poker-page--new-design .stats-tile { padding: clamp(12px, 2vw, 22px); }
  .poker-page--new-design .about-panel { gap: 18px; padding: clamp(20px, 4vw, 42px); }
  .poker-page--new-design .about-panel__title,
  .poker-page--new-design .statistics-dashboard h2,
  .poker-page--new-design .statistics-dashboard h3,
  .poker-page--new-design .about-panel__low h3 { color: var(--new-ink); }
  .poker-page--new-design .about-panel__title,
  .poker-page--new-design .statistics-dashboard h2 { letter-spacing: -.04em; }
  .poker-page--new-design .about-panel__copy,
  .poker-page--new-design .about-panel__low p,
  .poker-page--new-design .statistics-muted,
  .poker-page--new-design .statistics-meta { color: var(--new-muted); }
  .poker-page--new-design .about-panel__low {
    border: 1px solid rgba(200, 155, 69, .6);
    border-left: 5px solid var(--new-brass);
    border-radius: 10px;
    background: var(--new-paper-deep);
  }
  .poker-page--new-design .about-panel a { color: #08704f; font-weight: 700; }
  .poker-page--new-design .statistics-dashboard {
    padding: 0;
    background: transparent;
    color: var(--new-ink);
  }
  .poker-page--new-design .statistics-card {
    border: 1px solid rgba(123, 91, 42, .25);
    border-radius: 12px;
    background: rgba(255, 251, 239, .7);
    box-shadow: 0 4px 12px rgba(91, 57, 30, .08);
  }
  .poker-page--new-design .statistics-player,
  .poker-page--new-design .statistics-player:hover { background: transparent; }
  .poker-page--new-design .statistics-player[aria-pressed="true"] { background: #e8ddc2; border-left-color: var(--new-brass); }
  .poker-page--new-design .statistics-positive { color: #08704f; }
  .poker-page--new-design .statistics-negative { color: #a83c37; }
  .poker-page--new-design .statistics-badge { background: #e4d5ac; color: #634617; }
  .poker-page--new-design .statistics-meter > span { background: var(--new-felt-mid); }
  .poker-page--new-design .statistics-layout-switch button {
    border-color: rgba(200, 155, 69, .55);
    background: #eee3ca;
    color: var(--new-ink);
  }
  .poker-page--new-design .statistics-layout-switch button[aria-pressed="true"] { background: #d9c28d; border-color: var(--new-brass); color: #4f3516; }
  @media (max-width: 760px) {
    .poker-page--new-design::before { inset: 4px; }
    .poker-page--new-design .stats-tile,
    .poker-page--new-design .about-panel { border-width: 5px; }
  }
`;
