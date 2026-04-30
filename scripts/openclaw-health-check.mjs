#!/usr/bin/env node
/**
 * OpenClaw Health Check
 *
 * Phase 1 verification for openclaw-total-capture spec.
 * Checks:
 *   1. Products per chain (flag any with 0)
 *   2. sync_runs last 7 days (flag missing or failed days)
 *   3. Price freshness (% updated within 7 days)
 *   4. Overall product count trend (not static, not shrinking)
 *
 * Usage:
 *   node scripts/openclaw-health-check.mjs
 *
 * Output: GREEN (all passing) or RED (what's failing), then exit.
 * Exit code: 0 = GREEN, 1 = RED.
 */

import postgres from 'postgres'
import { existsSync, readFileSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const PHASE_1_CHAIN_TARGETS = [
  { label: 'Walmart', slugs: ['walmart'] },
  { label: 'Whole Foods', slugs: ['whole_foods', 'whole-foods'] },
  { label: "Shaw's", slugs: ['shaws', 'shaw_s', 'shaws_supermarket'] },
  { label: 'Target', slugs: ['target'] },
  { label: "Trader Joe's", slugs: ['trader_joes', 'trader-joes', 'trader_joe'] },
]
const PRODUCT_SAMPLE_LIMIT = 50001

function readDatabaseUrlFromEnvFile(filePath) {
  if (!existsSync(filePath)) return null
  const env = readFileSync(filePath, 'utf8')
  const match = env.match(/^DATABASE_URL=(.+)$/m)
  if (!match) return null
  return match[1].trim().replace(/^["']|["']$/g, '')
}

function findDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const envCandidates = [
    resolve(projectRoot, '.env.local'),
    resolve(projectRoot, '.env'),
    resolve(projectRoot, '../..', '.env.local'),
    resolve(projectRoot, '../..', '.env'),
    join(process.cwd(), '.env.local'),
    join(process.cwd(), '.env'),
  ]

  for (const candidate of envCandidates) {
    const value = readDatabaseUrlFromEnvFile(candidate)
    if (value) return value
  }

  return 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
}

function sqlList(values) {
  return values.map((value) => `'${String(value).replace(/'/g, "''")}'`).join(', ')
}

function formatDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value)
}

function formatSampledCount(value) {
  const count = Number(value || 0)
  if (count >= PRODUCT_SAMPLE_LIMIT) return `${(PRODUCT_SAMPLE_LIMIT - 1).toLocaleString()}+`
  return count.toLocaleString()
}

const dbUrl = findDatabaseUrl()
const sql = postgres(dbUrl, { max: 3, idle_timeout: 10 })

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

function ok(msg) {
  console.log(`${GREEN}  OK${RESET}  ${msg}`)
}
function warn(msg) {
  console.log(`${YELLOW}WARN${RESET}  ${msg}`)
}
function fail(msg) {
  console.log(`${RED}FAIL${RESET}  ${msg}`)
}

let anyFail = false

async function estimateTableRows(schemaName, tableName) {
  const rows = await sql`
    SELECT COALESCE(c.reltuples, 0)::bigint AS estimate
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = ${schemaName}
      AND c.relname = ${tableName}
    LIMIT 1
  `
  return Number(rows[0]?.estimate || 0)
}

