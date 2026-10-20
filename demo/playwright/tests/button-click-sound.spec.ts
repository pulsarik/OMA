import { expect, test } from '@playwright/test';

test('buttons play one quiet click for pointer and keyboard activation only', async ({ page }) => {
  await page.addInitScript(() => {
    const starts: number[] = [];
    Object.assign(window, { buttonSoundStarts: starts });
    const start = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when = 0) {
      starts.push(when);
      start.call(this, when);
    };
  });
  const soundCount = () => page.evaluate(() => (window as any).buttonSoundStarts.length);
  await page.goto('/');
  const friends = page.getByRole('button', { name: 'Play with friends' });
  await expect(friends).toBeVisible();
  expect(await soundCount()).toBe(0);

  // A click on a nested label still produces exactly one sound.
  await friends.locator('strong').click();
  await expect.poll(soundCount).toBe(1);
  const create = page.getByRole('button', { name: 'Create your own table' });
  await create.focus();
  await page.keyboard.press('Enter');
  await expect.poll(soundCount).toBe(2);
  await expect(page.getByLabel('Your name')).toBeVisible();

  // Disabled controls, other page content, and scripted clicks stay silent.
  await page.evaluate(() => {
    const disabled = document.createElement('button');
    disabled.disabled = true;
    disabled.textContent = 'Disabled sound test';
    disabled.dataset.testid = 'disabled-sound-test';
    document.body.append(disabled);
    const scripted = document.createElement('button');
    document.body.append(scripted);
    scripted.click();
    scripted.remove();
  });
  await page.getByTestId('disabled-sound-test').click({ force: true });
  await page.getByLabel('Your name').click();
  expect(await soundCount()).toBe(2);
});

test('buttons still work when audio is unavailable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, 'AudioContext', { value: class {
      constructor() { throw new Error('Audio is unavailable'); }
    } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with friends' }).click();
  await expect(page.getByRole('button', { name: 'Create your own table' })).toBeVisible();
  expect(errors).toEqual([]);
});
