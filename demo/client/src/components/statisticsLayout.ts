export type StatisticsLayout = 'player' | 'classic';

// Set to 'classic' to restore the old default without removing either view.
export const DEFAULT_STATISTICS_LAYOUT: StatisticsLayout = 'player';
export const STATISTICS_LAYOUT_KEY = 'omaha-statistics-layout';

export function defaultStatisticsLayout(): StatisticsLayout {
  return typeof window !== 'undefined' && window.innerWidth >= 761 ? 'classic' : DEFAULT_STATISTICS_LAYOUT;
}

export function readStatisticsLayout(): StatisticsLayout {
  try {
    const saved = localStorage.getItem(STATISTICS_LAYOUT_KEY);
    if (saved === 'classic' || saved === 'player') return saved;
  } catch { /* The view still works when browser storage is unavailable. */ }
  return defaultStatisticsLayout();
}

export function saveStatisticsLayout(layout: StatisticsLayout) {
  try { localStorage.setItem(STATISTICS_LAYOUT_KEY, layout); } catch { /* Keep the in-memory choice. */ }
}
