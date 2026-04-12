/**
 * SQLite database for directory image queue.
 * Tracks which listings need photos, scraping status, and sync state.
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, 'directory-images.db')

const db = new Database(DB_PATH)

// WAL mode for concurrent reads
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS image_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    website_url TEXT,
    lat REAL,
    lon REAL,
    status TEXT NOT NULL DEFAULT 'pending',
    -- pending | processing | found | not_found | error
    photo_path TEXT,           -- local path to downloaded image
    source TEXT,               -- og_image | json_ld | hero_img | google_places
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TEXT,
    synced_to_chefflow INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_queue_status ON image_queue(status);
  CREATE INDEX IF NOT EXISTS idx_queue_synced ON image_queue(synced_to_chefflow);
  CREATE INDEX IF NOT EXISTS idx_queue_state ON image_queue(state);
`)

// Prepared statements
export const queries = {
  getPending: db.prepare(`
    SELECT * FROM image_queue
    WHERE status = 'pending' AND website_url IS NOT NULL AND website_url != ''
    ORDER BY state ASC, city ASC
    LIMIT ?
  `),

  getPendingByState: db.prepare(`
    SELECT * FROM image_queue
    WHERE status = 'pending' AND website_url IS NOT NULL AND website_url != '' AND state = ?
    ORDER BY city ASC
    LIMIT ?
  `),

  getUnsynced: db.prepare(`
    SELECT listing_id, photo_path, source FROM image_queue
    WHERE status = 'found' AND synced_to_chefflow = 0
    LIMIT ?
  `),

  markFound: db.prepare(`
    UPDATE image_queue
    SET status = 'found', photo_path = ?, source = ?,
        attempts = attempts + 1, last_attempt_at = datetime('now'),
        updated_at = datetime('now')
    WHERE listing_id = ?
  `),

  markNotFound: db.prepare(`
    UPDATE image_queue
    SET status = 'not_found', attempts = attempts + 1,
        last_attempt_at = datetime('now'), updated_at = datetime('now')
    WHERE listing_id = ?
  `),

  markError: db.prepare(`
    UPDATE image_queue
    SET status = 'error', error_message = ?,
        attempts = attempts + 1, last_attempt_at = datetime('now'),
        updated_at = datetime('now')
    WHERE listing_id = ?
  `),

  markSynced: db.prepare(`
    UPDATE image_queue
    SET synced_to_chefflow = 1, updated_at = datetime('now')
    WHERE listing_id = ?
  `),

  markSyncedBatch: db.transaction((ids) => {
    const stmt = db.prepare(`
      UPDATE image_queue SET synced_to_chefflow = 1, updated_at = datetime('now')
      WHERE listing_id = ?
    `)
    for (const id of ids) stmt.run(id)
  }),

  upsertListing: db.prepare(`
    INSERT INTO image_queue (listing_id, name, city, state, website_url, lat, lon)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(listing_id) DO NOTHING
  `),

  upsertBatch: db.transaction((rows) => {
    const stmt = db.prepare(`
      INSERT INTO image_queue (listing_id, name, city, state, website_url, lat, lon)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(listing_id) DO NOTHING
    `)
    for (const r of rows) {
      stmt.run(r.listing_id || r.id, r.name, r.city, r.state, r.website_url, r.lat, r.lon)
    }
  }),

  getStats: db.prepare(`
    SELECT
      count(*) as total,
      sum(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      sum(CASE WHEN status = 'found' THEN 1 ELSE 0 END) as found,
      sum(CASE WHEN status = 'not_found' THEN 1 ELSE 0 END) as not_found,
      sum(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errored,
      sum(CASE WHEN synced_to_chefflow = 1 THEN 1 ELSE 0 END) as synced
    FROM image_queue
  `),

  getStatsByState: db.prepare(`
    SELECT state,
      count(*) as total,
      sum(CASE WHEN status = 'found' THEN 1 ELSE 0 END) as found,
      sum(CASE WHEN synced_to_chefflow = 1 THEN 1 ELSE 0 END) as synced
    FROM image_queue
    GROUP BY state
    ORDER BY total DESC
    LIMIT 20
  `),
}

export default db
