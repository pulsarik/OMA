import React from 'react';
import { type Language } from './content';

export function RuleCards({ codes, language, selected }: { codes: string; language: Language; selected?: readonly string[] }) {
  const symbols = { s: '♠', h: '♥', d: '♦', c: '♣' };
  const suits = language === 'ru' ? { s: 'пики', h: 'червы', d: 'бубны', c: 'трефы' } : { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
  return <span className="rules-cards illustrated-cards">{codes.split(' ').map(code => {
    const suit = code[1] as keyof typeof symbols;
    const rank = code[0] === 'T' ? '10' : code[0];
    const chosen = selected?.includes(code);
    return <span key={code} role="img" data-selected={chosen}
      className={`rules-card playing-card${suit === 'h' || suit === 'd' ? ' playing-card--red' : ''}${selected ? chosen ? ' playing-card--chosen' : ' playing-card--unused' : ''}`}
      aria-label={`${rank} ${suits[suit]}${selected ? chosen ? language === 'ru' ? ', выбрана' : ', selected' : language === 'ru' ? ', не используется' : ', not used' : ''}`}>
      <span className="playing-card-corner" aria-hidden="true">{rank}<small>{symbols[suit]}</small></span>
      <span className="playing-card-pip" aria-hidden="true">{symbols[suit]}</span>
      <span className="playing-card-foot" aria-hidden="true">{rank}</span>
    </span>;
  })}</span>;
}
