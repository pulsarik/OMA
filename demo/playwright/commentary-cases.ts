import { expect, Page, test, WebSocketRoute } from '@playwright/test';
import { fixture } from './mobile-oval/fixture';

async function table(page: Page, mode: string | null = 'text', blocked = false) {
  await page.addInitScript(({ mode, blocked }) => {
    if (mode !== null && !localStorage.getItem('omaha-commentary')) localStorage.setItem('omaha-commentary', JSON.stringify({ mode, locale: 'ru', volume: 0.5 }));
    const stats = { plays: 0, pauses: 0, volume: 0, blocked, finish: () => {} };
    (window as any).commentaryAudio = stats;
    (window as any).Audio = class {
      onended: (() => void) | null = null; onerror = null; volume = 0;
      constructor(public src: string) { stats.finish = () => this.onended?.(); }
      play() {
        stats.plays++; stats.volume = this.volume;
        if (stats.blocked) { stats.blocked = false; return Promise.reject(new Error('NotAllowedError')); }
        return Promise.resolve();
      }
      pause() { stats.pauses++; }
    };
  }, { mode, blocked });
  let state: any = { ...fixture(3, false), voiceEnabled: true, commentary: { enabled: true, voiceEnabled: true } };
  let socket: WebSocketRoute | undefined;
  const subscriptions: any[] = [];
  const newDeals: any[] = [];
  await page.route('**/api/player/**', r => r.fulfill({ json: state }));
  await page.routeWebSocket(/ws:\/\/localhost:(4000|4100)\//, ws => {
    socket = ws;
    ws.onMessage(raw => {
      const message = JSON.parse(String(raw));
      if (message.action === 'join_player') ws.send(JSON.stringify({ type: 'player_state', data: state }));
      if (message.action === 'commentary_preferences') subscriptions.push(message.preference);
      if (message.action === 'new_deal') newDeals.push(message);
    });
  });
  await page.goto('/player/mobile-fixture/P1/token');
  await expect(page.getByTestId('commentator')).toBeVisible();
  await expect.poll(() => subscriptions.length).toBeGreaterThan(0);
  return {
    subscriptions,
    newDeals,
    advance(stage: string, revision: number) { state = { ...state, stage, revision }; socket!.send(JSON.stringify({ type: 'player_state', data: state })); },
    complete() { state = { ...state, stage: 'showdown', revision: 2 }; socket!.send(JSON.stringify({ type: 'player_state', data: state })); },
    link() { state = { ...state, nextHandId: 'next-fixture', nextPlayerLink: { id: 'P1', url: '/player/next-fixture/P1/token' } }; socket!.send(JSON.stringify({ type: 'player_state', data: state })); },
    deal() { socket!.send(JSON.stringify({ type: 'hand_dealt', data: { playerLinks: [
      { id: 'P1', url: '/player/next-fixture/P1/token' },
    ] } })); },
    send(overrides: Record<string, unknown> = {}) {
      const now = Date.now();
      socket!.send(JSON.stringify({ type: 'commentary_ready', data: {
        id: 'event-1', handId: state.handId, partyId: state.partyId, revision: 2,
        locale: 'ru', text: 'За столом новый лидер.', serverNow: now, expiresAt: now + 12_000,
        audioUrl: `/api/commentary/audio/abc/${'a'.repeat(48)}`, ...overrides,
      } }));
    },
    close() { socket!.close(); },
  };
}

