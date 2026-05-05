/**
 * PIE Measure - Standalone measurement script
 *
 * Outputs a full PIE health snapshot to stdout as JSON.
 * Designed to run via: npx tsx scripts/pie-measure.mts
 * Used by Hermes cron, /pie-measure skill, and /morning briefing.
 *
 * Exit codes: 0 = success, 1 = PG unreachable, 2 = partial failure
 */

import postgres from 'postgres'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DB_URL, { connect_timeout: 5 })

interface PieMeasurement {
  timestamp: string
  pi_reachable: boolean
  pg_reachable: boolean
  last_sync: string | null
  census_size: number
  norm_linked: number
  norm_linked_pct: number
  naked_count: number
  priced_store_products: number
  active_stores: number
  active_chains: number
  states_covered: number
  norm_map_entries: number
  freshness_7d: number | null
  freshness_7d_pct: number | null
  freshness_30d: number | null
  stale_count: number | null
  stale_pct: number | null
  total_priced: number | null
  multi_source: number | null
  single_source: number | null
  triangulated: number | null
  layer2_ready: boolean
  alerts: string[]
}

async function measure(): Promise<PieMeasurement> {
  const result: PieMeasurement = {
    timestamp: new Date().toISOString(),
    pi_reachable: false,
    pg_reachable: false,
    last_sync: null,
    census_size: 0,
    norm_linked: 0,
    norm_linked_pct: 0,
    naked_count: 0,
    priced_store_products: 0,
    active_stores: 0,
    active_chains: 0,
    states_covered: 0,
    norm_map_entries: 0,
    freshness_7d: null,
    freshness_7d_pct: null,
    freshness_30d: null,
    stale_count: null,
    stale_pct: null,
    total_priced: null,
    multi_source: null,
    single_source: null,
    triangulated: null,
    layer2_ready: false,
    alerts: [],
  }

  // Check Pi reachability
  try {
    execSync('ping -n 1 -w 2000 10.0.0.177', { stdio: 'pipe' })
    result.pi_reachable = true
  } catch {
    result.pi_reachable = false
    result.alerts.push('Pi unreachable (10.0.0.177)')
  }

  // Check last sync time
  try {
    const syncPath = resolve(import.meta.dirname || '.', '../scripts/openclaw-pull/.last-sync-time')
    const syncTime = readFileSync(syncPath, 'utf-8').trim()
    result.last_sync = syncTime
    const syncAge = Date.now() - new Date(syncTime).getTime()
    const syncDays = Math.floor(syncAge / (1000 * 60 * 60 * 24))
    if (syncDays > 2) {
      result.alerts.push(`Sync stale: ${syncDays} days old`)
    }
  } catch {
    result.last_sync = null
    result.alerts.push('Cannot read last sync time')
  }

  // Core counts
  try {
    const [census] = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.canonical_ingredients`
    const [linked] = await sql`SELECT COUNT(DISTINCT canonical_ingredient_id)::int as cnt FROM openclaw.normalization_map`
    const [priced] = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.store_products WHERE price_cents > 0`
    const [stores] = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.stores WHERE is_active = true`
    const [states] = await sql`SELECT COUNT(DISTINCT state)::int as cnt FROM openclaw.stores WHERE is_active = true`
    const [chains] = await sql`SELECT COUNT(DISTINCT chain_id)::int as cnt FROM openclaw.stores WHERE is_active = true`
    const [norms] = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.normalization_map`

    result.pg_reachable = true
    result.census_size = census.cnt
    result.norm_linked = linked.cnt
    result.norm_linked_pct = census.cnt > 0 ? Math.round(linked.cnt / census.cnt * 1000) / 10 : 0
    result.naked_count = census.cnt - linked.cnt
    result.priced_store_products = priced.cnt
    result.active_stores = stores.cnt
    result.active_chains = chains.cnt
    result.states_covered = states.cnt
    result.norm_map_entries = norms.cnt

    // Layer 2 gate: norm_linked_pct > 80%
    result.layer2_ready = result.norm_linked_pct > 80

    if (result.naked_count > 1000) {
      result.alerts.push(`${result.naked_count.toLocaleString()} naked ingredients (no norm link)`)
    }
  } catch (e: any) {
    result.pg_reachable = false
    result.alerts.push(`PG error: ${e.message}`)
  }

  // Freshness (only if --full flag passed, since it's slow on 39M rows)
  if (process.argv.includes('--full') && result.pg_reachable) {
    try {
      const [fresh] = await sql`
        SELECT
          COUNT(*) FILTER (WHERE last_seen_at > now() - interval '7 days')::int as d7,
          COUNT(*) FILTER (WHERE last_seen_at > now() - interval '30 days')::int as d30,
          COUNT(*) FILTER (WHERE last_seen_at <= now() - interval '30 days')::int as stale,
          COUNT(*)::int as total
        FROM openclaw.store_products WHERE price_cents > 0
      `
      result.freshness_7d = fresh.d7
      result.freshness_7d_pct = fresh.total > 0 ? Math.round(fresh.d7 / fresh.total * 1000) / 10 : 0
      result.freshness_30d = fresh.d30
      result.stale_count = fresh.stale
      result.stale_pct = fresh.total > 0 ? Math.round(fresh.stale / fresh.total * 1000) / 10 : 0
      result.total_priced = fresh.total

      if (result.freshness_7d_pct !== null && result.freshness_7d_pct < 50) {
        result.alerts.push(`Freshness critical: only ${result.freshness_7d_pct}% within 7 days`)
      }
    } catch (e: any) {
      result.alerts.push(`Freshness query failed: ${e.message}`)
    }
  }

  return result
}

// --- Main ---

const m = await measure()
await sql.end()

// Output JSON to stdout
console.log(JSON.stringify(m, null, 2))

// Human-readable summary to stderr
const lines = [
  `PIE HEALTH [${m.timestamp}]`,
  `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
  `Pi: ${m.pi_reachable ? '● reachable' : '✗ UNREACHABLE'}  |  PG: ${m.pg_reachable ? '● connected' : '✗ DOWN'}`,
  `Last sync: ${m.last_sync || 'unknown'}`,
  ``,
  `CENSUS: ${m.census_size.toLocaleString()} ingredients`,
  `  Linked:  ${m.norm_linked.toLocaleString()} (${m.norm_linked_pct}%)`,
  `  Naked:   ${m.naked_count.toLocaleString()}`,
  `  Stores:  ${m.active_stores.toLocaleString()} | Chains: ${m.active_chains.toLocaleString()} | States: ${m.states_covered}`,
  `  Products with price: ${m.priced_store_products.toLocaleString()}`,
  `  Norm map entries: ${m.norm_map_entries.toLocaleString()}`,
]

if (m.freshness_7d_pct !== null) {
  lines.push(``)
  lines.push(`FRESHNESS:`)
  lines.push(`  7-day:  ${m.freshness_7d_pct}% (${m.freshness_7d?.toLocaleString()})`)
  lines.push(`  30-day: ${m.freshness_30d?.toLocaleString()}`)
  lines.push(`  Stale:  ${m.stale_count?.toLocaleString()} (${m.stale_pct}%)`)
}

lines.push(``)
lines.push(`Layer 2 gate: ${m.layer2_ready ? 'OPEN (>80% linked)' : 'LOCKED'}`)

if (m.alerts.length > 0) {
  lines.push(``)
  lines.push(`ALERTS (${m.alerts.length}):`)
  m.alerts.forEach(a => lines.push(`  ! ${a}`))
}

process.stderr.write(lines.join('\n') + '\n')
process.exit(m.pg_reachable ? 0 : 1)
