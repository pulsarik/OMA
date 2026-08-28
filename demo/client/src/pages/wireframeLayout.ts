export const WIREFRAME_LAYOUT = {
  opponent: { width: 150, height: 260 },
  opponentGap: 2,
  results: { width: 320, height: 120 },
  flopHeight: 150,
  hints: { width: 200, height: 150 },
  hero: { width: 360, height: 180 },
  actionHeight: 100,
  actionWidthPercent: 80,
  sectionGap: 2,
  minimumOpponentSize: { width: 100, height: 70 },
  minimumOpponentScale: Math.min(100 / 150, 70 / 100),
} as const;

export const OPPONENT_COUNT = 7;
export const OPPONENT_ROW_LIMIT = 3;

export type OpponentRow = readonly number[];

export type OpponentRowsLayout = {
  fits: boolean;
  rowCount: number;
  rows: readonly OpponentRow[];
  rowOffsets: readonly number[];
  width: number;
  height: number;
  requiredWidth: number;
};

export type WireframeContainer = {
  width: number;
  height: number;
};

/** The two visual variants. A narrow table may still use two or three opponent rows. */
export type WireframeLayoutMode = 'wide' | 'narrow';

export type WireframeTableLayout = OpponentRowsLayout & {
  mode: WireframeLayoutMode;
  scale: number;
  opponentSize: { width: number; height: number };
  requiredHeight: number;
  container: WireframeContainer;
  fits: boolean;
  tooSmall: boolean;
  status: 'ready' | 'window-too-small';
  message: 'WINDOW TOO SMALL' | null;
};

function assertContainerSize(container: WireframeContainer): void {
  if (!Number.isFinite(container.width) || container.width < 0) {
    throw new RangeError('container.width must be a non-negative number');
  }
  if (!Number.isFinite(container.height) || container.height < 0) {
    throw new RangeError('container.height must be a non-negative number');
  }
}

/**
 * The fixed-height parts of the table are scaled together with the opponent
 * rows. The result is deliberately based only on the supplied table/container
 * dimensions; it must never read window.innerWidth or window.innerHeight.
 */
export function wireframeBaseHeight(rowCount: number): number {
  return (
    opponentRowsHeight(rowCount) +
    WIREFRAME_LAYOUT.results.height +
    WIREFRAME_LAYOUT.flopHeight +
    WIREFRAME_LAYOUT.hero.height +
    WIREFRAME_LAYOUT.actionHeight +
    4 * WIREFRAME_LAYOUT.sectionGap
  );
}

export function wireframeBaseWidth(opponentsInRow: number): number {
  // The complete table must fit horizontally. The lower hint/hero/hint row
  // is 200 + 2 + 300 + 2 + 200, so it participates in the same scale decision
  // as the opponent strip.
  const lowerPlayerRowWidth =
    WIREFRAME_LAYOUT.hints.width * 2 +
    WIREFRAME_LAYOUT.hero.width +
    WIREFRAME_LAYOUT.sectionGap * 2;
  return Math.max(opponentRowWidth(opponentsInRow), lowerPlayerRowWidth);
}

function layoutMode(rowCount: number): WireframeLayoutMode {
  return rowCount === 1 ? 'wide' : 'narrow';
}

