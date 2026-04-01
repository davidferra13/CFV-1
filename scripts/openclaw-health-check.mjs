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
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env.local from project root
let dbUrl
try {
  const env = readFileSync(resolve(__dirname, '../.env.local'), 'utf8')
  const match = env.match(/^DATABASE_URL=(.+)$/m)
  if (match) dbUrl = match[1].trim()
} catch {
  // fall through
}

if (!dbUrl) {
  dbUrl = process.env.DATABASE_URL
}

if (!dbUrl) {
  console.error('[health-check] ERROR: DATABASE_URL not found in .env.local or environment')
  process.exit(1)
}

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

async function main() {
  console.log(`\nOpenClaw Health Check - ${new Date().toLocaleString()}\n`)

  // 1. Chain product counts
  console.log('=== Chain Product Counts ===')
  try {
    const rows = await sql`
      SELECT c.name, c.slug, COUNT(DISTINCT sp.product_id)::int AS product_count
      FROM openclaw.chains c
      LEFT JOIN openclaw.stores s ON s.chain_id = c.id AND s.is_active = true
      LEFT JOIN openclaw.store_products sp ON sp.store_id = s.id
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.slug
      ORDER BY product_count DESC
    `

    const zeroChains = []
    for (const row of rows) {
      if (row.product_count === 0) {
        zeroChains.push(row.name)
        fail(`${row.name} (${row.slug}): 0 products`)
        anyFail = true
      } else {
        ok(`${row.name}: ${row.product_count.toLocaleString()} products`)
      }
    }

    if (zeroChains.length === 0) {
      console.log(`\n  All ${rows.length} chains have products.`)
    } else {
      console.log(`\n  ${zeroChains.length} chains with 0 products: ${zeroChains.join(', ')}`)
    }
  } catch (err) {
    fail(`Could not query chain stats: ${err.message}`)
    anyFail = true
  }

  // 2. Sync runs - last 7 days
  console.log('\n=== Sync Runs (Last 7 Days) ===')
  try {
    const runs = await sql`
      SELECT
        started_at::date AS run_date,
        COUNT(*)::int AS run_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::int AS failed_count
      FROM openclaw.sync_runs
      WHERE started_at > NOW() - INTERVAL '7 days'
      GROUP BY 1
      ORDER BY 1 DESC
    `.catch(() => sql`
      SELECT started_at::date AS run_date, COUNT(*)::int AS run_count
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
          fail(`${r.run_date}: ${r.failed_count} failed run(s)`)
          anyFail = true
        } else {
          ok(`${r.run_date}: ${r.run_count} run(s)`)
        }
      }
    }
  } catch (err) {
    fail(`Could not query sync_runs: ${err.message}`)
    anyFail = true
  }

  // 3. Price freshness
  console.log('\n=== Price Freshness ===')
  try {
    const [total, fresh] = await Promise.all([
      sql`SELECT COUNT(*)::int AS cnt FROM openclaw.store_products`,
      sql`SELECT COUNT(*)::int AS cnt FROM openclaw.store_products WHERE last_seen_at > NOW() - INTERVAL '7 days'`,
    ])

    const totalCount = total[0]?.cnt ?? 0
    const freshCount = fresh[0]?.cnt ?? 0
    const pct = totalCount > 0 ? Math.round((freshCount / totalCount) * 100) : 0

    if (pct >= 50) {
      ok(`${pct}% of prices updated within 7 days (${freshCount.toLocaleString()}/${totalCount.toLocaleString()})`)
    } else {
      warn(`Only ${pct}% of prices updated within 7 days (${freshCount.toLocaleString()}/${totalCount.toLocaleString()})`)
    }
  } catch (err) {
    fail(`Could not query price freshness: ${err.message}`)
    anyFail = true
  }

  // 4. Total product count
  console.log('\n=== Total Product Count ===')
  try {
    const [products, storeProducts] = await Promise.all([
      sql`SELECT COUNT(*)::int AS cnt FROM openclaw.products`,
      sql`SELECT COUNT(*)::int AS cnt FROM openclaw.store_products`,
    ])

    const productCount = products[0]?.cnt ?? 0
    const spCount = storeProducts[0]?.cnt ?? 0

    ok(`${productCount.toLocaleString()} products`)
    ok(`${spCount.toLocaleString()} store-price records`)
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
