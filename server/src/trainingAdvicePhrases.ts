import { PlayerMove } from './game';

export type TrainingAdviceLocale = 'en' | 'ru';

export type PhraseValues = { equity: number; potOdds: number; scoop: number };
export type PhraseGroup = 'fold' | 'call' | 'check' | 'riverCheck' | 'aggressive';

/** Reviewable copy base for the voice coach. Keep each explanation short enough to say in about five seconds. */
export const TRAINING_ADVICE_PHRASES: Record<TrainingAdviceLocale, {
  actions: Record<PlayerMove, string>;
  reasons: Record<PhraseGroup, string[]>;
}> = {
  ru: {
    actions: { fold: 'Сбрось карты', check: 'Чек', call: 'Колл', bet: 'Сделай ставку', raise: 'Рейз до' },
    reasons: {
      fold: [
        'Для выгодного колла не хватает эквити.',
        'Цена колла слишком высока для ожидаемой доли банка.',
        'Риск не оправдан с учётом возможной доли банка.',
      ],
      call: [
        'Ожидаемая доля банка оправдывает цену колла.',
        'Продолжать выгодно: эквити достаточно для такой цены.',
        'Цена колла подходит с учётом шансов на хай и лоу.',
      ],
      check: [
        'Можно бесплатно увидеть следующую карту и не раздувать банк.',
        'Ставка не нужна: лучше сохранить банк небольшим.',
        'Следующую карту можно увидеть без дополнительного риска.',
      ],
      riverCheck: [
        'На ривере можно бесплатно дойти до вскрытия.',
        'Доплачивать не нужно — спокойно открывай карты.',
      ],
      aggressive: [
        'Ожидаемая доля банка позволяет сыграть агрессивнее.',
        'Есть хорошие перспективы забрать значительную часть банка.',
        'Шансы на весь банк оправдывают агрессивную игру.',
      ],
    },
  },
  en: {
    actions: { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise to' },
    reasons: {
      fold: [
        'There is not enough equity to justify the call.',
        'The call costs too much for the expected share of the pot.',
        'The risk is too high for the likely return.',
      ],
      call: [
        'The expected pot share justifies the call price.',
        'Calling is profitable at this price.',
        'The price works given the chances of winning the high or low.',
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
        'The expected pot share supports a more aggressive line.',
        'There is a good chance of winning a meaningful share of the pot.',
        'The chance to scoop supports the aggressive play.',
      ],
    },
  },
};

export function trainingAdvicePhrase(locale: TrainingAdviceLocale, group: PhraseGroup, seed: string, values: PhraseValues) {
  const variants = TRAINING_ADVICE_PHRASES[locale].reasons[group];
  const index = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0) % variants.length;
  return variants[index].replace(/\{(equity|potOdds|scoop)\}/g, (_, key: keyof PhraseValues) => String(values[key]));
}
