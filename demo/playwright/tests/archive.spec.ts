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
  await expect(page.getByRole('button', { name: 'ABC123' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'XYZ789' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Game finished: No' })).toBeVisible();
  await page.getByRole('button', { name: 'XYZ789' }).click();

  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await expect(page.getByRole('tab', { name: 'TABLE', exact: true })).toBeVisible();
});
