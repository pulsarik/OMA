export type Advice = {
  handId: string;
  revision: number;
  playerId: string;
  stage: string;
  locale: 'en' | 'ru';
  move: 'fold' | 'check' | 'call' | 'bet' | 'raise';
  amount?: number;
  text: string;
  detail?: string;
  audioUrl?: string;
};

// Validate before display OR speech. Invalid envelopes have no trusted action
// to fall back to; ignore them. The server owns the localized text fallback.
export function parseTrainingAdvice(raw: unknown): Advice | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Advice;
  if (typeof value.handId !== 'string' || typeof value.playerId !== 'string'
    || !Number.isSafeInteger(value.revision) || value.revision < 0
    || !['preflop', 'flop', 'turn', 'river'].includes(value.stage)
    || !['ru', 'en'].includes(value.locale)
    || !['fold', 'check', 'call', 'bet', 'raise'].includes(value.move)
    || (value.amount !== undefined && (!Number.isFinite(value.amount) || value.amount <= 0))
    || typeof value.text !== 'string' || !value.text.trim() || value.text.length > 180
    || /[<>\r\n%]/.test(value.text)
    || (value.locale === 'ru' ? !/[а-яё]/i.test(value.text) || /[a-z]/i.test(value.text)
      : !/[a-z]/i.test(value.text) || /[а-яё]/i.test(value.text))) return null;
  const detail = typeof value.detail === 'string' && value.detail.length <= 1000 && !/[<>]/.test(value.detail)
    && (value.locale === 'ru' ? /[а-яё]/i.test(value.detail) : !/[а-яё]/i.test(value.detail))
    ? value.detail : undefined;
  const audioUrl = typeof value.audioUrl === 'string'
    && /^\/api\/commentary\/audio\/[0-9a-f-]+\/[0-9a-f]+$/.test(value.audioUrl) ? value.audioUrl : undefined;
  return { ...value, detail, audioUrl };
}
