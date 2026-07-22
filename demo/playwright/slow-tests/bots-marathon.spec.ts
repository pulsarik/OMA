import { APIRequestContext, expect, Page, test } from '@playwright/test';

const DEALS_TO_PLAY = 20;
const BOT_COUNT = 7;
const NO_PROGRESS_TIMEOUT_MS = 5_000;
const HAND_TIMEOUT_MS = 30_000;
const BOT_NAMES = ['Alex_bot', 'Maria_bot', 'Ivan_bot', 'Anna_bot', 'Dmitry_bot', 'Elena_bot', 'Pavel_bot'];

type DealResponse = {
  id: string;
  handNumber: number;
  playerLinks: Array<{ id: string; url: string }>;
};

async function sendDealCommand(page: Page, payload: Record<string, unknown>) {
  return page.evaluate((message) => new Promise<DealResponse>((resolve, reject) => {
    const socket = new WebSocket('ws://localhost:4000');
    const timeout = window.setTimeout(() => {
      socket.close();
      reject(new Error('websocket command timed out'));
    }, 10_000);

    socket.onopen = () => socket.send(JSON.stringify(message));
    socket.onerror = () => reject(new Error('websocket connection failed'));
    socket.onmessage = (event) => {
      const response = JSON.parse(event.data);
      if (response.type === 'hand_dealt') {
        window.clearTimeout(timeout);
        socket.close();
        resolve({
          id: response.data.id,
          handNumber: response.data.handNumber,
          playerLinks: response.data.playerLinks,
        });
      } else if (response.type === 'error') {
        window.clearTimeout(timeout);
        socket.close();
        reject(new Error(response.message));
      }
    };
  }), payload);
}

async function waitForShowdown(request: APIRequestContext, deal: DealResponse, sequence: number) {
  const startedAt = Date.now();
  let lastProgressAt = startedAt;
  let lastSignature = '';
  let lastState: Record<string, unknown> | undefined;

  while (Date.now() - startedAt < HAND_TIMEOUT_MS) {
    const response = await request.get(`http://localhost:4000/admin/hands/${deal.id}`);
    expect(response.ok(), `deal ${sequence}: state endpoint failed`).toBeTruthy();
    const state = await response.json();
    lastState = state;
    const signature = JSON.stringify({
      stage: state.stage,
      currentPlayerId: state.currentPlayerId,
      actions: state.actions?.length ?? 0,
      potCoins: state.potCoins,
    });

    if (signature !== lastSignature) {
      lastSignature = signature;
      lastProgressAt = Date.now();
    } else if (Date.now() - lastProgressAt > NO_PROGRESS_TIMEOUT_MS) {
      throw new Error(
        `deal ${sequence} stopped making progress for ${NO_PROGRESS_TIMEOUT_MS} ms: ${signature}`,
      );
    }

    if (state.stage === 'showdown') {
      expect(state.currentPlayerId, `deal ${sequence}: turn remains assigned at showdown`).toBeUndefined();
      expect(state.players.every((player: { isBot?: boolean }) => player.isBot)).toBeTruthy();
      expect(state.actions.length, `deal ${sequence}: no bot made a move`).toBeGreaterThan(0);
      return state;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`deal ${sequence} exceeded ${HAND_TIMEOUT_MS} ms: ${JSON.stringify(lastState)}`);
}

async function createBotParty(page: Page) {
  return sendDealCommand(page, {
    action: 'deal',
    players: BOT_COUNT,
    playerNames: BOT_NAMES,
    playerBots: Array.from({ length: BOT_COUNT }, () => true),
  });
}

test('seven bots and seven observing clients complete 20 deals without getting stuck', async ({
  page,
  request,
  context,
}) => {
  await page.goto('/');
  let deal = await createBotParty(page);
  const observers = await Promise.all(
    Array.from({ length: BOT_COUNT }, () => context.newPage()),
  );

  for (let sequence = 1; sequence <= DEALS_TO_PLAY; sequence += 1) {
    await test.step(`deal ${sequence}/${DEALS_TO_PLAY}`, async () => {
      await Promise.all(observers.map((observer, index) => observer.goto(deal.playerLinks[index].url)));
      await waitForShowdown(request, deal, sequence);
      await Promise.all(observers.map(async (observer, index) => {
        await expect(
          observer.getByText('showdown', { exact: true }).first(),
          `deal ${sequence}: observer P${index + 1} did not converge to showdown`,
        ).toBeVisible();
      }));
    });

    if (sequence === DEALS_TO_PLAY) break;

    try {
      deal = await sendDealCommand(page, { action: 'new_deal', handId: deal.id });
    } catch (error) {
      // A completed tournament is a valid terminal state. Start another all-bot
      // party so the watchdog still exercises exactly 20 full deals.
      if (!(error instanceof Error) || !error.message.includes('tournament is complete')) throw error;
      deal = await createBotParty(page);
    }
  }
});
