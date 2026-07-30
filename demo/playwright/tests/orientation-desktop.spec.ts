import { expect, test } from '@playwright/test';

test('a narrow desktop window is not treated as a rotated phone', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');

  await expect(page.getByTestId('portrait-orientation-guard')).toBeHidden();
  await expect(page.getByRole('button', { name: /Создать стол|Create a table/ })).toBeVisible();
});
