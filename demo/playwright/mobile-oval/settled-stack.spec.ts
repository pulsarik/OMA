import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

for (const width of [390, 1280]) {
  test(`settled stack replaces remaining chips at showdown (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem('omaha-mobile-language', 'ru'));
    const state = fixture(4, false);
    state.players[0].stack = state.stack = 844;
    state.partyTotals[0].total = 1006;
    const mock = await mockTable(page, state);
    const stack = page.getByTestId('mt-seat-P1').locator('.mt-seat-name strong');
    await expect(stack).toHaveText('844');
    const settled = { ...state, stage: 'showdown' };
    mock.update(settled);
    await expect(stack).toHaveText(/1\s?006/);
    mock.update(settled);
    await expect(stack).toHaveText(/1\s?006/);
    await expect(page.locator('.mt-page')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: /EN \/ RU/ })).toHaveCount(0);
  });
}
