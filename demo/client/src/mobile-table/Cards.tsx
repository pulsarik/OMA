import React from 'react';
import type { Combination, Language } from './types';
import { rankLabel, words } from './presentation';

export function Card({ code, language, empty = false }: { code?: string; language: Language; empty?: boolean }) {
  const suit = code?.slice(-1).toLowerCase();
  const rank = code?.slice(0, -1).toUpperCase();
  return <span className={`mt-card${!code ? empty ? ' mt-card--empty' : ' mt-card--back' : ''}${suit === 'h' || suit === 'd' ? ' mt-card--red' : ''}`}
    role="img" aria-label={code ?? words(language, empty ? 'Undealt board card' : 'Hidden card', empty ? 'Карта борда ещё не открыта' : 'Закрытая карта')}
    data-card={code}>
    {code ? <><b>{rank === 'T' ? '10' : rank}</b><span>{({ s: '♠', h: '♥', d: '♦', c: '♣' })[suit!]}</span></> : null}
  </span>;
}

export function Cards({ cards, count = 4, language, board = false }: { cards?: string[]; count?: number; language: Language; board?: boolean }) {
  return <div className="mt-cards">{Array.from({ length: count }, (_, i) => <Card key={i} code={cards?.[i]} empty={board} language={language} />)}</div>;
}

export function CombinationHint({ combo, kind, language, board, hole }: {
  combo?: Combination; kind: 'high' | 'low'; language: Language; board: string[]; hole: string[];
}) {
  const combination = combo?.[`${kind}Combo`];
  // Only render complete combinations from the server and cards actually visible now.
  const handCards = combination?.filter(c => c.source === 'hole' && hole.includes(c.code)) ?? [];
  const boardCards = combination?.filter(c => c.source === 'board' && board.includes(c.code)) ?? [];
  const complete = handCards.length === 2 && boardCards.length === 3;
  const rank = combo?.[`${kind}Rank`];
  return <section className={`mt-combo mt-combo--${kind}`} data-testid={`mt-hint-${kind}`} aria-label={`${kind.toUpperCase()} ${words(language, 'combination', 'комбинация')}`}>
    <div className="mt-combo-title"><b>{kind.toUpperCase()}</b><span>{rank ? rankLabel(rank, language) : words(language, 'Not made', 'Не собрана')}</span></div>
    {complete ? <div className="mt-combo-groups">
      <div className="mt-combo-source mt-combo-source--hole"><Cards cards={handCards.map(c => c.code)} count={2} language={language} /><span>{words(language, 'Hand', 'Рука')}</span></div>
      <div className="mt-combo-source"><Cards cards={boardCards.map(c => c.code)} count={3} language={language} /><span>{words(language, 'Board', 'Борд')}</span></div>
    </div> : <p className="mt-combo-empty">{board.length < 3 ? words(language, 'Available from the flop', 'Появится на флопе')
      : words(language, kind === 'low' ? 'No qualifying low' : 'No combination', kind === 'low' ? 'Нет подходящей LOW' : 'Нет комбинации')}</p>}
  </section>;
}
