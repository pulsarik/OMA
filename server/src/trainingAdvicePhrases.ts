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
    actions: { fold: 'Сбрось карты', check: 'Сделай чек', call: 'Уравняй ставку: добавь', bet: 'Поставь', raise: 'Повысь до' },
    call: 'По оценке, доля банка оправдывает доплату.',
    fold: 'Колл слишком дорог для этой руки.',
    margin: 'Для такого колла у руки слишком мало запаса.',
    entry: 'С такой стартовой рукой стоит посмотреть флоп за блайнд.',
    start: 'Сильная стартовая рука позволяет нарастить банк.',
    share: 'По оценке, рука может забрать весомую долю банка.',
    check: 'Сейчас доплачивать не нужно.',
    quarter: 'Не завышай ставку: можно получить лишь четверть банка.',
    vulnerable: 'Ставка сдержанная: новые карты могут ослабить твоё лоу.',
    unavailable: 'Не удалось подготовить подсказку.',
    detail: 'Оценка учитывает долю банка, включая раздел между старшей и младшей комбинациями и ничьи. Доля банка не равна шансу забрать его целиком. Это не гарантия выигрыша.',
    premiumDetail: 'Алгоритм разрешает вход за блайнд с сильной стартовой рукой и достаточным стеком. Это не утверждение о положительном ожидании колла.',
    marginDetail: 'Решение учитывает запас к цене колла и риск будущих ставок. Сырая эквити может быть выше цены колла.',
    noLow: 'На этом ривере лоу невозможно: весь банк разыгрывается по старшей комбинации.',
    split: 'Выигрыш младшей половины не означает выигрыш всего банка; при ничьей эта половина тоже делится.',
    stages: { preflop: 'Общие карты ещё не открыты.', flop: 'Впереди тёрн и ривер.', turn: 'Впереди ривер.', river: 'Общих карт больше не будет.', showdown: 'Торги завершены.' },
    checkDetail: 'Чек не гарантирует бесплатную следующую карту или вскрытие: соперник ещё может поставить.',
  },
  en: {
    actions: { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise to' },
    call: 'The estimate supports calling at this price.',
    fold: 'The call costs too much for this hand.',
    margin: 'There is too little margin for this call.',
    entry: 'This starting hand is worth seeing a flop for one blind.',
    start: 'This strong starting hand supports building the pot.',
    share: 'The hand is estimated to win a substantial pot share.',
    check: 'No more chips are needed right now.',
    quarter: 'Keep it small: you could receive only a quarter of the pot.',
    vulnerable: 'Keep it small: later cards could weaken your low.',
    unavailable: 'Advice is unavailable.',
    detail: 'The estimate accounts for pot share, including high/low splits and ties. Pot equity is not the chance of scooping. It does not guarantee a win.',
    premiumDetail: 'The strategy allows a strong starting hand to enter for one blind with a sufficient stack. This does not establish positive call EV.',
    marginDetail: 'The decision includes a margin over the call price and future betting risk. Raw equity may exceed the call price.',
    noLow: 'No low is possible on this river: the entire pot is played for high.',
    split: 'Winning low does not mean winning the entire pot; a tied low also splits that half.',
    stages: { preflop: 'No board cards are out yet.', flop: 'The turn and river are still to come.', turn: 'The river is still to come.', river: 'There are no more board cards to come.', showdown: 'Betting is over.' },
    checkDetail: 'Checking does not guarantee a free card or showdown: an opponent may still bet.',
  },
};
const allowed: Record<Recommendation['reason'], readonly PlayerMove[]> = {
  CHECK_NO_BET: ['check'], POT_ODDS: ['call', 'fold'], CALL_MARGIN: ['fold'],
  PREMIUM_BLIND_ENTRY: ['call'], STARTING_HAND: ['bet', 'raise'], POT_SHARE: ['bet', 'raise'], UNAVAILABLE: [],
};

export function validRecommendation(value: Recommendation): boolean {
  if (!value || typeof value !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(allowed, value.reason)
    && allowed[value.reason].includes(value.action) && value.confidence === null
    && value.context?.code === value.reason
    && Object.prototype.hasOwnProperty.call(copy.en.stages, value.context.stage)
    && ['quarterRisk', 'lowVulnerable', 'lowImpossible'].every(key =>
      typeof value.context![key as 'quarterRisk' | 'lowVulnerable' | 'lowImpossible'] === 'boolean')
    && (!value.context.lowImpossible || value.context.stage === 'river')
    && (['call', 'bet', 'raise'].includes(value.action)
      ? Number.isFinite(value.amount) && value.amount! > 0 : value.amount === undefined);
}

function compose(value: Recommendation, locale: TrainingAdviceLocale) {
  const c = copy[locale];
  const action = `${c.actions[value.action]}${value.amount === undefined ? '' : ` ${new Intl.NumberFormat(
    locale === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2, useGrouping: false },
  ).format(value.amount)}`}.`;
  const reason = value.reason === 'CHECK_NO_BET' ? c.check
    : value.reason === 'POT_ODDS' ? value.action === 'fold' ? c.fold : c.call
      : value.reason === 'CALL_MARGIN' ? c.margin
        : value.reason === 'PREMIUM_BLIND_ENTRY' ? c.entry
          : value.reason === 'STARTING_HAND' ? c.start
            : value.context?.quarterRisk ? c.quarter : value.context?.lowVulnerable ? c.vulnerable : c.share;
  return `${action} ${reason}`;
}

export function validAdviceText(text: unknown, value: Recommendation, locale: TrainingAdviceLocale): text is string {
  // Deterministic allowlist checks meaning, action and amount, not just punctuation.
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
      : value.reason === 'CALL_MARGIN' ? c.marginDetail : c.detail;
  const board = value.context?.lowImpossible ? c.noLow
    : value.context?.quarterRisk ? c.split : '';
  return { text, detail: [explanation, c.stages[value.context!.stage], board].filter(Boolean).join(' ') };
}
