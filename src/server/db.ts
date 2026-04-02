import { Database } from "bun:sqlite";
import { Shift, Screening, ShiftWithFilms, SyncStatus, SyncEntry } from "../shared/types.js";
import { matchShiftsToFilms } from "../data/matcher/match.js";

const DB_PATH = "gft.db";

let db: Database;

export function getDb(): Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.run("PRAGMA journal_mode = WAL");
    initSchema();
  }
  return db;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      screen INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      slots INTEGER NOT NULL,
      other_ushers TEXT NOT NULL DEFAULT '[]',
      UNIQUE(screen, start_time)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS screenings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      film_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      screen INTEGER NOT NULL,
      checkout_url TEXT NOT NULL,
      duration_mins INTEGER NOT NULL DEFAULT 0,
      UNIQUE(screen, start_time)
    )
  `);

  // Migration: add duration_mins if missing
  try {
    db.run("ALTER TABLE screenings ADD COLUMN duration_mins INTEGER NOT NULL DEFAULT 0");
  } catch {}

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_status (
      key TEXT PRIMARY KEY,
      last_synced_at TEXT NOT NULL,
      ok INTEGER NOT NULL DEFAULT 1,
      error TEXT
    )
  `);

  // Migration: add ok/error columns if missing
  try { db.run("ALTER TABLE sync_status ADD COLUMN ok INTEGER NOT NULL DEFAULT 1"); } catch {}
  try { db.run("ALTER TABLE sync_status ADD COLUMN error TEXT"); } catch {}
}

export function upsertShifts(shifts: Shift[]) {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO shifts (screen, start_time, end_time, slots, other_ushers)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(screen, start_time) DO UPDATE SET
      end_time = excluded.end_time,
      slots = excluded.slots,
      other_ushers = excluded.other_ushers
  `);

  const tx = d.transaction(() => {
    d.run("DELETE FROM shifts");
    for (const s of shifts) {
      stmt.run(s.screen, s.startTime, s.endTime, s.slots, JSON.stringify(s.otherUshers));
    }
  });
  tx();
}

export function upsertScreenings(screenings: Screening[]) {
  const d = getDb();
  const stmt = d.prepare(`
    INSERT INTO screenings (film_name, start_time, screen, checkout_url, duration_mins)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(screen, start_time) DO UPDATE SET
      film_name = excluded.film_name,
      checkout_url = excluded.checkout_url,
      duration_mins = excluded.duration_mins
  `);

  const tx = d.transaction(() => {
    d.run("DELETE FROM screenings");
    for (const s of screenings) {
      stmt.run(s.filmName, s.startTime, s.screen, s.checkoutUrl, s.durationMins);
    }
  });
  tx();
}

export function updateSyncStatus(key: string, ok: boolean, error?: string) {
  const d = getDb();
  d.run(
    `INSERT INTO sync_status (key, last_synced_at, ok, error) VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       last_synced_at = excluded.last_synced_at,
       ok = excluded.ok,
       error = excluded.error`,
    [key, new Date().toISOString(), ok ? 1 : 0, error ?? null]
  );
}

const emptySyncEntry: SyncEntry = { lastSyncedAt: null, ok: true, error: null };

export function getSyncStatus(): SyncStatus {
  const d = getDb();
  const rows = d.query("SELECT key, last_synced_at, ok, error FROM sync_status").all() as {
    key: string;
    last_synced_at: string;
    ok: number;
    error: string | null;
  }[];
  const map = Object.fromEntries(
    rows.map((r) => [r.key, { lastSyncedAt: r.last_synced_at, ok: !!r.ok, error: r.error }])
  );
  return {
    shifts: map["shifts"] ?? { ...emptySyncEntry },
    screenings: map["screenings"] ?? { ...emptySyncEntry },
  };
}

export function getShiftsWithFilms(fromDate: string): ShiftWithFilms[] {
  const d = getDb();

  const shifts = d
    .query(
      `SELECT id, screen, start_time, end_time, slots, other_ushers
       FROM shifts
       WHERE start_time >= ?
       ORDER BY start_time`
    )
    .all(fromDate) as {
    id: number;
    screen: number;
    start_time: string;
    end_time: string;
    slots: number;
    other_ushers: string;
  }[];

  const screenings = d
    .query(
      `SELECT id, film_name, start_time, screen, checkout_url, duration_mins
       FROM screenings
       WHERE start_time >= ?
       ORDER BY start_time`
    )
    .all(fromDate) as {
    id: number;
    film_name: string;
    start_time: string;
    screen: number;
    checkout_url: string;
    duration_mins: number;
  }[];

  const typedShifts: Shift[] = shifts.map((s) => ({
    id: s.id,
    screen: s.screen,
    startTime: s.start_time,
    endTime: s.end_time,
    slots: s.slots,
    otherUshers: JSON.parse(s.other_ushers),
  }));

  const typedScreenings: Screening[] = screenings.map((s) => ({
    id: s.id,
    filmName: s.film_name,
    startTime: s.start_time,
    screen: s.screen,
    checkoutUrl: s.checkout_url,
    durationMins: s.duration_mins,
  }));

  return matchShiftsToFilms(typedShifts, typedScreenings);
}
