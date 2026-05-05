/**
 * Direct Pi-to-Postgres Price Sync
 *
 * Bypasses ChefFlow's HTTP server entirely. Pulls enriched prices
 * from Pi's sync-api (port 8081) and writes directly to ChefFlow's
 * Postgres via ingredient_price_history and ingredients tables.
 *
 * Use when ChefFlow server isn't running but Pi + Postgres are alive.
 *
 * Run: npx tsx scripts/direct-pi-sync.mts [--dry-run] [--batch=200]
 */

import postgres from 'postgres'

const DB_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const PI_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'
const sql = postgres(DB_URL, { connect_timeout: 10 })

const isDryRun = process.argv.includes('--dry-run')
const batchArg = process.argv.find(a => a.startsWith('--batch='))
const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1], 10) : 200

interface EnrichedPrice {
  cents: number
  normalized_cents: number
  normalized_unit: string
  original_unit: string
  store: string
  tier: string
  confirmed_at: string
  in_stock?: boolean
}

interface EnrichedResult {
  canonical_id: string
  name: string
  category: string
  best_price: EnrichedPrice | null
  all_prices: EnrichedPrice[]
  trend: { direction: string | null; change_7d_pct: number | null; change_30d_pct: number | null } | null
  price_count: number
}

function tierToSource(tier: string): string {
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

function tierToConfidence(tier: string): number {
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

async function fetchEnriched(names: string[]): Promise<Record<string, EnrichedResult | null> | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)
    const res = await fetch(`${PI_API}/api/prices/enriched`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: names }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      process.stderr.write(`  Pi returned ${res.status}\n`)
      return null
    }
    const data = await res.json()
    return data.results || null
  } catch (err: any) {
    process.stderr.write(`  Pi unreachable: ${err.message}\n`)
    return null
  }
}

async function main() {
  const startTime = Date.now()
  process.stderr.write(`=== Direct Pi-to-Postgres Price Sync ===\n`)
  process.stderr.write(`Time: ${new Date().toISOString()}\n`)
  process.stderr.write(`Pi API: ${PI_API}\n`)
  process.stderr.write(`Database: ${DB_URL.replace(/:[^:@]+@/, ':***@')}\n`)
  process.stderr.write(`Dry run: ${isDryRun}\n\n`)

  // Test Pi connectivity
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)
    const stats = await fetch(`${PI_API}/api/stats`, { signal: controller.signal })
    clearTimeout(timeout)
    const data = await stats.json()
    process.stderr.write(`Pi alive: ${data.canonicalIngredients} ingredients, ${data.currentPrices} prices\n`)
    process.stderr.write(`Last scrape: ${data.lastScrapeAt}\n\n`)
  } catch (err: any) {
    process.stderr.write(`FATAL: Cannot reach Pi at ${PI_API}: ${err.message}\n`)
    await sql.end()
    process.exit(1)
  }

  // Step 1: Load all ChefFlow ingredients
  const ingredients = await sql`
    SELECT id, name, tenant_id, last_price_cents, price_unit
    FROM ingredients
    WHERE name IS NOT NULL AND TRIM(name) != ''
  `
  process.stderr.write(`Loaded ${ingredients.length} ChefFlow ingredients\n`)

  // Step 2: Deduplicate names
  const nameToIngredients = new Map<string, typeof ingredients>()
  for (const ing of ingredients) {
    const key = (ing.name as string).trim()
    if (!nameToIngredients.has(key)) nameToIngredients.set(key, [])
    nameToIngredients.get(key)!.push(ing)
  }
  const uniqueNames = [...nameToIngredients.keys()]
  process.stderr.write(`Unique names: ${uniqueNames.length}\n\n`)

  // Step 3: Batch fetch from Pi
  let matched = 0
  let updated = 0
  let skipped = 0
  let notFound = 0
  let quarantined = 0
  let batchNum = 0

  const today = new Date().toISOString().slice(0, 10)

  for (let i = 0; i < uniqueNames.length; i += BATCH_SIZE) {
    batchNum++
    const batch = uniqueNames.slice(i, i + BATCH_SIZE)
    process.stderr.write(`Batch ${batchNum}: ${batch.length} names (${i}/${uniqueNames.length})...`)

    const results = await fetchEnriched(batch)
    if (!results) {
      process.stderr.write(` FAILED\n`)
      continue
    }

    let batchUpdated = 0

    for (const [name, result] of Object.entries(results)) {
      const ings = nameToIngredients.get(name)
      if (!ings || ings.length === 0) continue

      if (!result || !result.best_price) {
        notFound += ings.length
        continue
      }

      matched += ings.length
      const bestPrice = result.best_price

      // Skip obvious bulk/wholesale
      if (bestPrice.original_unit === 'each' && bestPrice.cents > 5000) {
        skipped += ings.length
        continue
      }

      if (isDryRun) {
        batchUpdated += ings.length
        continue
      }

      for (const ing of ings) {
        try {
          // Validate: reject prices with >200% change from existing
          const existingCents = ing.last_price_cents as number | null
          if (existingCents && existingCents > 0) {
            const changePct = Math.abs(bestPrice.cents - existingCents) / existingCents
            if (changePct > 2.0) {
              quarantined++
              continue
            }
          }

          // Write best price to ingredient_price_history
          const source = tierToSource(bestPrice.tier)
          await sql`
            INSERT INTO ingredient_price_history
              (ingredient_id, price_cents, unit, source, store_name, purchase_date, tenant_id)
            VALUES
              (${ing.id}, ${bestPrice.cents}, ${bestPrice.normalized_unit || 'lb'},
               ${source}, ${bestPrice.store}, ${today}, ${ing.tenant_id})
            ON CONFLICT DO NOTHING
          `

          // Update ingredients table with latest price
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

          batchUpdated++
        } catch (err: any) {
          // Non-blocking per ingredient
          if (!err.message?.includes('duplicate') && !err.message?.includes('violates')) {
            process.stderr.write(`\n  Error on ${ing.name}: ${err.message}\n`)
          }
        }
      }
    }

    updated += batchUpdated
    process.stderr.write(` ${batchUpdated} updated\n`)
  }

  // Step 4: Refresh materialized views
  if (!isDryRun && updated > 0) {
    process.stderr.write(`\nRefreshing price views...`)
    try {
      await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY IF EXISTS openclaw.regional_price_averages`
      process.stderr.write(` done\n`)
    } catch {
      process.stderr.write(` skipped (view may not exist)\n`)
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  process.stderr.write(`\n=== SYNC COMPLETE ===\n`)
  process.stderr.write(`Matched: ${matched}\n`)
  process.stderr.write(`Updated: ${updated}\n`)
  process.stderr.write(`Not found on Pi: ${notFound}\n`)
  process.stderr.write(`Skipped (bulk): ${skipped}\n`)
  process.stderr.write(`Quarantined (>200% change): ${quarantined}\n`)
  process.stderr.write(`Elapsed: ${elapsed}s\n`)

  // JSON output for logging
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    matched, updated, notFound, skipped, quarantined,
    elapsed_s: parseFloat(elapsed),
    dry_run: isDryRun,
  }))

  await sql.end()
  process.exit(0)
}

main().catch(async (e) => {
  process.stderr.write(`FATAL: ${e.message}\n`)
  await sql.end()
  process.exit(1)
})
