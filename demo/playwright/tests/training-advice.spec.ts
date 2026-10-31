import { expect, test } from '@playwright/test';

test('voice coach follows the interface language and ignores old commentator settings', async ({ page }) => {
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
  await expect(advice.locator('p')).toContainText(/[A-Za-z]/);
  await expect(advice.locator('p')).not.toContainText(/[А-Яа-яЁё]/);

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
    const fold = page.getByRole('button', { name: 'Fold', exact: true });
    await expect(fold).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.training-advice-slot')).toBeVisible();
    const actionsBeforeAdvice = await page.locator('.mt-action-buttons button, .main-actions button').evaluateAll(buttons =>
      buttons.map(button => {
        const box = button.getBoundingClientRect();
        const dock = button.closest('.mt-dock, .action-dock')!.getBoundingClientRect();
        return { left: box.left - dock.left, top: box.top - dock.top, width: box.width, height: box.height };
      }),
    );
    const coach = page.getByTestId('training-advice');
    await expect(coach).toBeVisible({ timeout: 25_000 });
    const actionsWithAdvice = await page.locator('.mt-action-buttons button, .main-actions button').evaluateAll(buttons =>
      buttons.map(button => {
        const box = button.getBoundingClientRect();
        const dock = button.closest('.mt-dock, .action-dock')!.getBoundingClientRect();
        return { left: box.left - dock.left, top: box.top - dock.top, width: box.width, height: box.height };
      }),
    );
    expect(actionsWithAdvice).toEqual(actionsBeforeAdvice);
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
    await expect(coach.locator('details')).toHaveCount(0);
    await page.screenshot({ path: test.info().outputPath(`coach-${width}.png`), fullPage: true });
    await fold.scrollIntoViewIfNeeded();
    await expect(fold).toBeInViewport();
    await page.getByRole('button', { name: 'Fold', exact: true }).click();
    await expect(coach).toHaveCount(0);
  });
}
