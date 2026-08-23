import { expect, test } from '@playwright/test';

test('host creates a city table and a friend joins it by PIN', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Omaha Hi-Lo' })).toBeVisible();
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);

  const pin = (await page.getByLabel('Table PIN').textContent())?.trim() ?? '';
  const tableName = (await page.getByLabel('Table name').textContent())?.trim() ?? '';
  expect(pin).toMatch(/^\d{4}$/);
  expect(tableName).not.toBe('');
  await expect(page.getByText('Tell your friends the table name and PIN')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'REPLAY' })).toBeVisible();
  await page.getByRole('tab', { name: 'REPLAY' }).click();
  await expect(page.getByLabel('Replay code')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start game/ })).toBeVisible();
  await expect(page.getByTestId('lobby-table')).toHaveCount(0);
  await page.getByRole('tab', { name: 'LOBBY' }).click();
  await expect(page.getByTestId('lobby-table')).toBeVisible();
  const startButton = page.getByRole('button', { name: /Start game/ });
  const startButtonBox = await startButton.boundingBox();
  expect(startButtonBox).toBeTruthy();
  expect(startButtonBox!.y + startButtonBox!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  const reportButtonBox = await page.getByRole('button', { name: 'Report a problem' }).boundingBox();
  expect(reportButtonBox).toBeTruthy();
  expect(
    startButtonBox!.x + startButtonBox!.width <= reportButtonBox!.x
      || reportButtonBox!.x + reportButtonBox!.width <= startButtonBox!.x
      || startButtonBox!.y + startButtonBox!.height <= reportButtonBox!.y
      || reportButtonBox!.y + reportButtonBox!.height <= startButtonBox!.y,
  ).toBe(true);
  await expect(page.getByLabel('Table name')).not.toBeEmpty();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(page.url()).origin });
  await page.getByRole('button', { name: 'Copy invitation' }).click();
  await expect(page.getByRole('button', { name: 'Invitation copied' })).toBeVisible();
  const invitation = await page.evaluate(() => navigator.clipboard.readText());
  expect(invitation).toContain(`Website: ${new URL(page.url()).origin}`);
  expect(invitation).toContain(`City: ${tableName}`);
  expect(invitation).toContain(`PIN: ${pin}`);
  await expect(page.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('Dima');
  await expect(page.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('HOST · YOU');

  const secondHostContext = await browser.newContext();
  const secondHost = await secondHostContext.newPage();
  await secondHost.goto('/');
  await secondHost.getByRole('button', { name: 'Create a table' }).click();
  await secondHost.getByLabel('Your name').fill('Pavel');
  await secondHost.getByRole('button', { name: 'Create table' }).click();
  await expect(secondHost).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(secondHost.getByLabel('Table name')).not.toHaveText(tableName);
  await secondHostContext.close();

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto('/');
  await guest.getByRole('button', { name: 'Join an open table' }).click();
  const targetTable = guest.getByRole('button').filter({ hasText: tableName }).filter({ hasText: 'Dima' });
  await expect(targetTable).toBeVisible();
  await expect(guest.getByLabel('Table PIN')).toHaveCount(0);
  await targetTable.click();
  await guest.getByRole('textbox', { name: 'Table PIN' }).fill(pin === '0000' ? '0001' : '0000');
  await guest.getByRole('button', { name: 'Enter table' }).click();
  await expect(guest.getByText('incorrect table PIN')).toBeVisible();
  await expect(guest).toHaveURL('/');
  await guest.getByRole('textbox', { name: 'Table PIN' }).fill(pin);
  await guest.getByRole('button', { name: 'Enter table' }).click();
  await expect(guest).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(guest.getByRole('heading', { name: 'Table lobby' })).toHaveCount(0);
  await expect(guest.getByText('Players already here')).toBeVisible();
  await expect(guest.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('Dima');
  await expect(guest.getByText('Enter your name and wait for Dima to start the game.')).toBeVisible();
  await guest.getByLabel('Your name').fill('Anna');
  await guest.getByRole('button', { name: 'Take a seat' }).click();
  await expect(guest).toHaveURL(/\/lobby\/[^/?]+$/);

  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await expect(guest.getByText('Waiting for Dima to start the game…')).toBeVisible();
  await expect(page.getByTestId('lobby-table').locator('[data-lobby-seat="2"]')).toContainText('Anna');
  await expect(guest.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('Anna');
  await expect(guest.getByTestId('lobby-table').locator('[data-lobby-seat="4"]')).toContainText('Dima');

  await page.getByLabel('Seat for Anna').selectOption('3');
  await expect(page.getByTestId('lobby-table').locator('[data-lobby-seat="4"]')).toContainText('Anna');
  await expect(guest.getByTestId('lobby-table').locator('[data-lobby-seat="1"]')).toContainText('Anna');
  await expect(guest.getByTestId('lobby-table').locator('[data-lobby-seat="2"]')).toContainText('Dima');

  await page.getByLabel('Bot name').fill('Max');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByText('Max', { exact: true })).toBeVisible();
  await expect(guest.getByText('Max', { exact: true })).toBeVisible();

  const stableTableUrl = page.url();
  await page.getByRole('button', { name: 'Start game · fill with bots' }).click();
  await Promise.all([
    expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible(),
    expect(guest.getByRole('tab', { name: 'TABLE' })).toBeVisible(),
  ]);

  expect(page.url()).toBe(stableTableUrl);
  expect(guest.url()).toBe(stableTableUrl);
  await page.reload();
  await expect(page).toHaveURL(stableTableUrl);
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(guest.getByLabel('Language')).toHaveCount(0);
  await expect(page.getByTestId('opponents-grid').locator('[data-player-seat]')).toHaveCount(3);
  await expect(page.getByTestId('opponents-grid').locator('[data-player-seat]').nth(0)).toContainText('Max');
  await expect(page.getByTestId('opponents-grid').locator('[data-player-seat]').nth(1)).toContainText('Alex');
  await expect(page.getByTestId('opponents-grid').locator('[data-player-seat]').nth(2)).toContainText('Anna');
  await expect(guest.getByTestId('opponents-grid').locator('[data-player-seat]').nth(0)).toContainText('Dima');
  await expect(guest.getByTestId('opponents-grid').locator('[data-player-seat]').nth(1)).toContainText('Max');
  await expect(guest.getByTestId('opponents-grid').locator('[data-player-seat]').nth(2)).toContainText('Alex');
  await expect(page.getByText('Alex', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Anna', { exact: true }).first()).toBeVisible();
  await expect(guest.getByText('Dima', { exact: true }).first()).toBeVisible();

  await guestContext.close();
});
