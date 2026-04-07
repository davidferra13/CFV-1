#!/usr/bin/env node
/**
 * Refresh system_ingredient_prices from openclaw product data.
 *
 * Matches system_ingredients to openclaw.products via FTS, aggregates
 * prices (median, min, max, store count, state coverage), and upserts
 * into openclaw.system_ingredient_prices.
 *
 * This makes the 10-tier resolve-price.ts tier 6.5 (MARKET AGGREGATE)
 * work for thousands of ingredients instead of ~1,169.
 *
 * Usage: node scripts/refresh-system-ingredient-prices.mjs
 */

import pg from 'postgres'

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const sql = pg(DATABASE_URL, { max: 3, idle_timeout: 30 })

async function main() {
  console.log('=== Refresh System Ingredient Prices ===')

  // Get all system_ingredients with cleaned search terms
  const ingredients = await sql`
    SELECT id, name,
      TRIM(SPLIT_PART(SPLIT_PART(name, '(', 1), ',', 1)) as search_name
    FROM system_ingredients
    WHERE LENGTH(TRIM(SPLIT_PART(SPLIT_PART(name, '(', 1), ',', 1))) >= 3
    ORDER BY name
  `

  console.log(`Processing ${ingredients.length} system_ingredients...`)

  let matched = 0
  let skipped = 0
  let errors = 0
  const BATCH_SIZE = 50

  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(ingredients.length / BATCH_SIZE)

    for (const ing of batch) {
      try {
        // FTS match: find products matching this ingredient
        const agg = await sql`
          SELECT
            COUNT(DISTINCT sp.store_id) as store_count,
            COUNT(*) as product_count,
            COUNT(DISTINCT s.state) as state_count,
            ARRAY_AGG(DISTINCT s.state ORDER BY s.state) as states,
            ROUND(AVG(sp.price_cents))::int as avg_price_cents,
            MIN(sp.price_cents) as min_price_cents,
            MAX(sp.price_cents) as max_price_cents,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sp.price_cents)::int as median_price_cents,
            MAX(sp.last_seen_at) as newest_price_at,
            MIN(sp.last_seen_at) as oldest_price_at,
            MODE() WITHIN GROUP (ORDER BY COALESCE(p.size_unit, 'each')) as price_unit
          FROM (
            SELECT p.id, p.size_unit
            FROM openclaw.products p
            WHERE to_tsvector('english', p.name) @@ plainto_tsquery('english', ${ing.search_name})
              AND p.is_food = true
            LIMIT 200
          ) p
          JOIN openclaw.store_products sp ON sp.product_id = p.id
            AND sp.price_cents > 0
            AND sp.price_cents < 50000
          JOIN openclaw.stores s ON s.id = sp.store_id
        `

        if (agg.length === 0 || Number(agg[0].product_count) < 3) {
          skipped++
          continue
        }

        const row = agg[0]
        const storeCount = Number(row.store_count)
        const stateCount = Number(row.state_count)

        // Confidence based on data quality
        let confidence = 0.5
        if (storeCount >= 10) confidence = 0.6
        if (storeCount >= 25 && stateCount >= 2) confidence = 0.65
        if (storeCount >= 50 && stateCount >= 3) confidence = 0.7

        await sql`
          INSERT INTO openclaw.system_ingredient_prices (
            system_ingredient_id, avg_price_cents, min_price_cents, max_price_cents,
            median_price_cents, price_unit, store_count, product_count,
            state_count, states, newest_price_at, oldest_price_at,
            last_refreshed_at, confidence
          ) VALUES (
            ${ing.id}, ${row.avg_price_cents}, ${row.min_price_cents}, ${row.max_price_cents},
            ${row.median_price_cents}, ${row.price_unit || 'each'}, ${storeCount}, ${Number(row.product_count)},
            ${stateCount}, ${row.states}, ${row.newest_price_at}, ${row.oldest_price_at},
            NOW(), ${confidence}
          )
          ON CONFLICT (system_ingredient_id)
          DO UPDATE SET
            avg_price_cents = EXCLUDED.avg_price_cents,
            min_price_cents = EXCLUDED.min_price_cents,
            max_price_cents = EXCLUDED.max_price_cents,
            median_price_cents = EXCLUDED.median_price_cents,
            price_unit = EXCLUDED.price_unit,
            store_count = EXCLUDED.store_count,
            product_count = EXCLUDED.product_count,
            state_count = EXCLUDED.state_count,
            states = EXCLUDED.states,
            newest_price_at = EXCLUDED.newest_price_at,
            oldest_price_at = EXCLUDED.oldest_price_at,
            last_refreshed_at = NOW(),
            confidence = EXCLUDED.confidence
        `

        matched++
      } catch (err) {
        // Some FTS queries fail on stop words or empty search terms
        if (!err.message?.includes('stop words')) {
          errors++
          if (errors <= 5) console.error(`  Error on "${ing.name}": ${err.message}`)
        }
        skipped++
      }
    }

    if (batchNum % 5 === 0 || batchNum === totalBatches) {
      console.log(`  Batch ${batchNum}/${totalBatches}: ${matched} matched, ${skipped} skipped, ${errors} errors`)
    }
  }

  // Check for unique constraint - if it doesn't exist, add it
  const hasConstraint = await sql`
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'system_ingredient_prices'
    AND indexdef LIKE '%system_ingredient_id%'
    AND indexdef LIKE '%UNIQUE%'
  `

  if (hasConstraint.length === 0) {
    console.log('Adding unique constraint on system_ingredient_id...')
    try {
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_sip_system_ingredient_id
        ON openclaw.system_ingredient_prices (system_ingredient_id)`
    } catch (e) {
      console.log(`  Index creation note: ${e.message}`)
    }
  }

  // Final stats
  const [finalCount] = await sql`SELECT COUNT(*) as cnt FROM openclaw.system_ingredient_prices`

  console.log('\n=== COMPLETE ===')
  console.log(`Matched: ${matched}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
  console.log(`Total system_ingredient_prices rows: ${finalCount.cnt}`)

  await sql.end()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
