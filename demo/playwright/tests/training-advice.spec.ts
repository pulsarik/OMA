import { expect, test } from '@playwright/test';

test('voice coach is enabled by default and advises after ten seconds against bots', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('omaha-commentary', JSON.stringify({ mode: 'voice', locale: 'ru', volume: 0.65 }));
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: { speak: (utterance: { onend?: () => void }) => queueMicrotask(() => utterance.onend?.()), cancel: () => undefined, speaking: false },
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: class { lang = ''; rate = 1; constructor(public text: string) {} },
    });
  });
  await page.goto('/?start=bots');
  await page.getByLabel('Seats at the table').selectOption('2');
  await page.getByRole('button', { name: 'Play now' }).click();
  await expect(page.getByRole('button', { name: 'Fold', exact: true })).toBeVisible({ timeout: 15_000 });

  const advice = page.getByTestId('training-advice');
  await expect(advice).toBeVisible({ timeout: 12_000 });
  await expect(advice).toContainText(/[А-Яа-яЁё]/);

  await page.getByRole('tab', { name: 'SETTINGS' }).click();
  const setting = page.getByRole('checkbox', { name: 'Advice after 10 seconds' });
  await expect(setting).toBeChecked();
  await setting.uncheck();
  await expect(advice).toHaveCount(0);
});
