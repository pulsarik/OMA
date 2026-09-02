import { expect, Page, test } from '@playwright/test';

async function startMobileTable(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Create a table' }).click();
  await page.getByLabel('Your name').fill('Dima');
  await page.getByLabel('Seats at the table').selectOption('4');
  await page.getByRole('button', { name: 'Create table' }).click();
  await expect(page).toHaveURL(/\/lobby\/[^/?]+$/);
  await page.getByLabel('Bot name').fill('Anna');
  await page.getByRole('button', { name: 'Add bot' }).click();
  await page.getByRole('button', { name: /Start game/ }).click();
  await expect(page.getByRole('tab', { name: 'TABLE' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fold' })).toBeVisible({ timeout: 30_000 });
}

test('mobile combo hints do not intersect the hero hand', async ({ page }) => {
  await startMobileTable(page);
  await page.getByRole('button', { name: 'Fold' }).click();
  await expect(page.getByTestId('high-combo-side')).toBeVisible({ timeout: 30_000 });

  const metrics = await page.getByTestId('poker-table').evaluate((table) => {
    const hero = table.querySelector<HTMLElement>('.wireframe-hero-slot .compact-card-row')?.getBoundingClientRect();
    const hints = Array.from(table.querySelectorAll<HTMLElement>('[data-testid$="-combo-side"]')).map((hint) => {
      const box = hint.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    });
    return { hero: hero?.toJSON() ?? null, hints };
  });
  expect(metrics.hints.length).toBeGreaterThan(0);
  expect(metrics.hero).not.toBeNull();
  for (const hint of metrics.hints) {
    expect(hint.right <= metrics.hero!.left || hint.left >= metrics.hero!.right
      || hint.bottom <= metrics.hero!.top || hint.top >= metrics.hero!.bottom,
    JSON.stringify(metrics)).toBe(true);
  }
});
