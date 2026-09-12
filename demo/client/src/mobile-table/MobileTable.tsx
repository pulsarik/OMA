import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cards, CombinationHint } from './Cards';
import { amount, clockwiseOpponents, moveLabel, nameOf, OPPONENT_POSITIONS, rankLabel, stageLabel, words } from './presentation';
import type { Language, MobileTableProps, Move, Seat, TableState } from './types';
import './mobileTable.css';

function PlayerSeat({ seat, player, language, hero = false, dealerId, seconds }: {
  seat: Seat; player: TableState; language: Language; hero?: boolean; dealerId?: string; seconds?: number;
}) {
  const t = (en: string, ru: string) => words(language, en, ru);
  const showdown = player.stage === 'showdown';
  const summary = showdown ? player.result ?? player.showdownSummary : undefined;
  const payout = summary?.points.find(p => p.id === seat.id);
  const result = showdown ? player.result?.players.find(p => p.id === seat.id) : undefined;
  const winsHigh = !seat.folded && (payout?.high ?? 0) > 0;
  const winsLow = !seat.folded && (payout?.low ?? 0) > 0;
  const isTurn = !showdown && player.currentPlayerId === seat.id;
  const total = player.partyTotals.find(p => p.id === seat.id)?.total;
  const eliminated = total !== undefined && total <= 0;
  const offline = !seat.isBot && (seat.disconnected || seat.connected === false);
  const waiting = player.waitingForPlayers.some(p => p.id === seat.id);
  const lastAction = [...player.actions].reverse().find(a => a.playerId === seat.id && a.stage === player.stage);
  const blind = player.blinds?.smallBlindPlayerId === seat.id ? 'SB' : player.blinds?.bigBlindPlayerId === seat.id ? 'BB' : '';
  // Never infer other players' cards, even if a stale snapshot includes them before showdown.
  const cards = hero ? player.hole : showdown ? seat.hole : undefined;
  return <article className={`mt-seat${hero ? ' mt-seat--hero' : ''}${isTurn ? ' mt-seat--turn' : ''}${seat.folded ? ' mt-seat--folded' : ''}`}
    data-testid={`mt-seat-${seat.id}`} data-hero={hero} data-current={isTurn}>
    <div className="mt-seat-name" title={`${nameOf(seat)} · ${amount(seat.stack)}`}>
      <span>{hero ? t('You', 'Вы') : nameOf(seat)}</span><span aria-hidden="true">·</span><strong>{amount(seat.stack)}</strong>
    </div>
    <div className="mt-position-line">
      {dealerId === seat.id ? <span className="mt-position mt-position--dealer" title={t('Dealer', 'Дилер')}>D</span> : null}
      {blind ? <span className="mt-position">{blind}</span> : null}
      {offline ? <span className="mt-offline">{t('Offline', 'Нет связи')}</span> : null}
      {eliminated ? <span>{t('Out', 'Выбыл')}</span> : !showdown && seat.stack === 0 && !seat.folded ? <span>ALL-IN</span> : null}
    </div>
    <div className={`mt-hand${winsHigh ? ' mt-hand--high' : ''}${winsLow ? ' mt-hand--low' : ''}`} data-testid={`mt-hand-${seat.id}`}>
      <Cards cards={cards} count={seat.cardCount || 4} language={language} />
    </div>
    <div className="mt-seat-result">
      {showdown ? <>
        <div className="mt-awards">
          {winsHigh ? <span className="mt-award mt-award--high" data-testid={`mt-high-${seat.id}`}>H +{amount(payout?.high)}</span> : null}
          {winsLow ? <span className="mt-award mt-award--low" data-testid={`mt-low-${seat.id}`}>L +{amount(payout?.low)}</span> : null}
          {(payout?.uncontested ?? 0) > 0 ? <span className="mt-return">{t('Returned', 'Возврат')} {amount(payout?.uncontested)}</span> : null}
        </div>
        {!hero ? <div className="mt-ranks">
          {seat.folded ? <span>{t('Folded', 'Фолд')}</span> : null}
          {result?.highRank ? <span>H · {rankLabel(result.highRank, language)}</span> : null}
          {result?.lowRank ? <span>L · {rankLabel(result.lowRank, language)}</span> : null}
        </div> : null}
      </> : <span className={isTurn ? 'mt-turn-label' : ''}>
        {waiting ? t('Waiting', 'Ожидает') : isTurn ? <>{hero ? t('Your turn', 'Ваш ход') : t('Thinking', 'Думает')}{seconds !== undefined ? ` · ${seconds}s` : ''}</>
          : seat.folded ? t('Folded', 'Фолд') : lastAction ? `${moveLabel(lastAction.move, language)}${lastAction.amount ? ` ${amount(lastAction.amount)}` : ''}` : '\u00a0'}
      </span>}
    </div>
  </article>;
}

