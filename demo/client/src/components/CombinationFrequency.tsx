import { useId, useState } from 'react';

type Props = {
  count: number;
  total: number;
  expected: number;
  label: string;
  language: 'en' | 'ru';
};

export function CombinationFrequency({ count, total, expected, label, language }: Props) {
  const id = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  if (!total) return <span>—</span>;
  const actual = count / total * 100;
  const difference = actual - expected;
  const arrow = Math.abs(difference) < 0.0005 ? '≈' : difference > 0 ? '↑' : '↓';
  const ru = language === 'ru';
  const formatted = (value: number) => value.toFixed(3);
  const description = ru
    ? `${label}: ${count} из ${total} комбинаций игроков (${formatted(actual)}%). Ожидается ≈ ${formatted(expected)}%. Разница: ${difference >= 0 ? '+' : ''}${formatted(difference)} п.п. Оценка по 1 000 000 случайных раздач Омахи: ровно 2 карманные и 3 общие карты; роял-флеш входит в стрит-флеш. Учтены все игроки, включая сбросивших карты. Стрелка показывает направление отклонения, а не его статистическую значимость; на небольшой выборке колебания естественны.`
    : `${label}: ${count} of ${total} player combinations (${formatted(actual)}%). Expected ≈ ${formatted(expected)}%. Difference: ${difference >= 0 ? '+' : ''}${formatted(difference)} percentage points. Estimate from 1,000,000 random Omaha deals: exactly 2 hole and 3 board cards; royal flush is included in straight flush. All players count, including folded players. The arrow shows direction, not statistical significance; fluctuations are natural in small samples.`;
  const show = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 328)), top: Math.max(8, rect.top - 250) });
  };
  return <>
    <button
      type="button"
      aria-label={description}
      aria-describedby={position ? id : undefined}
      onMouseEnter={event => show(event.currentTarget)}
      onMouseLeave={() => setPosition(null)}
      onFocus={event => show(event.currentTarget)}
      onBlur={() => setPosition(null)}
      onClick={event => show(event.currentTarget)}
      onKeyDown={event => { if (event.key === 'Escape') setPosition(null); }}
      style={{ border: 0, background: 'transparent', color: '#475569', cursor: 'help', font: 'inherit', fontSize: 11, whiteSpace: 'nowrap', padding: '4px 2px' }}
    >{formatted(actual)}% {arrow}</button>
    {position ? <span id={id} role="tooltip" style={{ position: 'fixed', ...position, width: 300, maxWidth: 'calc(100vw - 32px)', padding: 12, borderRadius: 8, background: '#172a23', color: '#fff', fontSize: 12, fontWeight: 400, textAlign: 'left', zIndex: 1000, boxShadow: '0 4px 18px #0003', pointerEvents: 'none' }}>{description}</span> : null}
  </>;
}
