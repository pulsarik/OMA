import { commentaryBettingSummary, commentaryRecentActions, commentaryResultSummary, DealtHand } from '../game';
import { CommentaryEvent } from './types';

export function createCommentaryEvent(hand: DealtHand, now = Date.now()): CommentaryEvent | undefined {
  const summary = hand.stage === 'showdown' ? commentaryResultSummary(hand) : commentaryBettingSummary(hand);
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
    id: hand.stage === 'showdown' ? `${hand.id}:complete`
      : facts.some(f => f.kind.endsWith('_board')) ? `${hand.id}:betting:board:${hand.stage}`
      : `${hand.id}:betting:${hand.actions.length}`,
    ...(hand.stage !== 'showdown' ? { stage: hand.stage } : {}),
    partyId: hand.partyId, handId: hand.id,
    handNumber: hand.handNumber, revision: hand.revision ?? 0,
    createdAt: now, expiresAt: now + 12_000, names, context,
    actions: commentaryRecentActions(hand).map(({ playerId, ...action }) => ({ player: markers.get(playerId)!, ...action })),
    facts: facts.map((f, i) => {
      const playerId = 'playerId' in f ? f.playerId : undefined;
      return { id: `f${i + 1}`, kind: f.kind, ...(playerId ? { player: markers.get(playerId) } : {}) };
    }),
  };
}
