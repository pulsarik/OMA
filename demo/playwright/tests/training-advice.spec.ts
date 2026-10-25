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

  await page.getByRole('tab', { name: 'SETTINGS' }).or(page.getByRole('button', { name: 'Settings', exact: true })).click();
  const setting = page.getByRole('checkbox', { name: 'Advice after 10 seconds' });
  await expect(setting).toBeChecked();
  await setting.uncheck();
  await expect(advice).toHaveCount(0);
});

for (const width of [320, 390]) {
  test(`coach stays clear of cards and action buttons at ${width}px; speech matches visible text`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 320 ? 568 : 844 });
    await page.addInitScript(() => {
      localStorage.setItem('omaha-commentary', JSON.stringify({ mode: 'voice', locale: 'ru', volume: 0.65 }));
      (window as any).__coachSpeech = [];
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
        speak: (utterance: any) => { (window as any).__coachSpeech.push(utterance.text); queueMicrotask(() => utterance.onend?.()); },
        cancel: () => undefined, speaking: false,
      } });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true,
        value: class { lang = ''; rate = 1; constructor(public text: string) {} } });
    });
    await page.goto('/?start=bots');
    await page.getByLabel('Seats at the table').selectOption('2');
    await page.getByRole('button', { name: 'Play now' }).click();
    const coach = page.getByTestId('training-advice');
    await expect(coach).toBeVisible({ timeout: 25_000 });
    const text = await coach.locator('p').first().innerText();
    expect(text.length).toBeLessThanOrEqual(110);
    await expect.poll(() => page.evaluate(() => (window as any).__coachSpeech)).toContain(text);
    const checkGeometry = async () => {
      const collisions = await coach.evaluate(element => {
        const a = element.getBoundingClientRect();
        const targets = document.querySelectorAll('.main-actions button, .mt-action-buttons button, .focal-card-frame, .mt-board .mt-card, .mt-seat--hero .mt-card, [data-testid="table-board"]');
        return { overflow: a.left < 0 || a.right > innerWidth,
          overlaps: [...targets].filter(target => {
            const b = target.getBoundingClientRect();
            return b.width > 0 && b.height > 0 && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
          }).map(target => target.className) };
      });
      expect(collisions).toEqual({ overflow: false, overlaps: [] });
    };
    await checkGeometry();
    await page.screenshot({ path: test.info().outputPath(`coach-${width}-short.png`), fullPage: true });
    await coach.getByText('Почему?', { exact: true }).click();
    await expect(coach.locator('details')).toHaveAttribute('open', '');
    await checkGeometry();
    const fold = page.getByRole('button', { name: 'Fold', exact: true });
    await fold.scrollIntoViewIfNeeded();
    await expect(fold).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath(`coach-${width}.png`), fullPage: true });
    await coach.getByText('Почему?', { exact: true }).click();
    await page.getByRole('button', { name: 'Fold', exact: true }).click();
    await expect(coach).toHaveCount(0);
  });
}
