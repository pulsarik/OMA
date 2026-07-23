import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import HandStore from './handStore';
import { botMove } from './bot';
import {
  PlayerMove,
  MAX_RAISES_PER_STREET,
  POT_COINS,
  dealHand,
  dealHandFromCode,
  evaluateOmahaHiLo,
  evaluatePlayerCombo,
  nextPartyHand,
  normalizeHand,
  recordPlayerMove,
  replayHandLayout,
  stacksAfterPayout,
  visibleCommunity,
} from './game';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const store = new HandStore(process.env.DATA_FILE || path.join(process.cwd(), 'data', 'hands.sqlite'));
const continuationLocks = new Map<string, Promise<any>>();
const botTurnTimers = new Map<string, ReturnType<typeof setTimeout>>();
const BOT_THINK_MS = Math.max(0, Number(process.env.BOT_THINK_MS) || 1000);
const staticDir = [
  process.env.STATIC_DIR,
  path.resolve(process.cwd(), 'demo/client/dist'),
  path.resolve(__dirname, '../../demo/client/dist'),
].find((candidate): candidate is string => Boolean(candidate && fs.existsSync(candidate)));

type BuildInfo = {
  commit?: string;
  buildTimeGmt?: string;
};

function formatGmt(date: Date) {
  return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' GMT');
}

