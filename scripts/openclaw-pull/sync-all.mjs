#!/usr/bin/env node

/**
 * Full OpenClaw sync orchestrator.
 * Runs the complete pipeline in order:
 *   1. Pull SQLite from Pi -> populate openclaw.* tables
 *   2. Sync normalization map + auto-link ingredient aliases
 *   3. Sync prices from Pi API -> ingredient_price_history
 *   4. Refresh materialized views
 *
 * Usage: node scripts/openclaw-pull/sync-all.mjs
 */

import { execFileSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import postgres from 'postgres'
import config from './config.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../..')

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)

function runScript(name, path) {
  log(`\n${'='.repeat(60)}`)
  log(`STEP: ${name}`)
  log('='.repeat(60))
  try {
    execFileSync('node', [path], {
      cwd: rootDir,
      stdio: 'inherit',
      timeout: 600000, // 10 min max per step
      env: { ...process.env, DATABASE_URL: config.pg.connectionString },
    })
    log(`${name}: DONE`)
    return true
  } catch (err) {
    log(`${name}: FAILED (exit ${err.status})`)
    return false
  }
}

async function refreshViews() {
  log(`\n${'='.repeat(60)}`)
  log('STEP: Refresh materialized views')
  log('='.repeat(60))

  const sql = postgres(config.pg.connectionString)
  try {
    await sql.unsafe('SET search_path TO public, extensions')
    await sql.unsafe('REFRESH MATERIALIZED VIEW regional_price_averages')
    log('  Refreshed regional_price_averages')
    await sql.unsafe('REFRESH MATERIALIZED VIEW category_price_baselines')
    log('  Refreshed category_price_baselines')

    // Quick stats
    const rpa = await sql`SELECT COUNT(*) as cnt FROM regional_price_averages`
    const cpb = await sql`SELECT COUNT(*) as cnt FROM category_price_baselines`
    log(`  Regional averages: ${rpa[0].cnt}`)
    log(`  Category baselines: ${cpb[0].cnt}`)
  } finally {
    await sql.end()
  }
}

async function printSummary() {
  const sql = postgres(config.pg.connectionString)
  try {
    const products = await sql`SELECT COUNT(*) as cnt FROM openclaw.products`
    const stores = await sql`SELECT COUNT(*) as cnt FROM openclaw.stores`
    const prices = await sql`SELECT COUNT(*) as cnt FROM openclaw.store_products`
    const history = await sql`SELECT COUNT(*) as cnt FROM ingredient_price_history`
    const aliases = await sql`SELECT COUNT(*) as cnt FROM ingredient_aliases`
    const ings = await sql`SELECT COUNT(*) as cnt FROM ingredients`
    const priced = await sql`SELECT COUNT(*) as cnt FROM ingredients WHERE last_price_cents IS NOT NULL`
    const bridge = await sql`SELECT COUNT(*) as cnt FROM openclaw.ingredient_price_bridge`

    log(`\n${'='.repeat(60)}`)
    log('SYNC COMPLETE')
    log('='.repeat(60))
    log(`  Stores:          ${stores[0].cnt}`)
    log(`  Products:        ${products[0].cnt}`)
    log(`  Store prices:    ${prices[0].cnt}`)
    log(`  Price history:   ${history[0].cnt}`)
    log(`  Aliases:         ${aliases[0].cnt} / ${ings[0].cnt}`)
    log(`  Priced:          ${priced[0].cnt} / ${ings[0].cnt}`)
    log(`  Bridge rows:     ${bridge[0].cnt}`)
    log(`  Mapping:         ${ings[0].cnt > 0 ? ((aliases[0].cnt / ings[0].cnt) * 100).toFixed(1) : 0}%`)
    log(`  Null results:    ${ings[0].cnt > 0 ? (((ings[0].cnt - priced[0].cnt) / ings[0].cnt) * 100).toFixed(1) : 0}%`)
  } finally {
    await sql.end()
  }
}

async function main() {
  const start = Date.now()
  log('Starting full OpenClaw sync pipeline')

  // Step 1: Pull SQLite and populate openclaw.* tables
  const pullOk = runScript('Pull catalog from Pi', resolve(__dirname, 'pull.mjs'))
  if (!pullOk) {
    log('Pull failed. Continuing with existing data...')
  }

  // Step 2: Sync normalization map + auto-link aliases
  const normOk = runScript('Sync normalization + aliases', resolve(__dirname, 'sync-normalization.mjs'))
  if (!normOk) {
    log('Normalization sync failed. Continuing...')
  }

  // Step 3: Sync prices from Pi API
  const priceOk = runScript('Sync prices from Pi API', resolve(rootDir, 'scripts/run-openclaw-sync.mjs'))
  if (!priceOk) {
    log('Price sync failed.')
  }

  // Step 4: Refresh materialized views
  await refreshViews()

  // Summary
  await printSummary()

  const elapsed = Math.round((Date.now() - start) / 1000)
  log(`\nTotal time: ${elapsed}s`)
}

main().catch((err) => {
  console.error('[sync-all] Fatal:', err.message)
  process.exit(1)
})
