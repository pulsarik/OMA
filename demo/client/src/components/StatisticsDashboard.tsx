import React, { useState } from 'react';
import { COMBINATION_RANKS, type CombinationCounts, type WalletHistorySeries } from '../partyStatistics';
import { playerSeriesStyle } from './playerSeriesStyles';
import { FocusedWalletChart } from './FocusedWalletChart';

export type StatisticsPlayer = {
  id: string;
  name?: string;
  isBot?: boolean;
  botStyle?: 'normal' | 'aggressive' | 'cautious';
  hands: number;
  aggressivePercent: string;
  realizationPercent: string;
  missedHigh: number;
  missedLow: number;
  foldPercent: string;
  winPercent: string;
  lossPercent: string;
  net: number;
  maxWin: number;
  maxLoss: number;
  stack: number;
  combinations: CombinationCounts;
};

export type StatisticsDashboardProps = {
  metrics: StatisticsPlayer[];
  walletHistory: WalletHistorySeries[];
  currentPlayerId?: string;
  completedHands: number;
  replayCode?: string;
  isReplay?: boolean;
  isFinal: boolean;
  playerName: (id: string) => string;
  formatValue: (value: number) => string;
  t: (en: string, ru: string) => string;
};

function Metric({ label, value, testId, percent, tone, help }: {
  label: string;
  value: React.ReactNode;
  testId: string;
  percent?: number;
  tone?: string;
  help?: string;
}) {
  return (
    <div className="statistics-metric">
      <dt>
        {label}
        {help ? <details className="statistics-help">
          <summary aria-label={label}>i</summary>
          <span>{help}</span>
        </details> : null}
      </dt>
      <dd>
        {percent !== undefined ? <span className="statistics-meter" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
        </span> : null}
        <strong className={tone} data-testid={testId}>{value}</strong>
      </dd>
    </div>
  );
}

