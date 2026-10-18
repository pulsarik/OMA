import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`voice tab is accessible and returns to the table at ${viewport.width}px`, async ({ page, browser }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('button', { name: 'Play with friends' }).click();
    await page.getByRole('button', { name: 'Create your own table' }).click();
    await page.getByLabel('Your name').fill('Voice player');
    await page.getByRole('button', { name: 'Create table' }).click();
    const pin = (await page.getByLabel('Table PIN').textContent())!.trim();
    const guest = await browser.newPage();
    try {
      await guest.goto(`${page.url()}?pin=${pin}`);
      await guest.getByLabel('Your name').fill('Voice guest');
      await guest.getByRole('button', { name: 'Take a seat' }).click();
      await expect(page.getByTestId('lobby-host-members')).toContainText('Voice guest');
      await page.getByRole('button', { name: 'Add bot' }).click();
      await page.getByRole('button', { name: /Start game/ }).click();

      const voiceTab = page.getByRole('tab', { name: 'VOICE', exact: true });
      await expect(voiceTab).toBeVisible();
      await voiceTab.click();
      await expect(voiceTab).toHaveAttribute('aria-selected', 'true');
      const panel = page.getByRole('tabpanel', { name: 'VOICE', exact: true });
      await expect(panel).toBeVisible();
      // Without LiveKit configuration the restored tab explains its availability.
      await expect(panel).toContainText('Voice chat is currently unavailable.');
      await page.getByRole('tab', { name: 'TABLE', exact: true }).click();
      await expect(panel).toBeHidden();
      await expect(page.getByTestId('game-tile')).toBeVisible();
    } finally {
      await guest.close();
    }
  });

  test(`voice chat is absent when playing with bots at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/?start=bots');
    await page.getByRole('button', { name: 'Play now', exact: true }).click();
    await expect(page.getByTestId('game-tile')).toBeVisible();
    await expect(page.locator('#voice-tab')).toHaveCount(0);
    await expect(page.locator('#voice-panel')).toHaveCount(0);
    await expect(page.getByTestId('voice-chat')).toHaveCount(0);
  });
}