function potPools(pot: { amount: number; noLow?: boolean; uncontestedWinnerId?: string }) {
  if (pot.uncontestedWinnerId) return { high: 0, low: 0, returned: pot.amount };
  return pot.noLow
    ? { high: pot.amount, low: 0, returned: 0 }
    : { high: Math.ceil(pot.amount / 2), low: Math.floor(pot.amount / 2), returned: 0 };
}

function PotSplit({ player: p, language, onOpen }: { player: TableState; language: Language; onOpen: () => void }) {
  const t = (en: string, ru: string) => words(language, en, ru);
  const result = p.result ?? p.showdownSummary;
  if (!result) return null;
  const pots = result.sidePots;
  const totalHigh = result.points.reduce((sum, score) => sum + score.high, 0);
  const totalLow = result.points.reduce((sum, score) => sum + score.low, 0);
  if (pots.length <= 1) return <span className="mt-pot-caption" title={t('An odd chip goes to HIGH', 'Нечётная фишка относится к HIGH')}>
    {result.noLow
      ? <>{t('Whole pot', 'Весь банк')} · H {amount(totalHigh)} · {t('NO LOW', 'НЕТ LOW')}</>
      : <>{t('Shares', 'Доли')} · H {amount(totalHigh)} · L {amount(totalLow)}</>}
  </span>;

  const main = potPools(pots[0]);
  return <div className="mt-pot-splits" data-testid="mt-pot-splits">
    <span>{t('Main', 'Основной')} {amount(pots[0].amount)} · {main.returned
      ? `${t('return', 'возврат')} ${amount(main.returned)}`
      : `H ${amount(main.high)}${main.low ? ` / L ${amount(main.low)}` : ` · ${t('no LOW', 'нет LOW')}`}`}</span>
    <button className="mt-side-link" type="button" onClick={onOpen}>
      {t('Side pots', 'Побочные банки')} · {pots.length - 1} · {t('details', 'подробно')}
    </button>
  </div>;
}

function ActionDock({ props, language }: { props: MobileTableProps; language: Language }) {
  const { player, controls: c } = props;
  const t = (en: string, ru: string) => words(language, en, ru);
  const press = useRef('');
  const signature = `${player.handId}:${player.stage}:${player.currentPlayerId}:${c.canAct}`;
  const act = (event: React.MouseEvent, move: Move) => {
    if (!c.canAct || (event.detail > 0 && press.current !== signature)) return;
    const wager = move === 'bet' || move === 'raise';
    props.onMove(move, wager ? c.wagerTarget : undefined, wager ? c.betSize : undefined);
  };
  if (player.stage === 'showdown') return props.onNext ? <footer className="mt-dock">
    <button className="mt-next" disabled={!c.connected || c.creatingDeal} onClick={props.onNext}>
      {c.creatingDeal ? t('Dealing…', 'Раздаём…') : t('Next deal', 'Следующая раздача')}
    </button>
  </footer> : null;
  return <footer className="mt-dock" data-testid="mt-actions">
    <fieldset disabled={!c.canAct} aria-label={t('Actions', 'Действия')} onPointerDownCapture={() => { press.current = signature; }}>
      <div className="mt-bet-sizes" role="group" aria-label={t('Bet size', 'Размер ставки')}>
        {(['blind', 'quarter', 'half', 'pot'] as const).map((size, i) => <button key={size} aria-pressed={c.betSize === size}
          disabled={player.currentBet > 0 && !c.canRaise} onClick={() => props.onBetSize(size)}>
          {['BB', '¼ POT', '½ POT', 'POT'][i]}</button>)}
      </div>
      <div className="mt-action-buttons">
        <button className="mt-fold" onClick={e => act(e, 'fold')}>{t('Fold', 'Фолд')}</button>
        <button className="mt-call" disabled={c.callAmount > 0 && !c.canCall} onClick={e => act(e, c.callAmount > 0 ? 'call' : 'check')}>
          {c.callAmount > 0 ? <>{c.callIsAllIn ? 'All-in' : t('Call', 'Колл')} <b>{amount(c.callAmount)}</b></> : t('Check', 'Чек')}
        </button>
        <button className="mt-raise" disabled={player.currentBet > 0 && !c.canRaise} onClick={e => act(e, player.currentBet > 0 ? 'raise' : 'bet')}>
          {c.wagerIsAllIn ? 'All-in' : player.currentBet > 0 ? t('Raise to', 'Рейз до') : t('Bet', 'Ставка')} <b>{amount(c.wagerTarget)}</b>
        </button>
      </div>
      {c.maxRaises !== undefined ? <small className="mt-cap">{t('Raises', 'Повышения')}: {c.raiseCount}/{c.maxRaises}</small> : null}
    </fieldset>
  </footer>;
}

