#!/usr/bin/env node

/**
 * Push Stores from PostgreSQL to Pi SQLite
 *
 * PostgreSQL has 477K+ stores (from OSM ingestion, SNAP retailers, farmers markets,
 * and Pi's own scrapers). The Pi bridge (port 7700) only reads from its local
 * catalog_stores table (~37K). This script pushes ALL stores from PG -> Pi SQLite
 * so the bridge sees the full nationwide store registry.
 *
 * Flow:
 *   1. Query all stores from openclaw.stores (PG) with chain slug
 *   2. SSH into Pi and write to catalog_stores in prices.db
 *   3. Uses batched inserts via SSH + sqlite3 CLI for reliability
 *
 * Usage:
 *   node scripts/push-stores-to-pi.mjs [--dry-run] [--batch=5000]
 *
 * Cron (nightly after OSM ingestion):
 *   0 3 * * * cd /path/to/CFv1 && node scripts/push-stores-to-pi.mjs >> logs/push-stores.log 2>&1
 */

import postgres from 'postgres'
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const PI_HOST = process.env.PI_HOST || 'davidferra@10.0.0.177'
const PI_DB_PATH = '/home/davidferra/openclaw-prices/data/prices.db'
const TEMP_DIR = resolve(rootDir, '.openclaw-temp')

const isDryRun = process.argv.includes('--dry-run')
const batchArg = process.argv.find(a => a.startsWith('--batch='))
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1], 10) : 5000

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)

// Store types that are valid for the Pi bridge
const VALID_STORE_TYPES = new Set([
  'retail', 'wholesale', 'club', 'convenience', 'specialty',
  'farm', 'dollar', 'alcohol', 'frozen_food', 'ice_cream',
  'dairy', 'fuel', 'farmers_market', 'discount',
])

