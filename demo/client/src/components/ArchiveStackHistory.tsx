import { useEffect, useMemo, useState } from 'react';
import { WalletHistoryChart } from './WalletHistoryChart';

type StackHistory = {
  series: Array<{
    id: string;
    name?: string;
    points: Array<{ handNumber: number; stack: number }>;
  }>;
  completedHands: number;
};

export function ArchiveStackHistory({ apiUrl, partyId, language }: {
  apiUrl: string;
  partyId: string;
  language: 'en' | 'ru';
}) {
  const ru = language === 'ru';
  const [history, setHistory] = useState<StackHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setHistory(null);
    setError(null);
    fetch(`${apiUrl}/api/archive/${encodeURIComponent(partyId)}/stacks`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || `${response.status} ${response.statusText}`);
        }
        return response.json() as Promise<StackHistory>;
      })
      .then(result => {
        if (!controller.signal.aborted) setHistory(result);
      })
      .catch(reason => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      });
    return () => controller.abort();
  }, [apiUrl, partyId, reload]);

  const names = useMemo(() => new Map(history?.series.map((series, index) => [
    series.id,
    series.name || (ru ? `Игрок ${index + 1}` : `Player ${index + 1}`),
  ]) ?? []), [history, ru]);
  const chartSeries = history?.series.map(series => ({
    playerId: series.id,
    points: series.points.map(point => ({ handNumber: point.handNumber, wallet: point.stack })),
  })) ?? [];
  const formatStack = (value: number) => Math.round(value).toLocaleString(ru ? 'ru-RU' : 'en-GB');

  if (error) {
    return (
      <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', color: '#b91c1c' }}>
        <span>{ru ? 'Не удалось загрузить историю стека.' : 'Could not load stack history.'} {error}</span>
        <button type="button" onClick={() => setReload(current => current + 1)}>
          {ru ? 'Повторить' : 'Retry'}
        </button>
      </div>
    );
  }
  if (!history) return <p role="status">{ru ? 'Загружаем историю стека…' : 'Loading stack history…'}</p>;
  if (!chartSeries.length) return <p>{ru ? 'В этой партии нет игроков-людей.' : 'This game has no human players.'}</p>;

  return (
    <div>
      <WalletHistoryChart
        series={chartSeries}
        playerName={id => names.get(id) ?? id}
        formatValue={formatStack}
        title={ru ? 'История стека игроков' : 'Player stack history'}
        handLabel={ru ? 'Раздача' : 'Hand'}
        walletLabel={ru ? 'Фишки' : 'Stack'}
      />
      <small style={{ display: 'block', marginTop: 8, color: '#65736a' }}>
        {ru
          ? `Показан стек после каждой завершённой раздачи (${history.completedHands}).`
          : `Stack after each completed hand (${history.completedHands}).`}
      </small>
    </div>
  );
}
