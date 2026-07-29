import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export default class HandStore {
  private db?: Database<sqlite3.Database, sqlite3.Statement>;
  private saveQueue: Promise<void> = Promise.resolve();
  constructor(public filename: string) {}

  async init() {
    await fs.mkdir(path.dirname(this.filename), { recursive: true });
    this.db = await open({ filename: this.filename, driver: sqlite3.Database });
    await this.db.run(`CREATE TABLE IF NOT EXISTS hands (id TEXT PRIMARY KEY, created INTEGER, data TEXT)`);
    await this.db.run(`CREATE TABLE IF NOT EXISTS lobbies (id TEXT PRIMARY KEY, created INTEGER, data TEXT)`);
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS analytics_activity (
        party_id TEXT PRIMARY KEY,
        first_activity INTEGER NOT NULL,
        last_activity INTEGER NOT NULL,
        active_ms INTEGER NOT NULL DEFAULT 0,
        event_count INTEGER NOT NULL DEFAULT 1
      )
    `);
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS analytics_visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        party_id TEXT NOT NULL,
        hand_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        ip TEXT,
        user_agent TEXT,
        device_type TEXT,
        platform TEXT,
        screen_width INTEGER,
        screen_height INTEGER,
        viewport_width INTEGER,
        viewport_height INTEGER,
        pixel_ratio REAL
      )
    `);
    await this.db.run('CREATE INDEX IF NOT EXISTS analytics_visits_party ON analytics_visits(party_id)');
    await this.db.run('CREATE INDEX IF NOT EXISTS analytics_visits_created ON analytics_visits(created DESC)');
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS problems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created INTEGER NOT NULL,
        description TEXT NOT NULL,
        data TEXT NOT NULL
      )
    `);
    await this.db.run(`
      INSERT INTO sqlite_sequence(name, seq)
      SELECT 'problems', 999
      WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'problems')
    `);
    await this.db.run(`UPDATE sqlite_sequence SET seq = 999 WHERE name = 'problems' AND seq < 999`);
  }

  private async getDb() {
    if (!this.db) await this.init();
    return this.db!;
  }

  private code(prefix: string, value: number) {
    return `${prefix}${String(value).padStart(4, '0')}`;
  }

  private async assignPublicCodes(hand: any) {
    if (!hand.handCode) {
      const count = await this.countHands();
      hand.handCode = this.code('HA', count + 1);
    }

    if (!hand.partyCode) {
      const existingPartyHand = hand.partyId
        ? (await this.listAllHands()).find((savedHand: any) => (
          (savedHand.partyId ?? savedHand.id) === hand.partyId && savedHand.partyCode
        ))
        : undefined;

      if (existingPartyHand?.partyCode) {
        hand.partyCode = existingPartyHand.partyCode;
      } else {
        const hands = await this.listAllHands();
        const partyCodes = new Set(hands.map((savedHand: any) => savedHand.partyCode).filter(Boolean));
        hand.partyCode = this.code('PA', partyCodes.size + 1);
      }
    }
  }

  async saveHand(hand: any) {
    let releaseSave!: () => void;
    const previousSave = this.saveQueue;
    this.saveQueue = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });

    await previousSave;
    try {
      const db = await this.getDb();
      const id = hand.id || uuidv4();
      await this.assignPublicCodes(hand);
      await db.run('INSERT INTO hands(id, created, data) VALUES(?,?,?)', id, Date.now(), JSON.stringify(hand));
      return id;
    } finally {
      releaseSave();
    }
  }

  async updateHand(hand: any) {
    const db = await this.getDb();
    await db.run('UPDATE hands SET data = ? WHERE id = ?', JSON.stringify(hand), hand.id);
  }

  async listHands(limit = 20, offset = 0) {
    const db = await this.getDb();
    const rows = await db.all(
      'SELECT id, created FROM hands ORDER BY created DESC LIMIT ? OFFSET ?',
      limit,
      offset,
    );
    return rows;
  }

  async countHands() {
    const db = await this.getDb();
    const row = await db.get('SELECT COUNT(*) as count FROM hands');
    return row.count as number;
  }

  async getHand(id: string) {
    const db = await this.getDb();
    const row = await db.get('SELECT data FROM hands WHERE id = ?', id);
    if (!row) return null;
    return JSON.parse(row.data);
  }

  async listAllHands() {
    const db = await this.getDb();
    const rows = await db.all('SELECT data FROM hands ORDER BY created ASC');
    return rows.map((row: any) => JSON.parse(row.data));
  }

  async listHandsByParty(partyId: string) {
    const hands = await this.listAllHands();
    return hands.filter((hand: any) => (hand.partyId ?? hand.id) === partyId);
  }

  async saveLobby(lobby: any) {
    const db = await this.getDb();
    await db.run(
      'INSERT INTO lobbies(id, created, data) VALUES(?,?,?)',
      lobby.id,
      lobby.created ?? Date.now(),
      JSON.stringify(lobby),
    );
  }

  async updateLobby(lobby: any) {
    const db = await this.getDb();
    await db.run('UPDATE lobbies SET data = ? WHERE id = ?', JSON.stringify(lobby), lobby.id);
  }

  async getLobby(id: string) {
    const db = await this.getDb();
    const row = await db.get('SELECT data FROM lobbies WHERE id = ?', id);
    return row ? JSON.parse(row.data) : null;
  }

  async saveProblem(description: string, data: any) {
    const db = await this.getDb();
    const created = Date.now();
    const result = await db.run(
      'INSERT INTO problems(created, description, data) VALUES(?,?,?)',
      created,
      description,
      JSON.stringify(data),
    );
    return {
      id: result.lastID as number,
      created,
    };
  }

  async getProblem(id: number) {
    const db = await this.getDb();
    const row = await db.get(
      'SELECT id, created, description, data FROM problems WHERE id = ?',
      id,
    );
    if (!row) return null;
    return {
      id: row.id as number,
      created: row.created as number,
      description: row.description as string,
      ...JSON.parse(row.data),
    };
  }

  async recordAnalyticsActivity(partyId: string, occurredAt = Date.now()) {
    const db = await this.getDb();
    await db.run(`
      INSERT INTO analytics_activity(
        party_id, first_activity, last_activity, active_ms, event_count
      ) VALUES(?, ?, ?, 0, 1)
      ON CONFLICT(party_id) DO UPDATE SET
        active_ms = active_ms + MIN(MAX(? - last_activity, 0), 30000),
        last_activity = MAX(last_activity, ?),
        event_count = event_count + 1
    `, partyId, occurredAt, occurredAt, occurredAt, occurredAt);
  }

  async recordAnalyticsVisit(visit: {
    partyId: string;
    handId: string;
    playerId: string;
    ip?: string;
    userAgent?: string;
    deviceType?: string;
    platform?: string;
    screenWidth?: number;
    screenHeight?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    pixelRatio?: number;
  }, occurredAt = Date.now()) {
    const db = await this.getDb();
    const result = await db.run(`
      INSERT INTO analytics_visits(
        created, last_seen, party_id, hand_id, player_id, ip, user_agent,
        device_type, platform, screen_width, screen_height, viewport_width,
        viewport_height, pixel_ratio
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    occurredAt,
    occurredAt,
    visit.partyId,
    visit.handId,
    visit.playerId,
    visit.ip ?? null,
    visit.userAgent ?? null,
    visit.deviceType ?? null,
    visit.platform ?? null,
    visit.screenWidth ?? null,
    visit.screenHeight ?? null,
    visit.viewportWidth ?? null,
    visit.viewportHeight ?? null,
    visit.pixelRatio ?? null);
    return result.lastID as number;
  }

  async touchAnalyticsVisit(id: number, occurredAt = Date.now()) {
    const db = await this.getDb();
    await db.run(
      'UPDATE analytics_visits SET last_seen = MAX(last_seen, ?) WHERE id = ?',
      occurredAt,
      id,
    );
  }

  async getAnalyticsStats(now = Date.now()) {
    const db = await this.getDb();
    const [handRows, activityRows, accesses, devices, totals] = await Promise.all([
      db.all('SELECT created, data FROM hands ORDER BY created ASC'),
      db.all('SELECT * FROM analytics_activity'),
      db.all(`
        SELECT MIN(created) AS firstSeen, MAX(last_seen) AS lastSeen,
          ip, user_agent AS userAgent, device_type AS deviceType,
          platform, screen_width AS screenWidth,
          screen_height AS screenHeight, viewport_width AS viewportWidth,
          viewport_height AS viewportHeight, pixel_ratio AS pixelRatio,
          COUNT(*) AS connections
        FROM analytics_visits
        GROUP BY ip, user_agent, device_type, platform, screen_width,
          screen_height, viewport_width, viewport_height, pixel_ratio
        ORDER BY lastSeen DESC
        LIMIT 200
      `),
      db.all(`
        SELECT COALESCE(device_type, 'Unknown') AS deviceType,
          COALESCE(platform, 'Unknown') AS platform,
          COUNT(*) AS visits
        FROM analytics_visits
        GROUP BY device_type, platform
        ORDER BY visits DESC
      `),
      db.get(`
        SELECT COUNT(*) AS visits, COUNT(DISTINCT ip) AS uniqueIps
        FROM analytics_visits
      `),
    ]);

    const hands = handRows.map((row: any) => {
      const hand = JSON.parse(row.data);
      return { ...hand, created: hand.created ?? row.created };
    });
    const parties = new Map<string, any>();
    hands.forEach((hand: any) => {
      const partyId = hand.partyId ?? hand.id;
      const party = parties.get(partyId) ?? {
        partyId,
        partyCode: hand.partyCode,
        deals: 0,
        created: hand.created,
      };
      party.deals += 1;
      party.created = Math.min(party.created ?? hand.created, hand.created);
      party.partyCode = party.partyCode ?? hand.partyCode;
      parties.set(partyId, party);
    });

    const activityByParty = new Map(activityRows.map((row: any) => [row.party_id, row]));
    let totalActiveMs = 0;
    const partyStats = [...parties.values()].map((party: any) => {
      const activity: any = activityByParty.get(party.partyId);
      const liveTail = activity ? Math.min(Math.max(now - activity.last_activity, 0), 30000) : 0;
      const activeMs = (activity?.active_ms ?? 0) + liveTail;
      totalActiveMs += activeMs;
      return {
        ...party,
        activeMs,
        firstActivity: activity?.first_activity,
        lastActivity: activity?.last_activity,
        eventCount: activity?.event_count ?? 0,
      };
    }).sort((a: any, b: any) => (b.lastActivity ?? b.created) - (a.lastActivity ?? a.created));

    return {
      generatedAt: now,
      totals: {
        deals: hands.length,
        parties: parties.size,
        activeMs: totalActiveMs,
        averagePartyActiveMs: parties.size ? Math.round(totalActiveMs / parties.size) : 0,
        visits: totals.visits as number,
        uniqueIps: totals.uniqueIps as number,
      },
      devices,
      accesses,
    };
  }
}