function readBuildInfo(): BuildInfo {
  const file = path.resolve(__dirname, '../build-info.json');
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

const buildInfo = readBuildInfo();
const commitSha = process.env.RENDER_GIT_COMMIT || process.env.COMMIT_SHA || buildInfo.commit || 'dev';
const buildTimeGmt = process.env.BUILD_TIME_GMT || buildInfo.buildTimeGmt || formatGmt(new Date());

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

if (staticDir) {
  app.use(express.static(staticDir));
}

function scheduleBotTurns(handId: string) {
  if (botTurnTimers.has(handId)) return;

  const timer = setTimeout(async () => {
    let shouldScheduleNext = false;
    try {
      const hand = await store.getHand(handId);
      if (!hand) return;
      normalizeHand(hand);
      if (hand.stage === 'showdown') {
        await store.updateHand(hand);
        broadcastHandUpdated(hand);
        return;
      }

      const current = hand.players.find((player: any) => player.id === hand.currentPlayerId);
      if (!current?.isBot || current.folded || current.stack <= 0) return;

      const decision = botMove(hand, current);
      recordPlayerMove(hand, current.id, decision.move, decision.amount);
      await store.updateHand(hand);
      broadcastHandUpdated(hand);
      shouldScheduleNext = hand.stage !== 'showdown';
    } catch (error) {
      console.error('bot turn failed', error);
      shouldScheduleNext = true;
    } finally {
      if (botTurnTimers.get(handId) === timer) {
        botTurnTimers.delete(handId);
      }
      if (shouldScheduleNext) scheduleBotTurns(handId);
    }
  }, BOT_THINK_MS);

  botTurnTimers.set(handId, timer);
}

function publicHandState(hand: any) {
  normalizeHand(hand);
  return {
    id: hand.id,
    partyId: hand.partyId,
    partyCode: hand.partyCode,
    handCode: hand.handCode,
    dealCode: hand.dealCode,
    handNumber: hand.handNumber,
    revision: hand.revision ?? 0,
    replayOfHandId: hand.replayOfHandId,
    potCoins: hand.potCoins ?? POT_COINS,
    currentBet: hand.currentBet ?? 0,
    roundBets: hand.roundBets ?? {},
    raiseCount: hand.raiseCount ?? 0,
    maxRaises: MAX_RAISES_PER_STREET,
    blinds: hand.blinds,
    stage: hand.stage ?? 'showdown',
    currentPlayerId: hand.currentPlayerId,
    community: visibleCommunity(hand),
    players: hand.players.map((p: any) => ({
      id: p.id,
      name: p.name,
      isBot: Boolean(p.isBot),
      stack: p.stack,
      folded: Boolean(p.folded),
      public: true,
    })),
    revealVotes: hand.revealVotes ?? [],
    cardsRevealed: Boolean(hand.cardsRevealed),
    nextHandId: hand.nextHandId,
    nextReplayHandId: hand.nextReplayHandId,
    result: hand.cardsRevealed ? evaluateOmahaHiLo(hand) : undefined,
    actions: hand.actions ?? [],
  };
}

function playerLinks(hand: any) {
  return hand.players.map((p: any) => ({
    id: p.id,
    name: p.name,
    isBot: Boolean(p.isBot),
    url: `/player/${hand.id}/${p.id}/${p.token}`,
  }));
}

function showdownSummary(hand: any) {
  if (hand.stage !== 'showdown') return undefined;

  const result = evaluateOmahaHiLo(hand);
  if (!result) return undefined;

  return {
    potCoins: result.potCoins,
    highWinners: result.highWinners,
    lowWinners: result.lowWinners,
    noLow: result.noLow,
    points: result.points,
  };
}

async function partyScore(hand: any) {
  normalizeHand(hand);
  const partyHands = await store.listHandsByParty(hand.partyId);
  const hands = partyHands
    .map((partyHand: any) => normalizeHand(partyHand))
    .sort((a: any, b: any) => (a.handNumber ?? 1) - (b.handNumber ?? 1) || (a.created ?? 0) - (b.created ?? 0));

  const latestHand = hands[hands.length - 1] ?? hand;
  const totals = stacksAfterPayout(latestHand);

  return {
    partyId: hand.partyId,
    partyCode: hand.partyCode,
    hands: hands.map((partyHand: any) => ({
      id: partyHand.id,
      handCode: partyHand.handCode,
      handNumber: partyHand.handNumber,
      stage: partyHand.stage,
      replayOfHandId: partyHand.replayOfHandId,
      points: partyHand.stage === 'showdown' ? evaluateOmahaHiLo(partyHand)?.points ?? [] : [],
    })),
    totals: [...totals.entries()].map(([id, total]) => ({ id, total })),
  };
}

async function nextPlayerLink(hand: any, player: any) {
  const nextId = continuationHandId(hand);
  if (!nextId) return undefined;

  const nextHand = await store.getHand(nextId);
  const nextPlayer = nextHand?.players.find((candidate: any) => candidate.id === player.id);
  if (!nextHand || !nextPlayer) return undefined;

  return {
    id: nextPlayer.id,
    handCode: nextHand.handCode,
    replayOfHandId: nextHand.replayOfHandId,
    url: `/player/${nextHand.id}/${nextPlayer.id}/${nextPlayer.token}`,
  };
}

async function playerState(hand: any, player: any) {
  normalizeHand(hand);
  const community = visibleCommunity(hand);
  return {
    handId: hand.id,
    partyId: hand.partyId,
    partyCode: hand.partyCode,
    handCode: hand.handCode,
    dealCode: hand.dealCode,
    handNumber: hand.handNumber,
    revision: hand.revision ?? 0,
    replayOfHandId: hand.replayOfHandId,
    playerId: player.id,
    playerName: player.name,
    isBot: Boolean(player.isBot),
    stack: player.stack,
    potCoins: hand.potCoins ?? POT_COINS,
    currentBet: hand.currentBet ?? 0,
    roundBets: hand.roundBets ?? {},
    raiseCount: hand.raiseCount ?? 0,
    maxRaises: MAX_RAISES_PER_STREET,
    blinds: hand.blinds,
    hole: player.hole,
    folded: Boolean(player.folded),
    players: hand.players.map((p: any) => ({
      id: p.id,
      name: p.name,
      isBot: Boolean(p.isBot),
      stack: p.stack,
      folded: Boolean(p.folded),
      cardCount: p.hole.length,
      hole: hand.cardsRevealed ? p.hole : undefined,
    })),
    stage: hand.stage ?? 'showdown',
    currentPlayerId: hand.currentPlayerId,
    revealVotes: hand.revealVotes ?? [],
    cardsRevealed: Boolean(hand.cardsRevealed),
    nextHandId: hand.nextHandId,
    nextReplayHandId: hand.nextReplayHandId,
    nextPlayerLink: await nextPlayerLink(hand, player),
    showdownSummary: showdownSummary(hand),
    partyScore: await partyScore(hand),
    result: hand.cardsRevealed ? evaluateOmahaHiLo(hand) : undefined,
    currentCombo: evaluatePlayerCombo(player.hole, community),
    community,
    actions: hand.actions ?? [],
    created: hand.created,
  };
}

function broadcastHandUpdated(hand: any) {
  const publicState = publicHandState(hand);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify({ type: 'hand_updated', data: publicState }));
    }
  });
}