function createScaledLayout(
  container: WireframeContainer,
  opponentCount: number,
  rowCount: 1 | 2 | 3,
): WireframeTableLayout {
  const rows = splitOpponentsIntoRows(opponentCount, rowCount);
  const requiredWidth = Math.max(...rows.map((row) => opponentRowWidth(row.length)));
  const requiredHeight = wireframeBaseHeight(rows.length);
  const baseWidth = wireframeBaseWidth(Math.max(...rows.map((row) => row.length)));
  const scale = Math.min(
    container.width / baseWidth,
    container.height / requiredHeight,
  );
  const opponentSize = {
    width: WIREFRAME_LAYOUT.opponent.width * Math.max(0, scale),
    height: WIREFRAME_LAYOUT.opponent.height * Math.max(0, scale),
  };
  const fits =
    scale >= WIREFRAME_LAYOUT.minimumOpponentScale &&
    opponentSize.width >= WIREFRAME_LAYOUT.minimumOpponentSize.width &&
    opponentSize.height >= WIREFRAME_LAYOUT.minimumOpponentSize.height;
  const rowOffsets = rows.map(
    (row) => (requiredWidth - opponentRowWidth(row.length)) / 2,
  );

  return {
    fits,
    tooSmall: !fits,
    status: fits ? 'ready' : 'window-too-small',
    message: fits ? null : 'WINDOW TOO SMALL',
    mode: layoutMode(rows.length),
    scale,
    opponentSize,
    container,
    rowCount: rows.length,
    rows,
    rowOffsets,
    width: requiredWidth,
    height: requiredHeight,
    requiredWidth,
    requiredHeight,
  };
}

/**
 * Calculates the complete table layout from the available poker-table
 * container. Opponents always stay in one row; the whole table scales down
 * when the available width is smaller than the base layout.
 */
export function getWireframeTableLayout(
  container: WireframeContainer,
  opponentCount = OPPONENT_COUNT,
): WireframeTableLayout {
  assertContainerSize(container);
  if (!Number.isInteger(opponentCount) || opponentCount < 1) {
    throw new RangeError('opponentCount must be a positive integer');
  }

  return createScaledLayout(container, opponentCount, 1);
}

// Descriptive aliases keep the contract easy to discover for callers that
// describe this operation as "calculate" rather than "get".
export const calculateWireframeLayout = getWireframeTableLayout;
export const getTableLayoutForContainer = getWireframeTableLayout;

/**
 * Splits opponents into balanced rows. The first rows receive the remainder,
 * so the final row is never larger than an earlier row and can be centered.
 */
export function splitOpponentsIntoRows(
  opponentCount = OPPONENT_COUNT,
  rowCount: 1 | 2 | 3 = 1,
): readonly OpponentRow[] {
  if (!Number.isInteger(opponentCount) || opponentCount < 1) {
    throw new RangeError('opponentCount must be a positive integer');
  }
  if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > OPPONENT_ROW_LIMIT) {
    throw new RangeError('rowCount must be 1, 2, or 3');
  }

  const actualRowCount = Math.min(rowCount, opponentCount);
  const baseSize = Math.floor(opponentCount / actualRowCount);
  const remainder = opponentCount % actualRowCount;
  const rows: number[][] = [];
  let opponentIndex = 0;

  for (let rowIndex = 0; rowIndex < actualRowCount; rowIndex += 1) {
    const size = baseSize + (rowIndex < remainder ? 1 : 0);
    rows.push(
      Array.from({ length: size }, () => {
        const index = opponentIndex;
        opponentIndex += 1;
        return index;
      }),
    );
  }

  return rows;
}

export function opponentRowWidth(opponentsInRow: number): number {
  if (!Number.isInteger(opponentsInRow) || opponentsInRow < 1) {
    throw new RangeError('opponentsInRow must be a positive integer');
  }
  return (
    opponentsInRow * WIREFRAME_LAYOUT.opponent.width +
    (opponentsInRow - 1) * WIREFRAME_LAYOUT.opponentGap
  );
}

export function opponentRowsHeight(rowCount: number): number {
  if (!Number.isInteger(rowCount) || rowCount < 1 || rowCount > OPPONENT_ROW_LIMIT) {
    throw new RangeError('rowCount must be 1, 2, or 3');
  }
  return (
    rowCount * WIREFRAME_LAYOUT.opponent.height +
    (rowCount - 1) * WIREFRAME_LAYOUT.opponentGap
  );
}

/**
 * Retained as a pure helper for callers that need row calculations. The main
 * table layout intentionally uses one row regardless of available width.
 */
