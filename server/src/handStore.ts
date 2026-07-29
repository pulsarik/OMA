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
}
