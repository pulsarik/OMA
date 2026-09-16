import { expect, Page, WebSocketRoute } from '@playwright/test';
import type { TableState } from '../../client/src/mobile-table/types';

export function fixture(count = 7, showdown = true) {
  const holes = [ ['Ac', '2c', '9s', '8s'], ['3d', '3h', 'Jh', '9h'], ['Kh', 'Kd', 'Js', 'Ts'],
    ['As', '2s', 'Jd', '9d'], ['Ah', '2h', 'Tc', '8c'], ['Qh', 'Qd', '9c', '8d'], ['4c', '4h', 'Td', '7h'],
    ['Ad', '2d', '6c', '6d'], ['3s', '4s', '6h', '6s'], ['5c', '5d', '7c', '7d'] ];
  const names = ['Вы', 'Лев', 'Иван', 'Алекс', 'Маша', 'Ольга', 'Нина', 'Анна', 'Олег', 'Максим'];
  const players = holes.slice(0, count).map((hole, i) => ({ id: `P${i + 1}`, name: names[i], hole, cardCount: 4, stack: 800, folded: false, connected: true }));
  const winnerIds = ['P1', 'P4', 'P5'].filter(id => players.some(p => p.id === id));
  const combo = {
    highRank: 'straight', lowRank: '5-4-3-2-A',
    highCombo: [{ code: 'Ac', source: 'hole' }, { code: '2c', source: 'hole' }, { code: '3c', source: 'board' }, { code: '4d', source: 'board' }, { code: '5h', source: 'board' }],
    lowCombo: [{ code: 'Ac', source: 'hole' }, { code: '2c', source: 'hole' }, { code: '3c', source: 'board' }, { code: '4d', source: 'board' }, { code: '5h', source: 'board' }],
  } as const;
  const points = players.map(p => ({ id: p.id, high: winnerIds.includes(p.id) ? 600 / winnerIds.length : 0,
    low: winnerIds.includes(p.id) ? 600 / winnerIds.length : 0, total: winnerIds.includes(p.id) ? 1200 / winnerIds.length : 0 }));
  const result = {
    highWinners: winnerIds, lowWinners: winnerIds, noLow: false, potCoins: 1200, points,
    sidePots: [{ amount: 1200, eligiblePlayerIds: players.map(p => p.id), highWinners: winnerIds, lowWinners: winnerIds, noLow: false,
      players: points.map(p => ({ ...p, payout: p.total, contributed: 200, net: p.total - 200, eligible: true })) }],
    players: players.map(p => ({ id: p.id, folded: false, highRank: winnerIds.includes(p.id) ? 'straight' : 'three of a kind',
      ...(p.id === 'P1' ? JSON.parse(JSON.stringify(combo)) : {}) })),
  };
  return {
    handId: 'mobile-fixture', handCode: 'HA0024', handNumber: 24, partyId: 'party-fixture', partyCode: 'PA0001', revision: 1,
    playerId: 'P1', playerName: 'Вы', stack: 800, folded: false, hole: holes[0], players,
    community: ['3c', '4d', '5h', 'Ks', 'Qc'], stage: showdown ? 'showdown' : 'river',
    currentPlayerId: showdown ? undefined : 'P1', currentBet: showdown ? 0 : 20, potCoins: 1200,
    totalContributions: Object.fromEntries(players.map(p => [p.id, 200])), roundBets: { P1: 0 },
    raiseCount: 0, lastFullRaise: 20, actedSinceLastFullRaise: [],
    blinds: { small: 2, big: 4, smallBlindPlayerId: 'P2', bigBlindPlayerId: 'P3', dealerPlayerId: 'P1' },
    potBreakdown: [{ amount: 1200, eligiblePlayerIds: players.map(p => p.id) }],
    partyTotals: players.map(p => ({ id: p.id, total: 1000 })), waitingForPlayers: [], actions: [],
    partyFinishedEarly: false, cardsRevealed: showdown, revealVotes: [], completedHandCount: showdown ? 1 : 0,
    currentCombo: JSON.parse(JSON.stringify(combo)), result: showdown ? result : undefined, showdownSummary: showdown ? result : undefined,
    turnDeadline: Date.now() + 45000, turnDurationMs: 45000,
    session: { serverNow: Date.now(), lastActivity: Date.now(), warningAfterMs: 3600000, expiresAfterMs: 7200000 },
  } satisfies TableState & Record<string, unknown>;
}

export async function mockTable(page: Page, initial = fixture()) {
  let state = initial;
  const messages: Array<Record<string, any>> = [];
  let socket: WebSocketRoute | undefined;
  await page.route('**/api/player/**', route => route.fulfill({ json: state }));
  await page.routeWebSocket(/ws:\/\/localhost:(4000|4100)\//, ws => {
    socket = ws;
    ws.onMessage(raw => {
      const message = JSON.parse(String(raw));
      messages.push(message);
      if (message.action === 'join_player') ws.send(JSON.stringify({ type: 'player_state', data: state }));
    });
  });
  await page.goto('/player/mobile-fixture/P1/token');
  await expect.poll(() => Boolean(socket)).toBe(true);
  return {
    messages,
    update(next: typeof initial) { state = next; socket!.send(JSON.stringify({ type: 'player_state', data: state })); },
    ack(commandId: string) { socket!.send(JSON.stringify({ type: 'command_ack', commandId })); },
    close() { socket!.close(); },
  };
}