function PotDialog({ player: p, language, open, onClose }: {
  player: TableState; language: Language; open: boolean; onClose: () => void;
}) {
  const t = (en: string, ru: string) => words(language, en, ru);
  const result = p.stage === 'showdown' ? p.result ?? p.showdownSummary : undefined;
  const label = (id: string) => nameOf(p.players.find(s => s.id === id) ?? { id });
  const pots = result?.sidePots ?? p.potBreakdown ?? [];
  const contributions = p.players.map(seat => ({
    seat,
    total: p.totalContributions?.[seat.id] ?? 0,
    round: p.roundBets?.[seat.id] ?? 0,
    payout: result?.points.find(score => score.id === seat.id),
  })).sort((a, b) => b.total - a.total);
  const maxContribution = Math.max(1, ...contributions.map(item => item.total));

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="mt-pot-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="mt-pot-dialog" id="mt-pot-details" role="dialog" aria-modal="true" aria-labelledby="mt-pot-title">
      <header className="mt-pot-dialog-header">
        <div>
          <span>{t('Pot details', 'Состав банка')}</span>
          <h2 id="mt-pot-title">{t('Pot', 'Банк')} {amount(p.potCoins)}</h2>
        </div>
        <button className="mt-pot-close" type="button" onClick={onClose} autoFocus aria-label={t('Close pot details', 'Закрыть состав банка')}>×</button>
      </header>

      {pots.length ? <div className="mt-pot-cards" aria-label={t('Pots', 'Банки')}>{pots.map((pot, i) => {
      const settled = result?.sidePots[i];
      const pools = settled ? potPools(settled) : undefined;
      return <article className="mt-pot-detail" key={i}>
        <div className="mt-pot-detail-title"><span>{i === 0 ? t('Main pot', 'Основной банк') : `${t('Side pot', 'Побочный банк')} ${i}`}</span><strong>{amount(pot.amount)}</strong></div>
        {pools ? <p className="mt-pot-pools">{pools.returned
          ? `${t('Uncalled return', 'Невостребованный остаток')}: ${amount(pools.returned)}`
          : `${t('Shares', 'Доли')}: HIGH ${amount(pools.high)} · ${pools.low ? `LOW ${amount(pools.low)}` : t('no LOW', 'нет LOW')}`}</p> : null}
        <p className="mt-pot-eligible">{t('Eligible', 'Участвуют')}: {pot.eligiblePlayerIds.map(label).join(', ')}</p>
        {settled ? <>
          <p className="mt-pot-winners"><b>HIGH</b> {settled.highWinners.map(label).join(', ') || '—'}</p>
          <p className="mt-pot-winners mt-pot-winners--low"><b>LOW</b> {settled.noLow ? t('No qualifying low', 'Нет подходящей LOW') : settled.lowWinners.map(label).join(', ')}</p>
          {settled.uncontestedWinnerId ? <p>{t('Uncontested', 'Без борьбы')}: {label(settled.uncontestedWinnerId)}</p> : null}
        </> : null}
      </article>;
    })}</div> : null}

      <section className="mt-contributions" aria-labelledby="mt-contributions-title">
        <div className="mt-contributions-heading">
          <h3 id="mt-contributions-title">{t('Player contributions', 'Вклады игроков')}</h3>
          <span>{t('Contributed this hand', 'Внесено за раздачу')}</span>
        </div>
        <div className="mt-results-list">{contributions.map(({ seat, total, round, payout }) => {
          const net = payout ? payout.total - total : 0;
          return <article className={seat.id === p.playerId ? 'mt-contribution mt-contribution--hero' : 'mt-contribution'} key={seat.id}>
            <div className="mt-contribution-title">
              <strong>{seat.id === p.playerId ? t('You', 'Вы') : nameOf(seat)}</strong>
              <b>{amount(total)}</b>
            </div>
            <div className="mt-contribution-track" aria-hidden="true"><i style={{ width: `${total ? Math.max(2, (total / maxContribution) * 100) : 0}%` }} /></div>
            <div className="mt-contribution-meta">
              <span>{t('This street', 'На этой улице')} <b>+{amount(round)}</b></span>
              {payout ? <span>{t('Payout', 'Выплата')} <b>{amount(payout.total)}</b> · {t('Net', 'Итог')} <b className={net >= 0 ? 'mt-net--plus' : 'mt-net--minus'}>{net > 0 ? '+' : ''}{amount(net)}</b></span> : null}
            </div>
          </article>;
        })}</div>
      </section>
    </section>
  </div>;
}

