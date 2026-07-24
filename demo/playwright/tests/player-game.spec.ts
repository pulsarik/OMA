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

test('opponent rows stay stable as seat content changes at every table size', async ({ page }) => {
  test.setTimeout(60_000);
  const rowSizes = async () => {
    const positions = await page.getByTestId('opponents-grid').locator('[data-player-seat]')
      .evaluateAll((seats) => seats.map((seat) => ({
        top: (seat as HTMLElement).offsetTop,
        left: (seat as HTMLElement).offsetLeft,
      })));
    return positions.reduce((rows, position) => {
      const row = rows.find((item) => Math.abs(item.top - position.top) < 2);
      if (row) row.positions.push(position.left);
      else rows.push({ top: position.top, positions: [position.left] });
      return rows;
    }, [] as Array<{ top: number; positions: number[] }>)
      .map((row) => row.positions.length);
  };

  for (let playerCount = 2; playerCount <= 10; playerCount += 1) {
    await page.goto('/');
    await expect(page.getByText('connected', { exact: true })).toBeVisible();
    await page.getByLabel('Players').fill(String(playerCount));
    await page.getByLabel('Players').press('Tab');
    await page.getByRole('button', { name: 'New deal' }).click();

    const playerLink = page.getByRole('link', { name: /Dima Open/ });
    await expect(playerLink).toBeVisible();
    const href = await playerLink.getAttribute('href');
    expect(href).toBeTruthy();
    await page.goto(href!);

    const opponentsGrid = page.getByTestId('opponents-grid');
    await expect(opponentsGrid).toHaveCSS('display', 'grid');
    await expect(opponentsGrid.locator('[data-player-seat]')).toHaveCount(playerCount - 1);
    const rowsBeforeContentChange = await rowSizes();

    await opponentsGrid.locator('.player-seat').first().evaluate((seat) => {
      (seat as HTMLElement).style.width = `${(seat as HTMLElement).offsetWidth + 140}px`;
    });
    const rowsAfterContentChange = await rowSizes();
    expect(rowsAfterContentChange, `${playerCount}-player table reflowed`).toEqual(rowsBeforeContentChange);
  }

  const firstOpponentCards = page.getByTestId('player-cards-P2');
  await expect(firstOpponentCards).toHaveCSS('flex-wrap', 'nowrap');
  await expect(firstOpponentCards.locator(':scope > div')).toHaveCount(4);

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
  await expect(page.getByTestId('game-tile')).toBeVisible();
  await expect(page.getByTestId('stats-tile')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'TABLE' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toBeDisabled();
  await expect(page.getByTestId('player-name-P1')).toHaveText('Dima (you)');
  await expect(page.getByTestId('player-name-P2')).toHaveText('Anna');
  await expect(page.getByText(/_bot$/)).toHaveCount(0);
  const chipPositions = await page.locator('[data-player-seat="P1"] [data-chip-index]')
    .evaluateAll((chips) => chips.slice(0, 3).map((chip) => chip.getBoundingClientRect().x));
  expect(chipPositions).toHaveLength(3);
  expect(chipPositions[1]).toBeGreaterThan(chipPositions[0]);
  expect(Math.abs(chipPositions[2] - chipPositions[0])).toBeLessThan(0.5);
  const tableBox = await page.getByTestId('poker-table').boundingBox();
  const actionDock = page.locator('.action-dock');
  const actionDockBox = await actionDock.boundingBox();
  const dealFooterBox = await page.getByTestId('deal-footer').boundingBox();
  expect(tableBox).toBeTruthy();
  expect(actionDockBox).toBeTruthy();
  expect(dealFooterBox).toBeTruthy();
  await expect(actionDock).toHaveCSS('position', 'static');
  expect(actionDockBox!.y).toBeGreaterThanOrEqual(tableBox!.y + tableBox!.height);
  expect(dealFooterBox!.y).toBeGreaterThan(tableBox!.y + tableBox!.height);
  const yourSeat = page.locator('[data-player-seat="P1"]');
  await expect(yourSeat.getByText('YOUR TURN', { exact: true })).toBeVisible();
  await expect(page.locator('.action-dock').getByText('YOUR TURN', { exact: true })).toHaveCount(0);

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

test('all action buttons fit in the viewport at a seven-player table', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await expect(page.getByText('connected', { exact: true })).toBeVisible();
  await page.getByLabel('Players').fill('7');
  await page.getByLabel('Players').press('Tab');
  for (let playerNumber = 3; playerNumber <= 7; playerNumber += 1) {
    await page.getByText(`P${playerNumber}`, { exact: true })
      .locator('..')
      .getByRole('button', { name: 'Human' })
      .click();
  }
  await page.getByRole('button', { name: 'New deal' }).click();

  const playerLink = page.getByRole('link', { name: /Dima Open/ });
  await expect(playerLink).toBeVisible();
  const href = await playerLink.getAttribute('href');
  expect(href).toBeTruthy();
  await page.goto(href!);

  const actionDock = page.locator('.action-dock');
  await expect(actionDock).toBeVisible({ timeout: 10_000 });
  const buttonBoxes = await actionDock.locator('button').evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { top: box.top, right: box.right, bottom: box.bottom, left: box.left };
  }));
  expect(buttonBoxes.length).toBeGreaterThanOrEqual(7);
  const viewport = page.viewportSize()!;
  buttonBoxes.forEach((box) => {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(viewport.width);
    expect(box.bottom).toBeLessThanOrEqual(viewport.height);
  });

  await page.getByRole('button', { name: 'Fold' }).click();
  const newDealButton = page.getByRole('button', { name: 'New deal' });
  await expect(newDealButton).toBeVisible({ timeout: 30_000 });
  const newDealBox = await newDealButton.boundingBox();
  expect(newDealBox).toBeTruthy();
  expect(newDealBox!.y).toBeGreaterThanOrEqual(0);
  expect(newDealBox!.y + newDealBox!.height).toBeLessThanOrEqual(viewport.height);
});

