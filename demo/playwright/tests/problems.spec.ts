import { expect, test } from '@playwright/test';

test('a tester can submit a problem and retrieve it by numeric ID', async ({ page, request }) => {
  await page.goto('/');
  await page.getByLabel('Язык').selectOption('en');

  const reportButton = page.getByRole('button', { name: 'Report a problem' });
  await expect(reportButton).toBeVisible();
  await reportButton.click();

  const dialog = page.getByRole('dialog', { name: 'Report a problem' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Description').fill('The pot is calculated incorrectly');

  const responsePromise = page.waitForResponse((response) => (
    response.url().endsWith('/api/problems') && response.request().method() === 'POST'
  ));
  await dialog.getByRole('button', { name: 'OK' }).click();
  const createResponse = await responsePromise;
  expect(createResponse.status()).toBe(201);

  const created = await createResponse.json();
  expect(created.id).toBeGreaterThanOrEqual(1000);
  await expect(page.getByRole('status')).toHaveText(`Problem #${created.id} saved`);

  const storedResponse = await request.get(`http://localhost:4000/api/problems/${created.id}`);
  expect(storedResponse.ok()).toBe(true);
  await expect(storedResponse.json()).resolves.toMatchObject({
    id: created.id,
    description: 'The pot is calculated incorrectly',
    context: {
      page: 'home',
    },
  });
});

test('Cancel closes the problem dialog without sending a report', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Язык').selectOption('en');
  await page.getByRole('button', { name: 'Report a problem' }).click();
  const dialog = page.getByRole('dialog', { name: 'Report a problem' });
  await dialog.getByLabel('Description').fill('Do not send this');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
});
