import React from 'react';
import { type Language } from '../seo/content';

export type HomeChoice = 'bots' | 'friends' | 'guests' | 'archive';

const choices = (language: Language) => [
  { target: 'bots', href: '/?start=bots', icon: '♠', title: 'Play with bots', hint: 'Explore the game with hand hints.' },
  { target: 'friends', href: '/?start=friends', icon: '♧', title: 'Play with friends', hint: 'Invite friends to a private table with a PIN.' },
  { target: 'guests', href: '/?start=guests', icon: '♣', title: 'Play with guests', hint: 'Join an open table. No PIN needed.' },
  { target: 'rules', href: '/rules', icon: '?', title: language === 'ru' ? 'Правила' : 'Rules', hint: language === 'ru' ? 'PLO8 в картинках: карты, блайнды и размеры ставок.' : 'PLO8 in pictures: cards, blinds and bet sizes.' },
  { target: 'practice', href: '/rules#practice-50', icon: '50', title: '50 practice situations', hint: 'Solve card puzzles and explore the explanations.' },
  { target: 'archive', href: '/statistics', icon: '▤', title: 'Statistics', hint: 'Browse the game archive.' },
] as const;

export function HomeChoices({ onChoose, children, language = 'en' }: { onChoose?: (choice: HomeChoice) => void; children?: React.ReactNode; language?: Language }) {
  return <section className="welcome-choice-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
    {children}
    {choices(language).map(({ target, href, icon, title, hint }) => {
      const props = {
        className: `welcome-choice-card${target === 'bots' ? ' welcome-choice-card--primary' : ''}`,
        style: { border: '1px solid #d8e2dc', borderRadius: 22, background: 'rgba(255,255,255,.96)', boxShadow: '0 24px 70px rgba(1,35,25,.22)', padding: 'clamp(18px, 4vw, 30px)', minHeight: 158, display: 'grid', gridTemplateColumns: '1fr', alignContent: 'start', justifyItems: 'center', gap: 14, textAlign: 'center', color: 'inherit', textDecoration: 'none', cursor: 'pointer' } as React.CSSProperties,
      };
      const content = <>
        <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: 16, background: '#e8f7ef', color: '#08734d', fontSize: 28, fontWeight: 800 }}>{icon}</span>
        <span><strong style={{ display: 'block', fontSize: 20 }}>{title}</strong><small style={{ display: 'block', marginTop: 6, color: '#65736a', fontSize: 14, lineHeight: 1.4 }}>{hint}</small></span>
      </>;
      return onChoose && target !== 'practice' && target !== 'rules'
        ? <button key={target} {...props} onClick={() => onChoose(target)}>{content}</button>
        : <a key={target} href={href} {...props}>{content}</a>;
    })}
  </section>;
}
