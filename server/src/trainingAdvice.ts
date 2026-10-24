import { botMove } from './bot';
import { DealtHand, PlayerHand, PlayerMove } from './game';

export type TrainingAdviceLocale = 'en' | 'ru';

export type TrainingAdvice = {
  handId: string;
  revision: number;
  playerId: string;
  stage: string;
  move: PlayerMove;
  amount?: number;
  text: string;
};

function actionText(move: PlayerMove, amount: number | undefined, locale: TrainingAdviceLocale) {
  const labels: Record<TrainingAdviceLocale, Record<PlayerMove, string>> = {
    en: { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise to' },
    ru: { fold: 'Фолд', check: 'Чек', call: 'Колл', bet: 'Ставка', raise: 'Рейз до' },
  };
  return `${labels[locale][move]}${amount === undefined ? '' : ` ${amount}`}.`;
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
  let reason: string;

  if (decision.move === 'fold') {
    reason = locale === 'ru'
      ? `Доля банка около ${equity}% ниже цены колла ${potOdds}%.`
      : `About ${equity}% pot share is below the ${potOdds}% call price.`;
  } else if (decision.move === 'call') {
    reason = locale === 'ru'
      ? `Доля банка около ${equity}% оправдывает цену колла ${potOdds}%.`
      : `About ${equity}% pot share supports the ${potOdds}% call price.`;
  } else if (decision.move === 'check') {
    reason = locale === 'ru'
      ? 'Бесплатная карта позволяет не раздувать банк.'
      : 'A free card keeps the pot under control.';
  } else {
    reason = locale === 'ru'
      ? `Доля банка ${equity}% и шанс забрать всё ${scoop}% позволяют давить.`
      : `${equity}% pot share and ${scoop}% scoop chance support pressure.`;
  }

  return {
    handId: hand.id,
    revision: hand.revision ?? 0,
    playerId: player.id,
    stage: hand.stage,
    move: decision.move,
    ...(amount === undefined ? {} : { amount }),
    text: `${actionText(decision.move, amount, locale)} ${reason}`,
  };
}
