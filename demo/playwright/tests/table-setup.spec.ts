import { expect, test } from '@playwright/test';

for (const { viewport, seats } of [
  { viewport: { width: 1440, height: 900 }, seats: '10' },
  { viewport: { width: 390, height: 844 }, seats: '2' },
  { viewport: { width: 390, height: 844 }, seats: '9' },
]) {
  test(`direct bot entry and reload render without browser errors (${viewport.width}px, ${seats} seats)`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize(viewport);
    await page.goto('/?start=bots');
    await page.getByLabel('Seats at the table').selectOption(seats);
    await page.getByRole('button', { name: 'Play now' }).click();
    await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
    const table = page.getByRole('tab', { name: 'TABLE', exact: true });
    await expect(table).toBeVisible();
    await page.reload();
    await expect(table).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('people entry offers open tables and creating a table', async ({ page }) => {
  await page.routeWebSocket(/ws:\/\/localhost:(4000|4100)\//, socket => {
    const server = socket.connectToServer();
    server.onMessage(raw => {
      const message = JSON.parse(String(raw));
      socket.send(message.type === 'open_lobbies'
        ? JSON.stringify({ ...message, data: [] })
        : raw);
    });
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play with bots' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Play with friends' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Create a table' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Play with friends' }).click();
  await expect(page.getByRole('heading', { name: "Friends' tables - PIN required" })).toBeVisible();
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
  await page.getByRole('button', { name: 'Play with friends' }).click();
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
