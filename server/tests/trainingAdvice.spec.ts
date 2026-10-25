import { dealHand, MAX_RAISES_PER_STREET } from '../src/game';
import { botMove } from '../src/bot';
import { createTrainingAdvice, trainingRecommendation } from '../src/trainingAdvice';
import { renderTrainingAdvice, validAdviceText, type Recommendation } from '../src/trainingAdvicePhrases';

function recommendation(action: Recommendation['action'], reason: Recommendation['reason'],
  context: Partial<NonNullable<Recommendation['context']>> = {}): Recommendation {
  return { action, reason, confidence: null, ...(['call', 'bet', 'raise'].includes(action) ? { amount: 2 } : {}),
    context: { code: reason as any, stage: 'flop', quarterRisk: false, lowVulnerable: false, lowImpossible: false, ...context } };
}

test.each(['preflop', 'flop', 'turn', 'river'] as const)('same %s position has the same advice regardless of hand ID/revision', stage => {
  const hand = dealHand(3, 4242);
  hand.stage = stage;
  hand.community = hand.fullCommunity.slice(0, stage === 'preflop' ? 0 : stage === 'flop' ? 3 : stage === 'turn' ? 4 : 5);
  const player = hand.players[0];
  const decision = botMove(hand, player);
  const first = createTrainingAdvice(hand, player, 'ru');
  expect(first.move).toBe(decision.move);
  expect(first.recommendation.reason).toBe(decision.reason!.coach!.code);
  for (const [index, id] of ['a', 'zzzz', 'totally-different-id'].entries()) {
    hand.id = id;
    hand.revision = index + 10;
    const next = createTrainingAdvice(hand, player, 'ru');
    expect(next.recommendation).toEqual(first.recommendation);
    expect(next.text).toBe(first.text);
    expect(next.detail).toBe(first.detail);
  }
});

test.each(['preflop', 'flop', 'turn', 'river'] as const)('check on %s never promises a free card or showdown', stage => {
  const hand = dealHand(2, 71);
  hand.stage = stage;
  hand.currentBet = 0;
  hand.roundBets = {};
  hand.raiseCount = MAX_RAISES_PER_STREET;
  const advice = createTrainingAdvice(hand, hand.players[0], 'ru');
  expect(advice.recommendation.reason).toBe('CHECK_NO_BET');
  expect(advice.text).toBe('Сделай чек. Сейчас доплачивать не нужно.');
  expect(advice.detail).toContain('соперник ещё может поставить');
  if (stage === 'river') expect(advice.detail).toContain('Общих карт больше не будет');
});

test('premium blind entry is identified by the bot, not described as profitable pot odds', () => {
  const hand = dealHand(10, 71);
  const player = hand.players.find(p => p.id === hand.currentPlayerId)!;
  player.hole = ['As', 'Ks', '2s', '7s'];
  player.botStyle = 'cautious';
  const advice = createTrainingAdvice(hand, player, 'ru');
  expect(advice.recommendation.reason).toBe('PREMIUM_BLIND_ENTRY');
  expect(advice.text).toContain('посмотреть флоп за блайнд');
  expect(advice.text).not.toMatch(/выгод|прибыл|эквити/);
});

test('short all-in call amount never exceeds the stack; raise retains the target total', () => {
  const hand = dealHand(3, 71);
  hand.currentBet = 100;
  hand.roundBets = { P1: 20 };
  const player = hand.players[0];
  player.stack = 30;
  const reason = { summary: '', factors: [], equity: 0.5, potOdds: 0.2, scoopRate: 0.1,
    coach: recommendation('call', 'POT_ODDS').context };
  const call = trainingRecommendation(hand, player, { move: 'call', reason });
  expect(call.amount).toBe(30);
  expect(renderTrainingAdvice(call, 'ru').text).toMatch(/^Уравняй ставку: добавь 30\./);
  expect(trainingRecommendation(hand, player, { move: 'raise', amount: 120, reason }).amount).toBe(120);
});