export function StatisticsDashboard({
  metrics, walletHistory, currentPlayerId, completedHands, replayCode, isReplay, isFinal,
  playerName, formatValue, t,
}: StatisticsDashboardProps) {
  const [selection, setSelection] = useState(currentPlayerId);
  const player = metrics.find(item => item.id === selection)
    ?? metrics.find(item => item.id === currentPlayerId) ?? metrics[0];
  const signed = (value: number) => `${value > 0 ? '+' : ''}${formatValue(value)}`;
  const tone = (value: number) => value > 0 ? 'statistics-positive' : value < 0 ? 'statistics-negative' : '';
  const maxCombination = player ? Math.max(1, ...Object.values(player.combinations)) : 1;

  return (
    <section className="statistics-dashboard" data-testid="party-statistics">
      <header className="statistics-heading">
        <div>
          <h2>{t('Party statistics', 'Статистика партии')}</h2>
          <div className="statistics-meta">
            <span data-testid="completed-hand-count">{completedHands} {t(completedHands === 1 ? 'hand' : 'hands', 'раздач')}</span>
            {replayCode ? <span data-testid="replay-code">
              {isReplay ? t('REPLAY', 'ПОВТОР') : t('Replay code', 'Код повтора')}: <code>{replayCode}</code>
            </span> : null}
          </div>
        </div>
        {isFinal ? <span className="statistics-badge">{t('Party complete', 'Партия завершена')}</span> : null}
      </header>

      {!player ? <p>{t('No player statistics yet.', 'Статистика игроков пока недоступна.')}</p> : (
        <div className="statistics-grid">
          <aside className="statistics-players statistics-card" aria-label={t('Players', 'Игроки')}>
            <h3>{t('Players', 'Игроки')}</h3>
            <p className="statistics-muted">{t('Choose a player to explore their game.', 'Выберите игрока, чтобы изучить его игру.')}</p>
            <div className="statistics-player-columns" aria-hidden="true">
              <span>{t('Player', 'Игрок')}</span><span>{t('Net', 'Итог')}</span><span>{t('Stack', 'Стек')}</span>
            </div>
            <div className="statistics-player-list">
              {metrics.map((item, index) => (
                <button type="button" className="statistics-player" key={item.id}
                  aria-pressed={player.id === item.id} data-testid={`statistics-select-${item.id}`}
                  onClick={() => setSelection(item.id)}>
                  <span className="statistics-player-identity">
                    <span className="statistics-dot" aria-hidden="true" style={{ background: playerSeriesStyle(index).color }} />
                    <span className="statistics-player-copy">
                      <span className="statistics-player-name">{playerName(item.id)}</span>
                      {item.id === currentPlayerId ? <small>{t('You', 'Вы')}</small> : null}
                      {isFinal && item.isBot ? <small data-testid={`bot-style-${item.id}`}>
                        {item.botStyle === 'normal' ? t('Normal', 'Обычный')
                          : item.botStyle === 'aggressive' ? t('Aggressive', 'Наглый') : t('Cautious', 'Осторожный')}
                      </small> : null}
                    </span>
                  </span>
                  <strong className={tone(item.net)}><span className="statistics-sr-only">{t('Net', 'Итог')} </span>{signed(item.net)}</strong>
                  <span><span className="statistics-sr-only">{t('Stack', 'Стек')} </span>{formatValue(item.stack)}</span>
                </button>
              ))}
            </div>
          </aside>

          <div className="statistics-detail" data-testid="statistics-player-detail" data-player-id={player.id}>
            <section className="statistics-overview statistics-card">
              <header className="statistics-selected-heading">
                <h3>{playerName(player.id)}</h3>
                {player.id === currentPlayerId ? <span className="statistics-badge">{t('You', 'Вы')}</span> : null}
              </header>
              <dl className="statistics-headlines">
                <div><dt>{t('Net result', 'Итог')}</dt><dd className={tone(player.net)} data-testid={`party-net-${player.id}`}>{signed(player.net)}</dd></div>
                <div><dt>{t('Stack', 'Стек')}</dt><dd data-testid={`party-stack-${player.id}`}>{formatValue(player.stack)}</dd></div>
              </dl>
              {walletHistory.some(item => item.points.length) ? <>
                <div className="statistics-chart-heading">
                  <h4>{t('Wallet history', 'История кошелька')}</h4>
                  <div className="statistics-legend" role="group" aria-label={t('Chart players', 'Игроки на графике')}>
                    {metrics.map((item, index) => <button key={item.id} type="button"
                      aria-pressed={item.id === player.id} onClick={() => setSelection(item.id)}>
                      <span className="statistics-dot" aria-hidden="true" style={{ background: playerSeriesStyle(index).color }} />
                      {playerName(item.id)}
                    </button>)}
                  </div>
                </div>
                <FocusedWalletChart series={walletHistory} selectedPlayerId={player.id}
                  playerName={playerName} formatValue={formatValue} t={t} />
              </> : <p className="statistics-empty" role="status">{t('Wallet history will appear after the first completed hand.', 'История кошелька появится после первой завершённой раздачи.')}</p>}
            </section>

            <div className="statistics-cards">
              <section className="statistics-card">
                <h3>{t('Results', 'Результаты')}</h3>
                <dl>
                  <Metric label={t('Hands', 'Раздачи')} value={player.hands} testId={`party-hands-${player.id}`} />
                  <Metric label={t('Max win', 'Макс. выигрыш')} value={signed(player.maxWin)} tone={tone(player.maxWin)} testId={`party-max-win-${player.id}`} />
                  <Metric label={t('Max loss', 'Макс. проигрыш')} value={signed(player.maxLoss)} tone={tone(player.maxLoss)} testId={`party-max-loss-${player.id}`} />
                </dl>
              </section>
              <section className="statistics-card">
                <h3>{t('Play', 'Игра')}</h3>
                <dl>
                  <Metric label={t('Realization', 'Реализация')} value={player.realizationPercent} percent={parseFloat(player.realizationPercent)} testId={`party-realization-${player.id}`}
                    help={t('Percentage of advantaged hands that produced a positive net result.', 'Процент раздач с преимуществом, которые дали положительный итог.')} />
                  <Metric label={t('Missed high', 'Упущенный high')} value={player.missedHigh} testId={`party-missed-high-${player.id}`}
                    help={t('Hands with the best high but no high payout.', 'Раздачи с лучшим high без выплаты за high.')} />
                  <Metric label={t('Missed low', 'Упущенный low')} value={player.missedLow} testId={`party-missed-low-${player.id}`}
                    help={t('Hands with the best low but no low payout.', 'Раздачи с лучшим low без выплаты за low.')} />
                  <Metric label={t('Bet / raise', 'Бет / рейз')} value={player.aggressivePercent} percent={parseFloat(player.aggressivePercent)} testId={`party-aggression-${player.id}`} />
                  <Metric label={t('Fold', 'Фолд')} value={player.foldPercent} percent={parseFloat(player.foldPercent)} testId={`party-fold-${player.id}`} />
                  <Metric label={t('Wins', 'Победы')} value={player.winPercent} percent={parseFloat(player.winPercent)} testId={`party-win-${player.id}`} />
                  <Metric label={t('Losses', 'Проигрыши')} value={player.lossPercent} percent={parseFloat(player.lossPercent)} testId={`party-loss-${player.id}`} />
                </dl>
              </section>
              <section className="statistics-card statistics-combinations">
                <h3>{t('Combinations', 'Комбинации')}</h3>
                <dl>{COMBINATION_RANKS.map(combination => <Metric key={combination.key}
                  label={t(combination.en, combination.ru)} value={player.combinations[combination.key]}
                  percent={player.combinations[combination.key] / maxCombination * 100}
                  testId={`party-combination-${combination.key}-${player.id}`} />)}</dl>
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
