import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { WebSocket, WebSocketServer } from 'ws';
import HandStore from './handStore';
import { botMove } from './bot';
import {
  PlayerMove,
  DEFAULT_BOT_NAMES,
  MAX_RAISES_PER_STREET,
  POT_COINS,
  currentPotBreakdown,
  STARTING_STACK,
  dealHand,
  dealHandFromCode,
  evaluateOmahaHiLo,
  evaluatePlayerCombo,
  nextPartyHand,
  netResultsAfterPayout,
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
const lobbyConnections = new Map<WebSocket, { lobbyId: string; memberId: string }>();
const playerConnections = new Map<WebSocket, {
  handId: string;
  partyId: string;
  playerId: string;
  visitId: number;
}>();
const lobbyLocks = new Map<string, Promise<any>>();
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

type LobbyMember = {
  id: string;
  token: string;
  name: string;
  isBot: boolean;
  joinedAt: number;
  playerId?: string;
};

type Lobby = {
  id: string;
  hostMemberId: string;
  maxPlayers: number;
  status: 'waiting' | 'started';
  members: LobbyMember[];
  handId?: string;
  created: number;
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    potBreakdown: currentPotBreakdown(hand),
    totalContributions: hand.totalContributions,
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
    sidePots: result.sidePots,
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

  const handScores = hands.map((partyHand: any, index: number) => {
    const replaySource = partyHand.replayOfHandId
      ? hands.find((candidate: any) => candidate.id === partyHand.replayOfHandId)
      : undefined;
    const startingStacks = replaySource
      ? new Map<string, number>(replaySource.players.map((player: any) => [player.id, player.stack]))
      : index > 0
        ? stacksAfterPayout(hands[index - 1])
        : new Map<string, number>(partyHand.players.map((player: any) => [player.id, STARTING_STACK]));
    const result = partyHand.stage === 'showdown' ? evaluateOmahaHiLo(partyHand) : undefined;
    return {
      id: partyHand.id,
      handCode: partyHand.handCode,
      handNumber: partyHand.handNumber,
      stage: partyHand.stage,
      replayOfHandId: partyHand.replayOfHandId,
      players: partyHand.players.map((player: any) => ({
        id: player.id,
        folded: Boolean(player.folded),
        participated: (startingStacks.get(player.id) ?? 0) > 0,
      })),
      points: result?.points ?? [],
      net: result ? netResultsAfterPayout(partyHand, startingStacks) : [],
    };
  });

  return {
    partyId: hand.partyId,
    partyCode: hand.partyCode,
    hands: handScores,
    totals: [...totals.entries()].map(([id, total]) => ({ id, total })),
  };
}

function clientIp(req: http.IncomingMessage) {
  const forwarded = req.headers['x-forwarded-for'];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return (value?.trim() || req.socket.remoteAddress || '').replace(/^::ffff:/, '').slice(0, 100);
}

function finiteClientNumber(value: unknown, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), max) : undefined;
}

function deviceType(userAgent: string) {
  if (/ipad|tablet|kindle|silk/i.test(userAgent)) return 'Tablet';
  if (/mobi|android|iphone|ipod/i.test(userAgent)) return 'Mobile';
  return 'Desktop';
}

async function recordPlayerConnection(
  ws: WebSocket,
  req: http.IncomingMessage,
  hand: any,
  player: any,
  client: any,
) {
  const current = playerConnections.get(ws);
  if (current?.handId === hand.id && current?.playerId === player.id) return current;

  const userAgent = (req.headers['user-agent'] || '').slice(0, 500);
  const visitId = await store.recordAnalyticsVisit({
    partyId: hand.partyId ?? hand.id,
    handId: hand.id,
    playerId: player.id,
    ip: clientIp(req),
    userAgent,
    deviceType: deviceType(userAgent),
    platform: typeof client?.platform === 'string' ? client.platform.slice(0, 100) : undefined,
    screenWidth: finiteClientNumber(client?.screenWidth, 20000),
    screenHeight: finiteClientNumber(client?.screenHeight, 20000),
    viewportWidth: finiteClientNumber(client?.viewportWidth, 20000),
    viewportHeight: finiteClientNumber(client?.viewportHeight, 20000),
    pixelRatio: finiteClientNumber(client?.pixelRatio, 20),
  });
  const connection = {
    handId: hand.id,
    partyId: hand.partyId ?? hand.id,
    playerId: player.id,
    visitId,
  };
  playerConnections.set(ws, connection);
  await store.recordAnalyticsActivity(connection.partyId);
  return connection;
}

async function recordBoundPlayerActivity(ws: WebSocket) {
  const connection = playerConnections.get(ws);
  if (!connection) throw new Error('join player first');
  const now = Date.now();
  await Promise.all([
    store.recordAnalyticsActivity(connection.partyId, now),
    store.touchAnalyticsVisit(connection.visitId, now),
  ]);
}

