import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  getWireframeTableLayout,
  OPPONENT_COUNT,
  WIREFRAME_LAYOUT,
} from './wireframeLayout';
import './wireframeTable.css';

type WireframeTableProps = {
  opponents?: ReactNode[];
  results?: ReactNode;
  flop?: ReactNode;
  highHint?: ReactNode;
  hero?: ReactNode;
  lowHint?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  opponentCount?: number;
};

function viewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function availableTableHeight(table: HTMLDivElement): number {
  const top = table.getBoundingClientRect().top;
  return Math.max(0, viewportHeight() - top - 8);
}

export function WireframeTable({
  opponents,
  results,
  flop,
  highHint,
  hero,
  lowHint,
  actions,
  children,
  opponentCount = OPPONENT_COUNT,
}: WireframeTableProps) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return undefined;
    const measure = () => setContainer({
      width: table.clientWidth,
      height: availableTableHeight(table),
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(table);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);

  const layout = useMemo(() => getWireframeTableLayout(
    { width: Math.max(0, container.width - 4), height: container.height },
    Math.min(opponentCount, opponents?.length || opponentCount),
  ), [container, opponentCount, opponents?.length]);

  const opponentRows = layout.rows.map((row, rowIndex) => (
    (() => {
      const availableWidth = container.width * 0.9;
      const maxSlotWidth = 500 * layout.scale;
      const slotWidth = Math.min(maxSlotWidth, availableWidth / row.length);
      const rowWidth = row.length * slotWidth + Math.max(0, row.length - 1) * 2 * layout.scale;
      return (
        <div
          className="wireframe-opponents-row"
          data-testid={rowIndex === 0 ? 'opponents-grid' : 'wireframe-opponents-row'}
          data-row-index={rowIndex}
          style={{
            gridTemplateColumns: `repeat(${row.length}, ${slotWidth}px)`,
            width: `${rowWidth}px`,
            marginInline: 'auto',
          }}
          key={`row-${rowIndex}`}
        >
      {row.map((opponentIndex, index) => {
        const middle = (row.length - 1) / 2;
        const distance = row.length % 2 === 0
          ? Math.max(0, Math.abs(index - middle) - 0.5)
          : Math.abs(index - middle);
        return (
        <div
          className="wireframe-opponent-slot"
          key={`opponent-${opponentIndex}`}
          style={{ transform: `translateY(${distance * 10}%)` }}
        >
          {opponents?.[opponentIndex]}
        </div>
        );
      })}
        </div>
      );
    })()
  ));

  if (children) {
    const childNodes = React.Children.toArray(children);
    const actionNode = childNodes.find((child) => (
      React.isValidElement(child)
      && typeof child.props.className === 'string'
      && child.props.className.split(' ').includes('wireframe-actions-zone')
    ));
    const content = opponents
      ? [
        <section className="wireframe-opponents-zone" data-testid="opponents-zone" key="wireframe-opponents">
          {opponentRows}
        </section>,
        ...childNodes.slice(1).filter((child) => child !== actionNode),
      ]
      : childNodes.filter((child) => child !== actionNode);
    const tableStyle = {
      '--wireframe-scale': layout.scale,
      '--table-scale': layout.scale,
      '--card-table-scale': layout.scale,
      '--wireframe-opponent-width': `${WIREFRAME_LAYOUT.opponent.width}px`,
      '--wireframe-opponent-height': `${WIREFRAME_LAYOUT.opponent.height}px`,
      '--wireframe-required-height': `${layout.requiredHeight}px`,
      '--wireframe-table-height': `${Math.max(0, (layout.requiredHeight - WIREFRAME_LAYOUT.actionHeight - WIREFRAME_LAYOUT.sectionGap) * layout.scale + 4)}px`,
    } as React.CSSProperties;
    return (
      <div
        className="wireframe-table-stack"
        style={{
          '--wireframe-scale': layout.scale,
          '--wireframe-hint-offset': `${152 * layout.scale}px`,
        } as React.CSSProperties}
      >
        <div
          ref={tableRef}
          className="wireframe-table"
          data-testid="poker-table"
          data-row-count={layout.rowCount}
          data-layout-status={layout.status}
          style={tableStyle}
        >
          {content}
        </div>
        {actionNode}
      </div>
    );
  }

  return (
    <div
      ref={tableRef}
      className="wireframe-table"
      data-testid="poker-table"
      data-row-count={layout.rowCount}
      data-layout-status={layout.status}
      style={{
        '--wireframe-scale': layout.scale,
        '--table-scale': layout.scale,
        '--card-table-scale': layout.scale,
        '--wireframe-opponent-width': `${WIREFRAME_LAYOUT.opponent.width}px`,
        '--wireframe-opponent-height': `${WIREFRAME_LAYOUT.opponent.height}px`,
        '--wireframe-required-height': `${layout.requiredHeight}px`,
        '--wireframe-table-height': `${Math.max(0, layout.requiredHeight * layout.scale + 4)}px`,
      } as React.CSSProperties}
    >
      <section className="wireframe-opponents-zone" data-testid="opponents-zone">
        {opponentRows}
      </section>
      <section className="wireframe-results-zone" data-testid="results-zone">{results}</section>
      <section className="wireframe-flop-zone" data-testid="flop-zone">{flop}</section>
      <section className="wireframe-player-zone">
        <div className="wireframe-hint-zone" data-testid="high-hint-zone">{highHint}</div>
        <div className="wireframe-hero-zone" data-testid="hero-zone">{hero}</div>
        <div className="wireframe-hint-zone" data-testid="low-hint-zone">{lowHint}</div>
      </section>
      <section className="wireframe-actions-zone" data-testid="actions-zone">{actions}</section>
    </div>
  );
}
