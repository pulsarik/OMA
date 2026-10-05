import { expect, test } from '@playwright/test';

test('remembers the host name in the next create-table form', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with people' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await page.getByLabel('Your name').fill('Cookie Player');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);

  await page.goto('/');
  await page.getByRole('button', { name: 'Play with people' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await expect(page.getByLabel('Your name')).toHaveValue('Cookie Player');
});

test('host gets a simple lobby screen and copied invitation joins its table', async ({ page, browser }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with people' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await page.getByLabel('Your name').fill('Direct invite host');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(page.getByTestId('lobby-host-members')).toContainText('1/4');
  await expect(page.locator('.lobby-host-page')).toHaveCSS('background-image', /radial-gradient/);
  await expect(page.getByTestId('lobby-host-members')).toContainText('Direct invite host');
  await expect(page.getByText('The game will start when you press “Start game”.')).toBeVisible();
  await expect(page.getByText('Add at least one more player or a bot to enable the start button.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start game' })).toBeDisabled();
  await page.getByLabel('Your name').fill('Renamed host');
  await page.getByLabel('Your name').press('Enter');
  await expect(page.getByTestId('lobby-host-member')).toContainText('Renamed host');

  const pin = (await page.getByLabel('Table PIN').textContent())?.trim() ?? '';
  const tableUrl = new URL(page.url());
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: tableUrl.origin });
  await page.getByRole('button', { name: 'Copy invitation' }).click();
  const invitation = await page.evaluate(() => navigator.clipboard.readText());
  const invitationUrl = invitation.match(/https?:\/\/\S+/)?.[0] ?? '';
  expect(invitationUrl).toBe(`${tableUrl.origin}${tableUrl.pathname}?pin=${pin}`);

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.setViewportSize({ width: 360, height: 740 });
  await guest.goto(invitationUrl);
  await expect(guest).toHaveURL(new RegExp(`/lobby/[^/?]+\\?pin=${pin}$`));
  await expect(guest.getByLabel('Your name')).toBeVisible();
  await expect(guest.getByRole('textbox', { name: 'Table PIN' })).toHaveCount(0);
  await expect(guest.getByTestId('lobby-table')).toHaveCount(0);
  await expect(guest.locator('.lobby-join-page')).toHaveCSS('background-image', /radial-gradient/);
  await expect(guest.getByTestId('lobby-join-member')).toContainText('Renamed host');
  await expect(guest.getByText('The game will start when Renamed host, the host, starts it.')).toBeVisible();
  await guest.getByLabel('Your name').fill('Direct invite guest');
  await guest.getByRole('button', { name: 'Take a seat' }).click();
  await expect(page.getByTestId('lobby-host-members')).toContainText('Direct invite guest');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-host-member')).toHaveCount(3);
  await expect(page.getByTestId('lobby-host-members')).toContainText('BOT');
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(guest.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await guestContext.close();
});

test('mobile host can start a lobby and reach the table', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with people' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-host-members')).toContainText('BOT');
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByTestId('poker-table')).toBeVisible();
});

