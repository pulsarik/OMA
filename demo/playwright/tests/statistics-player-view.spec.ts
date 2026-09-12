import { expect, test, type Page } from '@playwright/test';

async function openStatistics(page: Page, seats = 2) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption(String(seats));
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await expect(page.getByTestId('lobby-table').getByText('Anna', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Start game/ }).click();
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'STATISTICS' })).toBeEnabled({ timeout: 20_000 });
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await expect(page.getByTestId('statistics-player-detail')).toBeVisible();
}

test('player view uses classic values, selects players, and remembers the reversible layout choice', async ({ page }) => {
  await openStatistics(page);
  await expect(page.getByTestId('statistics-player-detail')).toHaveAttribute('data-player-id', 'P1');
  await expect(page.getByTestId('statistics-select-P1')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('bot-style-P2')).toHaveCount(0);

  const readValues = () => page.getByTestId('party-statistics').locator('[data-testid]').evaluateAll(elements => (
    Object.fromEntries(elements.filter(element => /^party-(realization|missed-high|missed-low|hands|aggression|fold|win|loss|net|max-win|max-loss|stack|combination)-/.test(element.getAttribute('data-testid') ?? ''))
      .map(element => [element.getAttribute('data-testid')!, element.textContent!.replace(/^\+/, '')]))
  ));
  const firstPlayer = await readValues();
  expect(Object.keys(firstPlayer)).toHaveLength(19);
  await page.getByTestId('statistics-select-P2').click();
  await expect(page.getByTestId('statistics-player-detail')).toHaveAttribute('data-player-id', 'P2');
  await expect(page.getByTestId('wallet-series-P2')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByTestId('wallet-series-P1')).toHaveAttribute('data-selected', 'false');
  const secondPlayer = await readValues();
  expect(Object.keys(secondPlayer)).toHaveLength(19);

  const explore = page.getByRole('slider', { name: 'Explore hands' });
  await explore.focus();
  await explore.press('Home');
  await expect(explore).toHaveValue('0');
  await expect(page.getByTestId('statistics-chart-readout')).toContainText('Hand 0');
  await expect(page.getByTestId('statistics-chart-readout')).toContainText('Anna');
  await explore.press('End');
  await expect(page.getByTestId('statistics-chart-readout')).toContainText('Hand 1');
  await page.getByRole('group', { name: 'Chart players' }).getByRole('button', { name: 'Dima' }).click();
  await expect(page.getByTestId('statistics-player-detail')).toHaveAttribute('data-player-id', 'P1');
  await page.getByLabel('Realization', { exact: true }).click();
  await expect(page.getByText('Percentage of advantaged hands that produced a positive net result.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Classic view', exact: true }).click();
  await expect(page.getByTestId('party-metrics-scroll')).toBeVisible();
  expect(await readValues()).toEqual({ ...firstPlayer, ...secondPlayer });
  await page.reload();
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await expect(page.getByTestId('party-metrics-scroll')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Classic view', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Player view', exact: true }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'STATISTICS' }).click();
  await expect(page.getByTestId('statistics-player-detail')).toBeVisible();
});

test('player statistics fit desktop and mobile with every player and metric available', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openStatistics(page, 4);
  for (const width of [1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1100 });
    await expect(page.getByTestId('statistics-select-P4')).toBeVisible();
    await page.getByTestId('statistics-select-P4').click();
    await expect(page.getByTestId('statistics-player-detail')).toHaveAttribute('data-player-id', 'P4');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const chart = await page.getByTestId('wallet-history-chart').boundingBox();
    expect(chart!.x).toBeGreaterThanOrEqual(0);
    expect(chart!.x + chart!.width).toBeLessThanOrEqual(width);
    await expect(page.getByTestId('party-combination-twoPair-P4')).toBeVisible();
    if (width === 1440 || width === 390) {
      await page.screenshot({ path: testInfo.outputPath(`statistics-${width}.png`), fullPage: true });
    }
  }
});

test('empty history and unavailable storage still allow switching layouts', async ({ page }) => {
  await page.addInitScript(() => {
    const originalGet = Storage.prototype.getItem;
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === 'omaha-statistics-layout') throw new Error('Storage blocked');
      return originalGet.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'omaha-statistics-layout') throw new Error('Storage blocked');
      return originalSet.call(this, key, value);
    };
  });
  await page.route('**/api/player/*/*/*/score', async route => {
    const response = await route.fetch();
    const score = await response.json();
    await route.fulfill({ json: { ...score, hands: [] } });
  });
  await openStatistics(page);
  await expect(page.getByText('Wallet history will appear after the first completed hand.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('party-net-P1')).toHaveText('0');
  await expect(page.getByTestId('party-realization-P1')).toHaveText('0%');
  await page.getByRole('button', { name: 'Classic view', exact: true }).click();
  await expect(page.getByTestId('party-metrics-scroll')).toBeVisible();
  await page.getByRole('button', { name: 'Player view', exact: true }).click();
  await expect(page.getByTestId('statistics-player-detail')).toBeVisible();
});
