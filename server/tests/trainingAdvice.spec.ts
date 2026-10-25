import { dealHand } from '../src/game';
import { createTrainingAdvice } from '../src/trainingAdvice';

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
