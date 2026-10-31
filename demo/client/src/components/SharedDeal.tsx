import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Translate = (en: string, ru: string) => string;

const pendingLinks = new Map<string, Promise<string>>();

export function ShareDealButton({ serverUrl, handId, playerId, token, t }: {
  serverUrl: string; handId: string; playerId: string; token: string; t: Translate;
}) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const nativeShare = typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
  useEffect(() => {
    let active = true;
    const key = [serverUrl, handId, playerId, token].join(':');
    let pending = pendingLinks.get(key);
    if (!pending) {
      pending = fetch(`${serverUrl}/api/shares`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handId, playerId, token }),
      }).then(async response => {
        if (!response.ok) throw new Error();
        return new URL((await response.json()).path, window.location.origin).href;
      }).catch(error => { pendingLinks.delete(key); throw error; });
      if (pendingLinks.size > 100) pendingLinks.delete(pendingLinks.keys().next().value!);
      pendingLinks.set(key, pending);
    }
    void pending.then(link => { if (active) setUrl(link); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [serverUrl, handId, playerId, token, retry]);
  async function share() {
    if (failed) { setFailed(false); setRetry(value => value + 1); return; }
    setBusy(true);
    try {
      // The link is ready before the click, preserving mobile user activation.
      if (nativeShare) await navigator.share({ title: t('Play this Omaha deal', 'Сыграйте эту раздачу Омахи'), url });
      else { await navigator.clipboard.writeText(url); setCopied(true); }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setFallback(true);
    } finally { setBusy(false); }
  }
  return <>
    <button type="button" className="action-button mt-replay-deal deal-utility-action" data-testid="share-deal"
      disabled={busy || (!url && !failed)} onClick={share}
      title={t('Replay these cards and starting stacks in a separate game. Link valid for 30 days.', 'Сыграть с этими картами и исходными стеками в отдельной партии. Ссылка действует 30 дней.')}>
      {failed ? t('Retry sharing', 'Повторить создание ссылки') : !url ? t('Preparing link…', 'Готовим ссылку…')
        : copied ? t('Link copied', 'Ссылка скопирована')
        : nativeShare ? t('Share deal', 'Поделиться раздачей') : t('Copy link', 'Скопировать ссылку')}
    </button>
    {fallback ? createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: '#0009', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section role="dialog" aria-modal="true" aria-label={t('Share link', 'Ссылка на раздачу')}
        style={{ width: 'min(440px, 100%)', boxSizing: 'border-box', padding: 20, background: '#fff', color: '#172923', borderRadius: 16 }}>
        <p>{t('Select and copy the link.', 'Выделите и скопируйте ссылку.')}</p>
        <input autoFocus readOnly aria-label={t('Share link', 'Ссылка на раздачу')} value={url} onFocus={e => e.target.select()} style={{ width: '100%', boxSizing: 'border-box' }} />
        <button onClick={() => setFallback(false)}>{t('Close', 'Закрыть')}</button>
      </section>
    </div>, document.body) : null}
  </>;
}

export function SharedDealPage({ serverUrl, t }: { serverUrl: string; t: Translate }) {
  const [error, setError] = useState(false);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = window.location.pathname.split('/')[2];
    const key = `omaha-share-claim-${token}`;
    let claim: string = crypto.randomUUID();
    try {
      claim = localStorage.getItem(key) || claim;
      localStorage.setItem(key, claim);
    } catch {
      // Preserve retries/reloads in the address when browser storage is unavailable.
      claim = window.location.hash.slice(1) || claim;
      window.history.replaceState(null, '', `#${claim}`);
    }
    void fetch(`${serverUrl}/api/shares/${encodeURIComponent(token)}/claim`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ claim }),
    }).then(async response => {
      if (!response.ok) throw new Error();
      const result = await response.json();
      window.location.replace(result.playerUrl);
    }).catch(() => setError(true));
  }, [serverUrl]);
  return <main style={{ padding: 24 }}>
    <p role={error ? 'alert' : 'status'}>{error
      ? t('Could not open this deal. The link or saved game may have expired.', 'Не удалось открыть раздачу. Возможно, срок ссылки или сохранённой игры истёк.')
      : t('Preparing your table…', 'Готовим ваш стол…')}</p>
    {error ? <><button onClick={() => window.location.reload()}>{t('Try again', 'Повторить')}</button> <a href="/">{t('Home', 'На главную')}</a></> : null}
  </main>;
}
