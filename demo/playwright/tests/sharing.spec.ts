import { expect, test } from '@playwright/test';
import { fixture, mockTable } from '../mobile-oval/fixture';

test('share opens an independent playable table, survives reload and continues with separate statistics', async ({ page, browser, request }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (url: string) => { (window as any).sharedUrl = url; } } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ url }: { url: string }) => { (window as any).sharedUrl = url; (window as any).shareActivated = navigator.userActivation.isActive; } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play with friends' }).click();
  await page.getByRole('button', { name: 'Create your own table' }).click();
  await page.getByLabel('Your name').fill('Sharing player');
  await page.getByRole('button', { name: 'Create table' }).click();
  await page.getByRole('button', { name: 'Add bot' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.getByRole('button', { name: 'Fold', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await page.getByTestId('share-deal').filter({ visible: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).sharedUrl)).toBeTruthy();
  const shareUrl = await page.evaluate(() => (window as any).sharedUrl as string);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches)) {
    expect(await page.evaluate(() => (window as any).shareActivated)).toBe(true);
  }
  const sourceUrl = await page.evaluate(() => Object.entries(sessionStorage).find(([key]) => key.endsWith('-player-url'))![1]);
  const sourceId = sourceUrl.split('/')[2];
  const source = await (await request.get(`http://localhost:4100/admin/hands/${sourceId}`)).json();
  expect((await request.post('http://localhost:4100/api/shares', { data: { handId: sourceId, playerId: 'P1', token: 'wrong' } })).status()).toBe(403);
  const recipient = await browser.newContext();
  const friend = await recipient.newPage();
  await friend.goto(shareUrl);
  await expect(friend).toHaveURL(/\/player\//);
  const forkUrl = friend.url();
  const forkId = new URL(forkUrl).pathname.split('/')[2];
  const fork = await (await request.get(`http://localhost:4100/admin/hands/${forkId}`)).json();
  expect(fork.partyId).not.toBe(source.partyId);
  expect(fork.partyCode).toBe(`${source.partyCode}-1`);
  expect(fork.fullCommunity).toEqual(source.fullCommunity);
  expect(fork.players.map((p: any) => p.hole)).toEqual(source.players.map((p: any) => p.hole));
  expect(fork.previousHandId).toBeUndefined();
  expect(fork.players[0].name).toBe('You');
  const apiUrl = `http://localhost:4100/api${new URL(forkUrl).pathname}`;
  expect((await (await request.get(apiUrl)).json()).sharedComparison).toBeUndefined();
  await expect(friend.getByTestId('fork-banner').filter({ visible: true })).toContainText(fork.partyCode);
  await friend.reload();
  await expect(friend).toHaveURL(forkUrl);
  await friend.goto(shareUrl);
  await expect(friend).toHaveURL(forkUrl);
  await expect(friend.getByRole('button', { name: 'Fold', exact: true })).toBeEnabled();
  await friend.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect.poll(async () => (await (await request.get(apiUrl)).json()).stage).toBe('showdown');
  const resultDialog = friend.getByRole('dialog');
  await expect(resultDialog).toBeVisible();
  const comparison = (await (await request.get(apiUrl)).json()).sharedComparison;
  expect(comparison.sourceName).toBe('Sharing player');
  expect(comparison.sourceNet).toBe(-source.totalContributions.P1);
  await expect(resultDialog.getByTestId('shared-comparison')).toContainText('Sharing player');
  await expect(resultDialog.getByRole('button', { name: 'Play on' })).toBeDisabled();
  expect((await request.post(`${apiUrl}/shared-name`, { data: { name: '   ' } })).status()).toBe(400);
  expect((await request.post(`http://localhost:4100/api/player/${forkId}/P1/wrong/shared-name`, { data: { name: 'Alex' } })).status()).toBe(403);
  await friend.reload();
  await expect(resultDialog).toBeVisible();
  const score = await (await request.get(`${apiUrl}/score`)).json();
  expect(score.hands).toHaveLength(1);
  for (const net of score.hands[0].net) {
    const wallet = score.hands[0].wallets.find((p: any) => p.id === net.id).total;
    expect(net.total).toBe(wallet - fork.initialStacks[net.id]);
  }
  await resultDialog.getByLabel('Enter your name to continue playing').fill('Alex');
  await resultDialog.getByRole('button', { name: 'Play on', exact: true }).click();
  await expect.poll(async () => (await (await request.get(`http://localhost:4100/admin/hands/${forkId}`)).json()).nextHandId).toBeTruthy();
  const named = await (await request.get(`http://localhost:4100/admin/hands/${forkId}`)).json();
  const next = await (await request.get(`http://localhost:4100/admin/hands/${named.nextHandId}`)).json();
  expect(next.players[0].name).toBe('Alex');
  await expect(resultDialog).toHaveCount(0);
  const originalAfter = await (await request.get(`http://localhost:4100/admin/hands/${sourceId}`)).json();
  expect(originalAfter.nextHandId).toBeUndefined();
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await other.goto(shareUrl);
  await expect(other).toHaveURL(/\/player\//);
  expect(other.url()).not.toBe(forkUrl);
  const otherId = new URL(other.url()).pathname.split('/')[2];
  expect((await (await request.get(`http://localhost:4100/admin/hands/${otherId}`)).json()).partyCode).toBe(`${source.partyCode}-2`);
  await recipient.close();
  await otherContext.close();
});

test('an unavailable sharing link offers recovery', async ({ page }) => {
  await page.goto('/share/00000000-0000-4000-8000-000000000000');
  await expect(page.getByRole('alert')).toContainText('Could not open this deal');
  await expect(page.getByRole('link', { name: 'Home', exact: true })).toBeVisible();
});

test('showdown replaces the coach with sharing without resizing the table or controls', async ({ page }, testInfo) => {
  test.skip(!['desktop-table', 'mobile-table'].includes(testInfo.project.name), 'Oval table layout only');
  await page.route('**/api/shares', route => route.fulfill({ json: { path: '/share/test-link' } }));
  const mock = await mockTable(page, fixture(2, false));
  const table = page.getByTestId('mt-scene');
  await expect(table).toBeVisible();
  const measure = () => page.evaluate(() => Object.fromEntries(['.mt-scene', '.mt-dock', '.mt-coach-slot'].map(selector => {
    const rect = document.querySelector(selector)!.getBoundingClientRect();
    return [selector, { y: rect.y, height: rect.height }];
  })));
  const before = await measure();
  mock.update(fixture(2, true));
  await expect(page.locator('.mt-coach-slot [data-testid="share-deal"]')).toBeEnabled();
  await expect(page.locator('.mt-coach-slot [data-testid="replay-current-deal"]')).toBeVisible();
  const primary = page.getByRole('button', { name: 'Play on', exact: true });
  await expect(primary).toBeVisible();
  const primaryBox = (await primary.boundingBox())!;
  const controlsBox = (await page.locator('.mt-controls-slot').boundingBox())!;
  expect(Math.abs(primaryBox.width - controlsBox.width)).toBeLessThanOrEqual(2);
  const after = await measure();
  for (const selector of Object.keys(before)) {
    expect(Math.abs(after[selector].y - before[selector].y), selector + ' position').toBeLessThanOrEqual(2);
    expect(Math.abs(after[selector].height - before[selector].height), selector + ' height').toBeLessThanOrEqual(2);
  }
  mock.update({ ...fixture(2, true), partyFinishedEarly: true });
  await expect(page.locator('.mt-coach-slot [data-testid="share-deal"]')).toBeEnabled();
  mock.update({ ...fixture(2, false), handId: 'next-fixture' });
  await expect(page.locator('.mt-coach-slot [data-testid="share-deal"]')).toHaveCount(0);
  const next = await measure();
  expect(Math.abs(next['.mt-scene'].height - before['.mt-scene'].height)).toBeLessThanOrEqual(2);
});
