import { expect, test, type Page } from '@playwright/test';

async function create(page: Page, mode: string) {
  await page.goto(`/?start=${mode}`);
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await page.getByLabel('Your name').fill('Expiry host');
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await expect(page.getByTestId('lobby-host-members')).toContainText('Expiry host');
}

for (const mode of ['friends', 'guests']) {
  test(`${mode} waiting table expires, disappears from listings and cannot be resumed`, async ({ page, browser }) => {
    await create(page, mode);
    const url = page.url();
    const observer = await browser.newContext();
    try {
      const list = await observer.newPage();
      await list.goto(`/?start=${mode}`);
      await expect(list.getByRole('button').filter({ hasText: 'Expiry host' })).toBeVisible();
      await page.getByLabel('Your name').fill('Still waiting');
      await page.getByLabel('Your name').press('Enter');
      await expect(page.getByText('This table closed because the game did not start within one hour.')).toBeVisible({ timeout: 12_000 });
      await expect(page.getByRole('button', { name: 'Start game', exact: true })).toHaveCount(0);
      await expect(list.getByRole('button').filter({ hasText: 'Still waiting' })).toHaveCount(0, { timeout: 12_000 });
      await page.goto('/');
      await expect.poll(() => page.evaluate(() => localStorage.getItem('omaha-last-lobby-id'))).toBeNull();
      await list.goto(url);
      await expect(list.getByRole('alert')).toContainText('lobby not found');
      await expect(list.getByRole('button', { name: 'Take a seat' })).toBeDisabled();
    } finally { await observer.close(); }
  });
}

test('starting the game cancels waiting expiry', async ({ page }) => {
  await create(page, 'guests');
  await page.getByRole('button', { name: 'Add bot', exact: true }).click();
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByTestId('poker-table')).toBeVisible();
  await page.waitForTimeout(7000);
  await page.reload();
  await expect(page.getByTestId('poker-table')).toBeVisible();
  await expect(page.getByText('This table closed because the game did not start within one hour.')).toHaveCount(0);
});
