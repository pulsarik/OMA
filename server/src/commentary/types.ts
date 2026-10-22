export type CommentaryLocale = 'ru' | 'en';
export type CommentaryPreference = { locale: CommentaryLocale; mode: 'off' | 'text' | 'voice' };
export type CommentaryFact = { id: string; kind: string; player?: string };
export type CommentaryEvent = {
  id: string;
  partyId: string;
  handId: string;
  handNumber: number;
  revision: number;
  createdAt: number;
  expiresAt: number;
  stage?: Exclude<GameStage, 'showdown'>;
  facts: CommentaryFact[];
  context?: CommentaryResultContext | NonNullable<ReturnType<typeof commentaryBettingSummary>>['context'];
  names: Record<string, string>;
};
export type CommentaryReady = {
  id: string;
  partyId: string;
  handId: string;
  revision: number;
  locale: CommentaryLocale;
  text: string;
  audioUrl?: string;
  expiresAt: number;
  serverNow: number;
  stage?: Exclude<GameStage, 'showdown'>;
};

export function commentaryPreference(value: unknown): CommentaryPreference | undefined {
  const p = value as CommentaryPreference | null;
  if (!p || !['ru', 'en'].includes(p.locale) || !['off', 'text', 'voice'].includes(p.mode)) return;
  return { locale: p.locale, mode: p.mode };
}
import type { commentaryBettingSummary, CommentaryResultContext, GameStage } from '../game';

