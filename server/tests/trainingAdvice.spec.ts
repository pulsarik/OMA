import { dealHand } from '../src/game';
import { createTrainingAdvice } from '../src/trainingAdvice';
import { trainingAdvicePhrase } from '../src/trainingAdvicePhrases';

test('training advice uses the bot decision and stays concise in both languages', () => {
  const hand = dealHand(2, 4242, ['Hero', 'Bot'], [false, true]);
  const player = hand.players.find(candidate => !candidate.isBot)!;
  hand.currentPlayerId = player.id;

  const en = createTrainingAdvice(hand, player, 'en');
  const ru = createTrainingAdvice(hand, player, 'ru');

  expect(en).toMatchObject({ handId: hand.id, playerId: player.id, stage: hand.stage });
  expect(en.text.split(/\s+/).length).toBeLessThanOrEqual(20);
  expect(en.text.length).toBeLessThan(120);
  expect(ru.text.length).toBeLessThan(140);
  expect(ru.text).toMatch(/[А-Яа-яЁё]/);
  expect(['fold', 'check', 'call', 'bet', 'raise']).toContain(en.move);
});

test('training explanations vary while the recommended move stays bot-driven', () => {
  const hand = dealHand(2, 4242, ['Hero', 'Bot'], [false, true]);
  const player = hand.players.find(candidate => !candidate.isBot)!;
  hand.currentPlayerId = player.id;
  const texts = new Set(Array.from({ length: 6 }, (_, revision) => {
    hand.revision = revision;
    return createTrainingAdvice(hand, player, 'ru').text;
  }));

  expect(texts.size).toBeGreaterThan(1);
});

test.each([
  { equity: 24.4, potOdds: 24.5 },
  { equity: 25, potOdds: 25 },
  { equity: 25.4, potOdds: 25.5 },
])('coach avoids ambiguous rounded comparisons at the pot-odds boundary', values => {
  const data = { ...values, scoop: 0 };
  for (const locale of ['ru', 'en'] as const) {
    for (const group of ['fold', 'call'] as const) {
      const text = trainingAdvicePhrase(locale, group, 'boundary', data);
      expect(text).not.toMatch(/\d+%/);
      expect(text).not.toMatch(/ниже требуем|below the required/i);
    }
  }
});

test('coach uses Omaha Hi-Lo concepts without confusing scoop chance with pot equity', () => {
  const values = { equity: 52, potOdds: 25, scoop: 18 };
  expect(trainingAdvicePhrase('ru', 'call', 'omaha', values)).toMatch(/дол[яи] банка|хай и лоу|эквити/);
  expect(trainingAdvicePhrase('en', 'aggressive', 'scoop', values)).toMatch(/pot share|share of the pot|scoop/);
});
