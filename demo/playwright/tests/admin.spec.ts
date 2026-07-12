import { test, expect } from '@playwright/test';
test('admin page lists hands', async ({ request }) => {
  // ensure at least one hand exists by dealing via websocket (quick HTTP POST could be added)
  const res = await request.get('/admin/hands');
  expect(res.ok()).toBeTruthy();
});