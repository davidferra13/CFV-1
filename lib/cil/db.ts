// CIL - Per-tenant SQLite database management
// Each chef gets their own SQLite file for complete isolation

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const CIL_DIR = path.join(process.cwd(), 'storage', 'cil')

// In-memory cache of open database connections per tenant
const dbCache = new Map<string, Database.Database>()

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '{}',
  velocity TEXT NOT NULL DEFAULT '{}',
  last_observed INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  observation_count INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS relations (
  id TEXT PRIMARY KEY,
  from_entity TEXT NOT NULL REFERENCES entities(id),
  to_entity TEXT NOT NULL REFERENCES entities(id),
  type TEXT NOT NULL,
  strength REAL NOT NULL DEFAULT 0.5,
  confidence TEXT NOT NULL DEFAULT 'INFERRED',
  confidence_score REAL NOT NULL DEFAULT 0.8,
  evidence TEXT NOT NULL DEFAULT '[]',
  periodicity INTEGER,
  chef_override INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  last_reinforced INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS signals (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  entity_ids TEXT NOT NULL DEFAULT '[]',
  payload TEXT NOT NULL DEFAULT '{}',
  timestamp INTEGER NOT NULL,
  interpretation_status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_last_observed ON entities(last_observed);
CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_entity);
CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_entity);
CREATE INDEX IF NOT EXISTS idx_relations_type ON relations(type);
CREATE INDEX IF NOT EXISTS idx_signals_source ON signals(source);
CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(interpretation_status);
CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);
`

export function getOrCreateDB(tenantId: string): Database.Database {
  const cached = dbCache.get(tenantId)
  if (cached) return cached

  // Ensure directory exists
  if (!fs.existsSync(CIL_DIR)) {
    fs.mkdirSync(CIL_DIR, { recursive: true })
  }

  const dbPath = path.join(CIL_DIR, `${tenantId}.db`)
  const db = new Database(dbPath)

  // WAL mode for concurrent reads + one writer
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('busy_timeout = 5000')

  // Create schema
  db.exec(SCHEMA_SQL)

  dbCache.set(tenantId, db)
  return db
}

export function closeDB(tenantId: string): void {
  const db = dbCache.get(tenantId)
  if (db) {
    db.close()
    dbCache.delete(tenantId)
  }
}

export function closeAllDBs(): void {
  for (const [tenantId, db] of dbCache) {
    db.close()
    dbCache.delete(tenantId)
  }
}

export function deleteTenantDB(tenantId: string): void {
  closeDB(tenantId)
  const dbPath = path.join(CIL_DIR, `${tenantId}.db`)
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
  // WAL and SHM files
  if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal')
  if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm')
}

export function getDBPath(tenantId: string): string {
  return path.join(CIL_DIR, `${tenantId}.db`)
}