function escapeSql(val) {
  if (val == null) return 'NULL'
  const str = String(val).replace(/'/g, "''")
  return `'${str}'`
}

function piExec(cmd, timeoutMs = 30000) {
  return execSync(`ssh -o ConnectTimeout=10 -o BatchMode=yes ${PI_HOST} "${cmd}"`, {
    encoding: 'utf8',
    timeout: timeoutMs,
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim()
}

async function main() {
  const startTime = Date.now()
  log('=== Push Stores to Pi ===')
  log(`Pi host: ${PI_HOST}`)
  log(`Pi DB: ${PI_DB_PATH}`)
  log(`Dry run: ${isDryRun}`)
  log(`Batch size: ${BATCH_SIZE}`)

  mkdirSync(TEMP_DIR, { recursive: true })

  // Step 1: Test Pi connectivity
  try {
    const piTest = piExec(`sqlite3 ${PI_DB_PATH} "SELECT COUNT(*) FROM catalog_stores"`)
    log(`Pi current store count: ${piTest}`)
  } catch (err) {
    log(`FATAL: Cannot reach Pi or prices.db: ${err.message}`)
    process.exit(1)
  }

  // Step 2: Ensure Pi catalog_stores has required columns and constraints
  // Add store_type column if missing (for new store types)
  try {
    piExec(`sqlite3 ${PI_DB_PATH} "ALTER TABLE catalog_stores ADD COLUMN store_type TEXT DEFAULT 'retail'"`)
    log('Added store_type column to Pi catalog_stores')
  } catch {
    // Column already exists
  }

  // Add source column if missing (to track where store came from)
  try {
    piExec(`sqlite3 ${PI_DB_PATH} "ALTER TABLE catalog_stores ADD COLUMN source TEXT DEFAULT 'scraper'"`)
    log('Added source column to Pi catalog_stores')
  } catch {
    // Column already exists
  }

  // Create unique index on external_store_id so INSERT OR REPLACE works correctly
  try {
    piExec(`sqlite3 ${PI_DB_PATH} "CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_stores_ext_id ON catalog_stores(external_store_id)"`)
    log('Ensured unique index on external_store_id')
  } catch (err) {
    log(`WARN: Could not create unique index: ${err.message}`)
    log('Falling back to INSERT OR IGNORE strategy')
  }

  // Step 3: Query ALL stores from PostgreSQL with chain info
  const sql = postgres(DB_URL, { max: 5 })

  const totalResult = await sql`SELECT COUNT(*) as cnt FROM openclaw.stores`
  const totalStores = Number(totalResult[0].cnt)
  log(`PostgreSQL total stores: ${totalStores}`)

  // Step 4: Process in batches
  let offset = 0
  let totalPushed = 0
  let totalSkipped = 0
  let batchNum = 0

  while (offset < totalStores) {
    batchNum++
    const stores = await sql`
      SELECT
        s.id,
        s.external_store_id,
        s.name,
        s.address,
        s.city,
        s.state,
        s.zip,
        s.lat,
        s.lng,
        s.phone,
        s.store_type,
        s.hours_json,
        c.slug as chain_slug,
        c.name as chain_name
      FROM openclaw.stores s
      LEFT JOIN openclaw.chains c ON c.id = s.chain_id
      ORDER BY s.id
      LIMIT ${BATCH_SIZE} OFFSET ${offset}
    `

    if (stores.length === 0) break

    // Build SQL statements for this batch
    const statements = []

    for (const store of stores) {
      // Skip stores with no name or chain
      if (!store.name && !store.chain_slug) {
        totalSkipped++
        continue
      }

      const storeType = VALID_STORE_TYPES.has(store.store_type) ? store.store_type : 'retail'
      const externalId = store.external_store_id || `pg-${store.id}`
      const name = store.name || store.chain_name || 'Unknown'

      statements.push(
        `INSERT INTO catalog_stores ` +
        `(external_store_id, chain_slug, name, address, city, state, zip, lat, lng, phone, store_type, is_active, source) VALUES ` +
        `(${escapeSql(externalId)}, ${escapeSql(store.chain_slug)}, ${escapeSql(name)}, ` +
        `${escapeSql(store.address)}, ${escapeSql(store.city)}, ${escapeSql(store.state)}, ` +
        `${escapeSql(store.zip)}, ${store.lat != null ? store.lat : 'NULL'}, ` +
        `${store.lng != null ? store.lng : 'NULL'}, ${escapeSql(store.phone)}, ` +
        `${escapeSql(storeType)}, 1, 'pg_sync') ` +
        `ON CONFLICT(external_store_id) DO UPDATE SET ` +
        `chain_slug=excluded.chain_slug, name=excluded.name, address=excluded.address, ` +
        `city=excluded.city, state=excluded.state, zip=excluded.zip, ` +
        `lat=excluded.lat, lng=excluded.lng, phone=excluded.phone, ` +
        `store_type=excluded.store_type, is_active=1, source='pg_sync';`
      )
    }

    if (statements.length === 0) {
      offset += BATCH_SIZE
      continue
    }

    if (isDryRun) {
      log(`  Batch ${batchNum}: ${statements.length} stores (dry run, skipping)`)
      totalPushed += statements.length
      offset += BATCH_SIZE
      continue
    }

    // Write SQL to temp file and SCP to Pi, then execute
    const tempFile = resolve(TEMP_DIR, `stores-batch-${batchNum}.sql`)
    const piTempFile = `/tmp/stores-batch-${batchNum}.sql`

    // Wrap in transaction for speed
    const sqlContent = `BEGIN TRANSACTION;\n${statements.join('\n')}\nCOMMIT;\n`
    writeFileSync(tempFile, sqlContent)

    try {
      // SCP the file to Pi
      execSync(`scp -o ConnectTimeout=10 -o BatchMode=yes "${tempFile}" ${PI_HOST}:${piTempFile}`, {
        timeout: 60000,
        stdio: 'pipe',
      })

      // Execute on Pi
      execSync(
        `ssh -o ConnectTimeout=10 -o BatchMode=yes ${PI_HOST} "sqlite3 ${PI_DB_PATH} < ${piTempFile} && rm ${piTempFile}"`,
        { timeout: 120000, stdio: 'pipe' }
      )

      totalPushed += statements.length
      log(`  Batch ${batchNum}: ${statements.length} stores pushed (${offset + stores.length}/${totalStores})`)
    } catch (err) {
      log(`  Batch ${batchNum}: FAILED - ${err.message}`)
      // Try to clean up remote temp file
      try { piExec(`rm -f ${piTempFile}`, 5000) } catch {}
    }

    // Clean up local temp file
    try { unlinkSync(tempFile) } catch {}

    offset += BATCH_SIZE
  }

  // Step 5: Create index on external_store_id if not exists
  if (!isDryRun && totalPushed > 0) {
    log('Creating indexes on Pi...')
    try {
      piExec(`sqlite3 ${PI_DB_PATH} "CREATE INDEX IF NOT EXISTS idx_catalog_stores_external ON catalog_stores(external_store_id)"`, 60000)
      piExec(`sqlite3 ${PI_DB_PATH} "CREATE INDEX IF NOT EXISTS idx_catalog_stores_chain_slug ON catalog_stores(chain_slug)"`, 60000)
      piExec(`sqlite3 ${PI_DB_PATH} "CREATE INDEX IF NOT EXISTS idx_catalog_stores_state ON catalog_stores(state)"`, 60000)
      piExec(`sqlite3 ${PI_DB_PATH} "CREATE INDEX IF NOT EXISTS idx_catalog_stores_store_type ON catalog_stores(store_type)"`, 60000)
      log('  Indexes created')
    } catch (err) {
      log(`  Index creation warning: ${err.message}`)
    }
  }

  // Step 6: Verify final count on Pi
  if (!isDryRun) {
    try {
      const finalCount = piExec(`sqlite3 ${PI_DB_PATH} "SELECT COUNT(*) FROM catalog_stores"`)
      const byType = piExec(`sqlite3 ${PI_DB_PATH} "SELECT store_type, COUNT(*) FROM catalog_stores GROUP BY store_type ORDER BY COUNT(*) DESC LIMIT 15"`)
      log(`\nPi final store count: ${finalCount}`)
      log('By type:')
      for (const line of byType.split('\n').filter(Boolean)) {
        const [type, count] = line.split('|')
        log(`  ${type || 'NULL'}: ${count}`)
      }
    } catch (err) {
      log(`  Verification failed: ${err.message}`)
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  log(`\n=== COMPLETE ===`)
  log(`Pushed: ${totalPushed}`)
  log(`Skipped: ${totalSkipped}`)
  log(`Elapsed: ${elapsed}s`)

  await sql.end()
}

main().catch(err => {
  log(`FATAL: ${err.message}`)
  process.exit(1)
})
