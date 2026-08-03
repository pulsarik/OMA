import { expect, Page, test } from '@playwright/test';
import { createHash } from 'node:crypto';

async function createDefaultHumanVsBotDeal(page: Page, playerCount = 2, addNamedBot = true) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption(String(playerCount));
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  if (addNamedBot) {
    await page.getByLabel('Bot name').fill('Anna');
    await page.getByRole('button', { name: 'Add bot' }).click();
    await expect(page.getByTestId('lobby-table').getByText('Anna', { exact: true }))
      .toBeVisible({ timeout: 15_000 });
  }
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  return currentPlayerUrl(page);
}

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

test('pot details and bet-size math are available on demand', async ({ page, request }) => {
  const href = await createDefaultHumanVsBotDeal(page);
  const response = await request.get(apiUrlForPlayerLink(href));
  const state = await response.json();

  expect(state.dealCode).toBeUndefined();
  expect(state.dealAuditNonce).toBeUndefined();
  expect(state.dealCommitment).toMatch(/^[a-f0-9]{64}$/);

  await expect(page.getByTestId('omaha-guide')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pot limit' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Max', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('custom-wager-input')).toHaveCount(0);

  const contributions = page.getByTestId('pot-contributions');
  await expect(contributions).toBeHidden();
  await page.locator('.pot-summary').click();
  await expect(contributions).toBeVisible();
  await expect(contributions).toContainText(`Pot ${state.potCoins}`);
  await expect(contributions).toContainText('In pot');
  await expect(contributions).toContainText('This round');
  await expect(contributions.locator('.pot-contribution-row')).toHaveCount(
    Object.values(state.totalContributions).filter((amount) => Number(amount) > 0).length,
  );
  await expect(contributions.locator('.pot-contribution-row').filter({ hasText: 'You' }))
    .toContainText(String(state.totalContributions[state.playerId]));

  await page.getByRole('button', { name: '1/2 pot' }).click();
  const callAmount = Math.max(state.currentBet - state.roundBets[state.playerId], 0);
  const potAfterCall = state.potCoins + callAmount;
  await expect(page.getByTestId('bet-size-explanation'))
    .toContainText(`Pot after call: ${potAfterCall} · 1/2 pot = ${Math.ceil(potAfterCall / 2)} · Raise to`);

  await page.getByRole('button', { name: '1/4 pot' }).click();
  await page.getByRole('button', { name: /^Raise/ }).click();
  await expect.poll(async () => {
    const updated = await (await request.get(apiUrlForPlayerLink(href))).json();
    return updated.actions.find((action: { playerId: string }) => (
      action.playerId === state.playerId
    ))?.betSize;
  }).toBe('quarter');
});

