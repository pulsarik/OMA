import { expect, test } from '@jest/globals';
import { getWireframeTableLayout, WIREFRAME_LAYOUT } from '../client/src/pages/wireframeLayout';

test('wireframe scales up and keeps seven opponents in one row', () => {
  const layout = getWireframeTableLayout({ width: 1800, height: 1200 }, 7);
  expect(layout.rowCount).toBe(1);
  expect(layout.rows.map(row => row.length)).toEqual([7]);
  expect(layout.mode).toBe('wide');
  expect(layout.scale).toBeGreaterThan(1);
  expect(layout.opponentSize.width).toBeCloseTo(WIREFRAME_LAYOUT.opponent.width * layout.scale);
});

test('wireframe keeps desktop opponents in one row', () => {
  const layout = getWireframeTableLayout({ width: 900, height: 900 }, 7);
  expect(layout.rowCount).toBe(1);
  expect(layout.scale).toBeLessThan(1);
  expect(layout.opponentSize.width).toBeGreaterThanOrEqual(100);
  expect(layout.opponentSize.height).toBeGreaterThanOrEqual(70);
});

test('wireframe balances mobile opponent rows', () => {
  const twoRows = getWireframeTableLayout({ width: 700, height: 900 }, 7);
  const threeRows = getWireframeTableLayout({ width: 400, height: 900 }, 7);
  expect(twoRows.rows.map(row => row.length)).toEqual([4, 3]);
  expect(threeRows.rows.map(row => row.length)).toEqual([4, 3]);
  expect(twoRows.mode).toBe('narrow');
  expect(threeRows.mode).toBe('narrow');
});
