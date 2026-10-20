import { expect, Page, test, WebSocketRoute } from '@playwright/test';
import { fixture } from './mobile-oval/fixture';

async function soundTable(page: Page) {
  await page.addInitScript(() => {
    const stats = { tones: 0, rustles: 0 };
    (window as any).soundStats = stats;
    const toneStart = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (when = 0) { stats.tones++; toneStart.call(this, when); };
    const noiseStart = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when = 0) { stats.rustles++; noiseStart.call(this, when); };
  });
  let state: any = { ...fixture(3, false), currentPlayerId: 'P2', community: [], stage: 'preflop',
    actions: [{ playerId: 'P1', move: 'call', amount: 4, stage: 'preflop', at: 1 }] };
  let socket: WebSocketRoute;
  let joins = 0;
  await page.route('**/api/player/**', route => route.fulfill({ json: state }));
  await page.routeWebSocket(/ws:\/\/localhost:(4000|4100)\//, ws => {
    socket = ws;
    ws.onMessage(raw => {
      if (JSON.parse(String(raw)).action === 'join_player') {
        joins++;
        ws.send(JSON.stringify({ type: 'player_state', data: state }));
      }
    });
  });
  await page.goto('/player/mobile-fixture/P1/token');
  await expect.poll(() => joins).toBeGreaterThan(0);
  return {
    get state() { return state; },
    send(patch: Record<string, unknown>) {
      state = { ...state, revision: state.revision + 1, ...patch };
      socket.send(JSON.stringify({ type: 'player_state', data: state }));
    },
    async reconnect(patch: Record<string, unknown>) {
      state = { ...state, revision: state.revision + 1, ...patch };
      const before = joins;
      socket.close();
      await expect.poll(() => joins).toBeGreaterThan(before);
    },
  };
}

async function settings(page: Page) {
  const tab = page.getByRole('tab', { name: 'SETTINGS', exact: true });
  const menu = page.getByLabel('Table menu', { exact: true }).filter({ hasText: '☰' });
  const button = page.getByRole('button', { name: 'Settings', exact: true });
  await expect.poll(async () => await tab.isVisible() || await menu.isVisible() || await button.isVisible()).toBe(true);
  if (await tab.isVisible()) await tab.click();
  else {
    if (await menu.isVisible()) await menu.click();
    await button.click();
  }
  await expect(page.getByRole('heading', { name: 'Game sounds', exact: true })).toBeVisible();
}
const stats = (page: Page) => page.evaluate(() => ({ ...(window as any).soundStats }));
const resetStats = (page: Page) => page.evaluate(() => { Object.assign((window as any).soundStats, { tones: 0, rustles: 0 }); });

export function gameSoundCases() {
  test('confirmed game events sound once; reconnect and repeated snapshots stay silent', async ({ page }) => {
    const table = await soundTable(page);
    expect(await stats(page)).toEqual({ tones: 0, rustles: 0 });
    await settings(page); // A real gesture unlocks browser audio.
    await resetStats(page);
    table.send({ currentPlayerId: 'P1', actions: [...table.state.actions,
      { playerId: 'P2', move: 'raise', amount: 8, stage: 'preflop', at: 2 }] });
    await expect.poll(() => stats(page)).toEqual({ tones: 4, rustles: 0 });
    table.send({});
    table.send({ stage: 'flop', community: ['3c', '4d', '5h'] });
    await expect.poll(() => stats(page)).toEqual({ tones: 6, rustles: 1 });
    await table.reconnect({ stage: 'river', community: ['3c', '4d', '5h', 'Ks', 'Qc'], currentPlayerId: 'P2' });
    expect(await stats(page)).toEqual({ tones: 6, rustles: 1 });
    const result = fixture(3, true).result!;
    table.send({ stage: 'showdown', currentPlayerId: undefined, result, showdownSummary: result });
    await expect.poll(() => stats(page)).toEqual({ tones: 9, rustles: 1 });
    table.send({});
    await page.getByRole('heading', { name: 'Game sounds', exact: true }).click();
    expect(await stats(page)).toEqual({ tones: 9, rustles: 1 });
  });

  test('settings mute clicks and game effects immediately and persist after reload', async ({ page }) => {
    const table = await soundTable(page);
    await settings(page);
    const enabled = page.getByRole('checkbox', { name: 'Enable game sounds' });
    const volume = page.getByRole('slider', { name: /Game sound volume/ });
    await volume.fill('0.25');
    await expect(page.locator('.sound-settings output')).toHaveText('25%');
    await page.screenshot({ path: test.info().outputPath('sound-settings.png'), fullPage: true });
    await enabled.uncheck();
    await expect(volume).toBeDisabled();
    await resetStats(page);
    table.send({ currentPlayerId: 'P1', actions: [...table.state.actions,
      { playerId: 'P2', move: 'call', amount: 4, stage: 'preflop', at: 2 }] });
    await page.getByRole('tab', { name: 'TABLE', exact: true }).click();
    await settings(page);
    expect(await stats(page)).toEqual({ tones: 0, rustles: 0 });
    await page.reload();
    await settings(page);
    await expect(enabled).not.toBeChecked();
    await expect(volume).toHaveValue('0.25');
    expect(await stats(page)).toEqual({ tones: 0, rustles: 0 });
    await enabled.check();
    await resetStats(page);
    table.send({ stage: 'flop', community: ['3c', '4d', '5h'], currentPlayerId: 'P2' });
    await expect.poll(() => stats(page)).toEqual({ tones: 0, rustles: 1 });
    await volume.fill('0');
    table.send({ stage: 'turn', community: ['3c', '4d', '5h', 'Ks'], currentPlayerId: 'P1' });
    await page.getByRole('heading', { name: 'Game sounds', exact: true }).click();
    expect(await stats(page)).toEqual({ tones: 0, rustles: 1 });
  });
}
