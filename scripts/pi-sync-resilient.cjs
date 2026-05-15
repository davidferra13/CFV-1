#!/usr/bin/env node
/**
 * Resilient Pi-to-ChefFlow Price Sync
 *
 * Strategy (try in order):
 *   1. Hit ChefFlow's HTTP endpoint (fast, uses server-side logic)
 *   2. If HTTP fails, fall back to direct Postgres write (bypasses HTTP entirely)
 *
 * This replaces the old sync-to-chefflow.mjs which had a single point of failure:
 * if ChefFlow's HTTP server was down, prices never synced (broken since 2026-04-23).
 *
 * Run from Pi crontab:
 *   node /home/davidferra/chefflow-mirror/scripts/pi-sync-resilient.cjs
 *
 * Environment:
 *   CHEFFLOW_URL      - ChefFlow base URL (default: http://10.0.0.177:3100)
 *   CRON_SECRET       - Bearer token for cron auth
 *   DATABASE_URL      - Direct Postgres connection (fallback path)
 *   OPENCLAW_API_URL  - Pi's own API (default: http://127.0.0.1:8081)
 */

const CHEFFLOW_URL = process.env.CHEFFLOW_URL || 'http://10.0.0.177:3100'
const CRON_SECRET = process.env.CRON_SECRET || ''
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@10.0.0.177:54322/postgres'
const PI_API = process.env.OPENCLAW_API_URL || 'http://127.0.0.1:8081'

