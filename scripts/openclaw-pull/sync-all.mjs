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

import { execFileSync, execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
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

function pullDocketDocs() {
  log(`\n${'='.repeat(60)}`)
  log('STEP: Pull docket output documents')
  log('='.repeat(60))

  const piOutputDir = '/home/davidferra/openclaw-docket/output'
  const piDbPath = '/home/davidferra/openclaw-docket/docket.db'

  try {
    // List done (not yet pulled) files on Pi
    const fileList = execSync(
      `ssh pi "ls ${piOutputDir}/ 2>/dev/null"`,
      { encoding: 'utf8', timeout: 15000 }
    ).trim()

    if (!fileList) {
      log('  No docket output files to pull.')
      return
    }

    const files = fileList.split('\n').filter(f => f.endsWith('.md'))
    if (files.length === 0) {
      log('  No .md files in docket output.')
      return
    }

    log(`  Found ${files.length} output file(s)`)

    for (const file of files) {
      // Read the file to determine output type from frontmatter
      const content = execSync(
        `ssh pi "cat ${piOutputDir}/${file}"`,
        { encoding: 'utf8', timeout: 15000 }
      )

      // Determine destination based on output_type in frontmatter
      let destDir = resolve(rootDir, 'docs/specs')
      if (content.includes('output_type: research')) {
        destDir = resolve(rootDir, 'docs/research')
      }

      if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })

      const destPath = resolve(destDir, file)
      writeFileSync(destPath, content)
      log(`  Pulled: ${file} -> ${destDir}/`)

      // Extract docket item ID and mark as pulled on Pi
      const idMatch = content.match(/docket_item_id:\s*(\d+)/)
      if (idMatch) {
        try {
          execSync(
            `ssh pi "cd ~/openclaw-docket && node mark-pulled.mjs ${idMatch[1]}"`,
            { timeout: 10000 }
          )
        } catch {}
      }

      // Remove from Pi output dir (already pulled)
      try {
        execSync(`ssh pi "rm ${piOutputDir}/${file}"`, { timeout: 5000 })
      } catch {}
    }

    log(`  Docket pull: ${files.length} document(s) synced`)
  } catch (err) {
    log(`  Docket pull failed: ${err.message}`)
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

  // Step 4: Pull docket output documents from Pi
  pullDocketDocs()

  // Step 5: Refresh materialized views
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
