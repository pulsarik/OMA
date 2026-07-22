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

test('a bot takes its turn after the human acts', async ({ page, request }) => {
  const href = await createDefaultHumanVsBotDeal(page);
  await page.goto(href);
  await expect(page.getByText(/^deal: OMA1-/)).toBeVisible();
  await expect(page.getByText('connected', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('player-name-P1')).toHaveText('Dima (you)');
  await expect(page.getByTestId('player-name-P2')).toHaveText('Anna');
  await expect(page.getByText(/_bot$/)).toHaveCount(0);

  await page.getByRole('button', { name: /^Call / }).click();
  const apiUrl = apiUrlForPlayerLink(href);

  await expect.poll(async () => {
    const response = await request.get(apiUrl);
    const state = await response.json();
    return state.actions.filter((action: { playerId: string }) => action.playerId === 'P2').length;
  }, { timeout: 5_000 }).toBeGreaterThan(0);

  const opponentAction = page.locator('[title^="Last action:"]');
  await expect(opponentAction).toHaveCount(1);
  await expect(opponentAction).toHaveText(/^(CHECK|CALL|RAISE|FOLD|BET)( .+)?$/);
});

test('folded hands show combinations and a new deal opens', async ({ page }) => {
  const href = await createDefaultHumanVsBotDeal(page);
  await page.goto(href);
  await expect(page.getByText(/^deal: OMA1-/)).toBeVisible();
  await expect(page.getByText('connected', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByText('You lost', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Show cards' })).toHaveCount(0);

  const foldedHand = page.getByRole('heading', { name: 'Dima - folded' }).locator('..');
  await expect(foldedHand.getByText(/^High: /)).toBeVisible();
  await expect(foldedHand.getByText(/^Low: /)).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Dima', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Anna', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^High winner: Anna -/ })).toBeVisible();

  const oldUrl = page.url();
  await page.getByRole('button', { name: 'New deal' }).click();
  await expect(page).not.toHaveURL(oldUrl);
  await expect(page.getByText(/^deal: OMA1-/)).toBeVisible();
  await expect(page.getByText('preflop', { exact: true }).first()).toBeVisible();
});