export function getOpponentRowsLayout(
  availableWidth: number,
  opponentCount = OPPONENT_COUNT,
): OpponentRowsLayout {
  if (!Number.isFinite(availableWidth) || availableWidth < 0) {
    throw new RangeError('availableWidth must be a non-negative number');
  }
  if (!Number.isInteger(opponentCount) || opponentCount < 1) {
    throw new RangeError('opponentCount must be a positive integer');
  }

  const rows = splitOpponentsIntoRows(opponentCount, 1);
  const requiredWidth = Math.max(...rows.map((row) => opponentRowWidth(row.length)));
  const rowOffsets = rows.map(
    (row) => (requiredWidth - opponentRowWidth(row.length)) / 2,
  );
  return {
    fits: requiredWidth <= availableWidth,
    rowCount: rows.length,
    rows,
    rowOffsets,
    width: requiredWidth,
    height: opponentRowsHeight(rows.length),
    requiredWidth,
  };
}

export const WIREFRAME_LAYOUT_SPEC = {
  players: 8,
  opponents: 7,
  variants: ['narrow', 'wide'] as const,
  responsiveRules: {
    rows: 'one while width allows, then two, then three when required',
    balanceRows: true,
    centerShortLastRow: true,
    mobileSpecificLayout: false,
  },
  opponentRows: {
    one: [7] as const,
    two: [4, 3] as const,
    requiredWidths: { one: 1062, two: 606, three: 454 },
  },
  order: ['opponents', 'results', 'flop', 'hints-and-hero'] as const,
  actionsPlacement: 'outside-table-below' as const,
  zones: {
    opponent: '150x150',
  results: '320x120',
    flop: 'full-width x 100',
    highHint: '200x150',
    hero: '300x200',
    lowHint: '200x150',
    actions: '80-percent x 100',
  },
} as const;

