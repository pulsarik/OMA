import React from 'react';
import { useCommentary } from '../commentary/useCommentary';
import '../commentary/commentator.css';

type Props = { controller: ReturnType<typeof useCommentary> };

export function Commentator({ controller: c }: Props) {
  if (!c.enabled) return null;
  const t = (en: string, ru: string) => c.locale === 'ru' ? ru : en;
  const on = c.mode !== 'off';
  const retry = on && c.blocked && Boolean(c.text);
  const label = retry ? t('Enable audio', 'Включить звук') : on
    ? t('Turn commentator off', 'Выключить комментатора') : t('Turn commentator on', 'Включить комментатора');
  return <button type="button" className={`commentator-toggle${on ? ' is-on' : ''}${c.speaking ? ' is-speaking' : ''}`}
    data-testid="commentator" aria-label={label} title={label} aria-pressed={on}
    onClick={() => retry ? c.retryAudio() : c.setMode(on ? 'off' : 'voice')}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {on && !retry ? <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></>
        : <path d="m16 9 5 6m0-6-5 6" />}
    </svg>
  </button>;
}

export function CommentatorCaption({ controller: c }: Props) {
  return c.enabled && c.text ? <p className="commentator-caption" role="status" data-testid="commentary-caption">{c.text}</p> : null;
}

export function CommentatorSettings({ controller: c }: Props) {
  const t = (en: string, ru: string) => c.locale === 'ru' ? ru : en;
  return <div className="commentator-settings">
    <h2>{t('AI commentator', 'ИИ-комментатор')}</h2>
    {c.enabled ? <>
      <label>{t('Language', 'Язык')}<select aria-label={t('Commentary language', 'Язык комментатора')} value={c.locale}
        onChange={e => c.setLocale(e.target.value as typeof c.locale)}><option value="en">English</option><option value="ru">Русский</option></select></label>
      <label>{t('Volume', 'Громкость')}<span className="commentator-volume"><input aria-label={t('Commentary volume', 'Громкость комментатора')}
        type="range" min="0" max="1" step="0.05" value={c.volume} onChange={e => c.setVolume(Number(e.target.value))} />
        <output>{Math.round(c.volume * 100)}%</output></span></label>
    </> : <p>{t('Commentary is unavailable at this table.', 'Комментатор недоступен за этим столом.')}</p>}
  </div>;
}
