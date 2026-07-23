import { expect, Page, test } from '@playwright/test';

async function createDefaultHumanVsBotDeal(page: Page) {
  await page.goto('/');
  await expect(page.getByText('connected', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New deal' }).click();
  const playerLink = page.getByRole('link', { name: /Dima Open/ });
  await expect(playerLink).toBeVisible();
  const href = await playerLink.getAttribute('href');
  expect(href).toBeTruthy();
  return href!;
}

function apiUrlForPlayerLink(href: string) {
  const [, , handId, playerId, token] = new URL(href, 'http://localhost:5173').pathname.split('/');
  return `http://localhost:4000/api/player/${handId}/${playerId}/${token}`;
}

test('opponent cards stay four in a row at a five-player table', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('connected', { exact: true })).toBeVisible();
  await page.getByLabel('Players').fill('5');
  await page.getByLabel('Players').press('Tab');
  await page.getByRole('button', { name: 'New deal' }).click();

  const playerLink = page.getByRole('link', { name: /Dima Open/ });
  await expect(playerLink).toBeVisible();
  const href = await playerLink.getAttribute('href');
  expect(href).toBeTruthy();
  await page.goto(href!);

  for (let playerNumber = 2; playerNumber <= 5; playerNumber += 1) {
    const cardRow = page.getByTestId(`player-cards-P${playerNumber}`);
    await expect(cardRow).toBeVisible();
    await expect(cardRow).toHaveCSS('flex-wrap', 'nowrap');
    await expect(cardRow.locator(':scope > div')).toHaveCount(4);
    const cardTops = await cardRow.locator(':scope > div').evaluateAll((cards) => (
      cards.map((card) => (card as HTMLElement).offsetTop)
    ));
    expect(new Set(cardTops).size).toBe(1);
  }

  const stageBox = await page.getByTestId('table-stage').boundingBox();
  const boardBox = await page.getByTestId('table-board').boundingBox();
  const potBox = await page.getByTestId('table-pot').boundingBox();
  expect(stageBox).toBeTruthy();
  expect(boardBox).toBeTruthy();
  expect(potBox).toBeTruthy();
  expect(stageBox!.x + stageBox!.width).toBeLessThan(boardBox!.x);
  expect(boardBox!.x + boardBox!.width).toBeLessThan(potBox!.x);
});

test('a bot takes its turn after the human acts', async ({ page, request }) => {
  const href = await createDefaultHumanVsBotDeal(page);
  await page.goto(href);
  await expect(page.getByText(/^DEAL OMA1-/)).toBeVisible();
  await expect(page.getByText('connected', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('player-name-P1')).toHaveText('Dima (you)');
  await expect(page.getByTestId('player-name-P2')).toHaveText('Anna');
  await expect(page.getByText(/_bot$/)).toHaveCount(0);

  const apiUrl = apiUrlForPlayerLink(href);
  const initialResponse = await request.get(apiUrl);
  const initialState = await initialResponse.json();
  await expect(page.getByTestId(`player-blind-${initialState.blinds.smallBlindPlayerId}`))
    .toHaveText(`1× BLIND · ${initialState.blinds.small}`);
  await expect(page.getByTestId(`player-blind-${initialState.blinds.bigBlindPlayerId}`))
    .toHaveText(`2× BLIND · ${initialState.blinds.big}`);

  await page.getByRole('button', { name: /^Call / }).click();

  const thinkingSeat = page.getByTestId('active-player-P2');
  await expect(thinkingSeat).toBeVisible();
  await expect(thinkingSeat.getByText('THINKING...', { exact: true })).toBeVisible();
  await expect(page.getByText('Anna — THINKING...', { exact: true }).first()).toBeVisible();

  await expect.poll(async () => {
    const response = await request.get(apiUrl);
    const state = await response.json();
    return state.actions.filter((action: { playerId: string }) => action.playerId === 'P2').length;
  }, { timeout: 5_000 }).toBeGreaterThan(0);

  const response = await request.get(apiUrl);
  const state = await response.json();
  await expect(page.getByText(state.stage, { exact: true }).first()).toBeVisible();
  if (state.stage !== 'preflop') {
    await expect(page.locator('[data-testid^="player-blind-"]')).toHaveCount(0);
  }
  const opponentAction = page.locator('[title^="Last action:"]');
  const latestBotAction = [...state.actions]
    .reverse()
    .find((action: { playerId: string }) => action.playerId === 'P2');
  if (latestBotAction?.stage === state.stage) {
    await expect(opponentAction).toHaveCount(1);
    await expect(opponentAction).toHaveText(/^(CHECK|CALL|RAISE|FOLD|BET)( .+)?$/);
  } else {
    await expect(opponentAction).toHaveCount(0);
  }
});

test('folded hands show combinations and a new deal opens', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const href = await createDefaultHumanVsBotDeal(page);
  await page.goto(href);
  await expect(page.getByText(/^DEAL OMA1-/)).toBeVisible();
  await expect(page.getByText('connected', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByText('You lost', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show cards' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show all hands' }).click();

  const foldedHand = page.getByRole('heading', { name: 'Dima - folded' }).locator('..');
  await expect(foldedHand.getByText(/^High: /)).toBeVisible();
  await expect(foldedHand.getByText(/^Low: /)).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Dima', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Anna', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^High winner: Anna -/ })).toBeVisible();

  const oldUrl = page.url();
  await page.getByRole('button', { name: 'New deal' }).click();
  await expect(page).not.toHaveURL(oldUrl);
  await expect(page.getByText(/^DEAL OMA1-/)).toBeVisible();
  await expect(page.getByText('preflop', { exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});
