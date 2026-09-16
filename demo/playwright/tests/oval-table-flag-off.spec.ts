import { expect, test } from '@playwright/test';
import { fixture, mockTable } from '../mobile-oval/fixture';

test('disabled oval flag retains the legacy table on desktop and mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await mockTable(page, fixture(8, false));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByTestId('poker-table')).toBeVisible();
    await expect(page.locator('.mt-page')).toHaveCount(0);
    await expect(page.locator('.poker-page--new-design')).toHaveCount(0);
  }
});
