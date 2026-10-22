import express from 'express';
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

export const tableInput = z.object({
  game_type: z.literal('omaha_hi_lo').default('omaha_hi_lo'),
  opponents: z.enum(['bots', 'friends']).default('bots'),
  bot_count: z.number().int().min(1).max(9).optional(),
  player_name: z.string().trim().min(1).max(30).optional(),
  private: z.boolean().default(true),
}).strict().refine(value => value.opponents !== 'friends' || value.bot_count === undefined, {
  message: 'bot_count is only supported for bot practice',
});
export type TableInput = z.infer<typeof tableInput>;
export type PokerTools = {
  create: (input: TableInput) => Promise<Record<string, unknown>>;
  status: (tableId: string) => Promise<Record<string, unknown>>;
};

// Based on the site's /rules and /how-to-play guides, not a second rules engine.
export function gameInfo(origin: string) {
  return {
    game: 'Omaha Hi-Lo 8 or Better', free_to_play: true, registration_required: false,
    description: 'Free browser poker with bots or friends. Play on the website, not in chat.',
    description_ru: 'Бесплатная игра в браузере с ботами или друзьями, без регистрации. Игра проходит на сайте, не в чате.',
    rules: [
      'Four hole cards; use exactly two hole cards and three community cards for each five-card hand.',
      'High uses standard poker rankings. Low needs five distinct ranks eight or lower; ace is low.',
      'Straights and flushes do not hurt low. The best low is A-2-3-4-5.',
      'Best high and qualifying low split the pot. With no qualifying low, high wins it all. Different hole-card pairs may be used for high and low.',
    ],
    rules_ru: [
      'Четыре закрытые карты; используйте ровно две из руки и три общие карты.',
      'Хай определяется обычными комбинациями. Лоу — пять разных достоинств не выше восьмёрки; туз младший.',
      'Стрит и флеш не мешают лоу. Лучшее лоу — A-2-3-4-5.',
      'Банк делится между лучшим хай и подходящим лоу. Без лоу весь банк получает хай. Для хай и лоу можно выбрать разные пары карт руки.',
    ],
    features: ['1–9 bots', 'Private invitations', 'Guest nicknames', '2–10 seats', 'Hand replay', 'Statistics', 'Rules practice'],
    play_url: origin, rules_url: `${origin}/rules`, documentation_url: `${origin}/ai`,
  };
}

const toolDescriptions = {
  create_poker_table: 'Create a real free Omaha Hi-Lo table for bot practice or friends. Return its join link; the human plays on the website. First human to join becomes host. Never place bets or play for the user.',
  get_play_link: 'Prepare a NEW playable table and return its join link. Supports bots or friends. Reuse a previously returned link instead of calling again when possible.',
  get_table_status: 'Read only existence, waiting/in-progress state and available seats. Never returns names, credentials, invitations or cards.',
  get_game_info: 'Explain Omaha Hi-Lo rules, free guest play, supported features and website links.',
};

export function createPokerMcpServer(operations: PokerTools, origin: string) {
  const server = new McpServer({ name: 'omaha-hi-lo', version: '1.0.0', websiteUrl: `${origin}/ai` }, {
    instructions: 'Prepare a table only when requested. Return the join_url unchanged, including its fragment. Humans play on the website. Share private invitations only with intended players. MCP does not play hands or access private cards.',
  });
  const result = (data: Record<string, unknown>) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(data) }], structuredContent: data,
  });
  for (const name of ['create_poker_table', 'get_play_link'] as const) {
    server.registerTool(name, {
      description: toolDescriptions[name], inputSchema: tableInput,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    }, async input => {
      try { return result(await operations.create(input)); }
      catch { return { isError: true, content: [{ type: 'text', text: 'Table creation temporarily unavailable or creation limit reached. Please try later. / Создание стола временно недоступно или достигнут лимит. Попробуйте позже.' }] }; }
    });
  }
  server.registerTool('get_game_info', {
    description: toolDescriptions.get_game_info, inputSchema: z.object({}).strict(),
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => result(gameInfo(origin)));
  server.registerTool('get_table_status', {
    description: toolDescriptions.get_table_status, inputSchema: z.object({ table_id: z.string().uuid() }).strict(),
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ table_id }) => result(await operations.status(table_id)));
  return server;
}

// Bounded fixed windows for creation quotas. The persisted waiting-table cap is
// enforced by the application under its creation lock, including after restart.
export class CreationQuota {
  private buckets = new Map<string, { start: number; count: number }>();
  constructor(private perIp = 10, private global = 100, private windowMs = 3_600_000) {}
  take(ip: string, now = Date.now()) {
    for (const [key, bucket] of this.buckets) if (now >= bucket.start + this.windowMs) this.buckets.delete(key);
    for (const [key, limit] of [[ip, this.perIp], ['global', this.global]] as const) {
      if ((this.buckets.get(key)?.count ?? 0) >= limit) return false;
    }
    for (const key of [ip, 'global']) {
      const bucket = this.buckets.get(key) ?? { start: now, count: 0 };
      bucket.count++; this.buckets.set(key, bucket);
    }
    return true;
  }
}

export function mcpRouter(operations: PokerTools, origin: string, options: { allowedOrigins?: string[]; quota?: CreationQuota; requestsPerMinute?: number } = {}) {
  const router = express.Router();
  const allowed = new Set([origin, ...options.allowedOrigins ?? []]);
  const quota = options.quota ?? new CreationQuota();
  let inFlight = 0;
  router.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const requestOrigin = req.get('origin');
    if (requestOrigin && !allowed.has(requestOrigin)) { res.status(403).json({ error: 'Origin not allowed' }); return; }
    if (requestOrigin) { res.setHeader('Access-Control-Allow-Origin', requestOrigin); res.vary('Origin'); }
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });
  router.use(rateLimit({ windowMs: 60_000, limit: options.requestsPerMinute ?? 60, standardHeaders: 'draft-8', legacyHeaders: false }));
  router.use(rateLimit({ windowMs: 60_000, limit: 600, keyGenerator: () => 'global', standardHeaders: 'draft-8', legacyHeaders: false }));
  router.post('/', express.json({ limit: '16kb' }), async (req, res) => {
    if (inFlight >= 16) { res.setHeader('Retry-After', '5'); res.status(503).json({ error: 'Busy' }); return; }
    inFlight++;
    const server = createPokerMcpServer({ ...operations, create: async input => {
      if (!quota.take(ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? 'unknown'))) throw new Error('creation limit');
      return operations.create(input);
    } }, origin);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch {
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } });
    } finally {
      await server.close();
      inFlight--;
    }
  });
  // Stateless mode has no server-initiated SSE stream or session to delete.
  router.all('/', (_req, res) => { res.setHeader('Allow', 'POST, OPTIONS'); res.sendStatus(405); });
  return router;
}
