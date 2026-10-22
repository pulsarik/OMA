import { expect, test } from '@playwright/test';

test('archive API validates page numbers and returns pagination metadata', async ({ request }) => {
  for (const value of ['0', '-1', '1.5', 'Infinity', 'abc']) {
    const response = await request.get(`http://localhost:4100/api/archive?page=${value}`);
    expect(response.status()).toBe(400);
  }
  const response = await request.get('http://localhost:4100/api/archive');
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.pageSize).toBe(20);
  expect(body.page).toBe(1);
  expect(body.rows.length).toBeLessThanOrEqual(20);
  expect(body.summary.games).toBe(body.total);
});

test('archive requests only the selected page and retries a failed page', async ({ page }) => {
  const requested: number[] = [];
  let failSecond = true;
  await page.route('**/api/archive?*', route => {
    const current = Number(new URL(route.request().url()).searchParams.get('page'));
    requested.push(current);
    if (current === 2 && failSecond) {
      failSecond = false;
      return route.fulfill({ status: 503, json: { error: 'Temporary failure' } });
    }
    return route.fulfill({ json: {
      page: current, total: 21, pageSize: 20, totalPages: 2,
      summary: {
        games: 21, hands: 27, completedHands: 7, handsWithLow: 2, finishedGames: 1,
        durationMinutes: 42, lowWins: 2,
        combinations: { straightFlush: 0, fourOfAKind: 0, fullHouse: 0, flush: 0,
          straight: 0, threeOfAKind: 0, twoPair: 0, pair: 4, highCard: 10 },
      },
      rows: Array.from({ length: current === 1 ? 20 : 1 }, (_, index) => ({
        partyId: `${current}-${index}`, date: 1000, players: 2, bots: 1, humans: 1,
        hands: current === 1 ? 1 : 7, completedHands: 0, handsWithLow: 0, finished: false,
        durationMinutes: 0, lowPercent: null, lowWins: 0,
        combinations: { straightFlush: 0, fourOfAKind: 0, fullHouse: 0, flush: 0,
          straight: 0, threeOfAKind: 0, twoPair: 0, pair: 0, highCard: 0 },
      })),
    } });
  });
  await page.goto('/statistics');
  const navigation = page.getByRole('navigation', { name: 'Archive pages' });
  await expect(page.locator('tbody tr')).toHaveCount(21);
  await expect(navigation).toContainText('Page 1 of 2');
  await expect(navigation.getByRole('button', { name: 'Previous' })).toBeDisabled();
  const summary = page.locator('tbody tr').first();
  const assertSummary = async () => {
    await expect(summary.getByRole('rowheader')).toHaveText('All games average');
    await expect(summary.locator('td').nth(0)).toHaveText('1.3');
    await expect(summary.locator('td').nth(1)).toHaveText('4.8%');
    await expect(summary.locator('td').nth(2)).toHaveText('2.0');
    await expect(summary.locator('td').nth(3)).toHaveText('28.6%');
    await expect(summary.locator('td').nth(4)).toHaveText('0.1');
    await expect(summary.locator('td').nth(12).locator('div')).toHaveText('0.2');
    await expect(summary.locator('td').nth(12).getByRole('button')).toContainText('28.571%');
  };
  await assertSummary();
  expect(requested).toEqual([1]);
  await navigation.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('alert')).toContainText('Temporary failure');
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(navigation).toContainText('Page 2 of 2');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await assertSummary();
  await expect(navigation.getByRole('button', { name: 'Next' })).toBeDisabled();
  await navigation.getByRole('button', { name: 'Previous' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(21);
  await assertSummary();
  expect(requested).toEqual([1, 2, 2, 1]);
});

test('statistics opens the archive and its hand code starts a bot replay', async ({ page }) => {
  await page.route('**/api/archive?*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ page: 1, totalPages: 1, summary: {
      games: 2, hands: 4, completedHands: 4, handsWithLow: 1, finishedGames: 1,
      durationMinutes: 3, lowWins: 1,
      combinations: { straightFlush: 0, fourOfAKind: 0, fullHouse: 0, flush: 0,
        straight: 0, threeOfAKind: 0, twoPair: 1, pair: 2, highCard: 0 },
    }, rows: [{
      partyId: 'archive-test-party',
      date: Date.now(),
      bots: 1,
      humans: 1,
      players: 2,
      hands: 3,
      completedHands: 3,
      handsWithLow: 1,
      finished: true,
      durationMinutes: 2.5,
      lowPercent: 33.3,
      lowWins: 1,
      combinations: {
        straightFlush: 0,
        fourOfAKind: 0,
        fullHouse: 0,
        flush: 0,
        straight: 0,
        threeOfAKind: 0,
        twoPair: 1,
        pair: 2,
        highCard: 0,
      },
      replayCode: 'ABC123',
    }, {
      partyId: 'archive-test-party-2',
      date: Date.now() - 60_000,
      bots: 2,
      humans: 1,
      players: 3,
      hands: 1,
      completedHands: 1,
      handsWithLow: 0,
      finished: false,
      durationMinutes: 0.5,
      lowPercent: 0,
      lowWins: 0,
      combinations: {
        straightFlush: 0,
        fourOfAKind: 0,
        fullHouse: 0,
        flush: 0,
        straight: 0,
        threeOfAKind: 0,
        twoPair: 0,
        pair: 0,
        highCard: 0,
      },
      replayCode: 'XYZ789',
    }] }),
  }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.getByRole('heading', { name: 'Hand archive' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Archive pages' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Bots / humans' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Game finished' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Players', exact: true })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'With low', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Low wins', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Pair', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader')).toHaveCount(16);
  const rows = page.locator('tbody tr');
  await expect(rows.first().getByRole('rowheader')).toHaveText('All games average');
  await expect(rows.nth(1).locator('td').nth(13)).toHaveText('2');
  await expect(rows.nth(2).locator('td').nth(13)).toHaveText('0');
  await expect(rows.nth(0).locator('td').nth(2)).toHaveText('1.5');
  await expect(rows.nth(1).locator('td').nth(5)).toHaveText('1');
  await expect(rows.nth(2).locator('td').nth(5)).toHaveText('0');
  await expect(rows.nth(0).locator('td').nth(4)).toHaveText('0.5');
  await expect(rows.nth(0).locator('td').nth(3)).toHaveText('25.0%');
  const pairFrequency = rows.nth(0).locator('td').nth(12).getByRole('button');
  await expect(pairFrequency).toHaveText('66.667% ↑');
  await pairFrequency.focus();
  await expect(page.getByRole('tooltip')).toContainText('Pair: 2 of 3 player combinations');
  await expect(page.getByRole('tooltip')).toContainText('1,000,000 random Omaha deals');
  await pairFrequency.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const straightFlushFrequency = rows.nth(0).locator('td').nth(5).getByRole('button');
  await expect(straightFlushFrequency).toHaveText('0.000% ↓');
  await straightFlushFrequency.click();
  await expect(page.getByRole('tooltip')).toContainText('royal flush is included in straight flush');
  await straightFlushFrequency.press('Escape');
  await expect(rows.nth(0).locator('td').nth(3).getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ABC123' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'XYZ789' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Game finished: No' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'STATISTICS', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'LOBBY', exact: true })).toHaveAttribute('aria-selected', 'false');
  await page.getByRole('tab', { name: 'ABOUT', exact: true }).click();
  await page.getByRole('tab', { name: 'STATISTICS', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hand archive' })).toBeVisible();
  await page.getByRole('tab', { name: 'LOBBY', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'STATISTICS', exact: true })).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByRole('tab', { name: 'LOBBY', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'STATISTICS', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hand archive' })).toBeVisible();
  await page.getByRole('button', { name: 'XYZ789' }).click();

  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(page.getByRole('tab', { name: 'TABLE', exact: true })).toBeVisible();
});
