import React, { useState } from 'react';
import { StatisticsDashboard, type StatisticsDashboardProps } from './StatisticsDashboard';
import { readStatisticsLayout, saveStatisticsLayout, type StatisticsLayout } from './statisticsLayout';
import './statisticsDashboard.css';

export function StatisticsPresentation({ children, ...props }: StatisticsDashboardProps & {
  children: React.ReactNode;
}) {
  const [layout, setLayout] = useState(readStatisticsLayout);
  const choose = (next: StatisticsLayout) => {
    setLayout(next);
    saveStatisticsLayout(next);
  };

  return (
    <div className="statistics-presentation">
      <div className="statistics-layout-switch" role="group" aria-label={props.t('Statistics view', 'Вид статистики')}>
        <button type="button" aria-pressed={layout === 'player'} onClick={() => choose('player')}>
          {props.t('Player view', 'По игрокам')}
        </button>
        <button type="button" aria-pressed={layout === 'classic'} onClick={() => choose('classic')}>
          {props.t('Classic view', 'Прежний вид')}
        </button>
      </div>
      {layout === 'classic' ? children : <StatisticsDashboard {...props} />}
    </div>
  );
}
