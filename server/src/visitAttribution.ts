import type { IncomingHttpHeaders } from 'http';

export function visitCountry(headers: IncomingHttpHeaders): string | undefined {
  // Informational CDN metadata only, never used for authorization.
  const value = headers['cf-ipcountry'];
  if (typeof value !== 'string') return undefined;
  const country = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) && country !== 'XX' ? country : undefined;
}

export function visitSource(attribution: unknown): string | undefined {
  if (!attribution || typeof attribution !== 'object') return undefined;
  const { referrer, utmSource } = attribution as Record<string, unknown>;
  if (typeof referrer !== 'string' || typeof utmSource !== 'string') return undefined;
  const campaign = utmSource.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 100);
  if (campaign) return `campaign:${campaign}`;
  if (!referrer) return 'direct';
  try {
    const url = new URL(referrer);
    if (!/^https?:$/.test(url.protocol)) return undefined;
    return `referral:${url.hostname.slice(0, 253)}`;
  } catch {
    return undefined;
  }
}
