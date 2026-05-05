/**
 * PIE Alert Check - Cron-ready regression and failure detection
 *
 * Checks for: sync staleness, Pi down, coverage regression, freshness degradation.
 * Outputs alerts to stdout as JSON array.
 * Designed to run via: npx tsx scripts/pie-alert-check.mts
 *
 * Exit codes: 0 = no critical alerts, 1 = critical alert(s) found
 */

import postgres from 'postgres'
import { execSync } from 'child_process'
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = postgres(DB_URL, { connect_timeout: 5 })

interface Alert {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  message: string
  details: string | null
  auto_action: string | null
  timestamp: string
}

const alerts: Alert[] = []

function alert(severity: Alert['severity'], category: string, message: string, details?: string, auto_action?: string) {
  alerts.push({
    severity,
    category,
    message,
    details: details || null,
    auto_action: auto_action || null,
    timestamp: new Date().toISOString(),
  })
}

// --- Check 1: Pi reachability ---
try {
  execSync('ping -n 1 -w 2000 10.0.0.177', { stdio: 'pipe' })
} catch {
  alert('critical', 'source_failure', 'Pi unreachable (10.0.0.177)',
    'No new prices can flow. Freshness degrading daily.',
    'Physical intervention: check power, ethernet, IP assignment')
}

// --- Check 2: Sync staleness ---
try {
  const syncPath = resolve(import.meta.dirname || '.', '../scripts/openclaw-pull/.last-sync-time')
  if (existsSync(syncPath)) {
    const syncTime = readFileSync(syncPath, 'utf-8').trim()
    const syncAge = Date.now() - new Date(syncTime).getTime()
    const syncHours = Math.floor(syncAge / (1000 * 60 * 60))
    const syncDays = Math.floor(syncAge / (1000 * 60 * 60 * 24))

    if (syncDays > 7) {
      alert('critical', 'sync_failure', `Sync is ${syncDays} days old`,
        `Last sync: ${syncTime}. All prices aging without refresh.`,
        'Restore Pi connectivity, then run: npx tsx scripts/openclaw-pull/sync-all.mjs')
    } else if (syncHours > 48) {
      alert('high', 'sync_failure', `Sync is ${syncHours} hours old`,
        `Last sync: ${syncTime}. Expected < 48h.`,
        'Check Pi + cron job status')
    }
  } else {
    alert('high', 'sync_failure', 'No .last-sync-time file found',
      'Cannot determine when last sync occurred.',
      null)
  }
} catch (e: any) {
  alert('medium', 'sync_failure', `Error checking sync time: ${e.message}`)
}

// --- Check 3: PG health ---
try {
  await sql`SELECT 1`
} catch (e: any) {
  alert('critical', 'database', 'PostgreSQL unreachable',
    e.message,
    'Start PG: check Docker/service status')
  // Can't do further checks without PG
  await sql.end()
  console.log(JSON.stringify(alerts, null, 2))
  process.exit(1)
}

// --- Check 4: Census sanity ---
try {
  const [r] = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.canonical_ingredients`
  if (r.cnt === 0) {
    alert('critical', 'census', 'Census is EMPTY (0 ingredients)',
      'Database may have been wiped or migration failed.',
      'Investigate immediately. Check recent migrations.')
  } else if (r.cnt < 100000) {
    alert('medium', 'census', `Census unexpectedly small: ${r.cnt.toLocaleString()}`,
      'Expected 141K+. May indicate partial data loss.',
      'Compare to last known good count.')
  }
} catch (e: any) {
  alert('high', 'database', `Census query failed: ${e.message}`)
}

// --- Check 5: Normalization coverage regression ---
try {
  const [census] = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.canonical_ingredients`
  const [linked] = await sql`SELECT COUNT(DISTINCT canonical_ingredient_id)::int as cnt FROM openclaw.normalization_map`
  const pct = census.cnt > 0 ? linked.cnt / census.cnt * 100 : 0

  if (pct < 80) {
    alert('high', 'coverage_regression', `Norm coverage dropped to ${pct.toFixed(1)}%`,
      `Expected >87%. ${census.cnt - linked.cnt} naked ingredients.`,
      'Run /pie-ratchet focused on normalization')
  }
} catch (e: any) {
  alert('medium', 'database', `Coverage check failed: ${e.message}`)
}

// --- Check 6: Store products sanity ---
try {
  const [r] = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.store_products WHERE price_cents > 0`
  if (r.cnt < 30000000) {
    alert('medium', 'data_loss', `Priced products: ${r.cnt.toLocaleString()} (expected 39M+)`,
      'May indicate partial sync failure or data deletion.',
      'Compare to last backup. Investigate if count drops between runs.')
  }
} catch (e: any) {
  alert('medium', 'database', `Store products check failed: ${e.message}`)
}

// --- Check 7: Active stores sanity ---
try {
  const [r] = await sql`SELECT COUNT(*)::int as cnt FROM openclaw.stores WHERE is_active = true`
  if (r.cnt < 150000) {
    alert('medium', 'data_loss', `Active stores: ${r.cnt.toLocaleString()} (expected 196K+)`,
      'Stores may have been incorrectly deactivated.',
      null)
  }
} catch (e: any) {
  alert('medium', 'database', `Stores check failed: ${e.message}`)
}

// --- Output ---
await sql.end()

console.log(JSON.stringify(alerts, null, 2))

// Summary to stderr
const criticals = alerts.filter(a => a.severity === 'critical')
const highs = alerts.filter(a => a.severity === 'high')

if (alerts.length === 0) {
  process.stderr.write('PIE ALERT: All clear. No issues detected.\n')
} else {
  process.stderr.write(`PIE ALERT: ${criticals.length} critical, ${highs.length} high, ${alerts.length} total\n`)
  alerts.forEach(a => {
    process.stderr.write(`  [${a.severity.toUpperCase()}] ${a.category}: ${a.message}\n`)
  })
}

// --- Persist to docs/pie-alert-log.md ---
const logPath = resolve(import.meta.dirname || '.', '../docs/pie-alert-log.md')
const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
const dateLine = now.slice(0, 10)

let logEntry = ''
if (alerts.length === 0) {
  logEntry = `\n## ${now}\n\nAll clear. No issues detected.\n`
} else {
  logEntry = `\n## ${now}\n\n`
  logEntry += `**Summary:** ${criticals.length} critical, ${highs.length} high, ${alerts.length - criticals.length - highs.length} other\n\n`
  for (const a of alerts) {
    const icon = a.severity === 'critical' ? 'X' : a.severity === 'high' ? '!' : '-'
    logEntry += `- [${icon}] **${a.severity.toUpperCase()}** (${a.category}): ${a.message}\n`
    if (a.details) logEntry += `  - ${a.details}\n`
    if (a.auto_action) logEntry += `  - Action: ${a.auto_action}\n`
  }
  logEntry += '\n'
}

// Create file with header if it doesn't exist
if (!existsSync(logPath)) {
  writeFileSync(logPath, `# PIE Alert Log\n\nPersisted by \`scripts/pie-alert-check.mts\`. Newest entries at bottom.\n`)
}

appendFileSync(logPath, logEntry)
process.stderr.write(`Alert log appended to docs/pie-alert-log.md\n`)

process.exit(criticals.length > 0 ? 1 : 0)
