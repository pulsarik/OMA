import React, { useEffect, useRef, useState } from 'react';
import type { WalletHistorySeries } from '../partyStatistics';
import { playerSeriesStyle } from './playerSeriesStyles';

export function FocusedWalletChart({ series, selectedPlayerId, playerName, formatValue, t }: {
  series: WalletHistorySeries[];
  selectedPlayerId: string;
  playerName: (id: string) => string;
  formatValue: (value: number) => string;
  t: (en: string, ru: string) => string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [inspectedHand, setInspectedHand] = useState<number | null>(null);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const points = series.flatMap(item => item.points);
  const selected = series.find(item => item.playerId === selectedPlayerId);
  if (!points.length || !selected?.points.length) return null;
  const hands = [...new Set(points.map(point => point.handNumber))].sort((a, b) => a - b);
  const minHand = hands[0];
  const maxHand = hands[hands.length - 1];
  const wallets = points.map(point => point.wallet);
  const rawMin = Math.min(...wallets);
  const rawMax = Math.max(...wallets);
  const padding = Math.max(1, rawMax - rawMin) * .08;
  const minWallet = rawMin >= 0 ? Math.max(0, rawMin - padding) : rawMin - padding;
  const maxWallet = rawMax + padding;
  const height = 260;
  const left = 64;
  const right = 18;
  const top = 18;
  const bottom = 44;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (hand: number) => left + (hand - minHand) / Math.max(1, maxHand - minHand) * plotWidth;
  const y = (wallet: number) => top + (maxWallet - wallet) / Math.max(1, maxWallet - minWallet) * plotHeight;
  const tickStep = Math.max(1, Math.ceil(hands.length / Math.max(2, Math.floor(plotWidth / 75))));
  const xTicks = hands.filter((_, index) => index % tickStep === 0 && index < hands.length - Math.max(1, tickStep / 2));
  xTicks.push(maxHand);
  const point = selected.points.find(item => item.handNumber === inspectedHand) ?? selected.points[selected.points.length - 1];
  const selectedIndex = series.findIndex(item => item.playerId === selectedPlayerId);
  const selectedColor = playerSeriesStyle(selectedIndex).color;
  // Draw the selected player last; keep original indexes so colors never change.
  const ordered = series.map((item, index) => ({ item, index }))
    .sort((a, b) => Number(a.item.playerId === selectedPlayerId) - Number(b.item.playerId === selectedPlayerId));
  const inspectPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = (event.clientX - bounds.left) * width / bounds.width;
    const hand = minHand + Math.max(0, Math.min(1, (relativeX - left) / plotWidth)) * (maxHand - minHand);
    setInspectedHand(hands.reduce((nearest, candidate) => Math.abs(candidate - hand) < Math.abs(nearest - hand) ? candidate : nearest));
  };

  return (
    <div className="statistics-chart" ref={container} data-testid="wallet-history-chart">
      <div className="statistics-chart-readout" data-testid="statistics-chart-readout" aria-live="polite">
        <span>{playerName(selectedPlayerId)}</span>
        <span>{t('Hand', 'Раздача')} {point.handNumber}</span>
        <strong>{t('Wallet', 'Кошелек')}: {formatValue(point.wallet)}</strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={t('Wallet history', 'История кошелька')}
        onPointerMove={inspectPointer} onPointerDown={inspectPointer}>
        {Array.from({ length: 5 }, (_, index) => {
          const tick = minWallet + (maxWallet - minWallet) * index / 4;
          return <g key={index}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} className="statistics-chart-grid" />
            <text x={left - 10} y={y(tick) + 4} textAnchor="end">{formatValue(Math.round(tick))}</text>
          </g>;
        })}
        {xTicks.map(hand => <text key={hand} x={x(hand)} y={height - bottom + 22} textAnchor="middle">{hand}</text>)}
        <text x={left + plotWidth / 2} y={height - 3} textAnchor="middle">{t('Hand', 'Раздача')}</text>
        {ordered.map(({ item, index }) => {
          const active = item.playerId === selectedPlayerId;
          const style = playerSeriesStyle(index);
          const last = item.points[item.points.length - 1];
          return <g key={item.playerId} data-testid={`wallet-series-${item.playerId}`} data-selected={active} opacity={active ? 1 : .5}>
            <title>{playerName(item.playerId)}</title>
            <path d={item.points.map((entry, i) => `${i ? 'L' : 'M'} ${x(entry.handNumber)} ${y(entry.wallet)}`).join(' ')}
              fill="none" stroke={style.color} strokeWidth={active ? 3 : 1.5} strokeDasharray={style.dash}
              strokeLinejoin="round" strokeLinecap="round" />
            {last ? <circle cx={x(last.handNumber)} cy={y(last.wallet)} r={active ? 4 : 3} fill={style.color} /> : null}
          </g>;
        })}
        <line x1={x(point.handNumber)} x2={x(point.handNumber)} y1={top} y2={height - bottom} stroke={selectedColor} strokeDasharray="3 5" opacity=".3" />
        <circle cx={x(point.handNumber)} cy={y(point.wallet)} r="5" fill={selectedColor} stroke="white" strokeWidth="2" />
      </svg>
      <label className="statistics-chart-control">
        <span>{t('Explore hands', 'Просмотреть раздачи')}</span>
        <input type="range" min={0} max={selected.points.length - 1}
          value={selected.points.indexOf(point)}
          aria-valuetext={`${t('Hand', 'Раздача')} ${point.handNumber}, ${t('Wallet', 'Кошелек')} ${formatValue(point.wallet)}`}
          onChange={event => setInspectedHand(selected.points[Number(event.target.value)].handNumber)} />
      </label>
    </div>
  );
}