test('host creates a city table and a friend joins it by PIN', async ({ page, browser }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Omaha Hi-Lo' })).toBeVisible();
  await page.getByRole('button', { name: 'Play with people' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);

  const pin = (await page.getByLabel('Table PIN').textContent())?.trim() ?? '';
  const tableName = (await page.getByLabel('Table name').textContent())?.trim() ?? '';
  expect(pin).toMatch(/^\d{4}$/);
  expect(tableName).not.toBe('');
  await expect(page.getByTestId('lobby-host-members')).toContainText('Dima');
  await expect(page.getByText('The game will start when you press “Start game”.')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'REPLAY' })).toBeVisible();
  await page.getByRole('tab', { name: 'REPLAY' }).click();
  await expect(page.getByLabel('Replay code')).toBeVisible();
  await expect(page.getByRole('button', { name: /Start game/ })).toBeVisible();
  await expect(page.getByTestId('lobby-table')).toHaveCount(0);
  await page.getByRole('tab', { name: 'LOBBY' }).click();
  await expect(page.getByTestId('lobby-host-members')).toBeVisible();
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
  expect(invitation).toContain(`/lobby/${new URL(page.url()).pathname.split('/').pop()}?pin=${pin}`);
  expect(invitation).toContain(`City: ${tableName}`);
  expect(invitation).toContain(`PIN: ${pin}`);
  await expect(page.getByTestId('lobby-host-member')).toContainText('Dima');

  const secondHostContext = await browser.newContext();
  const secondHost = await secondHostContext.newPage();
  await secondHost.goto('/');
  await secondHost.getByRole('button', { name: 'Play with people' }).click();
  await secondHost.getByRole('button', { name: 'Create your own table' }).click();
  await secondHost.getByLabel('Your name').fill('Pavel');
  await secondHost.getByRole('button', { name: 'Create table' }).click();
  await expect(secondHost).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(secondHost.getByLabel('Table name')).not.toHaveText(tableName);
  await secondHostContext.close();

  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  await guest.goto('/');
  await guest.getByRole('button', { name: 'RU' }).click();
  await expect(guest.getByRole('button', { name: 'EN' })).toBeVisible();
  await guest.getByRole('button', { name: 'Играть с людьми' }).click();
  await expect(guest.getByRole('heading', { name: 'Открытые столы' })).toBeVisible();
  const targetTable = guest.getByRole('button').filter({ hasText: tableName }).filter({ hasText: 'Dima' });
  await expect(targetTable).toBeVisible();
  await expect(guest.getByLabel('PIN стола')).toHaveCount(0);
  await targetTable.click();
  await expect(guest.getByText('Выбранный стол')).toBeVisible();
  await expect(guest.getByRole('heading', { name: 'Введите PIN стола' })).toBeVisible();
  await guest.getByRole('textbox', { name: 'PIN стола' }).fill(pin === '0000' ? '0001' : '0000');
  await guest.getByRole('button', { name: 'Войти за стол' }).click();
  await expect(guest.getByText('Неверный PIN выбранного стола.')).toBeVisible();
  await expect(guest).toHaveURL('/');
  await guest.getByRole('textbox', { name: 'PIN стола' }).fill(pin);
  await guest.getByRole('button', { name: 'Войти за стол' }).click();
  await expect(guest).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(guest.getByRole('heading', { name: 'Table lobby' })).toHaveCount(0);
  await expect(guest.getByTestId('lobby-join-members')).toContainText('Dima');
  await expect(guest.getByText('Игра начнётся, когда её начнёт ведущий — Dima.')).toBeVisible();
  await expect(guest.getByTestId('lobby-table')).toHaveCount(0);
  await guest.getByLabel('Ваше имя').fill('Anna');
  await guest.getByRole('button', { name: 'Занять место' }).click();
  await expect(guest).toHaveURL(/\/lobby\/[^/?]+$/);

  await expect(page.getByText('Anna', { exact: true })).toBeVisible();
  await expect(guest.getByText('Ждём, когда Dima начнёт игру…')).toBeVisible();
  await expect(page.getByTestId('lobby-host-members')).toContainText('Anna');
  await expect(guest.getByTestId('lobby-table')).toContainText('Anna');
  await expect(guest.getByTestId('lobby-table')).toContainText('Dima');
  await expect(guest.getByTestId('lobby-table')).toContainText('ЖДЁМ ВЕДУЩЕГО');
  await expect(guest.getByTestId('lobby-table').getByText('ГОТОВ')).toHaveCount(0);

  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-host-members')).toContainText('BOT');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-host-member')).toHaveCount(4);
  await expect(guest.getByTestId('lobby-table')).toContainText('Alex');

  const stableTableUrl = page.url();
  await page.getByRole('button', { name: 'Start game' }).click();
  await Promise.all([
    expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible(),
    expect(guest.getByRole('tab', { name: /TABLE|СТОЛ/ })).toBeVisible(),
  ]);

  expect(page.url()).toBe(stableTableUrl);
  expect(guest.url()).toBe(stableTableUrl);
  await page.reload();
  await expect(page).toHaveURL(stableTableUrl);
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(guest.getByLabel('Language')).toHaveCount(0);
  await expect(page.getByTestId('opponents-grid').locator('[data-player-seat]')).toHaveCount(3);
  await expect(page.getByTestId('opponents-grid')).toContainText('Alex');
  await expect(page.getByTestId('opponents-grid')).toContainText('Maria');
  await expect(page.getByTestId('opponents-grid')).toContainText('Anna');
  await expect(guest.getByTestId('opponents-grid')).toContainText('Dima');
  await expect(guest.getByTestId('opponents-grid')).toContainText('Alex');
  await expect(guest.getByTestId('opponents-grid')).toContainText('Maria');
  await expect(page.getByText('Alex', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Anna', { exact: true }).first()).toBeVisible();
  await expect(guest.getByText('Dima', { exact: true }).first()).toBeVisible();

  await guestContext.close();
});
