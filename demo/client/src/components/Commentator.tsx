import React, { useSyncExternalStore } from 'react';
import { useCommentary } from '../commentary/useCommentary';
import { getSoundSettings, setSoundSettings, subscribeSoundSettings, unlockSounds } from '../audio/sounds';
import '../commentary/commentator.css';

type Props = { controller: ReturnType<typeof useCommentary> };

export function Commentator({ controller: c }: Props) {
  const sounds = useSyncExternalStore(subscribeSoundSettings, getSoundSettings);
  const t = (en: string, ru: string) => c.locale === 'ru' ? ru : en;
  const mode = !sounds.enabled ? 'silent' : c.mode === 'voice' ? 'all' : 'game';
  const retry = mode === 'all' && c.blocked && Boolean(c.text);
  const label = mode === 'all' ? t('Sound: all sounds', 'Звук: все звуки')
    : mode === 'game' ? t('Sound: game sounds without voice', 'Звук: игра без голоса')
      : t('Sound: silent', 'Звук: полная тишина');
  const nextLabel = mode === 'all' ? t('Next mode: game sounds without voice', 'Следующий режим: игра без голоса')
    : mode === 'game' ? t('Next mode: silent', 'Следующий режим: полная тишина')
      : t('Next mode: all sounds', 'Следующий режим: все звуки');
  const changeMode = () => {
    if (mode === 'all') c.setMode('text');
    else if (mode === 'game') {
      setSoundSettings({ enabled: false });
      c.setMode('off');
    } else {
      setSoundSettings({ enabled: true });
      c.setMode('voice');
      void unlockSounds();
    }
  };
  const buttonLabel = retry ? t('Enable audio', 'Включить звук') : `${label}. ${nextLabel}`;
  return <button type="button" className={`commentator-toggle sound-mode--${mode}${c.speaking ? ' is-speaking' : ''}`}
    data-testid="commentator" data-sound-mode={mode} aria-label={buttonLabel} title={buttonLabel}
    aria-pressed={mode !== 'silent'} onClick={retry ? c.retryAudio : changeMode}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      {mode === 'all' ? <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></>
        : mode === 'game' ? <path d="M15 9a4 4 0 0 1 0 6" />
          : <path d="m16 9 5 6m0-6-5 6" />}
    </svg>
    <span className="sound-mode-label">{mode === 'all' ? t('All', 'Всё') : mode === 'game' ? t('Game', 'Игра') : t('Mute', 'Тихо')}</span>
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
