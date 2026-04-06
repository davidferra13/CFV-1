#!/usr/bin/env node
/**
 * Sync System Ingredient Market Prices
 *
 * Bridges OpenClaw product prices to ChefFlow system_ingredients using
 * full-text search matching. This is the pipe that connects 9.8M store_product
 * prices to 5,435 canonical ingredients.
 *
 * Strategy:
 * 1. For each active system_ingredient, FTS match against openclaw.products
 * 2. Aggregate store_products prices for matched products
 * 3. Upsert into openclaw.system_ingredient_prices
 *
 * No AI involved. Pure database operations (FTS + aggregation).
 *
 * Usage: node scripts/sync-system-ingredient-prices.mjs [--limit N] [--verbose]
 */

import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')

const args = process.argv.slice(2)
const verbose = args.includes('--verbose')
const limitIdx = args.indexOf('--limit')
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : null

async function main() {
  console.log('=== System Ingredient Price Sync ===')
  console.log('')

  // 1. Get all active system ingredients
  const systemIngredients = await sql`
    SELECT id, name, category, standard_unit
    FROM system_ingredients
    WHERE is_active = true
    ${limit ? sql`LIMIT ${limit}` : sql``}
  `
  console.log(`Processing ${systemIngredients.length} system ingredients...`)
  console.log('')

  let matched = 0
  let unmatched = 0
  let errors = 0
  const batchSize = 50
  const upsertRows = []

  for (let i = 0; i < systemIngredients.length; i += batchSize) {
    const batch = systemIngredients.slice(i, i + batchSize)

    for (const si of batch) {
      try {
        // Build a search query from the ingredient name
        // Strip parenthetical qualifiers for broader matching
        const searchName = si.name
          .replace(/\([^)]*\)/g, '')  // Remove parentheses content
          .replace(/,/g, ' ')         // Commas to spaces
          .replace(/\s+/g, ' ')       // Collapse whitespace
          .trim()

        if (!searchName || searchName.length < 2) {
          unmatched++
          continue
        }

        // FTS match products, then compute price-per-unit from size data.
        // Products with size_value/size_unit get normalized to per-unit prices.
        // Products without size data contribute per-package ("each") prices.
        //
        // Unit normalization: convert all weight to per-lb, volume to per-fl-oz.
        // This gives chefs prices in units they actually use.
        const priceData = await sql`
          WITH matched_products AS (
            SELECT p.id AS product_id
            FROM openclaw.products p
            WHERE p.is_food = true
              AND to_tsvector('english', p.name) @@ plainto_tsquery('english', ${searchName})
              AND p.size_value > 0
              AND p.size_unit IS NOT NULL
            LIMIT 200
          ),
          per_unit_prices AS (
            SELECT
              sp.store_id,
              mp.product_id,
              s.state,
              sp.last_seen_at,
              CASE
                -- Products with weight size data: compute price per lb
                WHEN p.size_value > 0 AND p.size_unit = 'lb' THEN
                  ROUND(sp.price_cents / p.size_value)
                WHEN p.size_value > 0 AND p.size_unit = 'oz' THEN
                  ROUND(sp.price_cents / p.size_value * 16)
                WHEN p.size_value > 0 AND p.size_unit = 'kg' THEN
                  ROUND(sp.price_cents / p.size_value * 2.20462)
                WHEN p.size_value > 0 AND p.size_unit = 'g' THEN
                  ROUND(sp.price_cents / p.size_value * 453.592)
                -- Volume: compute price per fl oz
                WHEN p.size_value > 0 AND p.size_unit = 'fl oz' THEN
                  ROUND(sp.price_cents / p.size_value)
                WHEN p.size_value > 0 AND p.size_unit = 'gal' THEN
                  ROUND(sp.price_cents / p.size_value / 128)
                WHEN p.size_value > 0 AND p.size_unit = 'l' THEN
                  ROUND(sp.price_cents / p.size_value / 33.814)
                WHEN p.size_value > 0 AND p.size_unit = 'ml' THEN
                  ROUND(sp.price_cents / p.size_value * 29.5735)
                -- Count items: price per each
                WHEN p.size_value > 0 AND p.size_unit IN ('ct', 'each') THEN
                  ROUND(sp.price_cents / p.size_value)
                -- No size data: use raw price as "per each"
                ELSE sp.price_cents
              END AS price_per_unit_cents,
              CASE
                WHEN p.size_unit IN ('lb', 'oz', 'kg', 'g') THEN 'lb'
                WHEN p.size_unit IN ('fl oz', 'gal', 'l', 'ml') THEN 'fl oz'
                WHEN p.size_unit IN ('ct', 'each') THEN 'each'
                ELSE 'each'
              END AS normalized_unit
            FROM matched_products mp
            JOIN openclaw.store_products sp ON sp.product_id = mp.product_id
            JOIN openclaw.products p ON p.id = mp.product_id
            JOIN openclaw.stores s ON s.id = sp.store_id
            WHERE sp.price_cents > 0
              AND sp.price_cents < 100000
          ),
          -- Use the most common normalized unit for this ingredient
          best_unit AS (
            SELECT normalized_unit, COUNT(*) AS cnt
            FROM per_unit_prices
            WHERE price_per_unit_cents > 10 AND price_per_unit_cents < 15000
            GROUP BY normalized_unit
            ORDER BY cnt DESC
            LIMIT 1
          ),
          price_agg AS (
            SELECT
              COUNT(DISTINCT pup.store_id)::int AS store_count,
              COUNT(DISTINCT pup.product_id)::int AS product_count,
              COUNT(DISTINCT pup.state)::int AS state_count,
              array_agg(DISTINCT pup.state) FILTER (WHERE pup.state IS NOT NULL) AS states,
              AVG(pup.price_per_unit_cents)::int AS avg_price_cents,
              MIN(pup.price_per_unit_cents)::int AS min_price_cents,
              MAX(pup.price_per_unit_cents)::int AS max_price_cents,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY pup.price_per_unit_cents)::int AS median_price_cents,
              MAX(pup.last_seen_at) AS newest_price_at,
              MIN(pup.last_seen_at) AS oldest_price_at,
              bu.normalized_unit AS price_unit
            FROM per_unit_prices pup
            CROSS JOIN best_unit bu
            WHERE pup.normalized_unit = bu.normalized_unit
              AND pup.price_per_unit_cents > 10       -- > $0.10/unit (filter zero-ish prices)
              AND pup.price_per_unit_cents < 15000   -- < $150/unit (filter outlier conversions)
            GROUP BY bu.normalized_unit
          )
          SELECT * FROM price_agg WHERE store_count > 0
        `

        if (priceData.length === 0 || !priceData[0].store_count) {
          if (verbose) console.log(`  [SKIP] ${si.name} - no product matches`)
          unmatched++
          continue
        }

        const pd = priceData[0]

        // Compute confidence based on coverage
        let confidence = 0.5
        if (pd.store_count >= 10) confidence += 0.2
        else if (pd.store_count >= 3) confidence += 0.1
        if (pd.state_count >= 3) confidence += 0.1
        if (pd.product_count >= 5) confidence += 0.1
        // Fresh data bonus
        if (pd.newest_price_at && (Date.now() - new Date(pd.newest_price_at).getTime()) < 7 * 24 * 3600 * 1000) {
          confidence += 0.1
        }
        confidence = Math.min(confidence, 1.0)

        upsertRows.push({
          system_ingredient_id: si.id,
          avg_price_cents: pd.avg_price_cents,
          min_price_cents: pd.min_price_cents,
          max_price_cents: pd.max_price_cents,
          median_price_cents: pd.median_price_cents,
          price_unit: pd.price_unit || 'each',
          store_count: pd.store_count,
          product_count: pd.product_count,
          state_count: pd.state_count,
          states: pd.states,
          newest_price_at: pd.newest_price_at,
          oldest_price_at: pd.oldest_price_at,
          confidence: Math.round(confidence * 1000) / 1000,
        })

        matched++
        if (verbose) {
          console.log(`  [OK] ${si.name} -> ${pd.product_count} products, ${pd.store_count} stores, avg $${(pd.avg_price_cents / 100).toFixed(2)}/${pd.price_unit || 'each'}`)
        }
      } catch (err) {
        errors++
        if (verbose) console.log(`  [ERR] ${si.name}: ${err.message}`)
      }
    }

    // Progress
    const progress = Math.min(i + batchSize, systemIngredients.length)
    process.stdout.write(`\r  Progress: ${progress}/${systemIngredients.length} (${matched} matched, ${unmatched} unmatched, ${errors} errors)`)
  }

  console.log('')
  console.log('')

  // 2. Batch upsert results
  if (upsertRows.length > 0) {
    console.log(`Upserting ${upsertRows.length} system ingredient prices...`)

    for (let i = 0; i < upsertRows.length; i += 100) {
      const batch = upsertRows.slice(i, i + 100)

      for (const row of batch) {
        await sql`
          INSERT INTO openclaw.system_ingredient_prices (
            system_ingredient_id, avg_price_cents, min_price_cents, max_price_cents,
            median_price_cents, price_unit, store_count, product_count, state_count,
            states, newest_price_at, oldest_price_at, confidence, last_refreshed_at
          ) VALUES (
            ${row.system_ingredient_id}, ${row.avg_price_cents}, ${row.min_price_cents},
            ${row.max_price_cents}, ${row.median_price_cents}, ${row.price_unit},
            ${row.store_count}, ${row.product_count}, ${row.state_count},
            ${row.states}, ${row.newest_price_at}, ${row.oldest_price_at},
            ${row.confidence}, now()
          )
          ON CONFLICT (system_ingredient_id) DO UPDATE SET
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
            confidence = EXCLUDED.confidence,
            last_refreshed_at = now()
        `
      }
    }

    console.log('Upsert complete.')
  }

  // 3. Summary
  console.log('')
  console.log('=== RESULTS ===')
  console.log(`Total system ingredients: ${systemIngredients.length}`)
  console.log(`Matched to products:      ${matched} (${Math.round(matched / systemIngredients.length * 100)}%)`)
  console.log(`No product match:         ${unmatched}`)
  console.log(`Errors:                   ${errors}`)

  // Coverage check
  const coverage = await sql`
    SELECT COUNT(*)::int AS priced FROM openclaw.system_ingredient_prices
  `
  console.log(``)
  console.log(`System ingredients with market prices: ${coverage[0].priced} / ${systemIngredients.length}`)

  await sql.end()
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