async function tryHttpSync() {
  process.stderr.write(`[resilient-sync] Trying HTTP sync via ${CHEFFLOW_URL}...\n`)

  if (!CRON_SECRET) {
    process.stderr.write(`[resilient-sync] No CRON_SECRET set, skipping HTTP path\n`)
    return null
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${CHEFFLOW_URL}/api/cron/price-sync-pull`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      process.stderr.write(`[resilient-sync] HTTP returned ${res.status}: ${body.slice(0, 200)}\n`)
      return null
    }

    const data = await res.json()
    if (data.success) {
      process.stderr.write(`[resilient-sync] HTTP sync succeeded: ${data.updated} updated, ${data.matched} matched\n`)
      return data
    } else {
      process.stderr.write(`[resilient-sync] HTTP sync returned success=false: ${data.error || 'unknown'}\n`)
      return null
    }
  } catch (err) {
    process.stderr.write(`[resilient-sync] HTTP sync failed: ${err.message}\n`)
    return null
  }
}

async function tryDirectSync() {
  process.stderr.write(`[resilient-sync] Falling back to direct Postgres sync...\n`)

  let postgres
  try {
    postgres = require('postgres')
  } catch {
    process.stderr.write(`[resilient-sync] postgres package not available, cannot do direct sync\n`)
    return null
  }

  const sql = postgres(DATABASE_URL, { connect_timeout: 10 })

  try {
    // Test Pi connectivity
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const statsRes = await fetch(`${PI_API}/api/stats`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!statsRes.ok) {
      process.stderr.write(`[resilient-sync] Pi API unreachable (${statsRes.status})\n`)
      await sql.end()
      return null
    }
    const stats = await statsRes.json()
    process.stderr.write(`[resilient-sync] Pi alive: ${stats.currentPrices} prices\n`)

    // Load ChefFlow ingredients
    const ingredients = await sql`
      SELECT id, name, tenant_id, last_price_cents, price_unit
      FROM ingredients
      WHERE name IS NOT NULL AND TRIM(name) != ''
    `
    process.stderr.write(`[resilient-sync] Loaded ${ingredients.length} ingredients\n`)

    // Deduplicate names
    const nameToIngredients = new Map()
    for (const ing of ingredients) {
      const key = ing.name.trim()
      if (!nameToIngredients.has(key)) nameToIngredients.set(key, [])
      nameToIngredients.get(key).push(ing)
    }
    const uniqueNames = [...nameToIngredients.keys()]

    // Batch fetch from Pi
    let matched = 0
    let updated = 0
    let skipped = 0
    let notFound = 0
    let quarantined = 0
    const BATCH_SIZE = 200
    const today = new Date().toISOString().slice(0, 10)

    for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
      const batch = uniqueNames.slice(i, i + BATCH_SIZE)

      let results = null
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 60000)
        const res = await fetch(`${PI_API}/api/prices/enriched`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: batch }),
          signal: ctrl.signal,
        })
        clearTimeout(t)
        if (res.ok) {
          const data = await res.json()
          results = data.results || null
        }
      } catch (err) {
        process.stderr.write(`[resilient-sync] Batch fetch failed: ${err.message}\n`)
        continue
      }

      if (!results) continue

      for (const [name, result] of Object.entries(results)) {
        const ings = nameToIngredients.get(name)
        if (!ings || ings.length === 0) continue
        if (!result || !result.best_price) {
          notFound += ings.length
          continue
        }

        matched += ings.length
        const bestPrice = result.best_price

        if (bestPrice.original_unit === 'each' && bestPrice.cents > 5000) {
          skipped += ings.length
          continue
        }

        for (const ing of ings) {
          try {
            // Quarantine check: reject >200% change
            const existingCents = ing.last_price_cents
            if (existingCents && existingCents > 0) {
              const changePct = Math.abs(bestPrice.cents - existingCents) / existingCents
              if (changePct > 2.0) {
                quarantined++
                continue
              }
            }

            const source = tierToSource(bestPrice.tier)
            await sql`
              INSERT INTO ingredient_price_history
                (ingredient_id, price_cents, unit, source, store_name, purchase_date, tenant_id)
              VALUES
                (${ing.id}, ${bestPrice.cents}, ${bestPrice.normalized_unit || 'lb'},
                 ${source}, ${bestPrice.store}, ${today}, ${ing.tenant_id})
              ON CONFLICT DO NOTHING
            `

            await sql`
              UPDATE ingredients
              SET last_price_cents = ${bestPrice.cents},
                  price_unit = ${bestPrice.normalized_unit || 'lb'},
                  last_price_source = ${source},
                  last_price_store = ${bestPrice.store},
                  last_price_confidence = ${tierToConfidence(bestPrice.tier)},
                  last_price_date = NOW()
              WHERE id = ${ing.id}
                AND (last_price_date IS NULL OR last_price_date < NOW() - INTERVAL '1 hour')
            `
            updated++
          } catch (err) {
            if (!err.message?.includes('duplicate') && !err.message?.includes('violates')) {
              process.stderr.write(`[resilient-sync] Error on ${ing.name}: ${err.message}\n`)
            }
          }
        }
      }
    }

    await sql.end()

    const result = { success: true, matched, updated, notFound, skipped, quarantined }
    process.stderr.write(`[resilient-sync] Direct sync done: ${updated} updated, ${matched} matched\n`)
    return result
  } catch (err) {
    process.stderr.write(`[resilient-sync] Direct sync failed: ${err.message}\n`)
    try { await sql.end() } catch {}
    return null
  }
}

function tierToSource(tier) {
  switch (tier) {
    case 'flyer_scrape': return 'openclaw_flyer'
    case 'direct_scrape': return 'openclaw_scrape'
    case 'instacart_adjusted':
    case 'instacart_catalog': return 'openclaw_instacart'
    case 'government_baseline': return 'openclaw_government'
    case 'exact_receipt': return 'openclaw_receipt'
    default: return 'openclaw_flyer'
  }
}

function tierToConfidence(tier) {
  switch (tier) {
    case 'exact_receipt': return 0.95
    case 'direct_scrape': return 0.85
    case 'flyer_scrape': return 0.7
    case 'instacart_adjusted':
    case 'instacart_catalog': return 0.6
    case 'government_baseline': return 0.4
    default: return 0.5
  }
}

async function main() {
  const startTime = Date.now()
  process.stderr.write(`=== Resilient Price Sync (${new Date().toISOString()}) ===\n`)

  // Strategy 1: Try HTTP (uses full server-side logic with validation, quarantine, etc.)
  let result = await tryHttpSync()

  // Strategy 2: Fall back to direct DB write
  if (!result) {
    result = await tryDirectSync()
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  if (result) {
    process.stderr.write(`\n=== SUCCESS (${elapsed}s) ===\n`)
    console.log(JSON.stringify({ ...result, elapsed_s: parseFloat(elapsed), timestamp: new Date().toISOString() }))
    process.exit(0)
  } else {
    process.stderr.write(`\n=== FAILED: Both HTTP and direct paths failed (${elapsed}s) ===\n`)
    console.log(JSON.stringify({ success: false, elapsed_s: parseFloat(elapsed), timestamp: new Date().toISOString() }))
    process.exit(1)
  }
}

main().catch((e) => {
  process.stderr.write(`FATAL: ${e.message}\n${e.stack}\n`)
  process.exit(1)
})
