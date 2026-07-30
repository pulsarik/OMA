const COMPACT_CARD_SCALE = 0.72;
const OPPONENT_CARD_WIDTH = 92 * COMPACT_CARD_SCALE * 0.9;
const OPPONENT_CARD_HEIGHT = 132 * COMPACT_CARD_SCALE * 0.9;
const FOCAL_CARD_WIDTH = 92 * COMPACT_CARD_SCALE * 1.1;
const FOCAL_CARD_HEIGHT = 132 * COMPACT_CARD_SCALE * 1.1;

export const APP_SHELL_STYLES = `
  html, body, #root { min-height: 100%; }
  body { min-height: 100dvh; }
  .portrait-orientation-guard { display: none; }

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
      min-height: clamp(560px, calc(100vh - 150px), 750px);
      min-height: clamp(560px, calc(100dvh - 150px), 750px);
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
      gap: 8px;
      padding: 9px 6px;
    }
    .opponents-row,
    .poker-table.is-crowded .opponents-row { gap: 8px 4px; }
    .player-seat-wrap { flex-basis: min(288px, 100%); }
    .table-center,
    .poker-table.is-crowded .table-center { padding: 8px 5px; }
    .hero-zone {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas:
        "high"
        "low"
        "hero";
      width: 100%;
    }
    .combo-side {
      width: min(184px, 100%);
      justify-self: center;
    }
    .action-dock {
      gap: 7px;
      padding: 8px 6px;
    }
    .main-actions { width: 100%; }
    .main-actions .action-button { min-width: 0; padding-inline: 8px; }
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
