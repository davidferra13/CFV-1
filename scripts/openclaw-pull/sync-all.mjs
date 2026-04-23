#!/usr/bin/env node

/**
 * Full OpenClaw sync orchestrator.
 * Runs the complete pipeline in order:
 *   1. Pull SQLite from Pi -> populate openclaw.* tables
 *   2. Sync normalization map + auto-link ingredient aliases
 *   3. Promote canonical food items into system_ingredients
 *   4. Refresh system_ingredient market prices
 *   5. Sync prices from Pi API -> ingredient_price_history
 *   6. Refresh materialized views
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
const DELTA_FLAG = process.argv.includes('--delta')
const LAST_SYNC_FILE = resolve(__dirname, '.last-sync-time')
const SUMMARY_FILE = process.env.OPENCLAW_SYNC_SUMMARY_FILE || null

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`)

const pipelineSummary = {
  runId: `openclaw-${DELTA_FLAG ? 'delta' : 'full'}-${Date.now()}`,
  syncType: DELTA_FLAG ? 'delta' : 'full',
  status: 'running',
  partialSuccess: false,
  startedAt: new Date().toISOString(),
  completedAt: null,
  durationSeconds: null,
  failedStepNames: [],
  steps: [],
}

function persistSummary() {
  if (!SUMMARY_FILE) return

  pipelineSummary.failedStepNames = pipelineSummary.steps
    .filter((step) => step.status === 'failed')
    .map((step) => step.name)
  pipelineSummary.partialSuccess =
    pipelineSummary.status !== 'failed' && pipelineSummary.failedStepNames.length > 0

  try {
    writeFileSync(SUMMARY_FILE, JSON.stringify(pipelineSummary, null, 2))
  } catch {}
}

function recordStep(name, status, startedAt, extra = {}) {
  const completedAt = new Date()
  pipelineSummary.steps.push({
    name,
    status,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationSeconds: Math.round((completedAt.getTime() - startedAt.getTime()) / 100) / 10,
    ...extra,
  })
  persistSummary()
}

function finalizeSummary(status, extra = {}) {
  const completedAt = new Date()
  pipelineSummary.status = status
  pipelineSummary.completedAt = completedAt.toISOString()
  pipelineSummary.durationSeconds =
    Math.round((completedAt.getTime() - new Date(pipelineSummary.startedAt).getTime()) / 100) / 10
  Object.assign(pipelineSummary, extra)
  persistSummary()
}

persistSummary()

function parseNonNegativeInt(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

function runScript(name, path, timeoutMs = 3600000, options = {}) {
  const stepStartedAt = new Date()
  log(`\n${'='.repeat(60)}`)
  log(`STEP: ${name}`)
  log('='.repeat(60))
  try {
    const nodeArgs = options.nodeArgs ?? []
    const scriptArgs = options.scriptArgs ?? []
    execFileSync('node', [...nodeArgs, path, ...scriptArgs], {
      cwd: rootDir,
      stdio: 'inherit',
      timeout: timeoutMs, // default 1 hour; caller can override
      env: {
        ...process.env,
        DATABASE_URL: config.pg.connectionString,
        ...(options.env ?? {}),
      },
    })
    log(`${name}: DONE`)
    recordStep(name, 'success', stepStartedAt)
    return true
  } catch (err) {
    log(`${name}: FAILED (exit ${err.status})`)
    recordStep(name, 'failed', stepStartedAt, {
      error: err instanceof Error ? err.message : String(err),
      details: {
        exitCode: typeof err?.status === 'number' ? err.status : null,
        timeoutMs,
      },
    })
    return false
  }
}

async function refreshViews() {
  const stepStartedAt = new Date()
  log(`\n${'='.repeat(60)}`)
  log('STEP: Refresh materialized views')
  log('='.repeat(60))

  const sql = postgres(config.pg.connectionString)
  try {
    await sql.unsafe('SET search_path TO public, extensions')
    // CONCURRENTLY allows reads while refresh runs; requires unique index (exists).
    await sql.unsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY regional_price_averages')
    log('  Refreshed regional_price_averages')
    await sql.unsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY category_price_baselines')
    log('  Refreshed category_price_baselines')

    // Quick stats
    const rpa = await sql`SELECT COUNT(*) as cnt FROM regional_price_averages`
    const cpb = await sql`SELECT COUNT(*) as cnt FROM category_price_baselines`
    log(`  Regional averages: ${rpa[0].cnt}`)
    log(`  Category baselines: ${cpb[0].cnt}`)
    recordStep('Refresh materialized views', 'success', stepStartedAt, {
      details: {
        categoryBaselines: Number(cpb[0].cnt),
        regionalPriceAverages: Number(rpa[0].cnt),
      },
    })
  } catch (err) {
    recordStep('Refresh materialized views', 'failed', stepStartedAt, {
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
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
    // ingredient_price_bridge is a CROSS JOIN LATERAL view over 280K ingredients -
    // COUNT(*) would take hours. Use store_products as a proxy for bridge coverage.
    log(`\n${'='.repeat(60)}`)
    log('SYNC COMPLETE')
    log('='.repeat(60))
    log(`  Stores:          ${stores[0].cnt}`)
    log(`  Products:        ${products[0].cnt}`)
    log(`  Store prices:    ${prices[0].cnt}`)
    log(`  Price history:   ${history[0].cnt}`)
    log(`  Aliases:         ${aliases[0].cnt} / ${ings[0].cnt}`)
    log(`  Priced:          ${priced[0].cnt} / ${ings[0].cnt}`)
    log(`  Mapping:         ${ings[0].cnt > 0 ? ((aliases[0].cnt / ings[0].cnt) * 100).toFixed(1) : 0}%`)
    log(`  Null results:    ${ings[0].cnt > 0 ? (((ings[0].cnt - priced[0].cnt) / ings[0].cnt) * 100).toFixed(1) : 0}%`)
  } finally {
    await sql.end()
  }
}

function pullDocketDocs() {
  const stepStartedAt = new Date()
  log(`\n${'='.repeat(60)}`)
  log('STEP: Pull docket output documents')
  log('='.repeat(60))

  const piOutputDir = '/home/davidferra/openclaw-docket/output'
  const piDbPath = '/home/davidferra/openclaw-docket/docket.db'

  try {
    // List done (not yet pulled) files on Pi
    const piHost = process.env.PI_HOST || 'davidferra@10.0.0.177'
    const fileList = execSync(
      `ssh ${piHost} "ls ${piOutputDir}/ 2>/dev/null"`,
      { encoding: 'utf8', timeout: 15000 }
    ).trim()

    if (!fileList) {
      log('  No docket output files to pull.')
      recordStep('Pull docket output documents', 'success', stepStartedAt, {
        details: { filesSynced: 0 },
      })
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
        `ssh ${piHost} "cat ${piOutputDir}/${file}"`,
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
            `ssh ${piHost} "cd ~/openclaw-docket && node mark-pulled.mjs ${idMatch[1]}"`,
            { timeout: 10000 }
          )
        } catch {}
      }

      // Remove from Pi output dir (already pulled)
      try {
        execSync(`ssh ${piHost} "rm ${piOutputDir}/${file}"`, { timeout: 5000 })
      } catch {}
    }

    log(`  Docket pull: ${files.length} document(s) synced`)
    recordStep('Pull docket output documents', 'success', stepStartedAt, {
      details: { filesSynced: files.length },
    })
  } catch (err) {
    log(`  Docket pull failed: ${err.message}`)
    recordStep('Pull docket output documents', 'failed', stepStartedAt, {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

async function deltaSync() {
  const stepStartedAt = new Date()
  log(`\n${'='.repeat(60)}`)
  log('STEP: Delta sync (incremental)')
  log('='.repeat(60))

  // Read last sync time
  let since = '1970-01-01T00:00:00Z'
  if (existsSync(LAST_SYNC_FILE)) {
    since = readFileSync(LAST_SYNC_FILE, 'utf8').trim()
  }
  log(`  Last sync: ${since}`)

  try {
    const res = await fetch(
      `http://${config.pi.host}:${config.pi.port}/api/sync/delta?since=${encodeURIComponent(since)}`,
      { signal: AbortSignal.timeout(30000) }
    )
    if (!res.ok) throw new Error(`Delta API returned ${res.status}`)

    const data = await res.json()
    log(`  Price changes: ${data.price_changes.count}`)
    log(`  Updated prices: ${data.updated_prices.count}`)
    log(`  New anomalies: ${data.new_anomalies.count}`)

    if (data.price_changes.count === 0 && data.updated_prices.count === 0) {
      log('  No changes since last sync.')
      writeFileSync(LAST_SYNC_FILE, data.server_time)
      recordStep('Delta sync', 'success', stepStartedAt, {
        details: {
          appliedHistoryRows: 0,
          priceChanges: 0,
          updatedPrices: 0,
        },
      })
      return true
    }

    // Apply price changes to ingredient_price_history
    const sql = postgres(config.pg.connectionString)
    try {
      let applied = 0
      for (const change of data.price_changes.data) {
        try {
          await sql`
            INSERT INTO ingredient_price_history (
              id, ingredient_id, price_cents, unit, source, store_name,
              confirmed_at, created_at
            )
            SELECT gen_random_uuid(), i.id, ${change.new_price_cents},
              ${change.price_unit || 'each'}, ${'openclaw_' + (change.pricing_tier || 'retail')},
              ${change.source_name}, ${change.observed_at}::timestamptz, now()
            FROM ingredients i
            JOIN ingredient_aliases ia ON ia.ingredient_id = i.id
            JOIN system_ingredients si ON si.id = ia.system_ingredient_id
            WHERE LOWER(si.name) = LOWER(${change.ingredient_name})
            LIMIT 1
          `
          applied++
        } catch {}
      }
      log(`  Applied ${applied}/${data.price_changes.count} price changes to history`)
    } finally {
      await sql.end()
    }

    // Save sync timestamp
    writeFileSync(LAST_SYNC_FILE, data.server_time)
    log(`  Sync timestamp saved: ${data.server_time}`)
    recordStep('Delta sync', 'success', stepStartedAt, {
      details: {
        appliedHistoryRows: data.price_changes.count,
        priceChanges: data.price_changes.count,
        updatedPrices: data.updated_prices.count,
      },
    })
    return true
  } catch (err) {
    log(`  Delta sync failed: ${err.message}`)
    recordStep('Delta sync', 'failed', stepStartedAt, {
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

async function main() {
  const start = Date.now()
  log('Starting ' + (DELTA_FLAG ? 'DELTA (incremental)' : 'full') + ' OpenClaw sync pipeline')

  if (DELTA_FLAG) {
    // Fast path: only sync changes since last run
    const deltaOk = await deltaSync()
    if (!deltaOk) {
      log('Delta sync failed. Run without --delta for full sync.')
    }

    // Still pull docket docs and refresh views
    pullDocketDocs()
    await refreshViews()
    await printSummary()

    const elapsed = Math.round((Date.now() - start) / 1000)
    log(`\nTotal time: ${elapsed}s (delta)`)
    finalizeSummary(
      pipelineSummary.failedStepNames.length > 0 ? 'partial' : 'success'
    )
    return
  }

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

  // Step 3: Promote canonical food items into system_ingredients
  const promoteOk = runScript(
    'Promote canonical foods to system ingredients',
    resolve(rootDir, 'scripts/openclaw-promote-foods.ts'),
    3600000,
    {
      nodeArgs: ['--import', 'tsx'],
    }
  )
  if (!promoteOk) {
    log('Food promotion failed. Continuing...')
  }

  // Step 4: Refresh system ingredient market prices
  const marketAggOk = runScript(
    'Refresh system ingredient market prices',
    resolve(rootDir, 'scripts/sync-system-ingredient-prices.mjs')
  )
  if (!marketAggOk) {
    log('System ingredient market-price refresh failed. Continuing...')
  }

  // Step 5: Sync prices from Pi API
  const priceOk = runScript('Sync prices from Pi API', resolve(rootDir, 'scripts/run-openclaw-sync.mjs'))
  if (!priceOk) {
    log('Price sync failed.')
  }

  // Step 6: Incrementally document promoted ingredients
  const knowledgeLimit = parseNonNegativeInt(process.env.OPENCLAW_FOOD_PROMOTION_WIKI_LIMIT, 50)
  if (knowledgeLimit > 0) {
    const wikiOk = runScript(
      'Incremental ingredient knowledge enrichment',
      resolve(rootDir, 'scripts/openclaw-wiki-enrichment.mjs'),
      3600000,
      {
        scriptArgs: ['--resume', '--limit', String(knowledgeLimit)],
      }
    )
    if (!wikiOk) {
      log('Knowledge enrichment failed. Continuing...')
    }
  } else {
    log('Skipping incremental ingredient knowledge enrichment (limit=0)')
  }

  // Step 7: Pull docket output documents from Pi
  pullDocketDocs()

  // Step 8: Snapshot current prices for time-series tracking
  const snapshotStepStartedAt = new Date()
  try {
    const sql = postgres(config.pg.connectionString)
    const snapshotResult = await sql`
      INSERT INTO openclaw.price_snapshots (store_product_id, price_cents, is_sale, observed_at)
      SELECT sp.id, sp.price_cents, COALESCE(sp.is_sale, false), now()
      FROM openclaw.store_products sp
      WHERE sp.last_seen_at > now() - interval '1 day'
        AND sp.price_cents > 0
      ON CONFLICT DO NOTHING
    `
    log(`  Price snapshots: ${snapshotResult.count} observations recorded`)
    recordStep('Snapshot current prices', 'success', snapshotStepStartedAt, {
      details: {
        snapshotCount: snapshotResult.count,
      },
    })
    await sql.end()
  } catch (err) {
    log(`  Price snapshots failed (non-blocking): ${err.message}`)
    recordStep('Snapshot current prices', 'failed', snapshotStepStartedAt, {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // Step 9: Refresh materialized views
  await refreshViews()

  // Summary
  await printSummary()

  // Step 10: Price probe - verify key ingredients have prices
  runScript('Price probe', resolve(__dirname, 'price-probe.mjs'))

  // Save sync timestamp for future delta syncs
  writeFileSync(LAST_SYNC_FILE, new Date().toISOString())

  const elapsed = Math.round((Date.now() - start) / 1000)
  log(`\nTotal time: ${elapsed}s`)
  finalizeSummary(
    pipelineSummary.failedStepNames.length > 0 ? 'partial' : 'success'
  )
}

main().catch((err) => {
  finalizeSummary('failed', {
    fatalError: err instanceof Error ? err.message : String(err),
  })
  console.error('[sync-all] Fatal:', err.message)
  process.exit(1)
})
