import type { BotDecision, BotReasonCode } from './bot';
import type { PlayerMove } from './game';

export type TrainingAdviceLocale = 'en' | 'ru';
export type Recommendation = {
  action: PlayerMove;
  amount?: number;
  reason: BotReasonCode | 'UNAVAILABLE';
  /** The heuristic has no calibrated confidence score. */
  confidence: null;
  context?: NonNullable<BotDecision['reason']>['coach'];
};

// Editorial rules: action first, then the actual decision reason. No promises of
// profit, free future cards, certain showdowns, or invented probabilities.
// The table and speech synthesis use the SAME text. Longer context is separate.
const copy = {
  ru: {
    actions: { fold: 'Сбрось карты', check: 'Сделай чек', call: 'Колл', bet: 'Поставь', raise: 'Повысь до' },
    call: 'по оценке, шансы банка позволяют продолжить.',
    fold: 'цена колла слишком высока для этой руки.',
    margin: 'преимущество слишком невелико, чтобы рисковать.',
    entry: 'за один блайнд можно посмотреть флоп.',
    start: 'сильная стартовая рука — повод увеличить банк.',
    share: 'по оценке, с этой рукой можно увеличить банк.',
    check: 'пока можно остаться в раздаче без доплаты.',
    quarter: 'Есть риск получить только четверть банка или меньше.',
    vulnerable: 'Лоу уязвимо: новые карты могут его ослабить.',
    reduced: 'Из-за этих рисков выбран меньший размер ставки.',
    unavailable: 'Не удалось подготовить подсказку.',
    detail: 'В Omaha Hi-Lo можно выиграть весь банк или его часть — за старшую либо младшую комбинацию. При ничьей выигрыш тоже делится. Тренер оценивает, какая доля банка в среднем достанется этой руке.',
    callDetail: 'Тренер сравнивает стоимость колла с ожидаемой долей банка. В Omaha Hi-Lo учитываются как старшая, так и младшая комбинация, а также возможный делёж банка.',
    premiumDetail: 'Сильную стартовую руку стоит разыграть за один блайнд, пока стек позволяет. Дальнейшее решение зависит от флопа и ставок соперников.',
    marginDetail: 'Небольшого перевеса недостаточно для уверенного колла. Тренер оставляет запас на неточность оценки; до ривера учитывает и будущие ставки.',
    noLow: 'На этом ривере лоу невозможно: весь банк разыгрывается по старшей комбинации.',
    split: 'Выигрыш младшей половины не означает выигрыш всего банка; при ничьей эта половина тоже делится.',
    checkDetail: 'Можно остаться в раздаче без доплаты. Если соперник ещё может поставить, после его ставки придётся решать заново.',
  },
  en: {
    actions: { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise to' },
    call: 'the estimate supports continuing at these pot odds.',
    fold: 'the call costs too much for this hand.',
    margin: 'the edge is too small to take the risk.',
    entry: 'you can see the flop for one blind.',
    start: 'this strong starting hand supports building the pot.',
    share: 'the hand estimate supports building the pot.',
    check: 'you can stay in the hand without paying more right now.',
    quarter: 'There is a risk of receiving only a quarter of the pot or less.',
    vulnerable: 'Your low is vulnerable: later cards could weaken it.',
    reduced: 'These risks led to a smaller wager size.',
    unavailable: 'Advice is unavailable.',
    detail: 'In Omaha Hi-Lo, you can win the whole pot or a share through high or low. Ties split the winnings further. The coach estimates how much of the pot this hand will win on average.',
    callDetail: 'The coach compares the call price with the expected pot share. In Omaha Hi-Lo, that includes both high and low, as well as possible ties.',
    premiumDetail: 'This strong starting hand is worth playing for one blind with chips to spare. The flop and subsequent bets will guide the next decision.',
    marginDetail: 'A small edge leaves little room for error. The coach allows a cushion for uncertainty and, before the river, for future bets.',
    noLow: 'No low is possible on this river: the entire pot is played for high.',
    split: 'Winning low does not mean winning the entire pot; a tied low also splits that half.',
    checkDetail: 'You can stay in the hand without putting in more chips. If an opponent can still bet, you will need to reassess after their bet.',
  },
};
const allowed: Record<Recommendation['reason'], readonly PlayerMove[]> = {
  CHECK_NO_BET: ['check'], POT_ODDS: ['call', 'fold'], CALL_MARGIN: ['fold'],
  PREMIUM_BLIND_ENTRY: ['call'], STARTING_HAND: ['bet', 'raise'], POT_SHARE: ['bet', 'raise'], UNAVAILABLE: [],
};

// Schema/copy compatibility only. No hand state is available here to validate
// betting limits; botMove sizes wagers and game.ts enforces legal actions.
export function validRecommendation(value: Recommendation): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(allowed, value.reason)
    && allowed[value.reason].includes(value.action) && value.confidence === null
    && value.context?.code === value.reason
    && ['preflop', 'flop', 'turn', 'river'].includes(value.context.stage)
    && ['quarterRisk', 'lowVulnerable', 'lowImpossible'].every(key =>
      typeof value.context![key as 'quarterRisk' | 'lowVulnerable' | 'lowImpossible'] === 'boolean')
    && (!value.context.lowImpossible || value.context.stage === 'river')
    && (value.context.riskReducedAmount === undefined || typeof value.context.riskReducedAmount === 'boolean')
    && (!value.context.riskReducedAmount || (['bet', 'raise'].includes(value.action)
      && (value.context.quarterRisk || value.context.lowVulnerable)))
    && (['call', 'bet', 'raise'].includes(value.action)
      ? Number.isFinite(value.amount) && value.amount! > 0 : value.amount === undefined);
}

