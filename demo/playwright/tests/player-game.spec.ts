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

  const opponentPositions = await Promise.all(
    [2, 3, 4, 5].map((playerNumber) => page.locator(`[data-player-seat="P${playerNumber}"]`).boundingBox()),
  );
  opponentPositions.slice(1).forEach((position, index) => {
    const previous = opponentPositions[index];
    expect(previous).toBeTruthy();
    expect(position).toBeTruthy();
    const sameRow = Math.abs(position!.y - previous!.y) < 2;
    if (sameRow) {
      expect(position!.x).toBeGreaterThan(previous!.x);
    } else {
      expect(position!.y).toBeGreaterThan(previous!.y);
    }
  });

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
  const tableBox = await page.getByTestId('poker-table').boundingBox();
  const dealFooterBox = await page.getByTestId('deal-footer').boundingBox();
  expect(tableBox).toBeTruthy();
  expect(dealFooterBox).toBeTruthy();
  expect(dealFooterBox!.y).toBeGreaterThan(tableBox!.y + tableBox!.height);
  const yourSeat = page.locator('[data-player-seat="P1"]');
  await expect(yourSeat.getByText('YOUR TURN', { exact: true })).toBeVisible();
  await expect(page.locator('.action-dock').getByText('YOUR TURN', { exact: true })).toBeVisible();

  const apiUrl = apiUrlForPlayerLink(href);
  const initialResponse = await request.get(apiUrl);
  const initialState = await initialResponse.json();
  await expect(page.getByTestId(`player-blind-${initialState.blinds.smallBlindPlayerId}`))
    .toHaveText(`1× BLIND ${initialState.blinds.small}`);
  await expect(page.getByTestId(`player-blind-${initialState.blinds.bigBlindPlayerId}`))
    .toHaveText(`2× BLIND ${initialState.blinds.big}`);

  await page.getByRole('button', { name: /^Call / }).click();
  await expect(yourSeat.getByText('YOUR TURN', { exact: true })).toHaveCount(0);

  const thinkingSeat = page.getByTestId('active-player-P2');
  await expect(thinkingSeat).toBeVisible();
  await expect(thinkingSeat.getByText('THINKING...', { exact: true })).toBeVisible();
  await expect(page.getByText('Anna — THINKING...', { exact: true })).toHaveCount(0);

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

test('folded hands show combinations and a new deal opens with rotated blinds', async ({ page, request }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const href = await createDefaultHumanVsBotDeal(page);
  await page.goto(href);
  await expect(page.getByText(/^DEAL OMA1-/)).toBeVisible();
  await expect(page.getByText('connected', { exact: true })).toHaveCount(0);
  const firstStateResponse = await request.get(apiUrlForPlayerLink(href));
  const firstState = await firstStateResponse.json();

  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByText('You lost', { exact: true })).toBeVisible();
  const showdownResponse = await request.get(apiUrlForPlayerLink(href));
  const showdownState = await showdownResponse.json();
  for (const winnerId of showdownState.showdownSummary.highWinners) {
    await expect(page.getByTestId(`winner-high-${winnerId}`)).toHaveText('★ HIGH');
  }
  for (const winnerId of showdownState.showdownSummary.lowWinners) {
    await expect(page.getByTestId(`winner-low-${winnerId}`)).toHaveText('★ LOW');
  }
  await expect(page.getByRole('button', { name: 'Show cards' })).toHaveCount(0);
  const foldedTableResult = page.getByTestId('player-result-P1');
  await expect(foldedTableResult.getByText(/^High: /)).toBeVisible();
  await expect(foldedTableResult.getByText(/^Low: /)).toBeVisible();
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
  const nextStateResponse = await request.get(apiUrlForPlayerLink(page.url()));
  const nextState = await nextStateResponse.json();
  expect(nextState.blinds.smallBlindPlayerId).not.toBe(firstState.blinds.smallBlindPlayerId);
  expect(nextState.blinds.bigBlindPlayerId).not.toBe(firstState.blinds.bigBlindPlayerId);
  await expect(page.getByTestId(`player-blind-${nextState.blinds.smallBlindPlayerId}`))
    .toHaveText(`1× BLIND ${nextState.blinds.small}`);
  await expect(page.getByTestId(`player-blind-${nextState.blinds.bigBlindPlayerId}`))
    .toHaveText(`2× BLIND ${nextState.blinds.big}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});
