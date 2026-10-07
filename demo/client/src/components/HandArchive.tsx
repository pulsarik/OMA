import { useEffect, useState } from 'react';

type ArchiveRow = {
  partyId: string;
  date: number;
  bots: number;
  humans: number;
  players: number;
  hands: number;
  finished: boolean;
  durationMinutes: number;
  lowPercent: number | null;
  lowWins: number;
  combinations: {
    straightFlush: number;
    fourOfAKind: number;
    fullHouse: number;
    flush: number;
    straight: number;
    threeOfAKind: number;
    twoPair: number;
    pair: number;
    highCard: number;
  };
  replayCode?: string;
};

type Props = {
  language: 'en' | 'ru';
  apiUrl: string;
  onBack: () => void;
  onReplay: (code: string, players: number) => void;
};

export function HandArchive({ language, apiUrl, onBack, onReplay }: Props) {
  const ru = language === 'ru';
  const [rows, setRows] = useState<ArchiveRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const text = {
    title: ru ? 'Архив сдач' : 'Hand archive',
    back: ru ? 'Назад' : 'Back',
    loading: ru ? 'Загружаем архив…' : 'Loading archive…',
    failed: ru ? 'Не удалось загрузить архив.' : 'Could not load the archive.',
    retry: ru ? 'Повторить' : 'Retry',
    empty: ru ? 'Сохранённых игр пока нет.' : 'No saved games yet.',
    date: ru ? 'Дата записи' : 'Date',
    botsHumans: ru ? 'Боты / люди' : 'Bots / humans',
    hands: ru ? 'Сдач' : 'Hands',
    finished: ru ? 'Партия доиграна' : 'Game finished',
    duration: ru ? 'Минуты' : 'Minutes',
    low: ru ? 'С лоу' : 'With low',
    lowWins: ru ? 'Победы по лоу' : 'Low wins',
    straightFlush: ru ? 'Стрит-флэш' : 'Straight flush',
    fourOfAKind: ru ? 'Каре' : 'Four of a kind',
    fullHouse: ru ? 'Фулл-хаус' : 'Full house',
    flush: ru ? 'Флэш' : 'Flush',
    straight: ru ? 'Стрит' : 'Straight',
    threeOfAKind: ru ? 'Сет' : 'Three of a kind',
    twoPair: ru ? '2 пары' : 'Two pair',
    pair: ru ? 'Пара' : 'Pair',
    highCard: ru ? 'Хай' : 'High card',
    code: ru ? 'Код сдачи' : 'Hand code',
    yes: ru ? 'Да' : 'Yes',
    no: ru ? 'Нет' : 'No',
    average: ru ? 'Среднее' : 'Average',
  };

  useEffect(() => {
    const controller = new AbortController();
    setRows(null);
    setError(null);
    fetch(`${apiUrl}/api/archive`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || `${response.status} ${response.statusText}`);
        }
        return response.json() as Promise<ArchiveRow[]>;
      })
      .then(setRows)
      .catch(reason => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : text.failed);
        }
      });
    return () => controller.abort();
  }, [apiUrl, reload]);

  const average = (select: (row: ArchiveRow) => number) => (
    rows?.length ? rows.reduce((sum, row) => sum + select(row), 0) / rows.length : 0
  );
  const averageLow = rows?.filter(row => row.lowPercent !== null) ?? [];
  const lowMean = averageLow.length
    ? averageLow.reduce((sum, row) => sum + (row.lowPercent ?? 0), 0) / averageLow.length
    : null;
  const percent = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`;
  const date = (value: number) => new Date(value).toLocaleString(ru ? 'ru-RU' : 'en-GB');
  const averageCombination = (key: keyof ArchiveRow['combinations']) => (
    average(row => row.combinations[key]).toFixed(1)
  );

  return (
    <section style={{ border: '1px solid #cbd5e1', borderRadius: 22, background: 'rgba(255,255,255,.96)', padding: 'clamp(16px, 3vw, 26px)', display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack} style={{ border: 0, background: 'transparent', color: '#08734d', fontWeight: 900 }}>{'← '}{text.back}</button>
        <h2 style={{ margin: 0 }}>{text.title}</h2>
      </div>
      {rows === null && !error ? <p role="status">{text.loading}</p> : null}
      {error ? (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', color: '#b91c1c' }}>
          <span>{text.failed} {error}</span>
          <button onClick={() => setReload(current => current + 1)}>{text.retry}</button>
        </div>
      ) : null}
      {rows?.length === 0 ? <p role="status">{text.empty}</p> : null}
      {rows?.length ? (
        <div style={{ overflowX: 'auto', border: '1px solid #d8e2dc', borderRadius: 12 }}>
          <table style={{ width: '100%', minWidth: 1450, borderCollapse: 'collapse', fontSize: 13, textAlign: 'center' }}>
            <thead style={{ background: '#f0fdf4' }}>
              <tr>
                {[
                  text.date, text.botsHumans, text.hands, text.finished, text.duration, text.low, text.lowWins,
                  text.straightFlush, text.fourOfAKind, text.fullHouse, text.flush, text.straight, text.threeOfAKind,
                  text.twoPair, text.pair, text.highCard, text.code,
                ].map(label => <th key={label} scope="col" style={{ padding: 10, borderBottom: '1px solid #d8e2dc', whiteSpace: 'nowrap' }}>{label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.partyId}>
                  <td style={{ padding: 9, whiteSpace: 'nowrap' }}>{date(row.date)}</td>
                  <td>{row.bots} / {row.humans}</td>
                  <td>{row.hands}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.finished}
                      readOnly
                      aria-label={`${text.finished}: ${row.finished ? text.yes : text.no}`}
                    />
                  </td>
                  <td>{row.durationMinutes.toFixed(1)}</td>
                  <td>{percent(row.lowPercent)}</td>
                  <td>{row.lowWins}</td>
                  <td>{row.combinations.straightFlush}</td>
                  <td>{row.combinations.fourOfAKind}</td>
                  <td>{row.combinations.fullHouse}</td>
                  <td>{row.combinations.flush}</td>
                  <td>{row.combinations.straight}</td>
                  <td>{row.combinations.threeOfAKind}</td>
                  <td>{row.combinations.twoPair}</td>
                  <td>{row.combinations.pair}</td>
                  <td>{row.combinations.highCard}</td>
                  <td>
                    {row.replayCode ? (
                      <button type="button" onClick={() => onReplay(row.replayCode!, row.players)} style={{ border: 0, background: 'transparent', color: '#08734d', fontWeight: 900, textDecoration: 'underline', cursor: 'pointer' }}>
                        {row.replayCode}
                      </button>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                <th scope="row" style={{ padding: 9 }}>{text.average}</th>
                <td>{average(row => row.bots).toFixed(1)} / {average(row => row.humans).toFixed(1)}</td>
                <td>{average(row => row.hands).toFixed(1)}</td>
                <td>{percent(rows.filter(row => row.finished).length / rows.length * 100)}</td>
                <td>{average(row => row.durationMinutes).toFixed(1)}</td>
                <td>{percent(lowMean)}</td>
                <td>{average(row => row.lowWins).toFixed(1)}</td>
                <td>{averageCombination('straightFlush')}</td>
                <td>{averageCombination('fourOfAKind')}</td>
                <td>{averageCombination('fullHouse')}</td>
                <td>{averageCombination('flush')}</td>
                <td>{averageCombination('straight')}</td>
                <td>{averageCombination('threeOfAKind')}</td>
                <td>{averageCombination('twoPair')}</td>
                <td>{averageCombination('pair')}</td>
                <td>{averageCombination('highCard')}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
      <small style={{ color: '#65736a' }}>
        {ru
          ? 'Нажмите на код, чтобы начать повтор этой игры с ботами.'
          : 'Select a code to replay that game with bots.'}
      </small>
    </section>
  );
}