async function createAndSendDeal(ws: WebSocket, players: number, playerNames: string[] = [], playerBots: boolean[] = []) {
  const hand = dealHand(players, undefined, playerNames, playerBots);
  await store.saveHand(hand);
  sendDeal(ws, hand);
  broadcastPublicDeal(ws, hand);
  scheduleBotTurns(hand.id);

  return hand;
}

function sendDeal(ws: WebSocket, hand: any) {
  const publicState = publicHandState(hand);

  ws.send(JSON.stringify({
    type: 'hand_dealt',
    data: {
      ...publicState,
      playerLinks: playerLinks(hand),
    },
  }));
}

function broadcastPublicDeal(sender: WebSocket, hand: any) {
  const publicState = publicHandState(hand);
  wss.clients.forEach(c => {
    if (c !== sender && c.readyState === WebSocket.OPEN) {
      c.send(JSON.stringify({ type: 'hand_dealt', data: publicState }));
    }
  });
}

function continuationHandId(hand: any) {
  return hand.nextHandId ?? hand.nextReplayHandId;
}

async function getOrCreateContinuationDeal(hand: any, fallbackPlayers: number, mode: 'new' | 'replay') {
  if (continuationLocks.has(hand.id)) {
    return continuationLocks.get(hand.id);
  }

  const pending = (async () => {
    const latestHand = await store.getHand(hand.id) ?? hand;
    normalizeHand(latestHand);

    const existingId = continuationHandId(latestHand);
    if (existingId) {
      const existingHand = await store.getHand(existingId);
      if (existingHand) return existingHand;
    }

    if (mode === 'new') {
      const remainingPlayers = [...stacksAfterPayout(latestHand).values()].filter(stack => stack > 0);
      if (remainingPlayers.length <= 1) {
        throw new Error('tournament is complete');
      }
    }

    const nextHand = mode === 'replay' && latestHand.players?.length
      ? replayHandLayout(latestHand)
      : nextPartyHand(latestHand.players?.length ? latestHand : dealHand(fallbackPlayers));
    await store.saveHand(nextHand);
    latestHand.nextHandId = nextHand.id;
    if (mode === 'replay') {
      latestHand.nextReplayHandId = nextHand.id;
    }
    latestHand.revision = (latestHand.revision ?? 0) + 1;
    await store.updateHand(latestHand);

    return nextHand;
  })();

  continuationLocks.set(hand.id, pending);

  try {
    return await pending;
  } finally {
    continuationLocks.delete(hand.id);
  }
}

async function findHandByQuery(query: string) {
  const text = query.trim().toUpperCase();
  if (!text) return null;

  const hands = await store.listAllHands();
  const savedHand = hands
    .map((hand: any) => normalizeHand(hand))
    .sort((a: any, b: any) => (b.created ?? 0) - (a.created ?? 0))
    .find((hand: any) => (
      hand.id.toUpperCase() === text
      || hand.handCode?.toUpperCase() === text
      || hand.dealCode?.toUpperCase() === text
      || hand.handNumber === Number(text)
    ));

  if (savedHand) return savedHand;

  try {
    const restoredHand = dealHandFromCode(text);
    await store.saveHand(restoredHand);
    return restoredHand;
  } catch {
    return null;
  }
}