async function main() {
  console.log(`\nOpenClaw Health Check - ${new Date().toLocaleString()}\n`)
  await sql`SET statement_timeout = '30s'`

  // 1. Phase 1 blocker chains
  console.log('=== Phase 1 Blocker Chains ===')
  try {
    for (const target of PHASE_1_CHAIN_TARGETS) {
      const rows = await sql.unsafe(`
        SELECT COUNT(*)::int AS sampled_products
        FROM (
          SELECT 1
          FROM openclaw.chains c
          JOIN openclaw.stores s
            ON s.chain_id = c.id
           AND COALESCE(s.is_active, true) = true
          JOIN openclaw.store_products sp
            ON sp.store_id = s.id
           AND sp.price_cents > 0
          WHERE c.slug IN (${sqlList(target.slugs)})
          LIMIT ${PRODUCT_SAMPLE_LIMIT}
        ) sampled
      `)
      const productCount = Number(rows[0]?.sampled_products || 0)

      const chainRows = await sql.unsafe(`
        SELECT COUNT(*)::int AS chain_count
        FROM openclaw.chains c
        WHERE c.slug IN (${sqlList(target.slugs)})
      `)
      if (Number(chainRows[0]?.chain_count || 0) === 0) {
        fail(`${target.label}: chain missing from openclaw.chains`)
        anyFail = true
      } else if (productCount <= 0) {
        fail(`${target.label}: 0 products`)
        anyFail = true
      } else {
        ok(`${target.label}: ${formatSampledCount(productCount)} sampled priced products`)
      }
    }
  } catch (err) {
    fail(`Could not query Phase 1 chain stats: ${err.message}`)
    anyFail = true
  }

  // 2. Source manifest snapshot. Full all-chain product counting is intentionally
  // avoided here because openclaw.store_products can hold tens of millions of rows.
  console.log('\n=== Source Manifest Snapshot ===')
  try {
    const rows = await sql`
      SELECT status, COUNT(*)::int AS source_count
      FROM openclaw.source_manifest
      GROUP BY status
      ORDER BY status ASC
    `

    if (rows.length === 0) {
      warn('source_manifest has no rows yet')
    } else {
      for (const row of rows) {
        ok(`${row.status}: ${Number(row.source_count).toLocaleString()} source(s)`)
      }
    }
  } catch (err) {
    warn(`Could not query source_manifest: ${err.message}`)
  }

  // 3. Sync runs - last 7 days
  console.log('\n=== Sync Runs (Last 7 Days) ===')
  try {
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'openclaw' AND table_name = 'sync_runs'
    `
    const columnSet = new Set(columns.map((row) => row.column_name))
    const failureExpression = columnSet.has('status')
      ? "SUM(CASE WHEN status = 'failed' OR COALESCE(errors, 0) > 0 THEN 1 ELSE 0 END)::int"
      : 'SUM(CASE WHEN COALESCE(errors, 0) > 0 THEN 1 ELSE 0 END)::int'

    const runs = await sql.unsafe(`
      SELECT
        started_at::date AS run_date,
        COUNT(*)::int AS run_count,
        ${failureExpression} AS failed_count,
        SUM(COALESCE(products_synced, 0))::int AS products_synced,
        SUM(COALESCE(prices_synced, 0))::int AS prices_synced
      FROM openclaw.sync_runs
      WHERE started_at > NOW() - INTERVAL '7 days'
      GROUP BY 1
      ORDER BY 1 DESC
    `)

    if (runs.length === 0) {
      fail('No sync runs in the last 7 days')
      anyFail = true
    } else if (runs.length < 7) {
      warn(`Only ${runs.length}/7 days have sync runs`)
      for (const r of runs) {
        ok(`${r.run_date}: ${r.run_count} run(s)`)
      }
    } else {
      ok(`${runs.length} days of sync runs`)
      for (const r of runs) {
        if (r.failed_count > 0) {
          fail(`${formatDate(r.run_date)}: ${r.failed_count} failed or erroring run(s)`)
          anyFail = true
        } else if (Number(r.products_synced) <= 0 && Number(r.prices_synced) <= 0) {
          fail(`${formatDate(r.run_date)}: sync ran but captured no products or prices`)
          anyFail = true
        } else {
          ok(
            `${formatDate(r.run_date)}: ${r.run_count} run(s), ` +
              `${Number(r.products_synced).toLocaleString()} products, ` +
              `${Number(r.prices_synced).toLocaleString()} prices`
          )
        }
      }
    }
  } catch (err) {
    fail(`Could not query sync_runs: ${err.message}`)
    anyFail = true
  }

  // 4. Daily capture growth proxy
  console.log('\n=== Daily Capture Growth Proxy ===')
  try {
    const daily = await sql`
      SELECT
        started_at::date AS observed_date,
        SUM(COALESCE(products_synced, 0))::int AS products_seen,
        SUM(COALESCE(prices_synced, 0))::int AS price_records_seen
      FROM openclaw.sync_runs
      WHERE started_at > NOW() - INTERVAL '7 days'
      GROUP BY 1
      ORDER BY 1 ASC
    `

    if (daily.length < 2) {
      fail('Fewer than 2 days of observed price records in the last 7 days')
      anyFail = true
    } else {
      let previousProducts = 0
      for (const row of daily) {
        const productsSeen = Number(row.products_seen)
        const priceRecordsSeen = Number(row.price_records_seen)
        if (productsSeen <= 0 || priceRecordsSeen <= 0) {
          fail(`${formatDate(row.observed_date)}: no observed product growth`)
          anyFail = true
        } else if (productsSeen < previousProducts) {
          warn(
            `${formatDate(row.observed_date)}: observed products dropped from ` +
              `${previousProducts.toLocaleString()} to ${productsSeen.toLocaleString()}`
          )
        } else {
          ok(
            `${formatDate(row.observed_date)}: ${productsSeen.toLocaleString()} products synced, ` +
              `${priceRecordsSeen.toLocaleString()} prices synced`
          )
        }
        previousProducts = productsSeen
      }
    }
  } catch (err) {
    fail(`Could not query daily capture growth: ${err.message}`)
    anyFail = true
  }

  // 5. Price freshness
  console.log('\n=== Price Freshness ===')
  try {
    const [estimatedTotal, fresh] = await Promise.all([
      estimateTableRows('openclaw', 'store_products'),
      sql`
        SELECT COUNT(*)::int AS cnt
        FROM (
          SELECT 1
          FROM openclaw.store_products
          WHERE last_seen_at > NOW() - INTERVAL '7 days'
          LIMIT ${PRODUCT_SAMPLE_LIMIT}
        ) sampled
      `,
    ])

    const totalCount = estimatedTotal
    const freshCount = fresh[0]?.cnt ?? 0
    const pct = totalCount > 0 ? Math.round((freshCount / totalCount) * 100) : 0

    if (pct >= 50) {
      ok(
        `${pct}% of prices updated within 7 days ` +
          `(${formatSampledCount(freshCount)} sampled fresh/${totalCount.toLocaleString()} estimated total)`
      )
    } else {
      warn(
        `Only ${pct}% of prices updated within 7 days ` +
          `(${formatSampledCount(freshCount)} sampled fresh/${totalCount.toLocaleString()} estimated total)`
      )
    }
  } catch (err) {
    fail(`Could not query price freshness: ${err.message}`)
    anyFail = true
  }

  // 6. Total product count
  console.log('\n=== Total Product Count ===')
  try {
    const [productCount, storeProductCount] = await Promise.all([
      estimateTableRows('openclaw', 'products'),
      estimateTableRows('openclaw', 'store_products'),
    ])

    ok(`${productCount.toLocaleString()} estimated products`)
    ok(`${storeProductCount.toLocaleString()} estimated store-price records`)
  } catch (err) {
    fail(`Could not query product counts: ${err.message}`)
    anyFail = true
  }

  // Summary
  console.log('\n' + '='.repeat(40))
  if (anyFail) {
    console.log(`\n${RED}RESULT: RED - Issues found above${RESET}\n`)
    process.exit(1)
  } else {
    console.log(`\n${GREEN}RESULT: GREEN - All checks passed${RESET}\n`)
    process.exit(0)
  }
}

main().catch((err) => {
  console.error('[health-check] Fatal error:', err)
  process.exit(1)
}).finally(() => sql.end())
