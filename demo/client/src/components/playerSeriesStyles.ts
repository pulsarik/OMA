export const PLAYER_SERIES_STYLES = [
  { color: '#007A5E', dash: undefined, marker: 'circle' },
  { color: '#005FCC', dash: '14 6', marker: 'square' },
  { color: '#C73232', dash: '3 6', marker: 'diamond' },
  { color: '#6D3FC0', dash: '14 5 3 5', marker: 'triangle' },
  { color: '#B05A00', dash: '8 5', marker: 'triangle-down' },
  { color: '#007C91', dash: '2 5', marker: 'circle' },
  { color: '#C2185B', dash: '12 4 2 4', marker: 'square' },
  { color: '#4F6B00', dash: '6 4 2 4', marker: 'diamond' },
  { color: '#8A288F', dash: '16 5', marker: 'triangle' },
  { color: '#344054', dash: '5 5', marker: 'triangle-down' },
] as const;

export type PlayerSeriesStyle = (typeof PLAYER_SERIES_STYLES)[number];

export function playerSeriesStyle(index: number): PlayerSeriesStyle {
  return PLAYER_SERIES_STYLES[index % PLAYER_SERIES_STYLES.length];
}
