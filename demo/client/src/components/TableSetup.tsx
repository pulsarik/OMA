import React from 'react';
import './tableSetup.css';

export type TableMode = 'friends' | 'bots';

export function TableSetup({ mode, onModeChange, language, disabled, showModeSelector = true, children }: {
  mode: TableMode;
  onModeChange: (mode: TableMode) => void;
  language: 'en' | 'ru';
  disabled?: boolean;
  showModeSelector?: boolean;
  children: React.ReactNode;
}) {
  const ru = language === 'ru';
  return (
    <section className="table-setup">
      <div className="table-setup__cards" aria-hidden="true">
        <span>A<span>♠</span></span><span>2<span>♥</span></span><span>K<span>♣</span></span><span>3<span>♦</span></span>
      </div>
      <p className="table-setup__eyebrow">{ru ? 'Ваш стол. Ваша игра.' : 'Your table. Your game.'}</p>
      <h2>{ru ? 'С кем играем?' : 'Who’s at your table?'}</h2>
      {showModeSelector ? (
        <fieldset className="table-setup__modes" disabled={disabled}>
          <legend className="table-setup__legend">{ru ? 'Режим игры' : 'Game mode'}</legend>
          {(['friends', 'bots'] as const).map(value => (
            <label key={value} className={`table-setup__mode ${mode === value ? 'is-selected' : ''}`}>
              <input type="radio" name="table-mode" value={value} checked={mode === value} onChange={() => onModeChange(value)} />
              <strong>{value === 'friends' ? (ru ? 'С друзьями' : 'With friends') : (ru ? 'С ботами' : 'With bots')}</strong>
              <small>{value === 'friends' ? (ru ? 'Пригласите по PIN и начните, когда все готовы.' : 'Share a PIN. Start when everyone is ready.') : (ru ? 'Боты займут места. Игра начнётся сразу.' : 'Bots take the seats. The game starts right away.')}</small>
            </label>
          ))}
        </fieldset>
      ) : null}
      <div className="table-setup__form">{children}</div>
    </section>
  );
}
