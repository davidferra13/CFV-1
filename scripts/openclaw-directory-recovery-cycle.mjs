#!/usr/bin/env node
import os from 'os'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import postgres from 'postgres'
import Database from 'better-sqlite3'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(scriptDir, '..')
dotenv.config({ path: join(rootDir, '.env.local'), quiet: true })

const ARCHIVE_DB = process.env.CF_DIRECTORY_ARCHIVE_DB ||
  'D:/PiArchive/2026-08-30/recovered-directory-db/openclaw-directory-images/directory-images.db'
const STATE_PATH = join(rootDir, 'data', 'openclaw-directory-recovery.json')
const MIN_FREE_GB = Number(process.env.CF_INTEL_MIN_FREE_GB || 8)
const BATCH = Math.min(Math.max(Number(process.env.CF_DIRECTORY_RECOVERY_BATCH || 1000), 1), 1000)

function readState() {
  try { return JSON.parse(readFileSync(STATE_PATH, 'utf8')) } catch { return { cursor: 0, restored: 0 } }
}

function writeState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

function slugify(value) {
  return String(value || 'listing').toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'listing'
}

function mapRow(row) {
  const shortId = String(row.listing_id).replace(/-/g, '').slice(0, 10)
  const base = slugify([row.name, row.city, row.state].filter(Boolean).join('-'))
  return {
    id: row.listing_id,
    name: row.name,
    slug: `${base}-${shortId}`,
    city: row.city || null,
    state: row.state || null,
    website_url: row.website_url || null,
    lat: Number.isFinite(row.lat) ? row.lat : null,
    lon: Number.isFinite(row.lon) ? row.lon : null,
    business_type: 'unknown',
    status: 'discovered',
    source: 'openstreetmap',
    source_id: null,
  }
}

async function main() {
  const state = readState()
  const freeGb = os.freemem() / 1024 ** 3
  if (freeGb < MIN_FREE_GB) {
    console.log(JSON.stringify({ status: 'skipped', reason: 'low_memory', freeGb: Number(freeGb.toFixed(2)), state }))
    return
  }
  if (!existsSync(ARCHIVE_DB)) throw new Error(`Archive DB missing: ${ARCHIVE_DB}`)

  const archive = new Database(ARCHIVE_DB, { readonly: true, fileMustExist: true })
  const integrity = archive.pragma('quick_check', { simple: true })
  if (integrity !== 'ok') throw new Error(`Archive DB quick_check failed: ${integrity}`)

  const rows = archive.prepare(`
    SELECT id, listing_id, name, city, state, website_url, lat, lon
    FROM image_queue
    WHERE id > ?
    ORDER BY id
    LIMIT ?
  `).all(Number(state.cursor || 0), BATCH)

  if (!rows.length) {
    const total = archive.prepare('SELECT COUNT(*) c FROM image_queue').get().c
    archive.close()
    const done = { ...state, status: 'complete', total, completedAt: new Date().toISOString() }
    writeState(done)
    console.log(JSON.stringify(done, null, 2))
    return
  }

  const sql = postgres(process.env.DATABASE_URL || process.env.DB_URL, { max: 2, connect_timeout: 5 })
  let inserted = 0
  let existing = 0

  try {
    for (const row of rows) {
      const r = mapRow(row)
      const result = await sql`
        INSERT INTO directory_listings (
          id, name, slug, city, state, website_url, lat, lon,
          business_type, status, source, source_id, photo_urls, featured
        ) VALUES (
          ${r.id}::uuid, ${r.name}, ${r.slug}, ${r.city}, ${r.state},
          ${r.website_url}, ${r.lat}, ${r.lon}, ${r.business_type},
          ${r.status}, ${r.source}, ${r.source_id}, ARRAY[]::text[], false
        )
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `
      if (result.length) inserted++
      else existing++
    }

    const [{ count }] = await sql`SELECT COUNT(*)::int count FROM directory_listings`
    const next = {
      cursor: rows.at(-1).id,
      restored: Number(state.restored || 0) + inserted,
      processed: Number(state.processed || 0) + rows.length,
      lastBatch: rows.length,
      inserted,
      existing,
      directoryCount: count,
      freeGb: Number(freeGb.toFixed(2)),
      status: 'advanced',
      updatedAt: new Date().toISOString(),
    }
    writeState(next)
    console.log(JSON.stringify(next, null, 2))
  } finally {
    await sql.end()
    archive.close()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
