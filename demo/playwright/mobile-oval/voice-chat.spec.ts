import { expect, test, type Page } from '@playwright/test';
import { fixture, mockTable } from './fixture';

async function openVoice(page: Page, russian = false) {
  await page.getByRole('button', { name: russian ? 'Голос' : 'Voice', exact: true }).click();
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 800, height: 1138 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
  const mobile = viewport.width < 761;
  const tableId = mobile ? 'mobile-table' : 'desktop-table';

  test(`voice chat is absent when every opponent is a bot (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const state = fixture(7, false);
    const botsOnly = {
      ...state,
      voiceEnabled: true,
      players: state.players.map(player => ({ ...player, isBot: player.id !== state.playerId })),
    };
    await mockTable(page, botsOnly);
    await expect(page.getByTestId(tableId)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Voice', exact: true })).toHaveCount(0);
    await expect(page.locator('#voice-tab')).toHaveCount(0);
    await expect(page.locator('#voice-panel')).toHaveCount(0);
    await expect(page.getByTestId('voice-chat')).toHaveCount(0);
  });

  for (const language of ['en', 'ru']) {
    test(`voice is accessible from the main table (${viewport.width}px, ${language})`, async ({ page }) => {
      const russian = false;
      await page.setViewportSize(viewport);
      await page.addInitScript(language => {
        localStorage.setItem('omaha-language', language);
        localStorage.setItem('omaha-mobile-language', language);
      }, language);
      const state = { ...fixture(7, false), commentary: { enabled: true, voiceEnabled: true } };
      await mockTable(page, state);
      await expect(page.getByTestId(tableId)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole('button', { name: 'Voice', exact: true })).toBeInViewport();
      await expect(page.getByTestId('commentator').filter({ visible: true })).toBeInViewport();
      await openVoice(page, russian);
      await expect(page.getByRole('tabpanel', { name: russian ? 'ГОЛОС' : 'VOICE', exact: true }))
        .toContainText(russian ? 'Голосовой чат сейчас недоступен.' : 'Voice chat is currently unavailable.');
      await page.getByRole('tab', { name: russian ? 'СТОЛ' : 'TABLE', exact: true }).click();
      await expect(page.getByTestId(tableId)).toBeVisible();
      await expect(page.getByRole('button', { name: russian ? 'Колл 20' : 'Call 20', exact: true })).toBeEnabled();
    });
  }

  test(`voice stays connected when returning to the main table (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    // Exercise the real VoiceChat UI with a deterministic room, without a LiveKit server or microphone.
    await page.route('**/node_modules/.vite/deps/livekit-client.js*', route => route.fulfill({
      contentType: 'application/javascript',
      body: `
        export const RoomEvent = {};
        export const Track = { Kind: { Audio: 'audio' } };
        export class Room {
          remoteParticipants = new Map();
          localParticipant = {
            isMicrophoneEnabled: false,
            async setMicrophoneEnabled(enabled) { this.isMicrophoneEnabled = enabled; },
          };
          on() {}
          removeAllListeners() {}
          async connect() {}
          async startAudio() {}
          async disconnect() {}
        }
      `,
    }));
    const tokenRequests: unknown[] = [];
    await page.route('**/api/voice/token', route => {
      tokenRequests.push(route.request().postDataJSON());
      return route.fulfill({ json: { serverUrl: 'wss://voice.example.test', token: 'voice-token' } });
    });
    const initial = fixture(7, false);
    const state = {
      ...initial,
      voiceEnabled: true,
      players: initial.players.map((player, index) => ({ ...player, isBot: index > 1 })),
    };
    await mockTable(page, state);
    await openVoice(page);
    await page.getByRole('button', { name: 'Join voice', exact: true }).click();
    await expect(page.getByTestId('voice-chat')).toContainText('Connected');
    expect(tokenRequests).toEqual([{ handId: 'mobile-fixture', playerId: 'P1', token: 'token' }]);
    await page.getByRole('button', { name: 'Mic off', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Mic on', exact: true })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('tab', { name: 'TABLE', exact: true }).click();
    await expect(page.getByTestId(tableId)).toBeVisible();
    await expect(page.getByTestId('voice-chat')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Call 20', exact: true })).toBeEnabled();
    await openVoice(page);
    await expect(page.getByTestId('voice-chat')).toContainText('Connected');
    await expect(page.getByRole('button', { name: 'Mic on', exact: true })).toHaveAttribute('aria-pressed', 'true');
    expect(tokenRequests).toHaveLength(1);
    await page.getByRole('button', { name: 'Mic on', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Mic off', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Leave', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Join voice', exact: true })).toBeEnabled();
  });
}
