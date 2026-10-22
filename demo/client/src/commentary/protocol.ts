export type CommentaryMode = 'off' | 'text' | 'voice';
export type CommentaryLocale = 'en' | 'ru';
export type CommentaryMessage = {
  id: string; handId: string; partyId: string; revision: number; locale: CommentaryLocale;
  text: string; audioUrl?: string; expiresAt: number; serverNow: number;
  stage?: 'preflop' | 'flop' | 'turn' | 'river';
};
export type CommentaryState = { handId: string; partyId: string; revision: number; stage: string };

export function readCommentary(value: unknown, handId: string, locale: CommentaryLocale): CommentaryMessage | undefined {
  const m = value as CommentaryMessage | null;
  if (!m || typeof m.id !== 'string' || m.id.length > 150 || m.handId !== handId
    || typeof m.partyId !== 'string' || m.locale !== locale || typeof m.text !== 'string'
    || !m.text.trim() || m.text.length > 220 || !Number.isSafeInteger(m.revision)
    || !Number.isFinite(m.expiresAt) || !Number.isFinite(m.serverNow)
    || m.expiresAt <= m.serverNow || m.expiresAt - m.serverNow > 12_000) return;
  if (m.stage !== undefined && !['preflop', 'flop', 'turn', 'river'].includes(m.stage)) return;
  if (m.audioUrl !== undefined && (typeof m.audioUrl !== 'string'
    || !/^\/api\/commentary\/audio\/[a-f0-9-]+\/[a-f0-9]{48}$/.test(m.audioUrl))) return;
  return m;
}

export function canPresentCommentary(message: CommentaryMessage, state: CommentaryState | null) {
  return Boolean(state && state.handId === message.handId && state.partyId === message.partyId
    && state.stage === (message.stage ?? 'showdown') && state.revision >= message.revision);
}
