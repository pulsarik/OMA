import { expect, test } from '@playwright/test';
import { fixture, mockTable } from './fixture';

for (const viewport of [{ width: 320, height: 667 }, { width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  test(`fold keeps card backs and a red stamp at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const state = fixture(7, false);
    const mock = await mockTable(page, state);
    const opponent = page.getByTestId('mt-hand-P2');
    const hero = page.getByTestId('mt-hand-P1');
    const initialBox = await opponent.boundingBox();
    await expect(page.locator('.mt-fold-stamp')).toHaveCount(0);

    state.players[1].folded = true;
    state.players[0].folded = true;
    state.folded = true;
    state.currentPlayerId = 'P3';
    mock.update(state);
    await expect(page.locator('.mt-fold-stamp')).toHaveCount(2);
    await page.screenshot({ path: testInfo.outputPath('folded-cards.png') });

    for (const hand of [opponent, hero]) {
      await expect(hand.locator('.mt-card--back')).toHaveCount(4);
      await expect(hand.locator('[data-card]')).toHaveCount(0);
      for (const card of await hand.locator('.mt-card--back').all()) await expect(card).toBeVisible();
      const stamp = hand.getByRole('img', { name: 'Folded', exact: true });
      await expect(stamp).toHaveText('FOLD');
      await expect(stamp).toHaveCSS('color', 'rgb(255, 100, 100)');
      await expect(stamp).toHaveCSS('border-top-style', 'solid');
      const geometry = await stamp.evaluate(el => {
        const box = el.getBoundingClientRect();
        const handBox = el.parentElement!.getBoundingClientRect();
        const matrix = new DOMMatrix(getComputedStyle(el).transform);
        return { tilted: matrix.b !== 0, box: box.toJSON(), handBox: handBox.toJSON(),
          inside: box.left >= handBox.left && box.right <= handBox.right
            && box.top >= handBox.top && box.bottom <= handBox.bottom };
      });
      expect(geometry, JSON.stringify(geometry)).toMatchObject({ tilted: true, inside: true });
    }
    expect(await opponent.boundingBox()).toEqual(initialBox);
    await page.screenshot({ path: testInfo.outputPath('folded-cards.png') });

    const showdown = fixture();
    showdown.players[1].folded = true;
    mock.update(showdown);
    await expect(opponent.locator('[data-card]')).toHaveCount(4);
    await expect(opponent.locator('.mt-fold-stamp')).toHaveCount(0);
    await expect(opponent.locator('.mt-ranks')).toContainText('Folded');

    mock.update({ ...fixture(7, false), handId: 'next-fixture' });
    await expect(page.locator('.mt-fold-stamp')).toHaveCount(0);
    await expect(hero.locator('[data-card]')).toHaveCount(4);
    await expect(opponent.locator('.mt-card--back').first()).toBeVisible();
  });
}
