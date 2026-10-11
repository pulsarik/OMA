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
    }]),
  }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Statistics' }).click();
  await expect(page.getByRole('heading', { name: 'Hand archive' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Bots / humans' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Game finished' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Players', exact: true })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'With low', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Low wins', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Pair', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader')).toHaveCount(17);
  const rows = page.locator('tbody tr');
  await expect(rows.nth(0).locator('td').nth(14)).toHaveText('2');
  await expect(rows.nth(1).locator('td').nth(14)).toHaveText('0');
  await expect(rows.nth(2).locator('td').nth(3)).toHaveText('1.5');
  await expect(rows.nth(0).locator('td').nth(6)).toHaveText('1');
  await expect(rows.nth(1).locator('td').nth(6)).toHaveText('0');
  await expect(rows.nth(2).locator('td').nth(5)).toHaveText('0.5');
  await expect(rows.nth(2).locator('td').nth(4)).toHaveText('25.0%');
  const pairFrequency = rows.nth(2).locator('td').nth(13).getByRole('button');
  await expect(pairFrequency).toHaveText('66.667% ↑');
  await pairFrequency.focus();
  await expect(page.getByRole('tooltip')).toContainText('Pair: 2 of 3 player combinations');
  await expect(page.getByRole('tooltip')).toContainText('1,000,000 random Omaha deals');
  await pairFrequency.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  const straightFlushFrequency = rows.nth(2).locator('td').nth(6).getByRole('button');
  await expect(straightFlushFrequency).toHaveText('0.000% ↓');
  await straightFlushFrequency.click();
  await expect(page.getByRole('tooltip')).toContainText('royal flush is included in straight flush');
  await straightFlushFrequency.press('Escape');
  await expect(rows.nth(2).locator('td').nth(4).getByRole('button')).toHaveCount(0);
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
