import { expect, test } from '@playwright/test';

test('statistics opens the archive and its hand code starts a bot replay', async ({ page }) => {
  await page.route('**/api/archive', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{
      partyId: 'archive-test-party',
      date: Date.now(),
      bots: 1,
      humans: 1,
      players: 2,
      hands: 3,
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
      finished: false,
      durationMinutes: 0.5,
      lowPercent: null,
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
    }]),
  }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.getByRole('heading', { name: 'Hand archive' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Bots / humans' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Game finished' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Players', exact: true })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Hands with low, %', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Hands with a low win', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Player high combinations', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Pair', exact: true })).toHaveCount(0);
  await expect(page.getByRole('columnheader')).toHaveCount(8);
  const rows = page.locator('tbody tr');
  await expect(rows.nth(0).locator('td').nth(5)).toHaveText('3');
  await expect(rows.nth(1).locator('td').nth(5)).toHaveText('0');
  await expect(rows.nth(2).locator('td').nth(4)).toHaveText('1.5');
  await expect(rows.nth(0).locator('td').nth(6)).toHaveText('1');
  await expect(rows.nth(1).locator('td').nth(6)).toHaveText('0');
  await expect(rows.nth(2).locator('td').nth(5)).toHaveText('0.5');
  await expect(page.getByRole('button', { name: 'ABC123' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'XYZ789' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Game finished: No' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'STATISTICS', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'LOBBY', exact: true })).toHaveAttribute('aria-selected', 'false');
  await page.getByRole('tab', { name: 'ABOUT /' }).click();
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
