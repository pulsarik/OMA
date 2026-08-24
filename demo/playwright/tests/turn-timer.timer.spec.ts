import { expect, Page, test } from '@playwright/test';

async function currentPlayerUrl(page: Page) {
  return page.evaluate(() => (
    Object.entries(window.sessionStorage)
      .find(([key]) => key.endsWith('-player-url'))?.[1] ?? ''
  ));
}

function apiUrlForPlayerLink(href: string) {
  const [, , handId, playerId, token] = new URL(href, 'http://localhost:5173').pathname.split('/');
  return `http://localhost:4000/api/player/${handId}/${playerId}/${token}`;
}

async function createTwoHumanTable(host: Page, guest: Page) {
  await host.goto('/');
  await host.getByRole('button', { name: 'Create a table' }).click();
  await host.getByLabel('Your name').fill('Dima');
  await host.getByLabel('Seats at the table').selectOption('2');
  await host.getByRole('button', { name: 'Create table' }).click();

  const pin = (await host.getByLabel('Table PIN').textContent())?.trim() ?? '';
  const tableName = (await host.getByLabel('Table name').textContent())?.trim() ?? '';
  await guest.goto('/');
  await guest.getByRole('button', { name: 'Join an open table' }).click();
  await guest.getByRole('button').filter({ hasText: tableName }).filter({ hasText: 'Dima' }).click();
  await guest.getByRole('textbox', { name: 'Table PIN' }).fill(pin);
  await guest.getByRole('button', { name: 'Enter table' }).click();
  await guest.getByLabel('Your name').fill('Anna');
  await guest.getByRole('button', { name: 'Take a seat' }).click();
  await expect(host.getByTestId('lobby-table').getByText('Anna', { exact: true })).toBeVisible();

  await host.getByRole('button', { name: 'Start game' }).click();
  await expect(host.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(guest.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  return {
    hostUrl: await currentPlayerUrl(host),
    guestUrl: await currentPlayerUrl(guest),
  };
}

test('an unmatched timed-out player is automatically folded', async ({ page, browser, request }) => {
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  const { hostUrl } = await createTwoHumanTable(page, guest);
  const apiUrl = apiUrlForPlayerLink(hostUrl);

  await expect(page.getByTestId('turn-countdown-P1')).toBeVisible();
  await expect.poll(async () => {
    const state = await (await request.get(apiUrl)).json();
    return state.actions.some((action: any) => (
      action.playerId === 'P1' && action.stage === 'preflop' && action.move === 'fold'
    ));
  }).toBe(true);

  const state = await (await request.get(apiUrl)).json();
  expect(state.stage).toBe('showdown');
  expect(state.currentPlayerId).toBeUndefined();
  await guestContext.close();
});

test('a matched timed-out player is automatically checked', async ({ page, browser, request }) => {
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  const { guestUrl } = await createTwoHumanTable(page, guest);
  const apiUrl = apiUrlForPlayerLink(guestUrl);

  await page.getByRole('button', { name: /^Call / }).click();
  await guest.getByRole('button', { name: 'Check' }).click();
  await expect(guest.getByTestId('turn-countdown-P2')).toBeVisible();

  await expect.poll(async () => {
    const state = await (await request.get(apiUrl)).json();
    return state.actions.some((action: any) => (
      action.playerId === 'P2' && action.stage === 'flop' && action.move === 'check'
    ));
  }).toBe(true);

  const state = await (await request.get(apiUrl)).json();
  expect(state.stage).toBe('flop');
  expect(state.currentPlayerId).toBe('P1');
  await guestContext.close();
});

test('holds the last opponent action for one second when a new street gives me the turn', async ({ page, browser, request }) => {
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  const { hostUrl } = await createTwoHumanTable(page, guest);
  const apiUrl = apiUrlForPlayerLink(hostUrl);

  await page.getByRole('button', { name: /^Call / }).click();
  await guest.getByRole('button', { name: 'Check' }).click();

  await expect.poll(async () => {
    const state = await (await request.get(apiUrl)).json();
    return { stage: state.stage, currentPlayerId: state.currentPlayerId };
  }).toEqual({ stage: 'flop', currentPlayerId: 'P1' });

  const opponentAction = page.getByTestId('opponent-betting-action-P2');
  await expect(opponentAction).toBeVisible();
  await expect(opponentAction).toHaveText('CHECK');
  const pauseStartedAt = Date.now();
  await expect(page.locator('.action-dock')).toHaveCount(0);
  await expect.poll(() => Date.now() - pauseStartedAt, { timeout: 2_000 }).toBeGreaterThanOrEqual(700);
  await expect(opponentAction).toHaveCount(0);
  await expect(page.locator('.action-dock')).toBeVisible();

  await guestContext.close();
});
