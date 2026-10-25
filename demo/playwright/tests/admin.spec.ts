import { test, expect } from '@playwright/test';
test('admin API lists hands', async ({ request }) => {
  const res = await request.get('http://localhost:4100/admin/hands');
  expect(res.ok()).toBeTruthy();
  expect(Array.isArray((await res.json()).hands)).toBeTruthy();
});

test('admin shows country and source without exposing the cookie column', async ({ page }) => {
  await page.route('**/admin/stats', (route) => route.fulfill({ json: {
    accesses: [
      {
        playerName: 'Alice', clientCookie: 'private-browser-id', country: 'DE', source: 'referral:www.google.com',
        dealsPlayed: 12, partiesPlayed: 3, partiesWon: 2, winPercent: 67,
      },
      { playerName: 'Bob', source: 'direct' },
      { playerName: 'Carol', source: 'campaign:<img src=x onerror=alert(1)>' },
      { playerName: 'Legacy' },
    ],
  } }));
  await page.goto('/admin.html');
  const table = page.locator('#accesses');
  await expect(table.getByRole('columnheader', { name: 'Страна / Country' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Источник / Source' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Раздач сыграно / Deals played' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Партий сыграно / Parties played' })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Побед / Wins', exact: true })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Cookie', exact: true })).toHaveCount(0);
  await expect(table).not.toContainText('private-browser-id');
  const alice = table.getByRole('row').filter({ hasText: 'Alice' });
  await expect(alice).toContainText('Германия / Germany');
  await expect(alice).toContainText('www.google.com');
  await expect(alice.getByRole('cell').nth(2)).toHaveText('12');
  await expect(alice.getByRole('cell').nth(3)).toHaveText('3');
  await expect(alice.getByRole('cell').nth(4)).toHaveText('2');
  await expect(table.getByRole('row').filter({ hasText: 'Bob' })).toContainText('Direct / unknown');
  await expect(table.getByRole('row').filter({ hasText: 'Legacy' })).toContainText('Неизвестно / Unknown');
  await expect(table.getByRole('row').filter({ hasText: 'Carol' })).toContainText('UTM: <img');
  await expect(table.locator('img')).toHaveCount(0);
  expect(await alice.getByRole('cell').count()).toBe(await table.getByRole('columnheader').count());
});

test('captures arrivals on public guides before navigation to the game', async ({ page }) => {
  await page.goto('/rules', { referer: 'https://www.google.com/' });
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('omaha-visit-attribution')))
    .toBe(JSON.stringify({ referrer: 'https://www.google.com', utmSource: '' }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Play with friends' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem('omaha-visit-attribution')!)))
    .toEqual({ referrer: 'https://www.google.com', utmSource: '' });
});

for (const entry of [
  { name: 'Google visitor', path: '/', referer: 'https://www.google.com/', source: 'referral:www.google.com' },
  { name: 'Campaign visitor', path: '/?utm_source=newsletter', referer: '', source: 'campaign:newsletter' },
  { name: 'Direct visitor', path: '/', referer: '', source: 'direct' },
]) {
  test(`preserves ${entry.name} attribution from entry to game connection`, async ({ page, request }) => {
    await page.goto(entry.path, entry.referer ? { referer: entry.referer } : {});
    await page.getByRole('button', { name: 'Play with friends' }).click();
    await page.getByRole('button', { name: 'Create your own table' }).click();
    await page.getByLabel('Your name').fill(entry.name);
    await page.getByRole('button', { name: 'Create table', exact: true }).click();
    await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
    await page.getByRole('button', { name: 'Add bot' }).click();
    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(page.getByRole('tab', { name: 'TABLE', exact: true })).toBeVisible();
    const source = async () => {
      const stats = await (await request.get('http://localhost:4100/admin/stats')).json();
      return stats.accesses.find((access: any) => access.playerName === entry.name)?.source;
    };
    await expect.poll(source).toBe(entry.source);
    await page.reload();
    await expect(page.getByRole('tab', { name: 'TABLE', exact: true })).toBeVisible();
    await expect.poll(source).toBe(entry.source);
  });
}
