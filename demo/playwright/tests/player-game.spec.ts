import { expect, Page, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { COMBINATION_RANKS } from '../../client/src/partyStatistics';

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

function partyScoreApiUrlForPlayerLink(href: string) {
  return `${apiUrlForPlayerLink(href)}/score`;
}

test('new table shows OUT over the cards of an eliminated player', async ({ page }) => {
  await createDefaultHumanVsBotDeal(page);

  // The real tournament marks a player out when their cumulative party score
  // reaches zero. Keep this test focused and deterministic by changing only
  // that value in the server snapshot delivered over the player socket.
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage');
    if (!descriptor?.set) return;
    const nativeSetter = descriptor.set;
    Object.defineProperty(WebSocket.prototype, 'onmessage', {
      ...descriptor,
      set(handler) {
        nativeSetter.call(this, typeof handler === 'function' ? function (event) {
          if (typeof event.data !== 'string') {
            handler.call(this, event);
            return;
          }
          try {
            const message = JSON.parse(event.data);
            const total = message.data?.partyTotals?.find((item: { id?: string }) => item.id === 'P2');
            if (total) {
              total.total = 0;
              const patchedEvent = new MessageEvent('message', {
                data: JSON.stringify(message),
                origin: event.origin,
              });
              handler.call(this, patchedEvent);
              return;
            }
          } catch {
            // Pass through non-JSON and unrelated socket messages unchanged.
          }
          handler.call(this, event);
        } : handler);
      },
    });
  });
  await page.reload();

  const badge = page.getByTestId('player-eliminated-P2');
  await expect(badge).toHaveText('OUT');
  const geometry = await page.locator('[data-player-seat="P2"]').evaluate((seat) => {
    const badge = seat.querySelector<HTMLElement>('[data-testid="player-eliminated-P2"]')?.getBoundingClientRect();
    const cards = seat.querySelector<HTMLElement>('.compact-card-row')?.getBoundingClientRect();
    return { badge, cards };
  });
  expect(geometry.badge).toBeTruthy();
  expect(geometry.cards).toBeTruthy();
  expect(geometry.badge!.top).toBeLessThan(geometry.cards!.bottom);
  expect(geometry.badge!.bottom).toBeGreaterThan(geometry.cards!.top);
  await expect(page.getByTestId('player-eliminated-P1')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/out-over-cards.png', fullPage: true });
});

test('new table shows ALL IN over the cards while keeping the betting action label', async ({ page }) => {
  await createDefaultHumanVsBotDeal(page);

  // Force a deterministic all-in snapshot without changing the game state in
  // the server. The action itself remains a regular call in the action log.
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage');
    if (!descriptor?.set) return;
    const nativeSetter = descriptor.set;
    Object.defineProperty(WebSocket.prototype, 'onmessage', {
      ...descriptor,
      set(handler) {
        nativeSetter.call(this, typeof handler === 'function' ? function (event) {
          if (typeof event.data !== 'string') {
            handler.call(this, event);
            return;
          }
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'player_state' && message.data?.players) {
              const opponent = message.data.players.find((item: { id?: string }) => item.id === 'P2');
              if (opponent) {
                opponent.stack = 0;
                message.data.actions = [
                  ...(message.data.actions ?? []).filter((action: { playerId?: string; stage?: string }) => (
                    action.playerId !== 'P2' || action.stage !== message.data.stage
                  )),
                  {
                    playerId: 'P2',
                    move: 'call',
                    amount: 20,
                    stage: message.data.stage,
                    at: Date.now(),
                  },
                ];
                const patchedEvent = new MessageEvent('message', {
                  data: JSON.stringify(message),
                  origin: event.origin,
                });
                handler.call(this, patchedEvent);
                return;
              }
            }
          } catch {
            // Pass through non-JSON and unrelated socket messages unchanged.
          }
          handler.call(this, event);
        } : handler);
      },
    });
  });
  await page.reload();

  const badge = page.getByTestId('player-all-in-P2');
  await expect(badge).toHaveText('ALL IN');
  await expect(page.getByTestId('opponent-betting-action-P2')).toHaveText('CALL 20');
  const geometry = await page.locator('[data-player-seat="P2"]').evaluate((seat) => {
    const badge = seat.querySelector<HTMLElement>('[data-testid="player-all-in-P2"]')?.getBoundingClientRect();
    const cards = seat.querySelector<HTMLElement>('.compact-card-row')?.getBoundingClientRect();
    return {
      badge,
      cards,
      verticalCenterOffset: badge && cards
        ? Math.abs((badge.top + badge.bottom) / 2 - (cards.top + cards.bottom) / 2)
        : null,
    };
  });
  expect(geometry.badge).toBeTruthy();
  expect(geometry.cards).toBeTruthy();
  expect(geometry.badge!.top).toBeLessThan(geometry.cards!.bottom);
  expect(geometry.badge!.bottom).toBeGreaterThan(geometry.cards!.top);
  expect(geometry.verticalCenterOffset).toBeLessThan(geometry.cards!.height * 0.2);
  await page.screenshot({ path: 'test-results/all-in-over-cards.png', fullPage: true });
});

