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
  expect(['fold', 'check', 'call', 'bet', 'raise']).toContain(en.move);
});
