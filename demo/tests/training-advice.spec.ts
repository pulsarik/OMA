import { test, expect } from '@jest/globals';
import { parseTrainingAdvice } from '../client/src/training/protocol';

const advice = { handId: 'h1', revision: 3, playerId: 'P1', stage: 'flop', locale: 'ru',
  move: 'check', text: 'Сделай чек. Сейчас доплачивать не нужно.' };

test('legacy envelopes remain readable; optional details never replace the spoken text', () => {
  expect(parseTrainingAdvice(advice)?.text).toBe(advice.text);
  expect(parseTrainingAdvice({ ...advice, detail: 'Подробное объяснение.' })?.text).toBe(advice.text);
  expect(parseTrainingAdvice({ ...advice, detail: '<script>bad</script>' })?.detail).toBeUndefined();
});

test.each([null, {}, { ...advice, text: '' }, { ...advice, text: 'Check. No bet is required.' },
  { ...advice, text: 'Чек. <b>Бесплатно</b>' }, { ...advice, text: 'а'.repeat(181) },
  { ...advice, move: 'all-in' }, { ...advice, amount: Infinity }, { ...advice, revision: NaN },
  { ...advice, text: 'Шанс победы 100%.' }, { ...advice, locale: 'xx' },
])('rejects invalid advice before speech or display: %j', value => {
  expect(parseTrainingAdvice(value)).toBeNull();
});