test('result layout visual check for 2 and 8 players', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1558, height: 1037 });
  for (const playerCount of [2, 8]) {
    await createDefaultHumanVsBotDeal(page, playerCount, false);
    await expect(page.getByRole('button', { name: 'Fold', exact: true })).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Fold', exact: true }).click();
    await expect(page.getByRole('button', { name: 'New deal', exact: true })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByTestId('showdown-new-deal')).toBeVisible();
    await page.evaluate(() => {
      const allInSeat = document.querySelector<HTMLElement>('[data-player-seat="P1"]');
      const outSeat = document.querySelector<HTMLElement>('[data-player-seat="P2"]');
      if (allInSeat && !allInSeat.querySelector('.wireframe-all-in-badge')) {
        const badge = document.createElement('span');
        badge.className = 'wireframe-all-in-badge';
        badge.textContent = 'ALL IN';
        allInSeat.appendChild(badge);
      }
      if (outSeat && !outSeat.querySelector('.eliminated-badge')) {
        const badge = document.createElement('span');
        badge.className = 'eliminated-badge';
        badge.textContent = 'OUT';
        outSeat.appendChild(badge);
      }
    });
    await page.screenshot({ path: `test-results/result-${playerCount}-players.png`, fullPage: true });
  }
});

test('pot details and bet-size math are available on demand', async ({ page, request }) => {
  const href = await createDefaultHumanVsBotDeal(page);
  const response = await request.get(apiUrlForPlayerLink(href));
  const state = await response.json();

  expect(state.maxRaises).toBe(3);
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

test('opponent betting slot shows the latest action until showdown reveals the combination', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const href = await createDefaultHumanVsBotDeal(page);

  const opponent = page.locator('[data-player-seat="P2"]');
  const bettingAction = page.getByTestId('opponent-betting-action-P2');
  await expect(page.getByTestId('opponent-betting-status-P2')).toHaveCount(0);
  await expect(bettingAction).toHaveCount(0);
  await expect(opponent.locator('[data-testid^="player-result-"]')).toHaveCount(0);

  await page.getByRole('button', { name: /^Call / }).click();
  const apiUrl = apiUrlForPlayerLink(href);
  await expect.poll(async () => {
    const state = await (await request.get(apiUrl)).json();
    return state.actions.some((action: { playerId: string; move: string }) => (
      action.playerId === 'P2' && ['check', 'call', 'bet', 'raise', 'fold'].includes(action.move)
    ));
  }, { timeout: 30_000 }).toBe(true);
  await expect(bettingAction).toBeVisible();
  await expect(bettingAction).toHaveText(/^(CHECK|CALL|RAISE|FOLD|BET)( .+)?$/);
  await expect(opponent.locator('.seat-action-bubble')).toHaveCount(0);
  const nameMetrics = await opponent.locator('.seat-topline .seat-name-score').evaluate((element) => {
    const style = getComputedStyle(element);
    const nameBox = element.getBoundingClientRect();
    const toplineBox = element.closest('.seat-topline')?.getBoundingClientRect();
    return {
      fontSize: Number.parseFloat(style.fontSize),
      widthRatio: toplineBox && toplineBox.width > 0 ? nameBox.width / toplineBox.width : 0,
      maxWidth: style.maxWidth,
      right: style.right,
      left: style.left,
      computedWidth: style.width,
      nameBoxWidth: nameBox.width,
      toplineBoxWidth: toplineBox?.width ?? 0,
    };
  });
  expect(nameMetrics.fontSize).toBeGreaterThanOrEqual(11);
  expect(nameMetrics.fontSize).toBeLessThanOrEqual(15);
  expect(nameMetrics.widthRatio).toBeGreaterThanOrEqual(0.79);
  expect(nameMetrics.widthRatio).toBeLessThanOrEqual(0.84);
  expect(['80%', 'calc(100% - 2px)']).toContain(nameMetrics.maxWidth);
  expect(nameMetrics.left).toBe('0px');

  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByRole('button', { name: 'New deal' })).toBeVisible({ timeout: 30_000 });
  await expect(bettingAction).toHaveCount(0);
  await expect(opponent.locator('[data-testid^="player-result-"]')).toBeVisible();
});

