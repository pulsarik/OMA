import { expect, test } from '@playwright/test';

test('people entry offers open tables and creating a table', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play with bots' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Play with people' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Create a table' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Play with people' }).click();
  await expect(page.getByRole('heading', { name: 'Open tables' })).toBeVisible();
  await expect(page.getByText('No open tables yet', { exact: true })).toBeVisible();
  await expect(page.getByText('Create a table and it will appear here for other players to join.')).toBeVisible();
  const createTable = page.getByRole('button', { name: 'Create your own table' });
  await expect(createTable).toBeEnabled();
  await createTable.click();
  await expect(page.getByRole('button', { name: 'Create table', exact: true })).toBeVisible();
  await page.getByLabel('Your name').fill('Alice');
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(page.getByLabel('Table PIN')).toBeVisible();
});

test('mobile setup switches modes without losing details and starts with bots', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 862 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with bots' }).click();
  await expect(page.getByRole('radio', { name: /With friends/ })).toHaveCount(0);
  await page.getByLabel('Your name').fill('Bob');
  await page.getByLabel('Seats at the table').selectOption('4');
  await expect(page.getByLabel('Your name')).toHaveValue('Bob');
  await expect(page.getByLabel('Seats at the table')).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Play now' })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const cta = await page.getByRole('button', { name: 'Play now' }).boundingBox();
  expect(cta!.y + cta!.height).toBeLessThan(862);
  await page.getByLabel('Your name').blur();
  await page.screenshot({ path: testInfo.outputPath('table-setup-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Play now' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(page.getByRole('tab', { name: 'TABLE', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tab', { name: 'TABLE', exact: true })).toBeVisible();
});

test('bot entry can start without a name and friends remain a waiting table', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with bots' }).click();
  await expect(page.getByRole('radio', { name: /With bots/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Play now' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(page.getByRole('tab', { name: 'TABLE', exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with people' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await expect(page.getByRole('radio', { name: /With friends/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Enter your name.');
  await page.getByLabel('Your name').fill('Alice');
  await page.screenshot({ path: testInfo.outputPath('table-setup-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await expect(page.getByLabel('Table PIN')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start game/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'TABLE', exact: true })).toHaveCount(0);
});
