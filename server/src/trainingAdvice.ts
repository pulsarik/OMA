import { botMove } from './bot';
import { DealtHand, PlayerHand, PlayerMove } from './game';
import { TRAINING_ADVICE_PHRASES, trainingAdvicePhrase } from './trainingAdvicePhrases';
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
  text: string;
};

function actionText(move: PlayerMove, amount: number | undefined, locale: TrainingAdviceLocale) {
  return `${TRAINING_ADVICE_PHRASES[locale].actions[move]}${amount === undefined ? '' : ` ${amount}`}.`;
}

export function createTrainingAdvice(
  hand: DealtHand,
  player: PlayerHand,
  locale: TrainingAdviceLocale,
): TrainingAdvice {
  const decision = botMove(hand, player);
  const callAmount = Math.max(hand.currentBet - (hand.roundBets[player.id] ?? 0), 0);
  const amount = decision.move === 'call' ? callAmount : decision.amount;
  const equity = Math.round((decision.reason?.equity ?? 0) * 100);
  const potOdds = Math.round((decision.reason?.potOdds ?? 0) * 100);
  const scoop = Math.round((decision.reason?.scoopRate ?? 0) * 100);
  const seed = `${hand.id}:${hand.revision ?? 0}:${hand.stage}:${decision.move}`;
  let reason: string;

  const group = decision.move === 'fold' ? 'fold'
    : decision.move === 'call' ? 'call'
      : decision.move === 'check' ? (hand.stage === 'river' ? 'riverCheck' : 'check')
        : 'aggressive';
  reason = trainingAdvicePhrase(locale, group, seed, { equity, potOdds, scoop });

  return {
    handId: hand.id,
    revision: hand.revision ?? 0,
    playerId: player.id,
    stage: hand.stage,
    locale,
    move: decision.move,
    ...(amount === undefined ? {} : { amount }),
    text: `${actionText(decision.move, amount, locale)} ${reason}`,
  };
}