test('folded hands show combinations and a new deal opens with rotated blinds', async ({ page, request }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const assertCumulativeStats = async (state: any) => {
    const completedHands = state.partyScore.hands.filter((hand: any) => hand.stage === 'showdown');
    await expect(page.getByTestId('completed-hand-count'))
      .toHaveText(`${completedHands.length} ${completedHands.length === 1 ? 'hand' : 'hands'}`);
    await expect(page.getByTestId('party-history').locator('tbody tr')).toHaveCount(completedHands.length);
    for (const player of state.players) {
      const points = completedHands.flatMap((hand: any) => hand.points)
        .filter((point: any) => point.id === player.id)
        .reduce((sum: any, point: any) => ({
          high: sum.high + point.high,
          low: sum.low + point.low,
          total: sum.total + point.total,
        }), { high: 0, low: 0, total: 0 });
      const stack = state.partyScore.totals.find((total: any) => total.id === player.id)?.total ?? 0;
      await expect(page.getByTestId(`party-high-${player.id}`)).toHaveText(String(points.high));
      await expect(page.getByTestId(`party-low-${player.id}`)).toHaveText(String(points.low));
      await expect(page.getByTestId(`party-won-${player.id}`)).toHaveText(String(points.total));
      await expect(page.getByTestId(`party-stack-${player.id}`)).toHaveText(String(stack));
    }
  };
  const href = await createDefaultHumanVsBotDeal(page);
  await page.goto(href);
  await expect(page.getByText(/^DEAL OMA1-/)).toBeVisible();
  await expect(page.getByText('connected', { exact: true })).toHaveCount(0);
  const firstStateResponse = await request.get(apiUrlForPlayerLink(href));
  const firstState = await firstStateResponse.json();

  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByText('You lost', { exact: true })).toBeVisible();
  await expect(page.getByTestId('high-combo-side')).toBeVisible();
  await expect(page.getByTestId('low-combo-side')).toBeVisible();
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
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await expect(page.getByTestId('stats-tile')).toBeVisible();
  await expect(page.getByTestId('game-tile')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toHaveAttribute('aria-selected', 'true');
  await assertCumulativeStats(showdownState);
  await page.getByRole('button', { name: 'Show all hands' }).click();

  const foldedHand = page.getByRole('heading', { name: 'Dima - folded' }).locator('..');
  await expect(foldedHand.getByText(/^High: /)).toBeVisible();
  await expect(foldedHand.getByText(/^Low: /)).toBeVisible();
  await expect(page.getByTestId('party-total-P1')).toContainText('Dima');
  await expect(page.getByTestId('party-total-P2')).toContainText('Anna');
  await expect(page.getByRole('heading', { name: /^High winner: Anna -/ })).toBeVisible();

  await page.getByRole('tab', { name: 'TABLE' }).click();
  await expect(page.getByTestId('game-tile')).toBeVisible();
  await expect(page.getByTestId('stats-tile')).toHaveCount(0);
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

  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toBeEnabled();
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await assertCumulativeStats(nextState);
  await page.getByRole('tab', { name: 'TABLE' }).click();

  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByRole('button', { name: 'New deal' })).toBeVisible();
  const secondShowdownResponse = await request.get(apiUrlForPlayerLink(page.url()));
  const secondShowdownState = await secondShowdownResponse.json();
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await assertCumulativeStats(secondShowdownState);
});
