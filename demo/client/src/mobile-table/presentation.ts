import type { Language, Seat } from './types';

// Clockwise from the hero's left; changing counts never changes physical order.
export const OPPONENT_POSITIONS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[50, 14]],
  2: [[24, 23], [76, 23]],
  3: [[18, 28], [50, 11], [82, 28]],
  4: [[18, 54], [29, 13], [71, 13], [82, 54]],
  5: [[18, 54], [18, 28], [50, 11], [82, 28], [82, 54]],
  6: [[18, 54], [18, 28], [29, 11], [71, 11], [82, 28], [82, 54]],
};

// Horizontal oval, in the same clockwise order as the mobile seats.
export const DESKTOP_OPPONENT_POSITIONS: Record<number, ReadonlyArray<readonly [number, number]>> = {
  1: [[50, 18]],
  2: [[25, 20], [75, 20]],
  3: [[15, 46], [50, 18], [85, 46]],
  4: [[15, 48], [34, 19], [66, 19], [85, 48]],
  5: [[15, 48], [28, 19], [50, 18], [72, 19], [85, 48]],
  6: [[23, 76], [14, 46], [34, 19], [66, 19], [86, 46], [77, 76]],
  7: [[23, 76], [14, 46], [28, 19], [50, 18], [72, 19], [86, 46], [77, 76]],
  8: [[23, 78], [12, 57], [16, 31], [36, 17], [64, 17], [84, 31], [88, 57], [77, 78]],
  9: [[23, 78], [12, 57], [16, 31], [32, 16], [50, 15], [68, 16], [84, 31], [88, 57], [77, 78]],
};

export function clockwiseOpponents<T extends Seat>(players: T[], heroId: string): T[] {
  const index = players.findIndex(p => p.id === heroId);
  return index < 0 ? players : [...players.slice(index + 1), ...players.slice(0, index)];
}

export function words(language: Language, en: string, ru: string) {
  return language === 'ru' ? ru : en;
}
export function amount(value: number | undefined) {
  return value === undefined ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
}
export function nameOf(seat: { name?: string; id: string }) {
  return (seat.name || seat.id).replace(/_bot$/i, '');
}
const ranks: Record<string, string> = {
  'straight flush': 'Стрит-флеш', 'four of a kind': 'Каре', 'full house': 'Фулл-хаус',
  flush: 'Флеш', straight: 'Стрит', 'three of a kind': 'Сет', 'two pair': 'Две пары',
  pair: 'Пара', 'high card': 'Старшая карта',
};
const stages: Record<string, string> = { preflop: 'Префлоп', flop: 'Флоп', turn: 'Тёрн', river: 'Ривер', showdown: 'Вскрытие' };
const moves: Record<string, string> = { check: 'Чек', call: 'Колл', bet: 'Ставка', raise: 'Рейз', fold: 'Фолд' };
export const rankLabel = (rank: string, language: Language) => language === 'ru' ? ranks[rank] ?? rank : rank;
export const stageLabel = (stage: string, language: Language) => language === 'ru' ? stages[stage] ?? stage : stage;
export const moveLabel = (move: string, language: Language) => language === 'ru' ? moves[move] ?? move : move;
