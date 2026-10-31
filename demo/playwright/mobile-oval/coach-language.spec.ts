import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

test('coach request, text and speech follow the interface when languages change', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('omaha-language', 'ru');
    localStorage.setItem('omaha-commentary', JSON.stringify({ mode: 'off', locale: 'en' }));
    (window as any).__coachSpeech = [];
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speak: (utterance: any) => {
        (window as any).__coachSpeech.push({ text: utterance.text, lang: utterance.lang });
        queueMicrotask(() => utterance.onend?.());
      },
      cancel: () => undefined, speaking: false,
    } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true,
      value: class { lang = ''; rate = 1; constructor(public text: string) {} } });
  });
  const initial = fixture(4, false);
  const state = { ...initial, turnDeadline: Date.now() + 30_000,
    commentary: { enabled: true, voiceEnabled: true },
    players: initial.players.map(p => ({ ...p, isBot: p.id !== 'P1' })) };
  const mock = await mockTable(page, state);
  const requests = () => [...new Set(mock.messages.filter(m => m.action === 'training_advice').map(m => m.locale))];
  await expect.poll(requests).toEqual(['ru']);
  const russian = 'Колл двадцать — шансы банка позволяют продолжить.';
  mock.advice(russian, 'ru');
  await expect(page.getByTestId('training-advice')).toContainText(russian);
  await expect.poll(() => page.evaluate(() => (window as any).__coachSpeech)).toEqual([{ text: russian, lang: 'ru-RU' }]);

  await page.getByLabel('Меню стола', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await page.getByLabel('Язык интерфейса').selectOption('en');
  await expect.poll(requests).toEqual(['ru', 'en']);
  await page.getByRole('tab', { name: 'TABLE', exact: true }).click();
  await expect(page.getByTestId('mobile-table')).toHaveAttribute('lang', 'en');
  await expect(page.getByTestId('training-advice')).toHaveCount(0);
  mock.advice(russian, 'ru'); // A delayed reply for the old language must be ignored.
  const english = 'Call twenty. The pot odds support continuing.';
  mock.advice(english, 'en');
  await expect(page.getByTestId('training-advice')).toContainText(english);
  await expect.poll(() => page.evaluate(() => (window as any).__coachSpeech)).toEqual([
    { text: russian, lang: 'ru-RU' }, { text: english, lang: 'en-US' },
  ]);
  await expect(page.getByTestId('mobile-table')).toHaveAttribute('lang', 'en');
});
