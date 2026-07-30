import { expect, test } from '@playwright/test';

test('host creates a city table and a friend joins it by PIN', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Омаха хай-ло' })).toBeVisible();
  await page.getByLabel('Язык').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Omaha Hi-Lo' })).toBeVisible();
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+\?member=/);

  const pin = (await page.getByLabel('Table PIN').textContent())?.trim() ?? '';
  expect(pin).toMatch(/^\d{4}$/);
  await expect(page.getByText(/^TABLE [A-Z ]+$/)).toBeVisible();
  await expect(page.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('Dima');
  await expect(page.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('HOST · YOU');

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto('/');
  await guest.getByRole('button', { name: 'Войти в открытый стол' }).click();
  await expect(guest.getByText('Dima', { exact: true })).toBeVisible();
  await guest.getByLabel('PIN стола').fill(pin);
  await guest.getByRole('button', { name: 'Найти стол' }).click();
  await expect(guest).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(guest.getByText('Players already here')).toBeVisible();
  await expect(guest.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('Dima');
  await expect(guest.getByText('Enter your name and wait for the host to start.')).toBeVisible();
  await guest.getByLabel('Your name').fill('Anna');
  await guest.getByRole('button', { name: 'Take a seat' }).click();
  await expect(guest).toHaveURL(/\/lobby\/[^/?]+\?member=/);

  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await expect(guest.getByText('Waiting for the host to start the game…')).toBeVisible();

  await page.getByLabel('Bot name').fill('Max');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByText('Max', { exact: true })).toBeVisible();
  await expect(guest.getByText('Max', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Start game · fill with bots' }).click();
  await Promise.all([
    expect(page).toHaveURL(/\/player\/[^/]+\/P1\/[^/]+$/),
    expect(guest).toHaveURL(/\/player\/[^/]+\/P2\/[^/]+$/),
  ]);

  const hostPath = new URL(page.url()).pathname.split('/');
  const guestPath = new URL(guest.url()).pathname.split('/');
  expect(hostPath[2], 'host and guest opened different hands').toBe(guestPath[2]);
  await expect(page.getByTestId('opponents-grid').locator('[data-player-seat]')).toHaveCount(3);
  await expect(page.getByText('Alex', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Anna', { exact: true }).first()).toBeVisible();
  await expect(guest.getByText('Dima', { exact: true }).first()).toBeVisible();

  await guestContext.close();
});