export default function MobileTable(props: MobileTableProps) {
  const { player: p, controls: c } = props;
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem('omaha-mobile-language') === 'ru' ? 'ru' : 'en'; } catch { return 'en'; }
  });
  const [potOpen, setPotOpen] = useState(false);
  const potButton = useRef<HTMLButtonElement>(null);
  const closePot = useCallback(() => {
    setPotOpen(false);
    requestAnimationFrame(() => potButton.current?.focus());
  }, []);
  const t = (en: string, ru: string) => words(language, en, ru);
  const opponents = clockwiseOpponents(p.players, p.playerId);
  const positions = OPPONENT_POSITIONS[opponents.length];
  const showdown = p.stage === 'showdown';
  const result = showdown ? p.result ?? p.showdownSummary : undefined;
  const payout = result?.points.find(s => s.id === p.playerId);
  const contributed = p.totalContributions?.[p.playerId] ?? 0;
  const net = (payout?.total ?? 0) - contributed;
  const heroCombo = showdown ? p.result?.players.find(s => s.id === p.playerId) ?? p.currentCombo : p.currentCombo;
  const hero = { ...p.players.find(s => s.id === p.playerId), id: p.playerId, name: p.playerName, stack: p.stack, folded: p.folded, cardCount: p.hole.length || 4 };
  const finished = Boolean(props.winnerName || p.partyFinishedEarly);
  return <main className="mt-page" lang={language} data-testid="mobile-table" data-players={p.players.length}>
    <div className="mt-shell">
      <header className="mt-header">
        <span className="mt-brand">OMAHA <b>HI–LO</b></span>
        <span className="mt-table-id" title={props.tableName ?? p.partyCode}>{props.tableName ?? p.partyCode} · №{p.handNumber}</span>
        <span className={`mt-connection${c.connected ? '' : ' mt-connection--offline'}`} role="img" aria-label={t(c.connected ? 'Connected' : 'Disconnected', c.connected ? 'Подключено' : 'Нет связи')} />
        <details className="mt-menu"><summary aria-label={t('Table menu', 'Меню стола')}>☰</summary>
          <nav aria-label={t('Table menu', 'Меню стола')}>
            <button onClick={props.onStats} disabled={!props.statsAvailable}>{t('Statistics', 'Статистика')}</button>
            <button onClick={props.onAbout}>{t('About & rules', 'О проекте и правила')}</button>
            <button onClick={() => { const next = language === 'ru' ? 'en' : 'ru'; setLanguage(next); try { localStorage.setItem('omaha-mobile-language', next); } catch { /* Private mode. */ } }}>Language · EN / RU</button>
          </nav>
        </details>
      </header>
      {c.sessionWarning ? <p className="mt-alert" role="alert">{t('Table expires in', 'Стол будет удалён через')} {c.sessionWarning}</p> : null}
      {!c.connected ? <p className="mt-alert" role="status">{t('Reconnecting…', 'Восстанавливаем соединение…')}</p> : null}
      <div className={`mt-scene${showdown ? ' mt-scene--showdown' : ''}`} data-testid="mt-scene">
        <div className="mt-rail" aria-hidden="true" />
        {(p.isReplay || p.replayOfHandId) ? <span className="mt-replay">↻ {t('REPLAY', 'ПОВТОР')} · {p.replayCode}</span> : null}
        {opponents.map((seat, i) => <div className="mt-seat-anchor" key={seat.id} style={{ left: `${positions[i][0]}%`, top: `${positions[i][1]}%` }}>
          <PlayerSeat seat={seat} player={p} language={language} dealerId={props.dealerId} seconds={c.turnSeconds} />
        </div>)}
        <section className="mt-board" aria-label={t('Community board', 'Общие карты')}>
          <span className="mt-street">{stageLabel(p.stage, language)}</span>
          <div data-testid="mt-board-cards"><Cards cards={p.community} count={5} board language={language} /></div>
          <button ref={potButton} className="mt-pot" type="button" onClick={() => setPotOpen(true)} aria-expanded={potOpen} aria-controls="mt-pot-details">
            <span>{t('Pot', 'Банк')}</span> <strong>{amount(p.potCoins)}</strong><i aria-hidden="true">›</i>
          </button>
          {result ? <PotSplit player={p} language={language} onOpen={() => setPotOpen(true)} />
            : <span className="mt-pot-caption">{t('Bet', 'Ставка')} {amount(p.currentBet)} · {t('Blinds', 'Блайнды')} {amount(p.blinds?.small)}/{amount(p.blinds?.big)}</span>}
        </section>
        <div className="mt-hero-anchor"><PlayerSeat hero seat={hero} player={p} language={language} dealerId={props.dealerId} seconds={c.turnSeconds} /></div>
        <div className="mt-hints">
          <CombinationHint combo={heroCombo} kind="high" language={language} hole={p.hole} board={p.community} />
          <CombinationHint combo={heroCombo} kind="low" language={language} hole={p.hole} board={p.community} />
        </div>
        <div className="mt-personal-result" data-testid="mt-personal-result">
          {payout ? <><strong className={net > 0 ? 'mt-net--plus' : net < 0 ? 'mt-net--minus' : undefined}>{t('NET', 'ИТОГ')}: {net > 0 ? '+' : ''}{amount(net)}</strong><span>{t('Contributed', 'Внесено')}: {amount(contributed)} · {t('Payout', 'Выплата')}: {amount(payout.total)}</span></>
            : <span>{t('Exactly 2 from hand + 3 from board', 'Ровно 2 из руки + 3 с борда')}</span>}
        </div>
      </div>
      {finished ? <section className="mt-finished" role="status">
        <strong>{props.winnerName ? `${t('Winner', 'Победитель')}: ${props.winnerName}` : t('Table ended by agreement', 'Стол завершён по соглашению')}</strong>
        {props.isHost ? <div><button disabled={!c.connected} onClick={props.onRestart}>{t('Deal 1000 again', 'Снова раздать по 1000')}</button><button onClick={props.onExit}>{t('Exit to home', 'На главную')}</button></div>
          : <p>{t('Waiting for the host', 'Ждём решения ведущего')}</p>}
        <button onClick={props.onStats}>{t('Final statistics', 'Итоговая статистика')}</button>
      </section> : <ActionDock props={props} language={language} />}
      {c.notice ? <p className="mt-notice" role="status">{c.notice}</p> : null}
      <PotDialog player={p} language={language} open={potOpen} onClose={closePot} />
    </div>
  </main>;
}
