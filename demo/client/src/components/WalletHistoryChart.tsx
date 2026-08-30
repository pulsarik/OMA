import React from 'react';
import type { WalletHistorySeries } from '../partyStatistics';
import { playerSeriesStyle, type PlayerSeriesStyle } from './playerSeriesStyles';

// The dash and marker patterns make the series identifiable without relying on
// colour alone. This also keeps overlapping lines legible on small screens.
type SeriesStyle = PlayerSeriesStyle;

function SeriesMarker({ x, y, style, title }: {
  x: number;
  y: number;
  style: SeriesStyle;
  title?: string;
}) {
  const common = { fill: style.color, stroke: '#fff', strokeWidth: 2 };
  let shape: React.ReactNode;

  switch (style.marker) {
    case 'square':
      shape = <rect x={x - 5} y={y - 5} width="10" height="10" rx="1" {...common} />;
      break;
    case 'diamond':
      shape = <path d={`M ${x} ${y - 6} L ${x + 6} ${y} L ${x} ${y + 6} L ${x - 6} ${y} Z`} {...common} />;
      break;
    case 'triangle':
      shape = <path d={`M ${x} ${y - 6} L ${x + 6} ${y + 5} L ${x - 6} ${y + 5} Z`} {...common} />;
      break;
    case 'triangle-down':
      shape = <path d={`M ${x - 6} ${y - 5} L ${x + 6} ${y - 5} L ${x} ${y + 6} Z`} {...common} />;
      break;
    default:
      shape = <circle cx={x} cy={y} r="5" {...common} />;
  }

  return <g>{title ? <title>{title}</title> : null}{shape}</g>;
}

type Props = {
  series: WalletHistorySeries[];
  playerName: (playerId: string) => string;
  formatValue: (value: number) => string;
  title: string;
  handLabel: string;
  walletLabel: string;
};

export function WalletHistoryChart({
  series,
  playerName,
  formatValue,
  title,
  handLabel,
  walletLabel,
}: Props) {
  const points = series.flatMap((item) => item.points);
  if (!points.length) return null;

  const width = 900;
  const height = 270;
  const margin = { top: 22, right: 24, bottom: 48, left: 72 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const handNumbers = points.map((point) => point.handNumber);
  const wallets = points.map((point) => point.wallet);
  const minHand = Math.min(...handNumbers);
  const maxHand = Math.max(...handNumbers);
  const rawMinWallet = Math.min(...wallets);
  const rawMaxWallet = Math.max(...wallets);
  const walletRange = Math.max(1, rawMaxWallet - rawMinWallet);
  const minWallet = Math.max(0, rawMinWallet - walletRange * 0.08);
  const maxWallet = rawMaxWallet + walletRange * 0.08;
  const x = (handNumber: number) => margin.left + (
    ((handNumber - minHand) / Math.max(1, maxHand - minHand)) * plotWidth
  );
  const y = (wallet: number) => margin.top + (
    ((maxWallet - wallet) / Math.max(1, maxWallet - minWallet)) * plotHeight
  );
  const yTicks = Array.from({ length: 5 }, (_, index) => (
    minWallet + ((maxWallet - minWallet) * index) / 4
  ));
  const distinctHands = [...new Set(handNumbers)].sort((a, b) => a - b);
  const xTickStep = Math.max(1, Math.ceil(distinctHands.length / 8));
  const xTicks = distinctHands.filter((_, index) => (
    index % xTickStep === 0 || index === distinctHands.length - 1
  ));

  return (
    <section className="wallet-history" data-testid="wallet-history-chart">
      <h3>{title}</h3>
      <div className="wallet-history-canvas">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="chart-grid" />
              <text x={margin.left - 10} y={y(tick) + 4} textAnchor="end">{formatValue(tick)}</text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <g key={tick}>
              <line x1={x(tick)} x2={x(tick)} y1={margin.top} y2={height - margin.bottom} className="chart-grid" />
              <text x={x(tick)} y={height - margin.bottom + 20} textAnchor="middle">{tick}</text>
            </g>
          ))}
          <text className="chart-axis-title" x={margin.left + plotWidth / 2} y={height - 8} textAnchor="middle">{handLabel}</text>
          <text className="chart-axis-title" transform={`translate(17 ${margin.top + plotHeight / 2}) rotate(-90)`} textAnchor="middle">{walletLabel}</text>
          {series.map((item, index) => {
            const style = playerSeriesStyle(index);
            const path = item.points.map((point, pointIndex) => (
              `${pointIndex ? 'L' : 'M'} ${x(point.handNumber)} ${y(point.wallet)}`
            )).join(' ');
            return (
              <g key={item.playerId} data-testid={`wallet-series-${item.playerId}`}>
                <path
                  d={path}
                  className="chart-line-halo"
                  fill="none"
                  strokeDasharray={style.dash}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <path
                  d={path}
                  className="chart-line"
                  fill="none"
                  stroke={style.color}
                  strokeDasharray={style.dash}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {item.points.map((point) => (
                  <SeriesMarker
                    key={point.handNumber}
                    x={x(point.handNumber)}
                    y={y(point.wallet)}
                    style={style}
                    title={`${playerName(item.playerId)} - ${handLabel} ${point.handNumber} - ${walletLabel} ${formatValue(point.wallet)}`}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
