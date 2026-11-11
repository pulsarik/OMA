import React from 'react';
import { StatisticsDashboard, type StatisticsDashboardProps } from './StatisticsDashboard';
import './statisticsDashboard.css';

export function StatisticsPresentation({ children: _legacyView, ...props }: StatisticsDashboardProps & {
  children: React.ReactNode;
}) {
  return (
    <div className="statistics-presentation">
      <StatisticsDashboard {...props} />
    </div>
  );
}