function compose(value: Recommendation, locale: TrainingAdviceLocale) {
  const c = copy[locale];
  const action = `${c.actions[value.action]}${value.amount === undefined ? '' : ` ${new Intl.NumberFormat(
    locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2, useGrouping: false },
  ).format(value.amount)}`}`;
  const reason = value.reason === 'CHECK_NO_BET' ? c.check
    : value.reason === 'POT_ODDS' ? value.action === 'fold' ? c.fold : c.call
      : value.reason === 'CALL_MARGIN' ? c.margin
        : value.reason === 'PREMIUM_BLIND_ENTRY' ? c.entry
          : value.reason === 'STARTING_HAND' ? c.start
            : c.share;
  return `${action} — ${reason}`;
}

export function validAdviceText(text: unknown, value: Recommendation, locale: TrainingAdviceLocale): text is string {
  // Exact renderer match prevents arbitrary wording/action/amount substitutions.
  // It does not prove that the supplied reason is true of a real game state.
  return validRecommendation(value) && typeof text === 'string' && text === compose(value, locale)
    && text.length <= 180 && !/[<>\n%]/.test(text)
    && (locale === 'ru' ? !/[a-z]/i.test(text) : !/[а-яё]/i.test(text));
}

export function renderTrainingAdvice(value: Recommendation, locale: TrainingAdviceLocale): { text: string; detail?: string } {
  const c = copy[locale];
  if (!validRecommendation(value)) return { text: c.unavailable };
  const text = compose(value, locale);
  if (!validAdviceText(text, value, locale)) return { text: c.unavailable };
  const explanation = value.reason === 'CHECK_NO_BET' ? c.checkDetail
    : value.reason === 'PREMIUM_BLIND_ENTRY' ? c.premiumDetail
      : value.reason === 'POT_ODDS' && value.action === 'call' ? c.callDetail
      : value.reason === 'CALL_MARGIN' ? c.marginDetail : c.detail;
  const context = value.context!;
  return { text, detail: [explanation,
    context.lowImpossible ? c.noLow : '',
    context.quarterRisk ? c.quarter : '',
    context.quarterRisk && !context.lowImpossible ? c.split : '',
    context.lowVulnerable ? c.vulnerable : '',
    context.riskReducedAmount ? c.reduced : '',
  ].filter(Boolean).join(' ') };
}