test('opponent seats form a stable arc as content changes at every table size', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const rowSizes = async () => {
    const positions = await page.getByTestId('opponents-grid').locator('[data-player-seat]')
      .evaluateAll((seats) => seats.map((seat) => ({
        top: seat.getBoundingClientRect().top,
        left: seat.getBoundingClientRect().left,
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
    await createDefaultHumanVsBotDeal(page, playerCount, false);

    const opponentsGrid = page.getByTestId('opponents-grid');
    await expect(opponentsGrid).toHaveCSS('display', playerCount >= 7 ? 'block' : 'grid');
    await expect(opponentsGrid.locator('[data-player-seat]')).toHaveCount(playerCount - 1);
    if (playerCount === 2) {
      const gridBox = (await opponentsGrid.boundingBox())!;
      const opponentBox = (await opponentsGrid.locator('[data-player-seat]').boundingBox())!;
      expect(Math.abs(
        (opponentBox.x + opponentBox.width / 2) - (gridBox.x + gridBox.width / 2)
      )).toBeLessThanOrEqual(2);
    }
    const rowsBeforeContentChange = await rowSizes();
    if (playerCount === 5) {
      expect(rowsBeforeContentChange, 'four opponents should form a balanced arc').toEqual([2, 2]);
    }
    if (playerCount >= 7) {
      const seats = await opponentsGrid.locator('[data-player-seat]').evaluateAll((items) => (
        items.map((item) => {
          const box = item.getBoundingClientRect();
          return { centerX: box.x + box.width / 2, top: box.top };
        })
      ));
      const gridBox = (await opponentsGrid.boundingBox())!;
      const highestSeatTop = Math.min(...seats.map((seat) => seat.top));
      expect(seats[0].top, `${playerCount}-player left seat follows the oval`).toBeGreaterThan(highestSeatTop + 80);
      expect(seats.at(-1)!.top, `${playerCount}-player right seat follows the oval`).toBeGreaterThan(highestSeatTop + 80);
      expect(seats[0].centerX).toBeLessThan(gridBox.x + gridBox.width / 2);
      expect(seats.at(-1)!.centerX).toBeGreaterThan(gridBox.x + gridBox.width / 2);
    }

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

test('the table keeps its height in a compact desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('2');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();

  const compactTableBox = await page.getByTestId('poker-table').boundingBox();
  expect(compactTableBox).toBeTruthy();
  expect(compactTableBox!.height).toBeGreaterThanOrEqual(700);
});

test('a bot takes its turn after the human acts', async ({ page, request }) => {
  const href = await createDefaultHumanVsBotDeal(page);
  await page.goto(href);
  await expect(page.getByTestId('deal-footer')).toHaveCount(0);
  await expect(page.getByText(/^DEAL OMA1-/)).toHaveCount(0);
  await expect(page.getByText('connected', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('game-tile')).toBeVisible();
  await expect(page.getByTestId('stats-tile')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'TABLE' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toBeDisabled();
  await expect(page.getByTestId('player-name-P1')).toHaveText('Dima (you)');
  await expect(page.getByTestId('player-name-P2')).toHaveText('Anna');
  await expect(page.getByText(/_bot$/)).toHaveCount(0);
  await expect(page.getByTestId('player-score-P2')).toBeVisible();
  await expect(page.locator('[data-player-seat="P2"]').getByTestId('coin-stack')).toHaveCount(0);
  await expect(page.locator('[data-player-seat="P1"]').getByTestId('coin-stack')).toBeVisible();
  const chipPositions = await page.locator('[data-player-seat="P1"] [data-chip-index]')
    .evaluateAll((chips) => chips.slice(0, 3).map((chip) => chip.getBoundingClientRect().x));
  expect(chipPositions).toHaveLength(3);
  expect(chipPositions[1]).toBeGreaterThan(chipPositions[0]);
  expect(Math.abs(chipPositions[2] - chipPositions[0])).toBeLessThan(0.5);
  const tableBox = await page.getByTestId('poker-table').boundingBox();
  const actionDock = page.locator('.action-dock');
  const actionDockBox = await actionDock.boundingBox();
  expect(tableBox).toBeTruthy();
  expect(actionDockBox).toBeTruthy();
  await expect(actionDock).toHaveCSS('position', 'static');
  expect(actionDockBox!.y).toBeGreaterThanOrEqual(tableBox!.y + tableBox!.height);
  const yourSeat = page.locator('[data-player-seat="P1"]');
  await expect(yourSeat.getByText('YOUR TURN', { exact: true })).toBeVisible();
  await expect(page.locator('.action-dock').getByText('YOUR TURN', { exact: true })).toHaveCount(0);

  const apiUrl = apiUrlForPlayerLink(href);
  const initialResponse = await request.get(apiUrl);
  const initialState = await initialResponse.json();
  await expect(page.getByTestId(`card-face-${initialState.hole[0]}`))
    .toHaveAttribute('data-card-style', 'simple');
  await expect(page.getByTestId('card-back').first())
    .toHaveAttribute('data-card-style', 'simple');
  await expect(page.getByTestId('card-back').first())
    .toHaveCSS('background-image', /card-back-qz\.jpg/);
  await expect(page.getByTestId('player-score-P2'))
    .toHaveText(String(initialState.partyScore.totals.find((total: any) => total.id === 'P2').total));
  const opponentCardsBox = await page.getByTestId('player-cards-P2').boundingBox();
  const opponentScoreBox = await page.getByTestId('player-score-P2').boundingBox();
  expect(opponentCardsBox).toBeTruthy();
  expect(opponentScoreBox).toBeTruthy();
  expect(opponentScoreBox!.x).toBeGreaterThanOrEqual(tableBox!.x);
  expect(opponentScoreBox!.x + opponentScoreBox!.width).toBeLessThanOrEqual(tableBox!.x + tableBox!.width);
  await expect(page.getByTestId(`player-blind-${initialState.blinds.smallBlindPlayerId}`))
    .toHaveText(`SB ${initialState.blinds.small}`);
  await expect(page.getByTestId(`player-blind-${initialState.blinds.bigBlindPlayerId}`))
    .toHaveText(`BB ${initialState.blinds.big}`);
  await expect(page.locator('[data-testid^="player-dealer-"]')).toHaveCount(1);

  const opponentBlindBox = await page.getByTestId('player-blind-P2').boundingBox();
  expect(opponentBlindBox).toBeTruthy();
  expect(opponentBlindBox!.y).toBeLessThan(opponentCardsBox!.y + opponentCardsBox!.height / 2);

  await page.getByRole('button', { name: /^Call / }).click();
  await expect(yourSeat.getByText('YOUR TURN', { exact: true })).toHaveCount(0);

  const thinkingSeat = page.getByTestId('active-player-P2');
  await expect(thinkingSeat).toBeVisible();
  const thinkingBubble = thinkingSeat.getByText('THINKING…', { exact: true });
  await expect(thinkingBubble).toBeVisible();
  const thinkingBox = (await thinkingBubble.boundingBox())!;
  const thinkingTableBox = (await page.getByTestId('poker-table').boundingBox())!;
  expect(thinkingBox.x).toBeGreaterThanOrEqual(thinkingTableBox.x);
  expect(thinkingBox.y).toBeGreaterThanOrEqual(thinkingTableBox.y);
  expect(thinkingBox.x + thinkingBox.width).toBeLessThanOrEqual(thinkingTableBox.x + thinkingTableBox.width);
  expect(thinkingBox.y + thinkingBox.height).toBeLessThanOrEqual(thinkingTableBox.y + thinkingTableBox.height);
  await expect(page.getByText('Anna — THINKING…', { exact: true })).toHaveCount(0);

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

test('cards use the simplified deck without loading RevK images', async ({ page, request }) => {
  const href = await createDefaultHumanVsBotDeal(page);
  const stateResponse = await request.get(apiUrlForPlayerLink(href));
  const state = await stateResponse.json();
  const cardCode = state.hole[0] as string;

  await page.goto(href);
  const card = page.getByTestId(`card-face-${cardCode}`).first();
  await expect(card).toHaveAttribute('data-card-style', 'simple');
  await expect(card).toContainText(cardCode.slice(0, -1) === 'T' ? '10' : cardCode.slice(0, -1));
  await expect(page.locator('img[src*="/cards/revk/"]')).toHaveCount(0);
});

test('the board stays centered through showdown at a ten-player table', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1558, height: 1037 });
  await createDefaultHumanVsBotDeal(page, 10);

  const actionDock = page.locator('.action-dock');
  await expect(actionDock).toBeVisible({ timeout: 10_000 });
  await expect(actionDock.locator('button').first()).toBeVisible({ timeout: 10_000 });
  const tableHeightDuringDeal = (await page.getByTestId('poker-table').boundingBox())!.height;
  const boardDuringDeal = (await page.getByTestId('table-board').boundingBox())!;
  const buttonBoxes = await actionDock.locator('button').evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { top: box.top, right: box.right, bottom: box.bottom, left: box.left };
  }));
  expect(buttonBoxes.length).toBeGreaterThanOrEqual(2);
  const viewport = page.viewportSize()!;
  buttonBoxes.forEach((box) => {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(viewport.width);
    expect(box.bottom).toBeLessThanOrEqual(viewport.height);
  });

  await page.getByRole('button', { name: 'Fold' }).click();
  const newDealButton = page.getByRole('button', { name: 'New deal' });
  await expect(newDealButton).toBeVisible({ timeout: 90_000 });
  const tableBoxAfterDeal = (await page.getByTestId('poker-table').boundingBox())!;
  const boardAfterDeal = (await page.getByTestId('table-board').boundingBox())!;
  expect(Math.abs(tableBoxAfterDeal.height - tableHeightDuringDeal)).toBeLessThanOrEqual(2);
  expect(Math.abs(
    (boardAfterDeal.x + boardAfterDeal.width / 2) - (boardDuringDeal.x + boardDuringDeal.width / 2),
  )).toBeLessThanOrEqual(2);
  expect(Math.abs(
    (boardAfterDeal.y + boardAfterDeal.height / 2) - (boardDuringDeal.y + boardDuringDeal.height / 2),
  )).toBeLessThanOrEqual(2);
  const showdownNewDeal = page.getByTestId('showdown-new-deal');
  await expect(showdownNewDeal).toBeVisible();
  await expect(page.locator('.table-showdown').getByTestId('showdown-new-deal')).toBeVisible();
  const showdownBox = (await page.locator('.table-showdown').boundingBox())!;
  const showdownCenterBox = (await page.locator('.table-center.has-showdown').boundingBox())!;
  const showdownNewDealBox = (await showdownNewDeal.boundingBox())!;
  expect(showdownNewDealBox.x).toBeGreaterThanOrEqual(showdownBox.x);
  expect(showdownNewDealBox.x + showdownNewDealBox.width).toBeLessThanOrEqual(showdownBox.x + showdownBox.width);
  expect(showdownNewDealBox.y + showdownNewDealBox.height).toBeLessThanOrEqual(showdownBox.y + showdownBox.height);
  expect(Math.abs(
    (showdownBox.x + showdownBox.width / 2) - (showdownCenterBox.x + showdownCenterBox.width / 2),
  )).toBeLessThanOrEqual(2);
  const peripheralResults = page.locator('.poker-table.is-oval .opponents-row [data-testid^="player-result-"]');
  await expect(peripheralResults).toHaveCount(9);
  await expect(peripheralResults.first()).toBeVisible();
  await expect(page.getByTestId('player-result-P5')).toContainText('High:');
  const newDealBox = await newDealButton.boundingBox();
  expect(newDealBox).toBeTruthy();
  expect(newDealBox!.y).toBeGreaterThanOrEqual(0);
  expect(newDealBox!.y + newDealBox!.height).toBeLessThanOrEqual(viewport.height);
  const oldUrl = page.url();
  const oldPlayerUrl = await currentPlayerUrl(page);
  await newDealButton.click();
  await expect(page).toHaveURL(oldUrl);
  await expect.poll(() => currentPlayerUrl(page)).not.toBe(oldPlayerUrl);
});

test('folded hands show combinations and a new deal opens with rotated blinds', async ({ page, request }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const formatResultPoints = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(2);
  const assertCumulativeStats = async (state: any) => {
    const completedHands = state.partyScore.hands.filter((hand: any) => hand.stage === 'showdown');
    const formatPoints = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(2);
    const percentage = (count: number, hands: number) => hands ? `${Math.round((count / hands) * 100)}%` : '0%';
    await expect(page.getByTestId('completed-hand-count'))
      .toHaveText(`${completedHands.length} ${completedHands.length === 1 ? 'hand' : 'hands'}`);
    for (const player of state.players) {
      const hands = completedHands.filter((hand: any) => (
        hand.players.some((seat: any) => seat.id === player.id && seat.participated)
      ));
      const netResults = hands.map((hand: any) => (
        hand.net.find((result: any) => result.id === player.id)?.total ?? 0
      ));
      const folds = hands.filter((hand: any) => (
        hand.players.find((seat: any) => seat.id === player.id)?.folded
      )).length;
      const aggressiveHands = hands.filter((hand: any) => hand.actions.some((action: any) => (
        action.playerId === player.id && ['bet', 'raise'].includes(action.move)
      ))).length;
      const wins = netResults.filter((net: number) => net > 0).length;
      const losses = netResults.filter((net: number) => net < 0).length;
      const net = netResults.reduce((total: number, result: number) => total + result, 0);
      const stack = state.partyScore.totals.find((total: any) => total.id === player.id)?.total ?? 0;
      await expect(page.getByTestId(`party-hands-${player.id}`)).toHaveText(String(hands.length));
      await expect(page.getByTestId(`party-aggression-${player.id}`)).toHaveText(percentage(aggressiveHands, hands.length));
      await expect(page.getByTestId(`party-fold-${player.id}`)).toHaveText(percentage(folds, hands.length));
      await expect(page.getByTestId(`party-win-${player.id}`)).toHaveText(percentage(wins, hands.length));
      await expect(page.getByTestId(`party-loss-${player.id}`)).toHaveText(percentage(losses, hands.length));
      await expect(page.getByTestId(`party-net-${player.id}`)).toHaveText(formatPoints(net));
      await expect(page.getByTestId(`party-average-${player.id}`))
        .toHaveText(formatPoints(hands.length ? net / hands.length : 0));
      await expect(page.getByTestId(`party-max-win-${player.id}`))
        .toHaveText(formatPoints(Math.max(0, ...netResults)));
      await expect(page.getByTestId(`party-max-loss-${player.id}`))
        .toHaveText(formatPoints(Math.min(0, ...netResults)));
      await expect(page.getByTestId(`party-stack-${player.id}`)).toHaveText(formatPoints(stack));
    }
    await expect(page.getByTestId('wallet-history-chart')).toBeVisible();
    for (const player of state.players) {
      await expect(page.getByTestId(`wallet-series-${player.id}`)).toBeVisible();
    }
  };
  const href = await createDefaultHumanVsBotDeal(page);
  await expect(page.getByText(/^DEAL OMA1-/)).toHaveCount(0);
  await expect(page.getByText('connected', { exact: true })).toHaveCount(0);
  const firstStateResponse = await request.get(apiUrlForPlayerLink(href));
  const firstState = await firstStateResponse.json();

  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByText('You lost', { exact: true })).toBeVisible();
  await expect(page.getByTestId('high-combo-side')).toBeVisible();
  await expect(page.getByTestId('low-combo-side')).toBeVisible();
  const heroCardsBox = (await page.getByTestId('player-cards-P1').boundingBox())!;
  const highHintBox = (await page.getByTestId('high-combo-side').boundingBox())!;
  const lowHintBox = (await page.getByTestId('low-combo-side').boundingBox())!;
  expect(highHintBox.x + highHintBox.width).toBeLessThanOrEqual(heroCardsBox.x);
  expect(lowHintBox.x).toBeGreaterThanOrEqual(heroCardsBox.x + heroCardsBox.width);
  const comboCards = page.locator('[data-testid$="-combo-side"] [data-testid^="card-face-"]');
  await expect(comboCards.first()).toHaveAttribute('data-card-style', 'simple');
  expect(await comboCards.count()).toBeGreaterThan(0);
  const showdownResponse = await request.get(apiUrlForPlayerLink(href));
  const showdownState = await showdownResponse.json();
  expect(showdownState.dealCode).toMatch(/^OMA1-/);
  expect(showdownState.dealAuditNonce).toMatch(/^[a-f0-9]{64}$/);
  expect(createHash('sha256')
    .update(`${showdownState.dealCode}:${showdownState.dealAuditNonce}`)
    .digest('hex')).toBe(showdownState.dealCommitment);
  const contribution = showdownState.totalContributions.P1;
  const payout = showdownState.showdownSummary.points.find((score: any) => score.id === 'P1').total;
  const net = payout - contribution;
  await expect(page.getByTestId('showdown-contributed')).toHaveText(`Contributed: ${formatResultPoints(contribution)}`);
  await expect(page.getByTestId('showdown-payout')).toHaveText(`Payout: ${formatResultPoints(payout)}`);
  await expect(page.getByTestId('showdown-net')).toHaveText(`Net: ${formatResultPoints(net)}`);
  await expect(page.getByTestId('player-ineligible-P1')).toHaveText('FOLDED — NOT ELIGIBLE');
  for (const winnerId of showdownState.showdownSummary.highWinners) {
    await expect(page.getByTestId(`winner-high-${winnerId}`)).toHaveText('★ HIGH');
  }
  for (const winnerId of showdownState.showdownSummary.lowWinners) {
    await expect(page.getByTestId(`winner-low-${winnerId}`)).toHaveText('★ LOW');
  }
  await expect(page.getByRole('button', { name: 'Show cards' })).toHaveCount(0);
  const foldedTableResult = page.getByTestId('player-result-P1');
  await expect(foldedTableResult.getByText(/^High: /)).toHaveCount(0);
  await expect(foldedTableResult.getByText(/^Low: /)).toHaveCount(0);
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await expect(page.getByTestId('stats-tile')).toBeVisible();
  await expect(page.getByTestId('result-net-P1')).toHaveText(formatResultPoints(net));
  await expect(page.getByTestId('game-tile')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toHaveAttribute('aria-selected', 'true');
  await assertCumulativeStats(showdownState);
  await page.getByRole('button', { name: 'Show all hands' }).click();

  const foldedHand = page.getByTestId('hand-detail-P1');
  await expect(foldedHand.getByRole('heading', { name: 'Dima — folded' })).toBeVisible();
  await expect(foldedHand.getByText(/^High: /)).toBeVisible();
  await expect(foldedHand.getByText(/^Low: /)).toBeVisible();
  await expect(page.getByTestId('party-total-P1')).toContainText('Dima');
  await expect(page.getByTestId('party-total-P2')).toContainText('Anna');
  await expect(page.getByRole('heading', { name: 'Uncontested winner: Anna' })).toBeVisible();

  await page.getByRole('tab', { name: 'TABLE' }).click();
  await expect(page.getByTestId('game-tile')).toBeVisible();
  await expect(page.getByTestId('stats-tile')).toHaveCount(0);
  const oldUrl = page.url();
  const oldPlayerUrl = await currentPlayerUrl(page);
  await page.getByRole('button', { name: 'New deal' }).click();
  await expect(page).toHaveURL(oldUrl);
  await expect.poll(() => currentPlayerUrl(page)).not.toBe(oldPlayerUrl);
  await expect(page.getByText(/^DEAL OMA1-/)).toHaveCount(0);
  await expect(page.getByText('preflop', { exact: true }).first()).toBeVisible();
  const nextStateResponse = await request.get(apiUrlForPlayerLink(await currentPlayerUrl(page)));
  const nextState = await nextStateResponse.json();
  expect(nextState.blinds.smallBlindPlayerId).not.toBe(firstState.blinds.smallBlindPlayerId);
  expect(nextState.blinds.bigBlindPlayerId).not.toBe(firstState.blinds.bigBlindPlayerId);
  await expect(page.getByTestId(`player-blind-${nextState.blinds.smallBlindPlayerId}`))
    .toHaveText(`SB ${nextState.blinds.small}`);
  await expect(page.getByTestId(`player-blind-${nextState.blinds.bigBlindPlayerId}`))
    .toHaveText(`BB ${nextState.blinds.big}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toBeEnabled();
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await assertCumulativeStats(nextState);
  await page.getByRole('tab', { name: 'TABLE' }).click();

  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByRole('button', { name: 'New deal' })).toBeVisible();
  const secondShowdownResponse = await request.get(apiUrlForPlayerLink(await currentPlayerUrl(page)));
  const secondShowdownState = await secondShowdownResponse.json();
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await assertCumulativeStats(secondShowdownState);
});
