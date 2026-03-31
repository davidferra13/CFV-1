/**
 * Archive Digester SQLite database initialization.
 * Creates all tables on first run. Idempotent.
 */

import { createRequire } from 'module'
import path from 'path'
import os from 'os'
import fs from 'fs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const DATA_DIR = path.join(os.homedir(), 'openclaw-archive-digester', 'data')
const DB_PATH = path.join(DATA_DIR, 'archive.db')

export function openDb(readonly = false) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const db = new Database(DB_PATH, { readonly })
  db.pragma('journal_mode = WAL')
  return db
}

export function initDb() {
  const db = openDb()

  db.exec(`
    CREATE TABLE IF NOT EXISTS archive_files (
      id TEXT PRIMARY KEY,
      file_hash TEXT UNIQUE NOT NULL,
      original_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size_bytes INTEGER,
      classification TEXT,
      classification_confidence REAL,
      ocr_text TEXT,
      extracted_entities TEXT,
      linked_client_id TEXT,
      linked_event_id TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS archive_clients (
      id TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      name_variants TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      dietary_notes TEXT,
      allergen_notes TEXT,
      first_seen_date TEXT,
      last_seen_date TEXT,
      total_events INTEGER DEFAULT 0,
      total_revenue_cents INTEGER DEFAULT 0,
      notes TEXT,
      chefflow_client_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS archive_events (
      id TEXT PRIMARY KEY,
      client_id TEXT REFERENCES archive_clients(id),
      event_date TEXT,
      occasion TEXT,
      guest_count INTEGER,
      location TEXT,
      menu_summary TEXT,
      revenue_cents INTEGER,
      expense_cents INTEGER,
      tip_cents INTEGER,
      payment_method TEXT,
      notes TEXT,
      confidence TEXT DEFAULT 'low',
      source_file_ids TEXT,
      chefflow_event_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS archive_recipes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      ingredients TEXT,
      instructions TEXT,
      source_file_id TEXT REFERENCES archive_files(id),
      completeness TEXT DEFAULT 'partial',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS archive_financials (
      id TEXT PRIMARY KEY,
      event_id TEXT REFERENCES archive_events(id),
      type TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      description TEXT,
      vendor TEXT,
      date TEXT,
      source_file_id TEXT REFERENCES archive_files(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS archive_processing_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stage TEXT NOT NULL,
      files_processed INTEGER,
      files_succeeded INTEGER,
      files_failed INTEGER,
      duration_ms INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      records_sent INTEGER,
      records_accepted INTEGER,
      records_rejected INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_files_status ON archive_files(status);
    CREATE INDEX IF NOT EXISTS idx_files_classification ON archive_files(classification);
    CREATE INDEX IF NOT EXISTS idx_files_hash ON archive_files(file_hash);
    CREATE INDEX IF NOT EXISTS idx_events_client ON archive_events(client_id);
    CREATE INDEX IF NOT EXISTS idx_events_date ON archive_events(event_date);
    CREATE INDEX IF NOT EXISTS idx_financials_event ON archive_financials(event_id);
  `)

  // Crash recovery: reset any 'processing' files back to their previous state
  db.prepare("UPDATE archive_files SET status = 'pending' WHERE status = 'processing'").run()

  db.close()
  console.log(`Archive DB initialized at ${DB_PATH}`)
}