function diagnosticHandSnapshot(hand: any) {
  normalizeHand(hand);
  return {
    id: hand.id,
    partyId: hand.partyId,
    partyCode: hand.partyCode,
    handCode: hand.handCode,
    handNumber: hand.handNumber,
    revision: hand.revision ?? 0,
    replayOfHandId: hand.replayOfHandId,
    dealCode: hand.dealCode,
    dealSeed: hand.dealSeed,
    rngSeed: hand.rngSeed,
    players: hand.players.map((player: any) => ({
      id: player.id,
      name: player.name,
      isBot: Boolean(player.isBot),
      hole: player.hole,
      folded: Boolean(player.folded),
      stack: player.stack,
    })),
    community: hand.community,
    fullCommunity: hand.fullCommunity,
    stage: hand.stage,
    currentPlayerId: hand.currentPlayerId,
    currentBet: hand.currentBet,
    roundBets: hand.roundBets,
    totalContributions: hand.totalContributions,
    raiseCount: hand.raiseCount,
    blinds: hand.blinds,
    potCoins: hand.potCoins,
    revealVotes: hand.revealVotes,
    cardsRevealed: hand.cardsRevealed,
    actions: hand.actions,
    result: hand.stage === 'showdown' ? evaluateOmahaHiLo(hand) : undefined,
    created: hand.created,
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
    potBreakdown: currentPotBreakdown(hand),
    totalContributions: hand.totalContributions,
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

function lobbyState(lobby: Lobby) {
  return {
    id: lobby.id,
    hostMemberId: lobby.hostMemberId,
    maxPlayers: lobby.maxPlayers,
    status: lobby.status,
    handId: lobby.handId,
    members: lobby.members.map(member => ({
      id: member.id,
      name: member.name,
      isBot: member.isBot,
      isHost: member.id === lobby.hostMemberId,
    })),
  };
}

function lobbyName(value: unknown, fallback: string) {
  const name = typeof value === 'string' ? value.trim().slice(0, 30) : '';
  return name || fallback;
}

function nextLobbyBotName(lobby: Lobby) {
  const usedNames = new Set(lobby.members.map(member => member.name.replace(/_bot$/i, '').toLowerCase()));
  return DEFAULT_BOT_NAMES.find(name => !usedNames.has(name.toLowerCase()))
    ?? `Guest ${lobby.members.length + 1}`;
}

function lobbyBotName(lobby: Lobby, requestedName: unknown) {
  const name = lobbyName(requestedName, nextLobbyBotName(lobby));
  return name.toLowerCase().endsWith('_bot') ? name : `${name}_bot`;
}

function broadcastLobby(lobby: Lobby) {
  const message = JSON.stringify({ type: 'lobby_updated', data: lobbyState(lobby) });
  lobbyConnections.forEach((connection, client) => {
    if (
      connection.lobbyId === lobby.id
      && client.readyState === WebSocket.OPEN
    ) {
      client.send(message);
    }
  });
}

function bindLobbyClient(ws: WebSocket, lobby: Lobby, member: LobbyMember) {
  lobbyConnections.set(ws, { lobbyId: lobby.id, memberId: member.id });
}

async function withLobbyLock<T>(lobbyId: string, action: () => Promise<T>) {
  const previous = lobbyLocks.get(lobbyId) ?? Promise.resolve();
  const pending = previous.catch(() => undefined).then(action);
  lobbyLocks.set(lobbyId, pending);
  try {
    return await pending;
  } finally {
    if (lobbyLocks.get(lobbyId) === pending) lobbyLocks.delete(lobbyId);
  }
}

async function sendStartedLobby(ws: WebSocket, lobby: Lobby, member: LobbyMember) {
  if (!lobby.handId || !member.playerId) return;
  const hand = await store.getHand(lobby.handId);
  const player = hand?.players.find((candidate: any) => candidate.id === member.playerId);
  if (!hand || !player) return;
  ws.send(JSON.stringify({
    type: 'lobby_started',
    data: {
      lobby: lobbyState(lobby),
      playerUrl: `/player/${hand.id}/${player.id}/${player.token}`,
    },
  }));
}

async function createLobby(ws: WebSocket, message: any) {
  const member: LobbyMember = {
    id: uuidv4(),
    token: uuidv4(),
    name: lobbyName(message.name, 'Host'),
    isBot: false,
    joinedAt: Date.now(),
  };
  const lobby: Lobby = {
    id: uuidv4(),
    hostMemberId: member.id,
    maxPlayers: Math.min(Math.max(Number(message.maxPlayers) || 2, 2), 10),
    status: 'waiting',
    members: [member],
    created: Date.now(),
  };
  await store.saveLobby(lobby);
  bindLobbyClient(ws, lobby, member);
  ws.send(JSON.stringify({
    type: 'lobby_joined',
    data: { lobby: lobbyState(lobby), memberId: member.id, token: member.token, isHost: true },
  }));
}

async function viewLobby(ws: WebSocket, message: any) {
  const lobby = await store.getLobby(message.lobbyId) as Lobby | null;
  if (!lobby) throw new Error('lobby not found');
  ws.send(JSON.stringify({ type: 'lobby_updated', data: lobbyState(lobby) }));
}

async function joinLobby(ws: WebSocket, message: any) {
  return withLobbyLock(message.lobbyId, async () => {
    const lobby = await store.getLobby(message.lobbyId) as Lobby | null;
    if (!lobby) throw new Error('lobby not found');

    let member = lobby.members.find(candidate => (
      candidate.id === message.memberId && candidate.token === message.token && !candidate.isBot
    ));
    if (!member && (message.memberId || message.token)) {
      throw new Error('invalid lobby credentials');
    }
    if (!member) {
      if (lobby.status !== 'waiting') throw new Error('game already started');
      if (lobby.members.length >= lobby.maxPlayers) throw new Error('lobby is full');
      member = {
        id: uuidv4(),
        token: uuidv4(),
        name: lobbyName(message.name, `Player ${lobby.members.length + 1}`),
        isBot: false,
        joinedAt: Date.now(),
      };
      lobby.members.push(member);
      await store.updateLobby(lobby);
    }

    bindLobbyClient(ws, lobby, member);
    ws.send(JSON.stringify({
      type: 'lobby_joined',
      data: {
        lobby: lobbyState(lobby),
        memberId: member.id,
        token: member.token,
        isHost: member.id === lobby.hostMemberId,
      },
    }));
    broadcastLobby(lobby);
    if (lobby.status === 'started') await sendStartedLobby(ws, lobby, member);
  });
}

async function authenticatedLobby(ws: WebSocket, message: any) {
  const connection = lobbyConnections.get(ws);
  if (!connection || connection.lobbyId !== message.lobbyId) throw new Error('join lobby first');
  const lobby = await store.getLobby(connection.lobbyId) as Lobby | null;
  const member = lobby?.members.find(candidate => candidate.id === connection.memberId);
  if (!lobby || !member) throw new Error('lobby not found');
  return { lobby, member };
}

async function addLobbyBot(ws: WebSocket, message: any) {
  return withLobbyLock(message.lobbyId, async () => {
    const { lobby, member } = await authenticatedLobby(ws, message);
    if (member.id !== lobby.hostMemberId) throw new Error('host only');
    if (lobby.status !== 'waiting') throw new Error('game already started');
    if (lobby.members.length >= lobby.maxPlayers) throw new Error('lobby is full');
    lobby.members.push({
      id: uuidv4(),
      token: uuidv4(),
      name: lobbyBotName(lobby, message.name),
      isBot: true,
      joinedAt: Date.now(),
    });
    await store.updateLobby(lobby);
    broadcastLobby(lobby);
  });
}

async function removeLobbyBot(ws: WebSocket, message: any) {
  return withLobbyLock(message.lobbyId, async () => {
    const { lobby, member } = await authenticatedLobby(ws, message);
    if (member.id !== lobby.hostMemberId) throw new Error('host only');
    if (lobby.status !== 'waiting') throw new Error('game already started');
    const target = lobby.members.find(candidate => candidate.id === message.memberId);
    if (!target?.isBot) throw new Error('only bots can be removed');
    lobby.members = lobby.members.filter(candidate => candidate.id !== target.id);
    await store.updateLobby(lobby);
    broadcastLobby(lobby);
  });
}

async function startLobby(ws: WebSocket, message: any) {
  return withLobbyLock(message.lobbyId, async () => {
    const { lobby, member } = await authenticatedLobby(ws, message);
    if (member.id !== lobby.hostMemberId) throw new Error('host only');
    if (lobby.status !== 'waiting') throw new Error('game already started');

    while (lobby.members.length < lobby.maxPlayers) {
      lobby.members.push({
        id: uuidv4(),
        token: uuidv4(),
        name: lobbyBotName(lobby, undefined),
        isBot: true,
        joinedAt: Date.now(),
      });
    }

    const hand = dealHand(
      lobby.members.length,
      undefined,
      lobby.members.map(candidate => candidate.name),
      lobby.members.map(candidate => candidate.isBot),
    );
    await store.saveHand(hand);
    lobby.members.forEach((candidate, index) => {
      candidate.playerId = hand.players[index].id;
    });
    lobby.status = 'started';
    lobby.handId = hand.id;
    await store.updateLobby(lobby);
    broadcastLobby(lobby);

    const sends: Promise<void>[] = [];
    lobbyConnections.forEach((connection, client) => {
      if (connection.lobbyId !== lobby.id || client.readyState !== WebSocket.OPEN) return;
      const connectedMember = lobby.members.find(candidate => candidate.id === connection.memberId);
      if (connectedMember && !connectedMember.isBot) {
        sends.push(sendStartedLobby(client, lobby, connectedMember));
      }
    });
    await Promise.all(sends);
    scheduleBotTurns(hand.id);
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
app.get('/admin/stats', async (_req, res) => {
  res.json(await store.getAnalyticsStats());
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
app.post('/api/problems', async (req, res) => {
  const description = typeof req.body?.description === 'string'
    ? req.body.description.trim()
    : '';
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }
  if (description.length > 2000) {
    return res.status(400).json({ error: 'Description must be 2000 characters or fewer' });
  }

  const handId = typeof req.body?.handId === 'string'
    ? req.body.handId.trim().slice(0, 100)
    : '';
  const hand = handId ? await store.getHand(handId) : null;
  if (handId && !hand) {
    return res.status(404).json({ error: 'Hand not found' });
  }

  const page = typeof req.body?.page === 'string'
    ? req.body.page.trim().slice(0, 30)
    : 'unknown';
  const playerId = typeof req.body?.playerId === 'string'
    ? req.body.playerId.trim().slice(0, 100)
    : undefined;
  const lobbyId = typeof req.body?.lobbyId === 'string'
    ? req.body.lobbyId.trim().slice(0, 100)
    : undefined;
  const viewport = req.body?.viewport
    && Number.isFinite(req.body.viewport.width)
    && Number.isFinite(req.body.viewport.height)
    ? {
      width: Math.max(0, Math.round(req.body.viewport.width)),
      height: Math.max(0, Math.round(req.body.viewport.height)),
    }
    : undefined;

  const handSnapshot = hand ? diagnosticHandSnapshot(hand) : undefined;
  const saved = await store.saveProblem(description, {
    build: {
      commit: commitSha,
      buildTimeGmt,
    },
    context: {
      page,
      handId: hand?.id,
      playerId,
      lobbyId,
      viewport,
      userAgent: req.get('user-agent')?.slice(0, 500),
    },
    hand: handSnapshot,
  });

  res.status(201).json(saved);
});
app.get('/api/problems/:id', async (req, res) => {
  const expectedToken = process.env.PROBLEM_API_TOKEN;
  if (expectedToken && req.get('authorization') !== `Bearer ${expectedToken}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1000) {
    return res.status(400).json({ error: 'Problem ID must be an integer starting at 1000' });
  }

  const problem = await store.getProblem(id);
  if (!problem) return res.status(404).json({ error: 'Problem not found' });
  res.json(problem);
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
      if (msg.action === 'create_lobby') {
        await createLobby(ws, msg);
      } else if (msg.action === 'view_lobby') {
        await viewLobby(ws, msg);
      } else if (msg.action === 'join_lobby') {
        await joinLobby(ws, msg);
      } else if (msg.action === 'lobby_add_bot') {
        await addLobbyBot(ws, msg);
      } else if (msg.action === 'lobby_remove_bot') {
        await removeLobbyBot(ws, msg);
      } else if (msg.action === 'lobby_start') {
        await startLobby(ws, msg);
      } else if (msg.action === 'deal') {
        await createAndSendDeal(
          ws,
          msg.players || 2,
          Array.isArray(msg.playerNames) ? msg.playerNames : [],
          Array.isArray(msg.playerBots) ? msg.playerBots : [],
        );
      } else if (msg.action === 'new_deal') {
        if (playerConnections.has(ws)) await recordBoundPlayerActivity(ws);
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
        if (playerConnections.has(ws)) await recordBoundPlayerActivity(ws);
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
        await recordPlayerConnection(ws, req, hand, player, msg.client);
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
        if (!playerConnections.has(ws)) {
          await recordPlayerConnection(ws, req, hand, player, msg.client);
        }
        await recordBoundPlayerActivity(ws);
        recordPlayerMove(hand, player.id, msg.move as PlayerMove, msg.amount);
        await store.updateHand(hand);
        ws.send(JSON.stringify({ type: 'player_state', data: await playerState(hand, player) }));
        broadcastHandUpdated(hand);
        scheduleBotTurns(hand.id);
      } else if (msg.action === 'player_activity') {
        await recordBoundPlayerActivity(ws);
      } else if (msg.action === 'replay' && msg.id) {
        const h = await store.getHand(msg.id);
        if (h) ws.send(JSON.stringify({ type: 'hand_full', data: h }));
        else ws.send(JSON.stringify({ type: 'error', message: 'not found' }));
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', message: e instanceof Error ? e.message : 'invalid' }));
    }
  });
  ws.on('close', () => {
    lobbyConnections.delete(ws);
    playerConnections.delete(ws);
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
