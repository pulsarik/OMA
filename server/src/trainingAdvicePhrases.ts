import { PlayerMove } from './game';

export type TrainingAdviceLocale = 'en' | 'ru';

type PhraseValues = { equity: number; potOdds: number; scoop: number };
type PhraseGroup = 'fold' | 'call' | 'check' | 'riverCheck' | 'aggressive';

/** Reviewable copy base for the voice coach. Keep each explanation short enough to say in about five seconds. */
export const TRAINING_ADVICE_PHRASES: Record<TrainingAdviceLocale, {
  actions: Record<PlayerMove, string>;
  reasons: Record<PhraseGroup, string[]>;
}> = {
  ru: {
    actions: { fold: 'Фолд', check: 'Чек', call: 'Колл', bet: 'Ставка', raise: 'Рейз до' },
    reasons: {
      fold: [
        'Оценка доли банка {equity}% не покрывает цену колла {potOdds}%.',
        'Колл стоит слишком дорого: нужно {potOdds}%, а оценка руки — {equity}%.',
        'Сохрани стек: шансы руки {equity}% ниже требуемых {potOdds}%.',
      ],
      call: [
        'Оценка доли банка {equity}% оправдывает цену колла {potOdds}%.',
        'Цена подходящая: нужно {potOdds}%, а рука даёт около {equity}%.',
        'Продолжение выгодно: оценка руки {equity}% выше цены {potOdds}%.',
      ],
      check: [
        'Бесплатная карта позволяет не раздувать банк.',
        'Ставка не обязательна — сохрани банк небольшим.',
        'Возьми бесплатную следующую карту без лишнего риска.',
      ],
      riverCheck: [
        'На ривере можно бесплатно дойти до вскрытия.',
        'Доплачивать не нужно — спокойно открывай карты.',
      ],
      aggressive: [
        'Доля банка {equity}% и шанс забрать весь банк {scoop}% позволяют давить.',
        'Рука впереди достаточно часто: доля банка около {equity}%.',
        'Шанс забрать обе половины {scoop}% оправдывает агрессию.',
      ],
    },
  },
  en: {
    actions: { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise to' },
    reasons: {
      fold: [
        '{equity}% estimated pot share does not cover the {potOdds}% call price.',
        'The call is too expensive: it needs {potOdds}%, versus {equity}% estimated.',
        'Protect the stack: {equity}% estimated share is below the required {potOdds}%.',
      ],
      call: [
        '{equity}% estimated pot share supports the {potOdds}% call price.',
        'The price works: {potOdds}% required versus about {equity}% estimated.',
        'Continuing is profitable: {equity}% estimated share beats the {potOdds}% price.',
      ],
      check: [
        'A free card keeps the pot under control.',
        'No bet is needed; keep the pot smaller.',
        'Take the next card for free without extra risk.',
      ],
      riverCheck: [
        'Take the free showdown on the river.',
        'No extra chips are needed; check to showdown.',
      ],
      aggressive: [
        '{equity}% pot share and {scoop}% scoop chance support pressure.',
        'The hand is ahead often enough, with about {equity}% pot share.',
        'A {scoop}% scoop chance justifies the aggression.',
      ],
    },
  },
};

export function trainingAdvicePhrase(locale: TrainingAdviceLocale, group: PhraseGroup, seed: string, values: PhraseValues) {
  const variants = TRAINING_ADVICE_PHRASES[locale].reasons[group];
  const index = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) % variants.length;
  return variants[index].replace(/\{(equity|potOdds|scoop)\}/g, (_, key: keyof PhraseValues) => String(values[key]));
}
