import { expect, Page, test } from '@playwright/test';
import { fixture, mockTable } from '../mobile-oval/fixture';

async function measureTable(page: Page) {
  return page.getByTestId('poker-table').evaluate((table) => {
    const tableBox = table.getBoundingClientRect();
    const actionZone = table.parentElement?.querySelector<HTMLElement>('.wireframe-actions-zone');
    const heroZone = table.querySelector<HTMLElement>('.wireframe-hero-slot');
    return {
      tableHeight: tableBox.height,
      actionZoneHeight: actionZone?.getBoundingClientRect().height ?? 0,
      heroZoneHeight: heroZone?.getBoundingClientRect().height ?? 0,
      actionZoneVisible: Boolean(actionZone),
    };
  });
}

test('legacy table height stays stable when the human turn state changes', async ({ page }) => {
  const mock = await mockTable(page, fixture(8, false));
  await expect(page.getByTestId('poker-table')).toBeVisible();

  const before = await measureTable(page);

  mock.update({
    ...fixture(8, false),
    currentPlayerId: 'P2',
    currentBet: 20,
    roundBets: { P1: 0, P2: 20 },
  });

  const inBetween = await measureTable(page);

  mock.update({
    ...fixture(8, false),
    currentPlayerId: 'P1',
    currentBet: 20,
    roundBets: { P1: 0, P2: 20 },
  });

  const after = await measureTable(page);

  expect(inBetween.actionZoneVisible).toBe(false);
  expect(after.actionZoneVisible).toBe(true);
  expect(Math.abs(after.tableHeight - before.tableHeight)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.tableHeight - inBetween.tableHeight)).toBeLessThanOrEqual(2);
});
