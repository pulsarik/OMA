import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

test.use({ viewport: { width: 1440, height: 1000 } });

test('desktop seats, board, hints and actions fit without overlap for 2–10 players', async ({ page }, testInfo) => {
  const mock = await mockTable(page, fixture(8, false));
  for (const viewport of [{ width: 761, height: 800 }, { width: 1024, height: 768 }, { width: 1440, height: 1000 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    for (const showdown of [false, true]) {
      for (let count = 2; count <= 10; count++) {
        mock.update(fixture(count, showdown));
        await expect(page.getByTestId('desktop-table')).toBeVisible();
        await expect(page.locator('.mt-seat')).toHaveCount(count);
        await expect(page.locator('.mt-hand .mt-card[data-card]')).toHaveCount(showdown ? count * 4 : 4);
        const metrics = await page.getByTestId('desktop-table').evaluate(table => {
          const rect = (el: Element) => el.getBoundingClientRect();
          const areas = [...table.querySelectorAll('.mt-seat, .mt-board, .mt-hints, .mt-personal-result, .mt-dock')]
            .map(el => ({ ...rect(el).toJSON(), name: el.getAttribute('data-testid') ?? el.className }));
          const overlaps = areas.flatMap((a, i) => areas.slice(i + 1)
            .filter(b => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
            .map(b => [a.name, b.name]));
          const scene = rect(table.querySelector('.mt-scene')!);
          const cards = [...table.querySelectorAll('.mt-scene .mt-card')].map(rect);
          return { overlaps, inside: cards.every(c => c.left >= scene.left && c.right <= scene.right && c.top >= scene.top && c.bottom <= scene.bottom), overflow: document.documentElement.scrollWidth > innerWidth };
        });
        expect.soft(metrics, `${viewport.width}px, ${count} seats, showdown=${showdown}`).toEqual({ overlaps: [], inside: true, overflow: false });
        if (count === 8 && viewport.width === 1440) {
          await page.screenshot({ path: testInfo.outputPath(`desktop-eight-${showdown ? 'showdown' : 'live'}.png`), fullPage: true });
        }
      }
    }
  }
});

test('desktop actions, pot dialog, localization and resize preserve the hand', async ({ page }) => {
  const mock = await mockTable(page, fixture(8, false));
  await expect(page.locator('.mt-seat:not([data-hero=true]) .mt-card--back')).toHaveCount(28);
  await page.getByRole('button', { name: 'Call 20', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Call 20', exact: true })).toBeDisabled();
  const moves = mock.messages.filter(m => m.action === 'player_move');
  expect(moves).toHaveLength(1);
  expect(moves[0]).toMatchObject({ move: 'call', playerId: 'P1', handId: 'mobile-fixture', token: 'token' });
  mock.ack(moves[0].commandId);
  mock.update(fixture(8));
  await expect(page.getByTestId('mt-hint-high').locator('[data-card]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Pot 1 200' }).click();
  await expect(page.getByRole('dialog').locator('.mt-contribution')).toHaveCount(8);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'EN / RU', exact: true }).click();
  await expect(page.getByTestId('desktop-table')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('button', { name: 'Следующая раздача' })).toBeVisible();
  await page.getByRole('button', { name: 'EN / RU', exact: true }).click();
  await page.getByRole('button', { name: 'Rules', exact: true }).click();
  await expect(page.getByTestId('about-panel')).toBeVisible();
  await page.getByRole('tab', { name: 'TABLE', exact: true }).click();
  await expect(page.getByTestId('desktop-table')).toBeVisible();
  await page.setViewportSize({ width: 760, height: 844 });
  await expect(page.getByTestId('poker-table')).toBeVisible();
  mock.update(fixture(7));
  await expect(page.getByTestId('mobile-table')).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByTestId('desktop-table')).toBeVisible();
  await page.getByRole('button', { name: 'Next deal' }).click();
  expect(mock.messages.filter(m => m.action === 'new_deal')).toHaveLength(1);
});

test('real desktop lobby exposes ten seats and plays through to the next hand', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await expect(page.getByLabel('Seats at the table').locator('option')).toHaveCount(9);
  await page.getByLabel('Your name').fill('Desktop review');
  await page.getByLabel('Seats at the table').selectOption('8');
  await page.getByRole('button', { name: 'Create table', exact: true }).click();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByTestId('desktop-table')).toBeVisible();
  await expect(page.locator('.mt-seat')).toHaveCount(8);
  await page.getByRole('button', { name: 'Fold', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Next deal' })).toBeVisible({ timeout: 25000 });
  await page.getByRole('button', { name: 'Next deal' }).click();
  await expect(page.locator('.mt-table-id')).toContainText('№2');
});