app.get('/admin/hands', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const [hands, total] = await Promise.all([
    store.listHands(limit, offset),
    store.countHands(),
  ]);

  res.json({ hands, total, limit, offset });
});
app.get('/admin/hands/:id', async (req, res) => {
  const h = await store.getHand(req.params.id);
  if (!h) return res.status(404).send('Not found');
  normalizeHand(h);
  if (h.cardsRevealed) h.result = evaluateOmahaHiLo(h);
  res.json(h);
});
app.get('/api/version', (req, res) => {
  res.json({
    commit: commitSha,
    shortCommit: commitSha === 'dev' ? 'dev' : commitSha.slice(0, 7),
    buildTimeGmt,
  });
});
app.get('/api/player/:handId/:playerId/:token', async (req, res) => {
  const hand = await store.getHand(req.params.handId);
  if (!hand) return res.status(404).send('Not found');

  const player = hand.players.find((p: any) => p.id === req.params.playerId && p.token === req.params.token);
  if (!player) return res.status(403).send('Forbidden');

  res.json(await playerState(hand, player));
});

if (staticDir) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin/')) {
      next();
      return;
    }

    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

wss.on('connection', (ws, req) => {
  // simple protocol: client sends JSON {action: "join", tableId, role: "player"|"admin"}
  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.action === 'deal') {
        await createAndSendDeal(
          ws,
          msg.players || 2,
          Array.isArray(msg.playerNames) ? msg.playerNames : [],
          Array.isArray(msg.playerBots) ? msg.playerBots : [],
        );
      } else if (msg.action === 'new_deal') {
        const hand = msg.handId ? await store.getHand(msg.handId) : null;
        if (hand) {
          const nextHand = await getOrCreateContinuationDeal(hand, msg.players || 2, 'new');
          const updatedPreviousHand = await store.getHand(hand.id);
          if (updatedPreviousHand) broadcastHandUpdated(updatedPreviousHand);
          sendDeal(ws, nextHand);
          broadcastPublicDeal(ws, nextHand);
          scheduleBotTurns(nextHand.id);
        } else {
          await createAndSendDeal(
            ws,
            msg.players || 2,
            Array.isArray(msg.playerNames) ? msg.playerNames : [],
            Array.isArray(msg.playerBots) ? msg.playerBots : [],
          );
        }
      } else if (msg.action === 'replay_deal') {
        const hand = msg.handId
          ? await store.getHand(msg.handId)
          : typeof msg.handQuery === 'string'
            ? await findHandByQuery(msg.handQuery)
            : null;
        if (hand) {
          const replayHand = await getOrCreateContinuationDeal(hand, msg.players || 2, 'replay');
          const updatedPreviousHand = await store.getHand(hand.id);
          if (updatedPreviousHand) broadcastHandUpdated(updatedPreviousHand);
          sendDeal(ws, replayHand);
          broadcastPublicDeal(ws, replayHand);
          scheduleBotTurns(replayHand.id);
        } else {
          throw new Error('hand not found');
        }
      } else if (msg.action === 'list') {
        ws.send(JSON.stringify({ type: 'hands_list', data: await store.listHands() }));
      } else if (msg.action === 'join_player') {
        const hand = await store.getHand(msg.handId);
        if (!hand) throw new Error('hand not found');
        normalizeHand(hand);
        const player = hand.players.find((p: any) => p.id === msg.playerId && p.token === msg.token);
        if (!player) throw new Error('player not found');
        ws.send(JSON.stringify({ type: 'player_state', data: await playerState(hand, player) }));
        // Bot timers live in memory and disappear when the server restarts. A
        // player reconnecting to an unfinished hand must also wake the bot up.
        scheduleBotTurns(hand.id);
      } else if (msg.action === 'player_move') {
        const hand = await store.getHand(msg.handId);
        if (!hand) throw new Error('hand not found');
        normalizeHand(hand);
        const player = hand.players.find((p: any) => p.id === msg.playerId && p.token === msg.token);
        if (!player) throw new Error('player not found');
        recordPlayerMove(hand, player.id, msg.move as PlayerMove, msg.amount);
        await store.updateHand(hand);
        ws.send(JSON.stringify({ type: 'player_state', data: await playerState(hand, player) }));
        broadcastHandUpdated(hand);
        scheduleBotTurns(hand.id);
      } else if (msg.action === 'replay' && msg.id) {
        const h = await store.getHand(msg.id);
        if (h) ws.send(JSON.stringify({ type: 'hand_full', data: h }));
        else ws.send(JSON.stringify({ type: 'error', message: 'not found' }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: e instanceof Error ? e.message : 'invalid' }));
    }
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
