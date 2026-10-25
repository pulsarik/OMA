import { botMove, type BotDecision } from './bot';
import { DealtHand, PlayerHand, PlayerMove } from './game';
import { renderTrainingAdvice, type Recommendation } from './trainingAdvicePhrases';
import type { TrainingAdviceLocale } from './trainingAdvicePhrases';
export type { TrainingAdviceLocale } from './trainingAdvicePhrases';

export type TrainingAdvice = {
  handId: string;
  revision: number;
  playerId: string;
  stage: string;
  locale: TrainingAdviceLocale;
  move: PlayerMove;
  amount?: number;
  recommendation: Recommendation;
  text: string;
  detail?: string;
};

export function trainingRecommendation(hand: DealtHand, player: PlayerHand, decision: BotDecision): Recommendation {
  // Do not infer the cause from the action: only botMove knows which branch won.
  const context = decision.reason?.coach;
  const amount = decision.move === 'call'
    ? Math.min(player.stack, Math.max(hand.currentBet - (hand.roundBets[player.id] ?? 0), 0))
    : decision.amount;
  return { action: decision.move, ...(amount === undefined ? {} : { amount }),
    reason: context?.code ?? 'UNAVAILABLE', context, confidence: null };
}

export function createTrainingAdvice(hand: DealtHand, player: PlayerHand, locale: TrainingAdviceLocale): TrainingAdvice {
  const recommendation = trainingRecommendation(hand, player, botMove(hand, player));
  return {
    handId: hand.id, revision: hand.revision ?? 0, playerId: player.id, stage: hand.stage, locale,
    move: recommendation.action,
    ...(recommendation.amount === undefined ? {} : { amount: recommendation.amount }),
    recommendation,
    ...renderTrainingAdvice(recommendation, locale),
  };
}