test.each([
  recommendation('fold', 'POT_ODDS'), recommendation('fold', 'CALL_MARGIN'),
  recommendation('call', 'POT_ODDS'), recommendation('call', 'PREMIUM_BLIND_ENTRY'),
  recommendation('bet', 'STARTING_HAND'), recommendation('raise', 'POT_SHARE'),
  recommendation('raise', 'POT_SHARE', { quarterRisk: true }),
  recommendation('bet', 'POT_SHARE', { lowVulnerable: true }),
  recommendation('check', 'CHECK_NO_BET'),
])('reviewed copy stays short, action-aligned and free of unsupported claims: $action/$reason', value => {
  for (const locale of ['ru', 'en'] as const) {
    const { text } = renderTrainingAdvice(value, locale);
    expect(validAdviceText(text, value, locale)).toBe(true);
    expect(text.length).toBeLessThanOrEqual(100);
    expect(text).not.toMatch(/%|эквити|прибыл|выгод|guarantee|profitable|free showdown/i);
    expect(text).toMatch(/\.$/);
    expect(text).not.toMatch(locale === 'ru' ? /[a-z]/i : /[а-яё]/i);
  }
});

test('no-low river is distinguished from possible low, without looking at hidden runouts', () => {
  const hand = dealHand(2, 71);
  hand.stage = 'river';
  hand.community = hand.fullCommunity = ['Ks', 'Qh', 'Jd', '2c', '3c'];
  expect(createTrainingAdvice(hand, hand.players[0], 'ru').detail).toContain('лоу невозможно');
  hand.community = hand.fullCommunity = ['As', '2h', '3d', 'Kc', 'Qc'];
  expect(createTrainingAdvice(hand, hand.players[0], 'ru').detail).not.toContain('лоу невозможно');
  hand.stage = 'flop';
  hand.community = hand.fullCommunity.slice(0, 3);
  const first = createTrainingAdvice(hand, hand.players[0], 'ru');
  hand.fullCommunity[3] = '4c';
  hand.fullCommunity[4] = '5c';
  expect(createTrainingAdvice(hand, hand.players[0], 'ru').text).toBe(first.text);
});

test('quartering is a risk, not a guaranteed quarter or a scoop', () => {
  const result = renderTrainingAdvice(recommendation('raise', 'POT_SHARE', { quarterRisk: true }), 'ru');
  expect(result.text).toContain('можно получить лишь четверть');
  expect(result.detail).toContain('при ничьей эта половина тоже делится');
});

test.each([0.249, 0.25, 0.251])('borderline estimates %s do not leak rounded comparisons into advice', equity => {
  const hand = dealHand(2, 71);
  const reason = { summary: '', factors: [], equity, potOdds: 0.25, scoopRate: 0,
    coach: recommendation('fold', 'CALL_MARGIN').context };
  const rec = trainingRecommendation(hand, hand.players[0], { move: 'fold', reason });
  expect(renderTrainingAdvice(rec, 'ru').text).toBe('Сбрось карты. Для такого колла у руки слишком мало запаса.');
});

test('invalid/mismatched/missing reason uses a complete fallback, never a fabricated explanation', () => {
  for (const value of [recommendation('raise', 'POT_ODDS'), recommendation('call', 'UNAVAILABLE'),
    { ...recommendation('call', 'POT_ODDS'), amount: NaN },
    { ...recommendation('call', 'POT_ODDS'), context: undefined },
    { ...recommendation('call', 'POT_ODDS'), amount: 1e308 },
    { ...recommendation('call', 'POT_ODDS'), amount: -1 }]) {
    expect(renderTrainingAdvice(value, 'ru').text).toBe('Не удалось подготовить подсказку.');
  }
  const rec = recommendation('call', 'POT_ODDS');
  for (const bad of ['Колл гарантирует прибыль.', 'Fold. The hand is weak.', '<b>Колл</b>', 'а'.repeat(200), null]) {
    expect(validAdviceText(bad, rec, 'ru')).toBe(false);
  }
});
