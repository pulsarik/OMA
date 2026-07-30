import { expect, test } from '@playwright/test';

test('host can end a completed table only after every player confirms', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByLabel('Язык').selectOption('en');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('2');
  await page.getByRole('button', { name: 'Create table' }).click();

  const pin = (await page.getByLabel('Table PIN').textContent())?.trim() ?? '';
  const tableName = (await page.getByLabel('Table name').textContent())?.trim() ?? '';
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();

  await guest.goto('/');
  await guest.getByLabel('Язык').selectOption('en');
  await guest.getByRole('button', { name: 'Join an open table' }).click();
  await guest.getByRole('button').filter({ hasText: tableName }).filter({ hasText: 'Dima' }).click();
  await guest.getByRole('textbox', { name: 'Table PIN' }).fill(pin);
  await guest.getByRole('button', { name: 'Enter table' }).click();
  await guest.getByLabel('Your name').fill('Anna');
  await guest.getByRole('button', { name: 'Take a seat' }).click();

  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('button', { name: 'End table early and calculate results' })).toHaveCount(0);

  const hostFold = page.getByRole('button', { name: 'Fold' });
  if (await hostFold.isEnabled()) await hostFold.click();
  else await guest.getByRole('button', { name: 'Fold' }).click();

  const finishButton = page.getByRole('button', { name: 'End table early and calculate results' });
  await expect(finishButton).toBeVisible();
  await finishButton.click();

  await expect(page.getByTestId('early-finish-vote')).toContainText('Confirmed: 1/2');
  await expect(guest.getByTestId('early-finish-vote')).toBeVisible();
  await guest.getByRole('button', { name: 'Confirm finish' }).click();

  await Promise.all([
    expect(page.getByTestId('early-finish-summary')).toBeVisible(),
    expect(guest.getByTestId('early-finish-summary')).toBeVisible(),
  ]);
  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toHaveAttribute('aria-selected', 'true');
  await expect(guest.getByRole('tab', { name: 'STATISTICS' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'New deal' })).toHaveCount(0);
  await expect(guest.getByRole('button', { name: 'New deal' })).toHaveCount(0);

  await guestContext.close();
});
