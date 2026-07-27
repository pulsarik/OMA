import { expect, test } from '@playwright/test';

test('host invites a friend, adds a bot and starts one shared game', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'LOBBY' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'QUICK DEAL' })).toHaveCount(0);
  await expect(page.getByText('connected', { exact: true })).toBeVisible();
  await page.getByLabel('Host name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create lobby' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+\?member=/);

  const inviteUrl = await page.getByLabel('Invite link').inputValue();
  expect(inviteUrl).not.toContain('member=');
  await expect(page.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('Dima');
  await expect(page.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('HOST · YOU');

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto(inviteUrl);
  await expect(guest.getByText('Players already here')).toBeVisible();
  await expect(guest.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('Dima');
  await expect(guest.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('HOST · READY');
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

  await page.getByRole('button', { name: 'Start game' }).click();
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
