import { Fragment, useEffect, useState } from 'react';
import baseline from '../omahaHighBaseline.json';
import { ArchiveStackHistory } from './ArchiveStackHistory';
import { CombinationFrequency } from './CombinationFrequency';

const countryFlagLoaders = import.meta.glob<string>('../../node_modules/flag-icons/flags/4x3/*.svg', {
  import: 'default',
  query: '?url&no-inline',
});

function CountryFlag({ country, label }: { country: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const loader = countryFlagLoaders[`../../node_modules/flag-icons/flags/4x3/${country.toLowerCase()}.svg`];
  useEffect(() => {
    let active = true;
    setSrc(null);
    if (loader) {
      loader()
        .then(url => { if (active) setSrc(url); })
        .catch(error => {
          console.error('Could not load country flag', error);
          if (active) setSrc('');
        });
    } else {
      setSrc('');
    }
    return () => { active = false; };
  }, [country, loader]);

  return src
    ? <img src={src} role="img" aria-label={label} title={label} style={{ width: 13, height: 10, flex: '0 0 13px', objectFit: 'cover' }} />
    : <span role="img" aria-label={label} title={label}>?</span>;
}

type ArchiveRow = {
  partyId: string;
  date: number;
  bots: number;
  humans: number;
  players: number;
  hands: number;
  completedHands: number;
  handsWithLow: number;
  finished: boolean;
  durationMinutes: number;
  lowPercent: number | null;
  lowWins: number;
  evaluatedPlayerHands: number;
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
  playerInfo?: { name?: string; country?: string }[];
};

type Props = {
  language: 'en' | 'ru';
  apiUrl: string;
  onBack: () => void;
  onReplay: (code: string, players: number) => void;
};

type ArchiveSummary = Pick<ArchiveRow, 'hands' | 'completedHands' | 'handsWithLow' | 'durationMinutes' | 'lowWins' | 'combinations' | 'evaluatedPlayerHands'> & {
  games: number;
  finishedGames: number;
};

export function HandArchive({ language, apiUrl, onBack, onReplay }: Props) {
  const ru = language === 'ru';
  const [rows, setRows] = useState<ArchiveRow[] | null>(null);
  const [summary, setSummary] = useState<ArchiveSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [expandedPartyId, setExpandedPartyId] = useState<string | null>(null);
  const text = {
    title: ru ? 'Архив сдач' : 'Hand archive',
    back: ru ? 'Назад' : 'Back',
    loading: ru ? 'Загружаем архив…' : 'Loading archive…',
    failed: ru ? 'Не удалось загрузить архив.' : 'Could not load the archive.',
    retry: ru ? 'Повторить' : 'Retry',
    empty: ru ? 'Сохранённых игр пока нет.' : 'No saved games yet.',
    date: ru ? 'Дата записи' : 'Date',
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
    codeHelp: ru ? 'Нажмите, чтобы начать повтор этой игры с ботами.' : 'Click to replay this game with bots.',
    player: ru ? 'Игрок' : 'Player',
    playerHelp: ru
      ? 'Если человек играл один — показаны его имя и флаг. Если людей несколько — показаны только флаги.'
      : 'For a solo human player, this shows their name and flag. For multiple humans, only flags are shown.',
    countryUnknown: ru ? 'Страна неизвестна' : 'Country unknown',
    dateHelp: ru ? 'Дата и время начала партии.' : 'Date and time when the game started.',
    handsHelp: ru ? 'Общее число сдач в партии.' : 'Total number of hands in the game.',
    finishedHelp: ru ? 'Завершена ли партия.' : 'Whether the game was completed.',
    durationHelp: ru ? 'Активное время в минутах: паузы между действиями учитываются максимум по одной минуте.' : 'Active minutes: gaps between actions count for up to one minute.',
    lowHelp: ru ? 'Доля завершённых сдач, в которых была выигрышная комбинация лоу.' : 'Share of completed hands that had a qualifying low.',
    lowWinsHelp: ru ? 'Количество завершённых сдач, в которых выиграли лоу.' : 'Number of completed hands with a low winner.',
    combinationHelp: ru
      ? 'Доля комбинаций этого типа среди всех оценённых рук игроков.'
      : 'Share of this hand type among all evaluated player hands.',
    yes: ru ? 'Да' : 'Yes',
    no: ru ? 'Нет' : 'No',
    average: ru ? 'Среднее' : 'Average',
    stackHistory: ru ? 'История стека' : 'Stack history',
    showStack: ru ? 'Стек' : 'Stack',
    hideStack: ru ? 'Скрыть' : 'Hide',
    stackHelp: ru ? 'Показать изменение стека игроков-людей по раздачам.' : 'Show human players’ stacks by hand.',
  };

  useEffect(() => {
    const controller = new AbortController();
    setRows(null);
    setSummary(null);
    setError(null);
    setExpandedPartyId(null);
    fetch(`${apiUrl}/api/archive?page=${page}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || `${response.status} ${response.statusText}`);
        }
        return response.json() as Promise<{ rows: ArchiveRow[]; summary: ArchiveSummary; page: number; totalPages: number }>;
      })
      .then(result => {
        if (controller.signal.aborted) return;
        setRows(result.rows);
        setSummary(result.summary);
        setPagination({ page: result.page, totalPages: result.totalPages });
      })
      .catch(reason => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : text.failed);
        }
      });
    return () => controller.abort();
  }, [apiUrl, reload, page]);

  const average = (total: number) => (
    summary?.games ? total / summary.games : 0
  );
  const lowMean = summary?.completedHands
    ? (summary.handsWithLow / summary.completedHands) * 100
    : null;
  const percent = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`;
  const date = (value: number) => new Date(value).toLocaleString(ru ? 'ru-RU' : 'en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const combinationFrequency = (count: number, denominator: number) => (
    denominator > 0 ? `${(100 * count / denominator).toFixed(2)}%` : '—'
  );
  const countryCode = (country?: string) => {
    const code = country?.trim().toUpperCase();
    return code && /^[A-Z]{2}$/.test(code) && code !== 'XX'
      ? code
      : undefined;
  };
  const combinationKeys = Object.keys(baseline.counts) as (keyof ArchiveRow['combinations'])[];
  const totalCombinations = summary ? (summary.evaluatedPlayerHands ?? combinationKeys.reduce((sum, key) => sum + summary.combinations[key], 0)) : 0;
  const columns = [
    { key: 'code', label: text.code, help: text.codeHelp },
    { key: 'player', label: text.player, help: text.playerHelp },
    { key: 'date', label: text.date, help: text.dateHelp },
    { key: 'hands', label: text.hands, help: text.handsHelp },
    { key: 'finished', label: text.finished, help: text.finishedHelp },
    { key: 'duration', label: text.duration, help: text.durationHelp },
    { key: 'low', label: text.low, help: text.lowHelp },
    { key: 'lowWins', label: text.lowWins, help: text.lowWinsHelp },
    ...combinationKeys.map(key => ({ key, label: text[key], help: text.combinationHelp })),
    { key: 'stackHistory', label: text.stackHistory, help: text.stackHelp },
  ];

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
                {columns.map(column => <th key={column.key} scope="col" title={column.help} style={{ padding: 10, borderBottom: '1px solid #d8e2dc', whiteSpace: 'nowrap' }}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {summary ? <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                <td>—</td>
                <td>—</td>
                <th scope="row" style={{ padding: 9 }} title={text.average}>{text.average}</th>
                <td>{average(summary.hands).toFixed(1)}</td>
                <td>{percent(average(summary.finishedGames) * 100)}</td>
                <td>{average(summary.durationMinutes).toFixed(1)}</td>
                <td>{percent(lowMean)}</td>
                <td>{average(summary.lowWins).toFixed(1)}</td>
                {combinationKeys.map(key => <td key={key}>
                  <div>{combinationFrequency(summary.combinations[key], totalCombinations)}</div>
                  <CombinationFrequency
                    count={summary.combinations[key]}
                    total={totalCombinations}
                    expected={baseline.counts[key] / baseline.samples * 100}
                    label={text[key]}
                    language={language}
                  />
                </td>)}
                <td>—</td>
              </tr> : null}
              {rows.map(row => {
                const expanded = expandedPartyId === row.partyId;
                return <Fragment key={row.partyId}>
                <tr>
                  <td>
                    {row.replayCode ? (
                      <button type="button" onClick={() => onReplay(row.replayCode!, row.players)} style={{ border: 0, background: 'transparent', color: '#08734d', fontWeight: 900, textDecoration: 'underline', cursor: 'pointer' }}>
                        {row.replayCode}
                      </button>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                      {(row.playerInfo ?? []).map((player, index) => {
                        const flag = countryCode(player.country);
                        const flagLabel = flag ? `Country: ${player.country}` : text.countryUnknown;
                        return row.humans === 1 ? (
                          <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {player.name ? <span>{player.name}</span> : null}
                            {flag
                              ? <CountryFlag country={flag} label={flagLabel} />
                              : <span role="img" aria-label={flagLabel} title={flagLabel}>?</span>}
                          </span>
                        ) : (
                          flag
                            ? <CountryFlag key={index} country={flag} label={flagLabel} />
                            : <span key={index} role="img" aria-label={flagLabel} title={flagLabel}>?</span>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ padding: 9, whiteSpace: 'nowrap' }}>{date(row.date)}</td>
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
                  <td>{combinationFrequency(row.combinations.straightFlush, row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0))}</td>
                  <td>{combinationFrequency(row.combinations.fourOfAKind, row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0))}</td>
                  <td>{combinationFrequency(row.combinations.fullHouse, row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0))}</td>
                  <td>{combinationFrequency(row.combinations.flush, row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0))}</td>
                  <td>{combinationFrequency(row.combinations.straight, row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0))}</td>
                  <td>{combinationFrequency(row.combinations.threeOfAKind, row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0))}</td>
                  <td>{combinationFrequency(row.combinations.twoPair, row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0))}</td>
                  <td>{combinationFrequency(row.combinations.pair, row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0))}</td>
                  <td>{combinationFrequency(row.combinations.highCard, row.evaluatedPlayerHands ?? Object.values(row.combinations).reduce((a, b) => a + b, 0))}</td>
                  <td style={{ padding: 8 }}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`stack-history-${row.partyId}`}
                      onClick={() => setExpandedPartyId(expanded ? null : row.partyId)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {expanded ? text.hideStack : text.showStack}
                    </button>
                  </td>
                </tr>
                {expanded ? (
                  <tr id={`stack-history-${row.partyId}`}>
                    <td colSpan={columns.length} style={{ padding: '4px 14px 16px', textAlign: 'left', background: '#f8fbf9' }}>
                      <ArchiveStackHistory apiUrl={apiUrl} partyId={row.partyId} language={language} />
                    </td>
                  </tr>
                ) : null}
                </Fragment>;
              })}
            </tbody>
          </table>
        </div>
      ) : null}
      {pagination.totalPages > 1 ? (
        <nav aria-label={ru ? 'Страницы архива' : 'Archive pages'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
          <button type="button" disabled={rows === null || pagination.page <= 1} onClick={() => setPage(pagination.page - 1)}>
            {ru ? 'Предыдущая' : 'Previous'}
          </button>
          <span aria-live="polite">{ru ? `Страница ${pagination.page} из ${pagination.totalPages}` : `Page ${pagination.page} of ${pagination.totalPages}`}</span>
          <button type="button" disabled={rows === null || pagination.page >= pagination.totalPages} onClick={() => setPage(pagination.page + 1)}>
            {ru ? 'Следующая' : 'Next'}
          </button>
        </nav>
      ) : null}
      <small style={{ color: '#65736a' }}>
        {text.codeHelp}
      </small>
    </section>
  );
}
