import React, { useRef, useState } from 'react';
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
      {seat.isBot ? <span>{t('BOT', 'БОТ')}</span> : null}
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

function ActionDock({ props, language }: { props: MobileTableProps; language: Language }) {
  const { player, controls: c } = props;
  const t = (en: string, ru: string) => words(language, en, ru);
  const press = useRef('');
  const signature = `${player.handId}:${player.stage}:${player.currentPlayerId}:${c.canAct}`;
  const act = (event: React.MouseEvent, move: Move) => {
    if (!c.canAct || (event.detail > 0 && press.current !== signature)) return;
    const wager = move === 'bet' || move === 'raise';
    if (((wager && c.wagerIsAllIn) || (move === 'call' && c.callIsAllIn))
      && !window.confirm(t('Confirm all-in?', 'Подтвердить олл-ин?'))) return;
    props.onMove(move, wager ? c.wagerTarget : undefined, wager ? c.betSize : undefined);
  };
  if (player.stage === 'showdown') return <footer className="mt-dock">
    {props.onNext ? <button className="mt-next" disabled={!c.connected || c.creatingDeal} onClick={props.onNext}>
      {c.creatingDeal ? t('Dealing…', 'Раздаём…') : t('Next deal', 'Следующая раздача')}
    </button> : <p className="mt-wait">{t('Hand complete', 'Раздача завершена')}</p>}
  </footer>;
  return <footer className="mt-dock" data-testid="mt-actions">
    <div className="mt-action-status" role="status">
      {!c.connected ? t('Reconnecting… Actions paused', 'Восстанавливаем связь… Действия недоступны')
        : c.pending ? t('Waiting for confirmation…', 'Ждём подтверждения…')
          : c.canAct ? t('Your turn', 'Ваш ход') : player.folded ? t('You folded · watching the hand', 'Вы сбросили · наблюдаем раздачу')
            : t('Waiting for the next action', 'Ждём следующего хода')}
      {c.canAct && c.turnSeconds !== undefined ? <span className="mt-timer">{c.turnSeconds}s</span> : null}
    </div>
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

function PotDetails({ player: p, language }: { player: TableState; language: Language }) {
  const t = (en: string, ru: string) => words(language, en, ru);
  const result = p.stage === 'showdown' ? p.result ?? p.showdownSummary : undefined;
  const label = (id: string) => nameOf(p.players.find(s => s.id === id) ?? { id });
  return <details className="mt-details" id="mt-pot-details">
    <summary>{t('Pot details & results', 'Банки и результаты')}</summary>
    {(result?.sidePots ?? p.potBreakdown ?? []).map((pot, i) => {
      const settled = result?.sidePots[i];
      return <section className="mt-pot-detail" key={i}>
        <strong>{i === 0 ? t('Main pot', 'Основной банк') : `${t('Side pot', 'Побочный банк')} ${i}`} · {amount(pot.amount)}</strong>
        <p>{t('Eligible', 'Участвуют')}: {pot.eligiblePlayerIds.map(label).join(', ')}</p>
        {settled ? <>
          <p>HIGH: {settled.highWinners.map(label).join(', ') || '—'}</p>
          <p>LOW: {settled.noLow ? t('No qualifying low', 'Нет подходящей LOW') : settled.lowWinners.map(label).join(', ')}</p>
          {settled.uncontestedWinnerId ? <p>{t('Uncontested', 'Без борьбы')}: {label(settled.uncontestedWinnerId)}</p> : null}
        </> : null}
      </section>;
    })}
    <div className="mt-results-list">{p.players.map(seat => {
      const payout = result?.points.find(s => s.id === seat.id);
      const contribution = p.totalContributions?.[seat.id] ?? 0;
      return <div key={seat.id}><strong>{nameOf(seat)}</strong>
        <span>{t('Contributed', 'Внесено')}: {amount(contribution)} · {t('Round', 'Улица')}: {amount(p.roundBets?.[seat.id] ?? 0)}</span>
        {payout ? <span>H {amount(payout.high)} · L {amount(payout.low)} · {t('Returned', 'Возврат')} {amount(payout.uncontested ?? 0)}<br />
          {t('Payout', 'Выплата')} {amount(payout.total)} · {t('Net', 'Итог')} {amount(payout.total - contribution)}</span> : null}
      </div>;
    })}</div>
  </details>;
}

export default function MobileTable(props: MobileTableProps) {
  const { player: p, controls: c } = props;
  const [language, setLanguage] = useState<Language>(() => {
    try { return localStorage.getItem('omaha-mobile-language') === 'en' ? 'en' : 'ru'; } catch { return 'ru'; }
  });
  const t = (en: string, ru: string) => words(language, en, ru);
  const opponents = clockwiseOpponents(p.players, p.playerId);
  const positions = OPPONENT_POSITIONS[opponents.length];
  const showdown = p.stage === 'showdown';
  const result = showdown ? p.result ?? p.showdownSummary : undefined;
  const payout = result?.points.find(s => s.id === p.playerId);
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
            <button onClick={() => { const next = language === 'ru' ? 'en' : 'ru'; setLanguage(next); try { localStorage.setItem('omaha-mobile-language', next); } catch { /* Private mode. */ } }}>Русский / English</button>
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
          <strong className="mt-pot">{t('Pot', 'Банк')} {amount(p.potCoins)}</strong>
          <span className="mt-pot-caption">{result ? <>HIGH {amount(result.points.reduce((v, s) => v + s.high, 0))} · {result.noLow ? t('NO LOW', 'НЕТ LOW') : `LOW ${amount(result.points.reduce((v, s) => v + s.low, 0))}`}</>
            : `${t('Bet', 'Ставка')} ${amount(p.currentBet)} · ${t('Blinds', 'Блайнды')} ${amount(p.blinds?.small)}/${amount(p.blinds?.big)}`}</span>
          {(result?.sidePots.length ?? p.potBreakdown?.length ?? 0) > 1 ? <a className="mt-side-link" href="#mt-pot-details" onClick={() => { document.querySelector<HTMLDetailsElement>('#mt-pot-details')?.setAttribute('open', ''); }}>
            {t('Side pots', 'Побочные банки')} · {result?.sidePots.length ?? p.potBreakdown.length}</a> : null}
        </section>
        <div className="mt-hero-anchor"><PlayerSeat hero seat={hero} player={p} language={language} dealerId={props.dealerId} seconds={c.turnSeconds} /></div>
        <div className="mt-hints">
          <CombinationHint combo={heroCombo} kind="high" language={language} hole={p.hole} board={p.community} />
          <CombinationHint combo={heroCombo} kind="low" language={language} hole={p.hole} board={p.community} />
        </div>
        <div className="mt-personal-result" data-testid="mt-personal-result">
          {payout ? <><strong>{t('Payout', 'Выплата')} {amount(payout.total)}</strong><span>{t('Contributed', 'Внесено')} {amount(p.totalContributions?.[p.playerId] ?? 0)} · {t('Net', 'Итог')} {amount(payout.total - (p.totalContributions?.[p.playerId] ?? 0))}</span></>
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
      <PotDetails player={p} language={language} />
    </div>
  </main>;
}
