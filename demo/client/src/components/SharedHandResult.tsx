import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { playSound, type GameSound } from '../audio/sounds';

export type SharedComparison = {
  sourceName: string; sourceNet: number; yourNet: number;
  outcome: 'you' | 'source' | 'tie'; needsName: boolean;
};

export function SharedHandResult({ comparison, serverUrl, handId, playerId, token, t, onSaved, canContinue }: {
  comparison: SharedComparison; serverUrl: string; handId: string; playerId: string; token: string;
  t: (en: string, ru: string) => string; onSaved: (state: any) => void; canContinue: boolean;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    const soundKey = `omaha-shared-result-sound:${handId}`;
    try {
      if (sessionStorage.getItem(soundKey) !== comparison.outcome) {
        sessionStorage.setItem(soundKey, comparison.outcome);
        const sound: GameSound = comparison.outcome === 'you' ? 'challengeWin'
          : comparison.outcome === 'source' ? 'challengeLoss' : 'challengeTie';
        void playSound(sound, false, 0.3);
      }
    } catch { /* Private browsing may block storage; the result remains usable. */ }
    return () => { element?.close(); };
  }, [comparison.outcome, handId]);
  const chips = (value: number) => `${value > 0 ? '+' : ''}${value}`;
  const outcomeIcon = comparison.outcome === 'you' ? '♛' : comparison.outcome === 'source' ? '↘' : '=';
  const outcomeLabel = comparison.outcome === 'you' ? t('Victory', 'Победа')
    : comparison.outcome === 'source' ? t('Defeat', 'Поражение') : t('Tie', 'Ничья');
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${serverUrl}/api/player/${handId}/${playerId}/${token}/shared-name`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error();
      onSaved(await response.json());
    } catch {
      setError(t('Could not save your name. Please try again.', 'Не удалось сохранить имя. Попробуйте ещё раз.'));
    } finally { setBusy(false); }
  }
  return createPortal(<dialog ref={dialog} aria-labelledby="shared-result-title" onCancel={event => event.preventDefault()}
    style={{ boxSizing: 'border-box', width: 'min(440px, calc(100% - 32px))', maxHeight: 'calc(100dvh - 32px)', padding: 24, border: '1px solid #a4ad91', borderRadius: 16, background: '#0c2b20', color: '#f1eddc' }}>
    <form onSubmit={submit} style={{ display: 'grid', gap: 16 }}>
      <div data-testid="shared-result-icon" role="img" aria-label={outcomeLabel}
        style={{ display: 'grid', placeItems: 'center', justifySelf: 'center', width: 72, height: 72, border: `2px solid ${comparison.outcome === 'you' ? '#dbc18b' : comparison.outcome === 'source' ? '#c88372' : '#a4ad91'}`, borderRadius: '50%', color: comparison.outcome === 'you' ? '#f2d68f' : comparison.outcome === 'source' ? '#e39a87' : '#d7ddd1', background: '#ffffff0a', fontSize: 38, lineHeight: 1 }}>
        <span aria-hidden="true">{outcomeIcon}</span>
      </div>
      <h2 id="shared-result-title" style={{ margin: 0, fontSize: 22 }}>{comparison.outcome === 'you'
        ? t('You got the better result!', 'Вы сыграли лучше!')
        : comparison.outcome === 'source' ? t('The sender got the better result', 'Отправитель сыграл лучше')
        : t('Same result!', 'Ничья!')}</h2>
      <div data-testid="shared-comparison" style={{ display: 'grid', gap: 8 }}>
        <div>{t('You', 'Вы')}: <strong>{chips(comparison.yourNet)}</strong></div>
        <div>{comparison.sourceName} ({t('sender', 'отправитель')}): <strong>{chips(comparison.sourceNet)}</strong></div>
        <small>{t('Net chips won or lost in this hand.', 'Чистый выигрыш или потеря фишек за эту раздачу.')}</small>
      </div>
      <label style={{ display: 'grid', gap: 8 }}>
        {t('Enter your name to continue playing', 'Введите имя, чтобы продолжить игру')}
        <input autoFocus required maxLength={30} autoComplete="nickname" value={name} onChange={event => setName(event.target.value)}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #a4ad91', fontSize: 16 }} />
      </label>
      {error ? <p role="alert">{error}</p> : null}
      <button type="submit" disabled={busy || !name.trim()} style={{ minHeight: 48, borderRadius: 8, border: 0, background: '#dbc18b', color: '#152016', fontSize: 16 }}>
        {busy ? t('Saving…', 'Сохраняем…') : canContinue ? t('Play on', 'Играть дальше') : t('Save name', 'Сохранить имя')}
      </button>
    </form>
  </dialog>, document.body);
}
