import { expect, test } from '@playwright/test';

test('guest tables are separate from friends, join without PIN and retain host permissions', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with guests' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await page.getByLabel('Your name').fill('Public host');
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await expect(page.getByText('Public table · no PIN')).toBeVisible();
  await expect(page.getByLabel('Table PIN')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start game', exact: true })).toBeDisabled();
  const url = page.url();
  const city = await page.getByLabel('Table name').textContent();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy invitation' }).click();
  const invitation = await page.evaluate(() => navigator.clipboard.readText());
  expect(invitation).toContain(url);
  expect(invitation).not.toContain('?pin=');

  const context = await browser.newContext();
  try {
    const guest = await context.newPage();
    await guest.goto('/?start=friends');
    await expect(guest.getByRole('heading', { name: /Friends' tables/ })).toBeVisible();
    await expect(guest.getByRole('button').filter({ hasText: 'Public host' })).toHaveCount(0);
    await guest.goto('/?start=guests');
    await guest.getByRole('button').filter({ hasText: city! }).filter({ hasText: 'Public host' }).click();
    await expect(guest.getByTestId('lobby-join-members')).toContainText('Public host');
    await expect(guest.getByLabel('Table PIN')).toHaveCount(0);
    await guest.reload();
    await guest.getByLabel('Your name').fill('Public guest');
    await guest.getByRole('button', { name: 'Take a seat' }).click();
    await expect(page.getByTestId('lobby-host-members')).toContainText('Public guest');
    await expect(guest.getByRole('button', { name: 'Start game', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page.getByTestId('poker-table')).toBeVisible();
    await expect(guest.getByTestId('poker-table')).toBeVisible();
  } finally { await context.close(); }
});

test('English remains selected despite saved Russian preferences; practice card opens exercises', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('omaha-language', 'ru');
    localStorage.setItem('omaha-mobile-language', 'ru');
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play with friends' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play with guests' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^(RU|EN|EN \/ RU)$/ })).toHaveCount(0);
  await page.locator('.welcome-choice-card').filter({ hasText: '50 practice situations' }).click();
  await expect(page).toHaveURL(/\/rules#practice-50$/);
  await expect(page.locator('#practice-50')).toBeInViewport();
  await expect(page.locator('.practice-case')).toHaveCount(50);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
