import { commentaryResultSummary, DealtHand } from '../game';
import { CommentaryEvent } from './types';

export function createCommentaryEvent(hand: DealtHand, now = Date.now()): CommentaryEvent | undefined {
  const summary = commentaryResultSummary(hand);
  if (!summary?.facts.length) return;
  const { facts, context } = summary;
  const names: Record<string, string> = {};
  const markers = new Map(hand.players.map((p, i) => {
    const marker = `[P${i + 1}]`;
    // Names never reach the model; plain text only, no markup or voice control tags.
    const name = p.name?.replace(/_bot$/i, '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim().slice(0, 24);
    names[marker] = name || `P${i + 1}`;
    return [p.id, marker] as const;
  }));
  return {
    id: `${hand.id}:complete`, partyId: hand.partyId, handId: hand.id,
    handNumber: hand.handNumber, revision: hand.revision ?? 0,
    createdAt: now, expiresAt: now + 12_000, names, context,
    facts: facts.map((f, i) => ({ id: `f${i + 1}`, kind: f.kind, ...(f.playerId ? { player: markers.get(f.playerId) } : {}) })),
  };
}
