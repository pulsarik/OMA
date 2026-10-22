export type VisitAttribution = { referrer: string; utmSource: string };

// Capture before the home page navigates to a lobby/player URL. Keep only the
// referring origin, never search terms, invitation tokens or other URL paths.
export function captureVisitAttribution(
  href: string,
  referrer: string,
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
): VisitAttribution {
  const url = new URL(href);
  let referringOrigin = '';
  try {
    const referringUrl = new URL(referrer);
    if (/^https?:$/.test(referringUrl.protocol) && referringUrl.origin !== url.origin) {
      referringOrigin = referringUrl.origin;
    }
  } catch { /* Empty or unavailable referrer. */ }
  const utmSource = (url.searchParams.get('utm_source') || '').trim().slice(0, 100);
  const attribution = { referrer: referringOrigin, utmSource };
  try {
    if (!referringOrigin && !utmSource) {
      const previous = JSON.parse(storage?.getItem('omaha-visit-attribution') || 'null');
      if (typeof previous?.referrer === 'string' && typeof previous?.utmSource === 'string') return previous;
    }
    storage?.setItem('omaha-visit-attribution', JSON.stringify(attribution));
  } catch { /* Storage may be blocked; attribution must not prevent playing. */ }
  return attribution;
}

export function browserVisitAttribution(): VisitAttribution {
  let storage: Storage | undefined;
  try { storage = window.sessionStorage; } catch { /* Storage is optional. */ }
  return captureVisitAttribution(window.location.href, document.referrer, storage);
}