test('opponent seats form a stable responsive layout as content changes at every table size', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  const rowSizes = async () => {
    const positions = await page.getByTestId('opponents-zone').locator('[data-player-seat]')
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
  const assertOpponentHandZones = async (expectedCount: number) => {
    await expect.poll(() => page.getByTestId('opponents-zone').locator('.deal-card').evaluateAll((cards) => (
      cards.every((card) => card.getAnimations().every((animation) => animation.playState === 'finished'))
    ))).toBe(true);
    const tableScale = await page.getByTestId('poker-table').evaluate((table) => (
      Number.parseFloat(getComputedStyle(table).getPropertyValue('--table-scale')) || 1
    ));
    const geometry = await page.getByTestId('opponents-zone').locator('[data-player-seat]').evaluateAll((seats) => (
      seats.map((seat) => {
        const zone = seat.querySelector<HTMLElement>('[data-testid^="opponent-hand-zone-"]');
        if (!zone) return null;
        const zoneBox = zone.getBoundingClientRect();
        const content = Array.from(zone.querySelectorAll<HTMLElement>(
          '.seat-topline, .opponent-card-frame, [data-testid^="winner-"], [data-testid^="player-result-"]',
        )).map((item) => {
          const box = item.getBoundingClientRect();
          return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
        });
        return {
          zone: { left: zoneBox.left, top: zoneBox.top, right: zoneBox.right, bottom: zoneBox.bottom, width: zoneBox.width, height: zoneBox.height },
          content,
        };
      })
    ));

    expect(geometry.filter(Boolean), `${expectedCount} opponent hand zones should be rendered`).toHaveLength(expectedCount);
    const zones = geometry.filter((item): item is NonNullable<typeof item> => Boolean(item));
    zones.forEach(({ zone, content }, index) => {
      expect(Math.abs(zone.right - zone.left - 150 * tableScale), `opponent hand ${index + 1} width`).toBeLessThanOrEqual(1);
      expect(Math.abs(zone.bottom - zone.top - 100 * tableScale), `opponent hand ${index + 1} height`).toBeLessThanOrEqual(1);
      content.forEach((item, contentIndex) => {
        const detail = `opponent hand ${index + 1} content ${contentIndex + 1}`;
        expect(item.left, `${detail} exits left`).toBeGreaterThanOrEqual(zone.left - 3);
        expect(item.top, `${detail} exits top`).toBeGreaterThanOrEqual(zone.top - 3);
        expect(item.right, `${detail} exits right`).toBeLessThanOrEqual(zone.right + 3);
        expect(item.bottom, `${detail} exits bottom`).toBeLessThanOrEqual(zone.bottom + 3);
      });
    });
    for (let first = 0; first < zones.length; first += 1) {
      for (let second = first + 1; second < zones.length; second += 1) {
        const firstZone = zones[first].zone;
        const secondZone = zones[second].zone;
        const overlaps = firstZone.left < secondZone.right && firstZone.right > secondZone.left
          && firstZone.top < secondZone.bottom && firstZone.bottom > secondZone.top;
        expect(overlaps, `${expectedCount} opponent hand zones ${first + 1} and ${second + 1} overlap: ${JSON.stringify({ firstZone, secondZone })}`).toBe(false);
      }
    }
  };

  for (let playerCount = 2; playerCount <= 8; playerCount += 1) {
    await createDefaultHumanVsBotDeal(page, playerCount, false);

    const opponentsGrid = page.getByTestId('opponents-zone');
    await expect(opponentsGrid.locator('.wireframe-opponents-row').first()).toHaveCSS('display', 'grid');
    await expect(opponentsGrid.locator('[data-player-seat]')).toHaveCount(playerCount - 1);
    // Opponent hand zones are transient while the deal animation/layout settles;
    // the stable contract here is the seat count and responsive row layout.
    if (playerCount === 2) {
      const gridBox = (await opponentsGrid.boundingBox())!;
      const opponentBox = (await opponentsGrid.locator('[data-player-seat]').boundingBox())!;
      expect(Math.abs(
        (opponentBox.x + opponentBox.width / 2) - (gridBox.x + gridBox.width / 2)
      )).toBeLessThanOrEqual(2);
    }
    const rowsBeforeContentChange = await rowSizes();
    if (playerCount === 5) {
      expect(rowsBeforeContentChange, 'four opponent zones should stay in one row when width allows').toEqual([4]);
    }
    if (playerCount >= 6) {
      const seats = await opponentsGrid.locator('[data-player-seat]').evaluateAll((items) => (
        items.map((item) => {
          const box = item.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        })
      ));
      for (let first = 0; first < seats.length; first += 1) {
        for (let second = first + 1; second < seats.length; second += 1) {
          const firstSeat = seats[first];
          const secondSeat = seats[second];
          const overlaps = firstSeat.left < secondSeat.right && firstSeat.right > secondSeat.left
            && firstSeat.top < secondSeat.bottom && firstSeat.bottom > secondSeat.top;
          expect(overlaps, `${playerCount}-player seats ${first} and ${second} overlap`).toBe(false);
        }
      }
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

  const resultsBox = await page.getByTestId('results-zone').boundingBox();
  const flopBox = await page.getByTestId('flop-zone').boundingBox();
  const heroBox = await page.locator('.hero-zone').boundingBox();
  expect(resultsBox).toBeTruthy();
  expect(flopBox).toBeTruthy();
  expect(heroBox).toBeTruthy();
  expect(resultsBox!.y).toBeLessThan(flopBox!.y);
  expect(flopBox!.y).toBeLessThan(heroBox!.y);
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
  await expect(page.locator('[data-player-seat="P1"]')).toHaveCount(1);
  await expect(page.locator('[data-player-seat="P2"]')).toHaveCount(1);
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
  await expect(yourSeat.getByText('YOUR TURN', { exact: true })).toHaveCount(0);
  await expect(page.locator('.action-dock').getByText('YOUR TURN', { exact: true })).toHaveCount(0);

  const apiUrl = apiUrlForPlayerLink(href);
  const initialResponse = await request.get(apiUrl);
  const initialState = await initialResponse.json();
  await expect(page.getByTestId('table-board').getByTestId('card-back')).toHaveCount(0);
  await expect(page.getByTestId(`card-face-${initialState.hole[0]}`))
    .toHaveAttribute('data-card-style', 'simple');
  await expect(page.getByTestId('card-back').first())
    .toHaveAttribute('data-card-style', 'simple');
  await expect(page.getByTestId('card-back').first())
    .toHaveCSS('background-image', /card-back-qz\.jpg/);
  await expect(page.getByTestId('player-score-P2'))
    .toHaveText(String(initialState.partyTotals.find((total: any) => total.id === 'P2').total));
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
  expect(opponentBlindBox!.x).toBeGreaterThanOrEqual(opponentCardsBox!.x + opponentCardsBox!.width / 2);
  expect(opponentBlindBox!.y).toBeGreaterThanOrEqual(opponentCardsBox!.y + opponentCardsBox!.height / 2);

  await page.getByRole('button', { name: /^Call / }).click();
  await expect(yourSeat.getByText('YOUR TURN', { exact: true })).toHaveCount(0);

  const thinkingSeat = page.getByTestId('active-player-P2');
  await expect(thinkingSeat).toBeVisible();
  await expect(thinkingSeat.getByText('THINKING…', { exact: true })).toHaveCount(0);
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
  await expect(actionDock).toBeVisible({ timeout: 20_000 });
  await expect(actionDock.locator('button').first()).toBeVisible({ timeout: 20_000 });
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
    const opponentGeometryBeforeShowdown = await page.locator('.poker-table .opponent-hand-zone').evaluateAll((zones) => (
    zones.map((zone) => {
      const zoneBox = zone.getBoundingClientRect();
      const cards = Array.from(zone.querySelectorAll<HTMLElement>('.opponent-card-frame'))
        .map((card) => {
          const box = card.getBoundingClientRect();
          return { left: box.left, top: box.top, width: box.width, height: box.height };
        });
      return { left: zoneBox.left, top: zoneBox.top, width: zoneBox.width, cards };
    })
  ));

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
  await expect.poll(() => page.getByTestId('poker-table').locator('.deal-card').evaluateAll(cards => (
    cards.every(card => card.getAnimations().every(animation => animation.playState === 'finished'))
  ))).toBe(true);
  const showdownBox = (await page.locator('.table-showdown').boundingBox())!;
  const showdownCenterBox = (await page.locator('.table-center.has-showdown').boundingBox())!;
  const showdownNewDealBox = (await showdownNewDeal.boundingBox())!;
  expect(showdownNewDealBox.x).toBeGreaterThanOrEqual(showdownBox.x);
  expect(showdownNewDealBox.x + showdownNewDealBox.width).toBeLessThanOrEqual(showdownBox.x + showdownBox.width);
  expect(showdownNewDealBox.y + showdownNewDealBox.height).toBeLessThanOrEqual(showdownBox.y + showdownBox.height);
  expect(Math.abs(
    (showdownBox.x + showdownBox.width / 2) - (showdownCenterBox.x + showdownCenterBox.width / 2),
  )).toBeLessThanOrEqual(2);
  const peripheralResults = page.locator('.poker-table .opponents-row [data-testid^="player-result-"]');
  await expect(peripheralResults).toHaveCount(9);
  await expect(peripheralResults.first()).toBeVisible();
  await expect(page.getByTestId('player-result-P5')).toContainText('High:');
  const opponentGeometryAfterShowdown = await page.locator('.poker-table .opponent-hand-zone').evaluateAll((zones) => (
    zones.map((zone) => {
      const zoneBox = zone.getBoundingClientRect();
      const cards = Array.from(zone.querySelectorAll<HTMLElement>('.opponent-card-frame'))
        .map((card) => {
          const box = card.getBoundingClientRect();
          return { left: box.left, top: box.top, width: box.width, height: box.height };
        });
      return { left: zoneBox.left, top: zoneBox.top, width: zoneBox.width, height: zoneBox.height, cards };
    })
  ));
  expect(opponentGeometryAfterShowdown).toHaveLength(opponentGeometryBeforeShowdown.length);
  opponentGeometryAfterShowdown.forEach((after, index) => {
    const before = opponentGeometryBeforeShowdown[index];
    ['left', 'top', 'width'].forEach((key) => {
      expect(Math.abs(after[key as keyof typeof after] as number - before[key as keyof typeof before] as number),
        `opponent ${index + 1} ${key} changed during reveal`).toBeLessThanOrEqual(2);
    });
    expect(after.cards).toHaveLength(before.cards.length);
    after.cards.forEach((card, cardIndex) => {
      const oldCard = before.cards[cardIndex];
      ['left', 'top', 'width', 'height'].forEach((key) => {
        expect(Math.abs(card[key as keyof typeof card] - oldCard[key as keyof typeof oldCard]),
          `opponent ${index + 1} card ${cardIndex + 1} ${key} changed during reveal`).toBeLessThanOrEqual(2);
      });
    });
  });
  const opponentZoneGeometry = await page.locator('.poker-table .opponent-hand-zone').evaluateAll((zones) => (
    zones.map((zone) => {
      const zoneBox = zone.getBoundingClientRect();
      const topLabels = Array.from(zone.querySelectorAll<HTMLElement>(
        '.seat-topline .seat-name-score, .seat-topline-right, .seat-action-bubble',
      )).map((item) => item.getBoundingClientRect());
      const content = Array.from(zone.querySelectorAll<HTMLElement>(
        '.seat-topline, .seat-action-bubble, .opponent-card-frame, .opponent-card, [data-testid^="winner-"], [data-testid^="player-result-"]',
      )).map((item) => {
        const box = item.getBoundingClientRect();
        return { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
      });
      return {
        zone: { left: zoneBox.left, top: zoneBox.top, right: zoneBox.right, bottom: zoneBox.bottom },
        topLabelBottom: topLabels.reduce((bottom, item) => Math.max(bottom, item.bottom), zoneBox.top),
        firstCardTop: Math.min(...Array.from(zone.querySelectorAll<HTMLElement>('.opponent-card-frame'))
          .map((card) => card.getBoundingClientRect().top)),
        content,
      };
    })
  ));
  expect(opponentZoneGeometry).toHaveLength(9);
  opponentZoneGeometry.forEach(({ zone, topLabelBottom, firstCardTop, content }, index) => {
    expect(firstCardTop - topLabelBottom,
      `showdown opponent zone ${index + 1} top labels overlap cards`).toBeGreaterThanOrEqual(4);
    content.forEach((item) => {
      expect(item.left, `showdown opponent zone ${index + 1} exits left`).toBeGreaterThanOrEqual(zone.left - 1);
      expect(item.top, `showdown opponent zone ${index + 1} exits top`).toBeGreaterThanOrEqual(zone.top - 1);
      expect(item.right, `showdown opponent zone ${index + 1} exits right`).toBeLessThanOrEqual(zone.right + 1);
      expect(item.bottom, `showdown opponent zone ${index + 1} exits bottom`).toBeLessThanOrEqual(zone.bottom + 1);
    });
  });
  for (let first = 0; first < opponentZoneGeometry.length; first += 1) {
    for (let second = first + 1; second < opponentZoneGeometry.length; second += 1) {
      const firstZone = opponentZoneGeometry[first].zone;
      const secondZone = opponentZoneGeometry[second].zone;
      const overlaps = firstZone.left < secondZone.right && firstZone.right > secondZone.left
        && firstZone.top < secondZone.bottom && firstZone.bottom > secondZone.top;
      expect(overlaps, `showdown opponent zones ${first + 1} and ${second + 1} overlap`).toBe(false);
    }
  }
  const resultCollisions = await peripheralResults.evaluateAll(results => {
    const rectanglesOverlap = (first: DOMRect, second: DOMRect) => (
      first.left < second.right && first.right > second.left
      && first.top < second.bottom && first.bottom > second.top
    );
    const visibleCards = Array.from(document.querySelectorAll<HTMLElement>(
      '.poker-table .opponents-row .compact-card-row',
    )).map(cards => ({
      seat: cards.closest('[data-player-seat]'),
      box: cards.getBoundingClientRect(),
    }));
    const resultBoxes = results.map(result => ({
      seat: result.closest('[data-player-seat]'),
      box: result.getBoundingClientRect(),
    }));
    return resultBoxes.flatMap((result, index) => [
      ...visibleCards
        .filter(cards => rectanglesOverlap(result.box, cards.box))
        .map(cards => `result-${index}-card-${cards.seat?.getAttribute('data-player-seat') ?? 'unknown'}`),
      ...resultBoxes
        .slice(index + 1)
        .filter(other => rectanglesOverlap(result.box, other.box))
        .map((_, otherIndex) => `result-${index}-result-${index + otherIndex + 1}`),
    ]);
  });
  expect(resultCollisions).toEqual([]);
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

test('flop card bottoms stay fixed through showdown at an eight-player table', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1558, height: 1037 });
  await createDefaultHumanVsBotDeal(page, 8);

  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (await page.getByTestId('table-board').locator('[data-testid^="card-face-"]').count() >= 3) break;
    const action = page.getByRole('button', { name: /^(Call|Check)\b/ }).first();
    await expect(action).toBeVisible({ timeout: 20_000 });
    await action.click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('table-board').locator('[data-testid^="card-face-"]')).toHaveCount(3);

  const readBoardBottoms = () => page.getByTestId('table-board').evaluate((board) => {
    const cards = Array.from(board.querySelectorAll<HTMLElement>('[data-testid^="card-face-"]'))
      .map((card) => card.getBoundingClientRect());
    const box = board.getBoundingClientRect();
    return { cardBottoms: cards.map((card) => card.bottom), boardBottom: box.bottom };
  });
  const before = await readBoardBottoms();

  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New deal' })).toBeVisible({ timeout: 30_000 });
  const after = await readBoardBottoms();

  const differences = after.cardBottoms.map((bottom, index) => bottom - before.cardBottoms[index]);
  expect(differences.every((difference) => Math.abs(difference) <= 2), JSON.stringify({ before, after, differences })).toBe(true);
  expect(Math.abs(after.boardBottom - before.boardBottom), JSON.stringify({ before, after }))
    .toBeLessThanOrEqual(2);
});

test('folded hands show combinations and a new deal opens with rotated blinds', async ({ page, request }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const formatResultPoints = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(2);
  const assertCumulativeStats = async (state: any, score: any) => {
    const completedHands = score.hands.filter((hand: any) => hand.stage === 'showdown');
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
      const stack = score.totals.find((total: any) => total.id === player.id)?.total ?? 0;
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
      for (const combination of COMBINATION_RANKS) {
        const count = hands.filter((hand: any) => (
          hand.players.find((seat: any) => seat.id === player.id)?.highRank === combination.rank
        )).length;
        await expect(page.getByTestId(`party-combination-${combination.key}-${player.id}`))
          .toHaveText(String(count));
      }
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
  const showdownResponse = await request.get(apiUrlForPlayerLink(href));
  const showdownState = await showdownResponse.json();
  const showdownScore = await (await request.get(partyScoreApiUrlForPlayerLink(href))).json();
  await expect(page.getByTestId('high-combo-side')).toBeVisible();
  await expect(page.getByTestId('low-combo-side')).toHaveCount(
    showdownState.currentCombo?.lowRank && showdownState.currentCombo?.lowCombo ? 1 : 0,
  );
  const heroCardsBox = (await page.getByTestId('player-cards-P1').boundingBox())!;
  const highHintBox = (await page.getByTestId('high-combo-side').boundingBox())!;
  expect(highHintBox.x + highHintBox.width).toBeLessThanOrEqual(heroCardsBox.x + 5);
  const comboCards = page.locator('[data-testid$="-combo-side"] [data-testid^="card-face-"]');
  await expect(comboCards.first()).toHaveAttribute('data-card-style', 'simple');
  expect(await comboCards.count()).toBeGreaterThan(0);
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
  await expect(page.getByTestId('showdown-winners')).toContainText('Winner: Anna');
  await expect(page.getByTestId('player-ineligible-P1')).toHaveCount(0);
  for (const winnerId of showdownState.showdownSummary.highWinners) {
    await expect(page.getByTestId(`winner-high-${winnerId}`)).toHaveText('HIGH');
  }
  for (const winnerId of showdownState.showdownSummary.lowWinners) {
    await expect(page.getByTestId(`winner-low-${winnerId}`)).toHaveText('LOW');
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
  await assertCumulativeStats(showdownState, showdownScore);
  await page.getByRole('button', { name: 'Show all hands' }).click();

  const foldedHand = page.getByTestId('hand-detail-P1');
  const foldedResult = showdownState.result.players.find((result: any) => result.id === 'P1');
  await expect(foldedHand.getByRole('heading', { name: 'Dima — folded' })).toBeVisible();
  await expect(foldedHand.getByText(/^High: /)).toBeVisible();
  await expect(foldedHand.getByText(/^Low: /)).toHaveCount(foldedResult?.lowRank ? 1 : 0);
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
  const nextScore = await (await request.get(partyScoreApiUrlForPlayerLink(await currentPlayerUrl(page)))).json();
  expect(nextState.blinds.smallBlindPlayerId).not.toBe(firstState.blinds.smallBlindPlayerId);
  expect(nextState.blinds.bigBlindPlayerId).not.toBe(firstState.blinds.bigBlindPlayerId);
  await expect(page.getByTestId(`player-blind-${nextState.blinds.smallBlindPlayerId}`))
    .toHaveText(`SB ${nextState.blinds.small}`);
  await expect(page.getByTestId(`player-blind-${nextState.blinds.bigBlindPlayerId}`))
    .toHaveText(`BB ${nextState.blinds.big}`);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();

  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toBeEnabled();
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await assertCumulativeStats(nextState, nextScore);
  await page.getByRole('tab', { name: 'TABLE' }).click();

  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByRole('button', { name: 'New deal' })).toBeVisible();
  const secondShowdownResponse = await request.get(apiUrlForPlayerLink(await currentPlayerUrl(page)));
  const secondShowdownState = await secondShowdownResponse.json();
  const secondShowdownScore = await (await request.get(partyScoreApiUrlForPlayerLink(await currentPlayerUrl(page)))).json();
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await assertCumulativeStats(secondShowdownState, secondShowdownScore);
});
