import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export default class HandStore {
  private db?: Database<sqlite3.Database, sqlite3.Statement>;
  private initializing?: Promise<void>;
  private saveQueue: Promise<void> = Promise.resolve();
  constructor(public filename: string) {}

  async init() {
    if (this.initializing) return this.initializing;
    if (this.db) return;
    this.initializing = this.initialize();
    try {
      await this.initializing;
    } catch (error) {
      this.db = undefined;
      throw error;
    } finally {
      this.initializing = undefined;
    }
  }

  private async initialize() {
    await fs.mkdir(path.dirname(this.filename), { recursive: true });
    this.db = await open({ filename: this.filename, driver: sqlite3.Database });
    await this.db.run(`CREATE TABLE IF NOT EXISTS hands (
      id TEXT PRIMARY KEY, created INTEGER, party_id TEXT, data TEXT
    )`);
    await this.db.run(`CREATE TABLE IF NOT EXISTS lobbies (
      id TEXT PRIMARY KEY, created INTEGER, hand_id TEXT, last_activity INTEGER, data TEXT
    )`);
    const handColumns = await this.db.all('PRAGMA table_info(hands)');
    if (!handColumns.some((column: any) => column.name === 'party_id')) {
      await this.db.run('ALTER TABLE hands ADD COLUMN party_id TEXT');
    }
    const lobbyColumns = await this.db.all('PRAGMA table_info(lobbies)');
    if (!lobbyColumns.some((column: any) => column.name === 'hand_id')) {
      await this.db.run('ALTER TABLE lobbies ADD COLUMN hand_id TEXT');
    }
    if (!lobbyColumns.some((column: any) => column.name === 'last_activity')) {
      await this.db.run('ALTER TABLE lobbies ADD COLUMN last_activity INTEGER');
    }
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS party_sessions (
        party_id TEXT PRIMARY KEY,
        created INTEGER NOT NULL,
        last_activity INTEGER NOT NULL
      )
    `);
    await this.db.run('CREATE INDEX IF NOT EXISTS party_sessions_activity ON party_sessions(last_activity)');
    const savedHands = await this.db.all('SELECT id, data FROM hands WHERE party_id IS NULL');
    for (const row of savedHands) {
      const hand = JSON.parse(row.data);
      const partyId = hand.partyId ?? hand.id ?? row.id;
      await this.db.run('UPDATE hands SET party_id = ? WHERE id = ?', partyId, row.id);
    }
    await this.db.run(`
      INSERT INTO party_sessions(party_id, created, last_activity)
      SELECT party_id, MIN(created), MAX(created)
      FROM hands
      WHERE party_id IS NOT NULL
      GROUP BY party_id
      ON CONFLICT(party_id) DO NOTHING
    `);
    const savedLobbies = await this.db.all(`
      SELECT id, data FROM lobbies
      WHERE hand_id IS NULL AND data LIKE '%"handId"%'
    `);
    for (const row of savedLobbies) {
      const lobby = JSON.parse(row.data);
      await this.db.run(
        'UPDATE lobbies SET hand_id = ?, last_activity = COALESCE(last_activity, created) WHERE id = ?',
        lobby.handId ?? null,
        row.id,
      );
    }
    await this.db.run('UPDATE lobbies SET last_activity = created WHERE last_activity IS NULL');
    await this.db.run('CREATE INDEX IF NOT EXISTS hands_party ON hands(party_id)');
    await this.db.run('CREATE INDEX IF NOT EXISTS lobbies_hand ON lobbies(hand_id)');
    await this.db.run('CREATE INDEX IF NOT EXISTS lobbies_activity ON lobbies(last_activity)');
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
        pixel_ratio REAL,
        client_cookie TEXT
      )
    `);
    const analyticsVisitColumns = await this.db.all('PRAGMA table_info(analytics_visits)');
    if (!analyticsVisitColumns.some((column: any) => column.name === 'client_cookie')) {
      await this.db.run('ALTER TABLE analytics_visits ADD COLUMN client_cookie TEXT');
    }
    await this.db.run('CREATE INDEX IF NOT EXISTS analytics_visits_party ON analytics_visits(party_id)');
    await this.db.run('CREATE INDEX IF NOT EXISTS analytics_visits_created ON analytics_visits(created DESC)');
    await this.db.run(`
      UPDATE party_sessions
      SET last_activity = MAX(
        last_activity,
        COALESCE(
          (SELECT analytics_activity.last_activity
           FROM analytics_activity
           WHERE analytics_activity.party_id = party_sessions.party_id),
          last_activity
        )
      )
    `);
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
    if (this.initializing) await this.initializing;
    else if (!this.db) await this.init();
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
      const created = hand.created ?? Date.now();
      await db.run(
        'INSERT INTO hands(id, created, party_id, data) VALUES(?,?,?,?)',
        id,
        created,
        hand.partyId ?? id,
        JSON.stringify(hand),
      );
      await db.run(`
        INSERT INTO party_sessions(party_id, created, last_activity)
        VALUES(?, ?, ?)
        ON CONFLICT(party_id) DO UPDATE SET
          last_activity = MAX(last_activity, excluded.last_activity)
      `, hand.partyId ?? id, created, created);
      return id;
    } finally {
      releaseSave();
    }
  }

  async updateHand(hand: any) {
    const db = await this.getDb();
    await db.run(
      'UPDATE hands SET party_id = ?, data = ? WHERE id = ?',
      hand.partyId ?? hand.id,
      JSON.stringify(hand),
      hand.id,
    );
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
    const db = await this.getDb();
    const rows = await db.all(
      'SELECT data FROM hands WHERE party_id = ? ORDER BY created ASC',
      partyId,
    );
    return rows.map((row: any) => JSON.parse(row.data));
  }

  async saveLobby(lobby: any) {
    const db = await this.getDb();
    await db.run(
      'INSERT INTO lobbies(id, created, hand_id, last_activity, data) VALUES(?,?,?,?,?)',
      lobby.id,
      lobby.created ?? Date.now(),
      lobby.handId ?? null,
      lobby.lastActivity ?? lobby.created ?? Date.now(),
      JSON.stringify(lobby),
    );
  }

  async updateLobby(lobby: any) {
    const db = await this.getDb();
    await db.run(
      'UPDATE lobbies SET hand_id = ?, last_activity = ?, data = ? WHERE id = ?',
      lobby.handId ?? null,
      lobby.lastActivity ?? Date.now(),
      JSON.stringify(lobby),
      lobby.id,
    );
  }

  async getLobby(id: string) {
    const db = await this.getDb();
    const row = await db.get('SELECT data FROM lobbies WHERE id = ?', id);
    return row ? JSON.parse(row.data) : null;
  }

  async listLobbies() {
    const db = await this.getDb();
    const rows = await db.all('SELECT data FROM lobbies ORDER BY created DESC');
    return rows.map((row: any) => JSON.parse(row.data));
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
      INSERT INTO party_sessions(party_id, created, last_activity)
      VALUES(?, ?, ?)
      ON CONFLICT(party_id) DO UPDATE SET
        last_activity = MAX(last_activity, excluded.last_activity)
    `, partyId, occurredAt, occurredAt);
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

  async getPartyLastActivity(partyId: string) {
    const db = await this.getDb();
    const row = await db.get(
      'SELECT last_activity FROM party_sessions WHERE party_id = ?',
      partyId,
    );
    return row?.last_activity as number | undefined;
  }

  async deleteExpiredParties(cutoff: number) {
    const db = await this.getDb();
    const expiredRows = await db.all(
      'SELECT party_id FROM party_sessions WHERE last_activity <= ?',
      cutoff,
    );
    const partyIds = expiredRows.map((row: any) => row.party_id as string);
    if (!partyIds.length) return { partyIds: [], handIds: [] };

    const deletedPartyIds: string[] = [];
    const deletedHandIds: string[] = [];

    await db.exec('BEGIN IMMEDIATE');
    try {
      for (const partyId of partyIds) {
        const stillExpired = await db.get(
          'SELECT 1 AS expired FROM party_sessions WHERE party_id = ? AND last_activity <= ?',
          partyId,
          cutoff,
        );
        if (!stillExpired) continue;
        const partyHandRows = await db.all('SELECT id FROM hands WHERE party_id = ?', partyId);
        const partyHandIds = partyHandRows.map((row: any) => row.id as string);
        await db.run('DELETE FROM hands WHERE party_id = ?', partyId);
        deletedPartyIds.push(partyId);
        deletedHandIds.push(...partyHandIds);
        await db.run('DELETE FROM analytics_visits WHERE party_id = ?', partyId);
        await db.run('DELETE FROM analytics_activity WHERE party_id = ?', partyId);
        await db.run('DELETE FROM party_sessions WHERE party_id = ?', partyId);
      }
      for (const handId of deletedHandIds) {
        await db.run('DELETE FROM lobbies WHERE hand_id = ?', handId);
      }
      await db.exec('COMMIT');
    } catch (error) {
      await db.exec('ROLLBACK');
      throw error;
    }

    return { partyIds: deletedPartyIds, handIds: deletedHandIds };
  }

  async deleteExpiredWaitingLobbies(cutoff: number) {
    const db = await this.getDb();
    const rows = await db.all(
      'SELECT id FROM lobbies WHERE hand_id IS NULL AND last_activity <= ?',
      cutoff,
    );
    await db.run(
      'DELETE FROM lobbies WHERE hand_id IS NULL AND last_activity <= ?',
      cutoff,
    );
    return rows.map((row: any) => row.id as string);
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
    clientCookie?: string;
  }, occurredAt = Date.now()) {
    const db = await this.getDb();
    const result = await db.run(`
      INSERT INTO analytics_visits(
        created, last_seen, party_id, hand_id, player_id, ip, user_agent,
        device_type, platform, screen_width, screen_height, viewport_width,
        viewport_height, pixel_ratio, client_cookie
      ) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    visit.pixelRatio ?? null,
    visit.clientCookie ?? null);
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
    const [handRows, activityRows, visitRows, devices, totals] = await Promise.all([
      db.all('SELECT created, data FROM hands ORDER BY created ASC'),
      db.all('SELECT * FROM analytics_activity'),
      db.all(`SELECT created, last_seen AS lastSeen, party_id AS partyId,
        player_id AS playerId, ip, user_agent AS userAgent, device_type AS deviceType,
        platform, screen_width AS screenWidth, screen_height AS screenHeight,
        viewport_width AS viewportWidth, viewport_height AS viewportHeight,
        pixel_ratio AS pixelRatio, client_cookie AS clientCookie
        FROM analytics_visits ORDER BY last_seen DESC`),
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
    const latestHandByParty = new Map<string, any>();
    hands.forEach((hand: any) => {
      const partyId = hand.partyId ?? hand.id;
      const previous = latestHandByParty.get(partyId);
      if (!previous || (hand.handNumber ?? 0) > (previous.handNumber ?? 0)) latestHandByParty.set(partyId, hand);
    });
    const accessGroups = new Map<string, any>();
    visitRows.forEach((visit: any) => {
      const key = [visit.clientCookie, visit.ip, visit.userAgent, visit.deviceType,
        visit.platform, visit.screenWidth, visit.screenHeight, visit.viewportWidth,
        visit.viewportHeight, visit.pixelRatio].map((value) => value ?? '').join('|');
      const access = accessGroups.get(key) ?? {
        firstSeen: visit.created,
        lastSeen: visit.lastSeen,
        clientCookie: visit.clientCookie,
        ip: visit.ip,
        userAgent: visit.userAgent,
        deviceType: visit.deviceType,
        platform: visit.platform,
        screenWidth: visit.screenWidth,
        screenHeight: visit.screenHeight,
        viewportWidth: visit.viewportWidth,
        viewportHeight: visit.viewportHeight,
        pixelRatio: visit.pixelRatio,
        connections: 0,
        playersByParty: new Map<string, string>(),
      };
      access.connections += 1;
      access.firstSeen = Math.min(access.firstSeen, visit.created);
      access.lastSeen = Math.max(access.lastSeen, visit.lastSeen);
      if (!access.playersByParty.has(visit.partyId)) access.playersByParty.set(visit.partyId, visit.playerId);
      accessGroups.set(key, access);
    });
    const accesses = [...accessGroups.values()].map((access: any) => {
      let gamesPlayed = 0;
      let wins = 0;
      access.playersByParty.forEach((playerId: string, partyId: string) => {
        const finalHand = latestHandByParty.get(partyId);
        const playersWithChips = finalHand?.players?.filter((player: any) => (Number(player.stack) || 0) > 0) ?? [];
        if (!finalHand || finalHand.stage !== 'showdown'
          || (!finalHand.partyFinishedEarly && playersWithChips.length > 1)
          || !finalHand.players.some((player: any) => player.id === playerId)) return;
        gamesPlayed += 1;
        const maxStack = Math.max(...finalHand.players.map((player: any) => Number(player.stack) || 0));
        if ((Number(finalHand.players.find((player: any) => player.id === playerId)?.stack) || 0) === maxStack) wins += 1;
      });
      const { playersByParty, ...publicAccess } = access;
      return { ...publicAccess, gamesPlayed, winPercent: gamesPlayed ? Math.round((wins / gamesPlayed) * 100) : 0 };
    }).sort((a: any, b: any) => b.lastSeen - a.lastSeen).slice(0, 200);
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
