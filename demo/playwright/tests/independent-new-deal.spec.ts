import { expect, test } from '@playwright/test';

test('players enter a new deal independently', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('2');
  await page.getByRole('button', { name: 'Create table' }).click();

  const pin = (await page.getByLabel('Table PIN').textContent())?.trim() ?? '';
  const tableName = (await page.getByLabel('Table name').textContent())?.trim() ?? '';

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto('/');
  await guest.getByRole('button', { name: 'Join an open table' }).click();
  await guest.getByRole('button').filter({ hasText: tableName }).filter({ hasText: 'Dima' }).click();
  await guest.getByRole('textbox', { name: 'Table PIN' }).fill(pin);
  await guest.getByRole('button', { name: 'Enter table' }).click();
  await guest.getByLabel('Your name').fill('Anna');
  await guest.getByRole('button', { name: 'Take a seat' }).click();

  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start game' }).click();
  await Promise.all([
    expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible(),
    expect(guest.getByRole('tab', { name: 'TABLE' })).toBeVisible(),
  ]);

  const hostFold = page.getByRole('button', { name: 'Fold' });
  const guestFold = guest.getByRole('button', { name: 'Fold' });
  if (await hostFold.isEnabled()) await hostFold.click();
  else await guestFold.click();

  await Promise.all([
    expect(page.getByRole('button', { name: 'New deal' })).toBeVisible(),
    expect(guest.getByRole('button', { name: 'New deal' })).toBeVisible(),
  ]);

  const guestDealUrl = await guest.evaluate(() => (
    Object.entries(window.sessionStorage)
      .find(([key]) => key.endsWith('-player-url'))?.[1]
  ));
  await page.getByRole('button', { name: 'New deal' }).click();
  await expect(page.getByText('preflop', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId(/waiting-for-player-/)).toHaveText('WAITING');
  await expect(page.locator('[data-player-seat]').filter({ hasText: 'Anna' }).getByText('WAITING')).toBeVisible();

  // Anna must remain on the completed deal until she presses her own button.
  await expect.poll(() => guest.evaluate(() => (
    Object.entries(window.sessionStorage)
      .find(([key]) => key.endsWith('-player-url'))?.[1]
  ))).toBe(guestDealUrl);
  await expect(guest.locator('.table-center.has-showdown')).toBeVisible();
  await expect(guest.getByRole('button', { name: 'New deal' })).toBeVisible();

  await guest.getByRole('button', { name: 'New deal' }).click();
  await expect(guest.getByText('preflop', { exact: true }).first()).toBeVisible();
  await expect(page.getByTestId(/waiting-for-player-/)).toHaveCount(0);

  await guestContext.close();
});