export function commentaryCases() {
  test('a two-line result keeps its line break in captions', async ({ page }) => {
    const t = await table(page);
    t.complete();
    t.send({ text: 'Первую строку сказал стол.\nВторая завершила рассказ.' });
    const caption = page.getByTestId('commentary-caption');
    await expect(caption).toHaveText('Первую строку сказал стол.\nВторая завершила рассказ.');
    await expect(caption).toHaveCSS('white-space', 'pre-line');
  });

  for (const width of [390, 1280]) {
    test(`next deal keeps speaking through creation at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const t = await table(page, 'voice');
      t.complete();
      t.send();
      const next = page.getByRole('button', { name: /^(Next deal|New deal)$/ });
      await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
      await expect(next).toBeEnabled();
      await next.click();
      await expect.poll(() => t.newDeals.length).toBe(1);
      await expect(page.getByRole('button', { name: /^(Dealing|Creating)/ })).toBeDisabled();
      t.deal();
      await expect(next).toBeEnabled();
      await expect(page).toHaveURL(/\/player\/mobile-fixture\/P1\/token$/);
      expect(await page.evaluate(() => (window as any).commentaryAudio.pauses)).toBe(0);
      await page.evaluate(() => (window as any).commentaryAudio.finish());
      await expect(page).toHaveURL(/\/player\/next-fixture\/P1\/token$/);
    });
  }

  test('opening an existing next deal lets the spoken result finish', async ({ page }) => {
    const t = await table(page, 'voice');
    t.complete();
    t.send();
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
    t.link();
    const next = page.getByRole('button', { name: /^(Next deal|New deal)$/ });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(page).toHaveURL(/\/player\/mobile-fixture\/P1\/token$/);
    expect(await page.evaluate(() => (window as any).commentaryAudio.pauses)).toBe(0);
    await page.evaluate(() => (window as any).commentaryAudio.finish());
    await expect(page).toHaveURL(/\/player\/next-fixture\/P1\/token$/);
    expect(t.newDeals).toHaveLength(0);
  });

  test('live betting commentary waits for the action and stops when the street changes', async ({ page }) => {
    const t = await table(page, 'voice');
    t.advance('flop', 1);
    t.send({ stage: 'flop', text: 'Анна отвечает повышением на повышение.' });
    await expect(page.getByTestId('commentary-caption')).toHaveCount(0);
    t.advance('flop', 2);
    await expect(page.getByTestId('commentary-caption')).toHaveText('Анна отвечает повышением на повышение.');
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
    const pauses = await page.evaluate(() => (window as any).commentaryAudio.pauses);
    t.advance('turn', 3);
    await expect(page.getByTestId('commentary-caption')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.pauses)).toBeGreaterThan(pauses);
    t.send({ id: 'late-action', stage: 'flop', text: 'Эта ставка уже устарела.' });
    await page.waitForTimeout(400);
    await expect(page.getByTestId('commentary-caption')).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
    t.complete();
    await expect(page.getByTestId('commentary-caption')).toHaveCount(0);
  });

  async function settings(page: Page) {
    const tab = page.getByRole('tab', { name: 'SETTINGS', exact: true });
    if (await tab.isVisible()) await tab.click();
    else {
      const menu = page.getByLabel('Table menu', { exact: true }).filter({ hasText: '☰' });
      if (await menu.isVisible()) await menu.click();
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
    }
  }

  test('voice defaults on, settings are separate and preferences survive reload', async ({ page }) => {
    const t = await table(page, null);
    await expect.poll(() => t.subscriptions.at(-1)?.mode).toBe('voice');
    await expect(page.getByTestId('commentator')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('slider')).toHaveCount(0);
    await settings(page);
    await page.getByLabel('Commentary language').selectOption('ru');
    await page.getByLabel('Громкость комментатора').fill('0.25');
    await expect(page.locator('.commentator-volume output')).toHaveText('25%');
    await page.getByTestId('commentator').click();
    await expect.poll(() => t.subscriptions.at(-1)?.mode).toBe('off');
    await page.reload();
    await expect(page.getByTestId('commentator')).toHaveAttribute('aria-pressed', 'false');
    await settings(page);
    await expect(page.getByLabel('Язык комментатора')).toHaveValue('ru');
    await expect(page.getByLabel('Громкость комментатора')).toHaveValue('0.25');
    await page.getByTestId('commentator').click();
    await expect.poll(() => t.subscriptions.at(-1)?.mode).toBe('voice');
    t.complete(); t.send();
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
    expect(await page.evaluate(() => (window as any).commentaryAudio.volume)).toBe(0.25);
  });

  test('human voice delays commentary and interrupts playback without restarting it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.route('**/node_modules/.vite/deps/livekit-client.js*', route => route.fulfill({
      contentType: 'application/javascript', body: `
        export const RoomEvent = { ActiveSpeakersChanged: 'speakers' };
        export const Track = { Kind: { Audio: 'audio' } };
        export class Room {
          remoteParticipants = new Map();
          localParticipant = { isMicrophoneEnabled: false, async setMicrophoneEnabled() {} };
          on(event, callback) { if (event === 'speakers') window.emitVoiceSpeakers = callback; }
          removeAllListeners() {}
          async connect() {}
          async startAudio() {}
          async disconnect() {}
        }
      `,
    }));
    await page.route('**/api/voice/token', route => route.fulfill({
      json: { serverUrl: 'wss://voice.example.test', token: 'test' },
    }));
    const t = await table(page, 'voice');
    const voiceTab = page.getByRole('tab', { name: 'VOICE', exact: true });
    if (await voiceTab.isVisible()) await voiceTab.click();
    else await page.getByRole('button', { name: 'Voice', exact: true }).click();
    await page.getByRole('button', { name: 'Join voice', exact: true }).click();
    await expect(page.getByTestId('voice-chat')).toContainText('Connected');
    await page.getByRole('tab', { name: 'TABLE', exact: true }).click();
    await page.evaluate(() => (window as any).emitVoiceSpeakers([{ name: 'Ivan' }]));
    t.complete(); t.send();
    await expect(page.getByTestId('commentary-caption')).toBeVisible();
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(0);
    await page.evaluate(() => (window as any).emitVoiceSpeakers([]));
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
    await page.evaluate(() => (window as any).emitVoiceSpeakers([{ name: 'Ivan' }]));
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.pauses)).toBeGreaterThan(0);
    await page.evaluate(() => (window as any).emitVoiceSpeakers([]));
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
  });

  for (const width of [320, 390, 761, 1280]) {
    test(`commentary waits for result, supports language and off settings (${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const t = await table(page);
      await expect(page.getByTestId('commentator')).toHaveCount(1);
      const toggle = await page.getByTestId('commentator').boundingBox();
      expect(toggle!.x).toBeGreaterThan(width / 2);
      expect(toggle!.y).toBeLessThan(80);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: test.info().outputPath(`commentator-${width}.png`) });
      t.send();
      await expect(page.getByTestId('commentary-caption')).toHaveCount(0);
      t.complete();
      await expect(page.getByTestId('commentary-caption')).toHaveText('За столом новый лидер.');
      expect(await page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(0);
      t.send({ text: 'Это повтор.' });
      await expect(page.getByTestId('commentary-caption')).toHaveText('За столом новый лидер.');
      await page.getByTestId('commentator').click();
      await expect(page.getByTestId('commentary-caption')).toHaveCount(0);
      await expect.poll(() => t.subscriptions.at(-1)?.mode).toBe('off');
      await settings(page);
      await page.getByLabel('Язык комментатора').selectOption('en');
      await expect(page.getByTestId('commentator')).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(() => t.subscriptions.at(-1)?.locale).toBe('en');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }

  test('audio plays once, respects volume and stops immediately when disabled', async ({ page }) => {
    const t = await table(page, 'voice'); t.complete(); t.send();
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
    expect(await page.evaluate(() => (window as any).commentaryAudio.volume)).toBe(0.5);
    t.send();
    await page.getByTestId('commentator').click();
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.pauses)).toBeGreaterThan(0);
    expect(await page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
  });

  test('an on-time spoken sentence can finish after the event start deadline', async ({ page }) => {
    const t = await table(page, 'voice'); t.complete();
    const now = Date.now(); t.send({ serverNow: now, expiresAt: now + 1_500 });
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
    await page.waitForTimeout(1_600);
    await expect(page.getByTestId('commentary-caption')).toBeVisible();
    expect(await page.evaluate(() => (window as any).commentaryAudio.pauses)).toBe(0);
    await page.evaluate(() => (window as any).commentaryAudio.finish());
    await expect(page.getByTestId('commentary-caption')).toHaveCount(0);
  });

  test('blocked autoplay offers a working explicit play button; stale and foreign events are ignored', async ({ page }) => {
    const t = await table(page, 'voice', true); t.complete();
    t.send({ id: 'expired', expiresAt: Date.now() - 100 });
    t.send({ id: 'other', handId: 'another-hand' });
    await expect(page.getByTestId('commentary-caption')).toHaveCount(0);
    t.send();
    await page.getByRole('button', { name: 'Включить звук' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(2);
    await expect(page.getByRole('button', { name: 'Включить звук' })).toHaveCount(0);
  });

  test('reconnect does not replay a delivered event', async ({ page }) => {
    const t = await table(page, 'voice'); t.complete(); t.send();
    await expect.poll(() => page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
    const count = t.subscriptions.length;
    t.close();
    await expect.poll(() => t.subscriptions.length).toBeGreaterThan(count);
    t.send();
    expect(await page.evaluate(() => (window as any).commentaryAudio.plays)).toBe(1);
  });
}
