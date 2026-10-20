import React from 'react';
import { useCommentary } from '../commentary/useCommentary';
import '../commentary/commentator.css';

export function Commentator({ controller: c }: { controller: ReturnType<typeof useCommentary> }) {
  if (!c.enabled) return null;
  const t = (en: string, ru: string) => c.locale === 'ru' ? ru : en;
  return <aside className="commentator" data-testid="commentator" aria-label={t('AI commentator', 'ИИ-комментатор')}>
    <details>
      <summary><span aria-hidden="true">{c.speaking ? '◉' : '♬'}</span> {t('AI commentator', 'ИИ-комментатор')}
        <span className="commentator-status">{c.mode === 'off' ? t('Off', 'Выключен') : c.speaking ? t('Speaking', 'Говорит') : t('On', 'Включён')}</span>
      </summary>
      <div className="commentator-settings">
        <label>{t('Mode', 'Режим')}<select aria-label={t('Commentary mode', 'Режим комментатора')} value={c.mode}
          onChange={e => c.setMode(e.target.value as typeof c.mode)}>
          <option value="off">{t('Off', 'Выключен')}</option>
          <option value="text">{t('Subtitles', 'Субтитры')}</option>
          <option value="voice" disabled={!c.voiceEnabled}>{t('Voice and subtitles', 'Голос и субтитры')}</option>
        </select></label>
        <label>{t('Language', 'Язык')}<select aria-label={t('Commentary language', 'Язык комментатора')} value={c.locale}
          onChange={e => c.setLocale(e.target.value as typeof c.locale)}><option value="en">English</option><option value="ru">Русский</option></select></label>
        <label>{t('Volume', 'Громкость')}<input aria-label={t('Commentary volume', 'Громкость комментатора')} type="range" min="0" max="1" step="0.05" value={c.volume}
          onChange={e => c.setVolume(Number(e.target.value))} /></label>
      </div>
    </details>
    {c.text ? <p role="status" data-testid="commentary-caption">{c.text}</p> : null}
    {c.blocked && c.text ? <button type="button" onClick={c.retryAudio}>{t('Enable audio', 'Включить звук')}</button> : null}
  </aside>;
}
