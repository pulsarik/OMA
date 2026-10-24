export const NARROW_TABLE_STYLES = `
  .compact-game-navigation, .compact-game-navigation-tabs { display: contents; }
  .compact-game-navigation-trigger { display: none; }

  /* Only the sub-320px window uses this layout. Larger phone and desktop
     layouts keep their existing dimensions and tab navigation. */
  @media (max-width: 319px) {
    #root .poker-page { padding: 4px 4px 0 !important; }
    #root .poker-page .game-tile { padding: 4px 4px 0 !important; }
    #root .poker-page .wireframe-table-stack { padding-bottom: 0 !important; }
    .compact-game-navigation { display: block; position: relative; z-index: 50; margin-bottom: 0; }
    .compact-game-navigation-trigger {
      display: flex; align-items: center; gap: 8px; min-height: 44px;
      padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 10px;
      background: #fff; color: #234336; font-weight: 800;
    }
    .compact-game-navigation-tabs { display: none; }
    .compact-game-navigation[data-open="true"] .compact-game-navigation-tabs {
      display: block; position: absolute; top: 100%; left: 0; right: 0;
      padding: 6px; border: 1px solid #cbd5e1; border-radius: 10px;
      background: #f7fbf8; box-shadow: 0 6px 18px #17203333;
    }
    #root .poker-page .view-tabs { margin: 0; display: grid; grid-template-columns: 1fr 1fr; }
    #root .poker-page .view-tab { min-height: 44px; padding: 6px; border-radius: 8px; }
    #root .poker-page .commentator-toolbar { position: absolute; top: 5px; right: 52px; padding: 0; margin: 0; }

    #root .poker-page .wireframe-table,
    #root .poker-page .wireframe-table[data-row-count="2"] {
      height: auto !important; max-height: none !important;
      grid-template-rows: auto auto auto; gap: 4px !important;
      padding: 4px !important;
    }
    #root .poker-page .wireframe-table .wireframe-results-zone { display: none; }
    #root .poker-page .wireframe-table .wireframe-opponents-zone { gap: 4px !important; }
    #root .poker-page .wireframe-table[data-row-count] .wireframe-opponent-slot {
      height: 50px !important; flex-basis: min(80px, var(--wireframe-opponent-slot-width)) !important;
      width: min(80px, var(--wireframe-opponent-slot-width)) !important;
      min-width: 0 !important; max-width: 80px !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand {
      grid-template-rows: 16px auto 1fr !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .compact-card-row > .opponent-card-frame {
      flex-basis: min(15px, calc((100% - 6px) / 4)) !important;
      max-width: 15px !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .seat-topline > .seat-name-score {
      width: 100% !important; max-width: 100% !important; min-width: 0 !important;
      min-height: 16px !important; height: 16px !important;
      padding: 2px !important; gap: 2px !important; font-size: 9px !important;
    }
    #root .poker-page .wireframe-table .wireframe-opponent-slot > .wireframe-opponent-hand > .seat-topline > .seat-name-score > span:first-child {
      min-width: 0 !important; overflow: hidden !important; text-overflow: ellipsis !important; flex: 1 1 auto !important;
    }
    #root .poker-page .wireframe-opponent-slot .seat-topline .showdown-net-badge {
      position: absolute; top: 38px; left: 50%; transform: translateX(-50%);
      font-size: 8px !important; min-height: 12px !important; padding: 1px 3px !important;
    }
    #root .poker-page .wireframe-table[data-row-count] .wireframe-flop-zone { height: 94px !important; }
    #root .poker-page .wireframe-table .wireframe-flop-zone > .table-pot { top: 0 !important; }
    #root .poker-page .wireframe-table[data-row-count] .wireframe-player-zone {
      display: flex !important; justify-content: center; height: 74px !important; gap: 0 !important;
    }
    #root .poker-page .wireframe-table .wireframe-player-zone > .wireframe-hero-slot {
      width: 160px !important; height: 74px !important; margin: 0 !important;
    }
    #root .poker-page .wireframe-table .wireframe-hero-slot .wireframe-hand:not(.wireframe-opponent-hand) {
      transform: none !important; height: 74px !important;
    }
    #root .poker-page .wireframe-table .wireframe-player-zone .wireframe-hero-slot
      .wireframe-hand:not(.wireframe-opponent-hand) > .compact-card-row {
      height: 50px !important; max-height: 50px !important; transform: none !important;
    }
    #root .poker-page .wireframe-table .wireframe-player-zone .wireframe-hero-slot
      .wireframe-hand:not(.wireframe-opponent-hand) > .compact-card-row > .focal-card-frame {
      flex: 0 0 34px !important; width: 34px !important; max-width: 34px !important;
      height: 49px !important; max-height: 49px !important;
    }
    #root .poker-page .wireframe-actions-zone .mobile-combination-guide {
      margin: 4px 0 0 !important; padding: 1px 4px !important;
    }
    #root .poker-page .wireframe-actions-zone > .action-dock {
      position: relative !important; padding: 4px !important; min-height: 0 !important; gap: 0 !important;
    }
    /* Pending commands already disable actions. Show their confirmation
       status over those controls without reserving an empty extra row. */
    #root .poker-page .action-dock-status {
      position: absolute; inset: 0; z-index: 2; padding: 8px;
      background: #f7fbf8f5; border-radius: inherit; pointer-events: none;
    }
    #root .poker-page .wireframe-actions-zone .action-dock-body {
      grid-template-columns: minmax(0, 1fr); gap: 4px;
    }
    #root .poker-page .wireframe-actions-zone > .turn-timer-badge {
      position: fixed !important; top: 12px !important; left: 106px !important;
      right: auto !important; bottom: auto !important; margin: 0 !important;
      transform: none !important; z-index: 40;
    }
    #root .poker-page .wireframe-actions-zone .bet-size-button,
    #root .poker-page .wireframe-actions-zone .main-actions .action-button {
      min-height: 38px !important; padding: 4px !important; font-size: 11px !important;
    }
    /* The result already highlights the winning cards on the table. Keep
       both combination names here while giving the next-deal button room. */
    #root .poker-page .wireframe-actions-zone:has(.mobile-result-dock) .mobile-combination-visual-cards,
    #root .poker-page .wireframe-actions-zone:has(.mobile-result-dock) .mobile-combination-visual-example small { display: none !important; }
    #root .poker-page .mobile-result-dock { padding: 4px !important; }
    #root .poker-page .mobile-result-dock > .showdown-status--mobile-actions { padding: 4px !important; gap: 4px !important; }
    #root .poker-page .mobile-result-dock .showdown-status--mobile-actions > strong { font-size: 14px !important; }
  }
`;