// Step 1: only card placeholders. Other game zones are deliberately hidden
// until the card geometry is verified.
export const WIREFRAME_GAME_STYLES = `
#root .poker-page .poker-table,#root .poker-page .poker-table.is-oval{display:grid!important;grid-template-columns:1fr!important;gap:2px!important;position:relative!important;width:100%!important;height:auto!important;min-height:0!important;padding:24px!important;border-radius:0!important;overflow:visible!important;background:#ebe8e0!important}
.poker-page .poker-table:before,.poker-page .poker-table:after{display:none!important}
#root .poker-page .opponents-row{position:static!important;display:grid!important;grid-template-columns:repeat(var(--opponent-columns,7),calc(150px * var(--table-scale, 1)))!important;grid-auto-rows:calc(100px * var(--table-scale, 1))!important;gap:calc(2px * var(--table-scale, 1))!important;width:100%!important;height:auto!important;order:1!important;justify-content:center!important}
.poker-page .opponents-row .player-seat-wrap{position:static!important;width:100%!important;min-width:0!important;height:150px!important;transform:none!important}
.poker-page .opponents-row .player-seat-wrap,.poker-page .opponents-row .player-seat{left:auto!important;top:auto!important;right:auto!important;bottom:auto!important}
.poker-page .opponents-row .player-seat{width:100%!important;height:150px!important;min-height:150px!important;border-radius:0!important}
#root .poker-page .table-center{display:flex!important;order:3!important;width:100%!important;height:100px!important;min-height:100px!important;margin:0!important;padding:0!important;/* border:2px solid #87918a!important; */border-radius:0!important;background:rgba(255,255,255,.35)!important;align-items:center!important;justify-content:center!important}
#root .poker-page .table-center>*{display:none!important}
#root .poker-page .table-center:before{content:'FLOP / BOARD';display:block!important;color:#9aa19b;font-size:12px}
#root .poker-page .action-dock{display:none!important}
#root .poker-page .poker-table:before{display:none!important}
#root .poker-page .results-placeholder{display:flex!important;order:2!important;align-items:center;justify-content:center;width:320px;height:120px;margin:0 auto;/* border:2px solid #87918a; */background:rgba(255,255,255,.35);color:#9aa19b;font-size:12px}
#root .poker-page .hero-zone{position:static!important;display:grid!important;grid-template-columns:200px 360px 200px!important;justify-content:center!important;gap:2px!important;width:100%!important;height:180px!important;order:4!important;margin:0!important}
.poker-page .hero-zone>.combo-side{display:none!important}
.poker-page .hero-zone .hero-seat{position:static!important;grid-column:2!important;width:360px!important;height:180px!important;min-height:180px!important;/* border:2px solid #52645a!important; */transform:none!important}
.poker-page .hero-zone .coin-stack,.poker-page .hero-zone [data-testid="coin-stack"]{display:none!important}
.poker-page .hero-zone .hero-seat{display:flex!important;align-items:center!important;justify-content:center!important}
.poker-page .hero-zone .hero-seat .player-seat{position:static!important;width:100%!important;height:100%!important;transform:none!important}
.poker-page .hero-zone:before,.poker-page .hero-zone:after{content:'EMPTY HINT';display:flex;align-items:center;justify-content:center;width:200px;height:150px;/* border:2px solid #87918a; */background:rgba(255,255,255,.35);color:#9aa19b;font-size:12px}
.poker-page .hero-zone,.poker-page .hero-zone>*{left:auto!important;top:auto!important;right:auto!important;bottom:auto!important}
.poker-page .seat-position-badges,.poker-page .position-badge{display:none!important}
.poker-page .game-tile{width:100%!important;max-width:none!important;padding:0!important}
#root .poker-page .poker-table{max-width:1800px!important;margin:0 auto!important;box-sizing:border-box!important;contain:layout!important}
#root .poker-page .poker-table:after{content:'ACTIONS / BUTTONS';display:flex!important;align-items:center;justify-content:center;order:5;width:80%;height:100px;margin:0 auto;/* border:2px solid #87918a; */background:rgba(255,255,255,.35);color:#9aa19b;font-size:12px}
#root .poker-page .opponents-row .player-seat{overflow:hidden!important}
#root .poker-page .opponents-row .opponent-hand-zone{position:static!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;width:100%!important;height:150px!important;min-height:150px!important;transform:none!important;overflow:hidden!important}
#root .poker-page .opponents-row .opponent-hand-zone .seat-topline{position:static!important;left:auto!important;top:auto!important;transform:none!important}
#root .poker-page .opponents-row .opponent-hand-zone .seat-topline{margin-top:2px!important}
#root .poker-page .opponents-row .opponent-hand-zone *{position:static!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;transform:none!important}
#root .poker-page .opponents-row .opponent-hand-zone .compact-card-row{transform:scale(.28)!important;transform-origin:center!important}
#root .poker-page .opponents-row .opponent-hand-content{width:100%!important;height:150px!important;overflow:hidden!important;display:flex!important;align-items:center!important;justify-content:center!important}
#root .poker-page .opponents-row .opponent-hand-card-area{width:100%!important;height:100%!important;overflow:hidden!important;display:flex!important;align-items:center!important;justify-content:center!important}
#root .poker-page .opponents-row .opponent-hand-content{zoom:.28!important}
#root .poker-page .opponents-row .opponent-hand-content .compact-card-row{transform:none!important;flex:0 0 auto!important}
#root .poker-page .opponents-zone{order:1!important;width:100%!important;min-height:150px!important}
#root .poker-page .opponents-row .opponent-hand-zone{width:calc(148px * var(--wireframe-scale, 1))!important;min-width:calc(148px * var(--wireframe-scale, 1))!important;max-width:calc(148px * var(--wireframe-scale, 1))!important;height:calc(148px * var(--wireframe-scale, 1))!important;min-height:calc(148px * var(--wireframe-scale, 1))!important;max-height:calc(148px * var(--wireframe-scale, 1))!important;flex:0 0 calc(148px * var(--wireframe-scale, 1))!important;padding:0!important;/* border:1px solid #87918a!important; */background:rgba(255,255,255,.25)!important;box-sizing:content-box!important}
#root .poker-page .opponents-row .opponent-hand-zone .opponent-hand-content{max-width:calc(150px * var(--wireframe-scale, 1))!important}
#root .poker-page .opponents-row .opponent-hand-zone .opponent-hand-content{position:relative!important;top:4px!important}
#root .poker-page .results-zone{order:2!important;display:flex!important;align-items:center!important;justify-content:center!important;width:320px!important;height:120px!important;min-height:120px!important;margin:0 auto!important;/* border:2px solid #87918a!important; */background:rgba(255,255,255,.35)!important;color:#9aa19b!important}
#root .poker-page .flop-zone{order:3!important;display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;height:150px!important;min-height:150px!important;margin:0!important;/* border:2px solid #87918a!important; */background:rgba(255,255,255,.35)!important;color:#9aa19b!important}
#root .poker-page .flop-zone .table-stage,#root .poker-page .flop-zone .table-board,#root .poker-page .flop-zone .table-pot{display:none!important}
#root .poker-page .flop-zone:before{content:'FLOP / BOARD';display:block!important}
#root .poker-page .actions-zone{order:5!important;display:flex!important;align-items:center!important;justify-content:center!important;width:80%!important;height:100px!important;min-height:100px!important;margin:0 auto!important;/* border:2px solid #87918a!important; */background:rgba(255,255,255,.35)!important;color:#9aa19b!important}
#root .poker-page .actions-zone .action-dock{display:none!important}
#root .poker-page .hero-zone .coin-stack,#root .poker-page .hero-zone [data-testid="coin-stack"]{display:none!important}
#root .poker-page .opponents-row[data-opponent-count="1"]{grid-template-columns:calc(150px * var(--table-scale, 1))!important;justify-content:center!important}
#root .poker-page .opponents-row[data-opponent-count="2"]{grid-template-columns:repeat(2,calc(150px * var(--table-scale, 1)))!important;justify-content:center!important}
#root .poker-page .opponents-row[data-opponent-count="3"]{grid-template-columns:repeat(3,calc(150px * var(--table-scale, 1)))!important;justify-content:center!important}
#root .poker-page .opponents-row[data-opponent-count="4"]{grid-template-columns:repeat(4,calc(150px * var(--table-scale, 1)))!important;justify-content:center!important}
#root .poker-page .opponents-row[data-opponent-count="5"]{grid-template-columns:repeat(5,calc(150px * var(--table-scale, 1)))!important;justify-content:center!important}
#root .poker-page .opponents-row[data-opponent-count="6"]{grid-template-columns:repeat(6,calc(150px * var(--table-scale, 1)))!important;justify-content:center!important}
#root .poker-page .opponents-row[data-opponent-count="7"]{grid-template-columns:repeat(7,calc(150px * var(--table-scale, 1)))!important;justify-content:center!important}
#root .poker-page .poker-table .opponents-row .player-seat-wrap{width:calc(150px * var(--table-scale, 1))!important;min-width:calc(150px * var(--table-scale, 1))!important;max-width:calc(150px * var(--table-scale, 1))!important;height:calc(100px * var(--table-scale, 1))!important;flex:0 0 calc(150px * var(--table-scale, 1))!important;zoom:1!important;transform:none!important}
#root .poker-page .poker-table .opponents-row .opponent-hand-zone{width:calc(150px * var(--table-scale, 1))!important;min-width:calc(150px * var(--table-scale, 1))!important;max-width:calc(150px * var(--table-scale, 1))!important;height:calc(100px * var(--table-scale, 1))!important;min-height:calc(100px * var(--table-scale, 1))!important;max-height:calc(100px * var(--table-scale, 1))!important;box-sizing:border-box!important;zoom:1!important;transform:none!important}
#root .poker-page .poker-table .opponents-row .opponent-hand-zone .opponent-hand-content{zoom:1!important}
#root .poker-page .poker-table .opponents-row .opponent-hand-zone .compact-card-row{transform:scale(calc(.42 * var(--wireframe-scale, 1)))!important;transform-origin:center!important}
#root .poker-page .poker-table.is-showdown .opponents-row{display:grid!important;grid-template-columns:repeat(var(--opponent-columns,7),calc(150px * var(--table-scale, 1)))!important;grid-auto-rows:calc(100px * var(--table-scale, 1))!important;gap:calc(2px * var(--table-scale, 1))!important;justify-content:center!important;align-content:start!important;position:static!important;transform:none!important}
#root .poker-page .poker-table.is-showdown .opponents-row[data-opponent-count="1"]{grid-template-columns:calc(150px * var(--table-scale, 1))!important}
#root .poker-page .poker-table.is-showdown .opponents-row[data-opponent-count="2"]{grid-template-columns:repeat(2,calc(150px * var(--table-scale, 1)))!important}
#root .poker-page .poker-table.is-showdown .opponents-row[data-opponent-count="3"]{grid-template-columns:repeat(3,calc(150px * var(--table-scale, 1)))!important}
#root .poker-page .poker-table.is-showdown .opponents-row[data-opponent-count="4"]{grid-template-columns:repeat(4,calc(150px * var(--table-scale, 1)))!important}
#root .poker-page .poker-table.is-showdown .opponents-row[data-opponent-count="5"]{grid-template-columns:repeat(5,calc(150px * var(--table-scale, 1)))!important}
#root .poker-page .poker-table.is-showdown .opponents-row[data-opponent-count="6"]{grid-template-columns:repeat(6,calc(150px * var(--table-scale, 1)))!important}
#root .poker-page .poker-table.is-showdown .opponents-row[data-opponent-count="7"]{grid-template-columns:repeat(7,calc(150px * var(--table-scale, 1)))!important}
#root .poker-page .poker-table.is-showdown .opponents-row .player-seat-wrap{width:calc(150px * var(--table-scale, 1))!important;min-width:calc(150px * var(--table-scale, 1))!important;max-width:calc(150px * var(--table-scale, 1))!important;height:calc(100px * var(--table-scale, 1))!important;flex:0 0 calc(150px * var(--table-scale, 1))!important;position:static!important;transform:none!important}
#root .poker-page .poker-table.is-showdown .opponents-row .opponent-hand-zone{width:calc(150px * var(--table-scale, 1))!important;min-width:calc(150px * var(--table-scale, 1))!important;max-width:calc(150px * var(--table-scale, 1))!important;height:calc(100px * var(--table-scale, 1))!important;min-height:calc(100px * var(--table-scale, 1))!important;max-height:calc(100px * var(--table-scale, 1))!important;transform:none!important;zoom:1!important}
#root .poker-page .poker-table.is-showdown .opponents-row .opponent-hand-content{zoom:1!important;transform:none!important;position:relative!important;top:4px!important}
#root .poker-page .poker-table.is-showdown .opponents-row .opponent-hand-zone .compact-card-row{transform:scale(calc(.42 * var(--table-scale, 1)))!important;transform-origin:center!important}
#root .poker-page .poker-table.is-showdown .opponents-row .opponent-hand-content{top:0!important}
#root .poker-page .poker-table.is-showdown .opponents-row .opponent-hand-zone .compact-card-row{transform:scale(calc(.28 * var(--table-scale, 1)))!important}
#root .poker-page .poker-table.is-showdown .results-zone .showdown-status{position:static!important;inset:auto!important;transform:none!important;width:100%!important;height:100%!important;max-width:none!important;margin:0!important;box-sizing:border-box!important}
`;
