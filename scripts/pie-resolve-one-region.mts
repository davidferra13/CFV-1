/**
 * Run resolve-prices aggregation for a single region.
 * Standalone script - no @/ imports.
 * Usage: npx tsx scripts/pie-resolve-one-region.mts [region-slug]
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!)
const slug = process.argv[2] || 'boston'

console.log(`[pie-resolve] Running for region: ${slug}`)

async function main() {
  // Get region
  const regions = await sql`
    SELECT id, slug, cost_index FROM openclaw.pricing_regions
    WHERE slug = ${slug} AND is_active = true
  `
  if (!regions.length) {
    console.error(`Region "${slug}" not found`)
    process.exit(1)
  }
  const region = regions[0]
  console.log(`[pie-resolve] Region: ${region.slug} (cost_index: ${region.cost_index})`)

  // Aggregate store prices for this region via normalization_map -> canonical_ingredients
  console.log('[pie-resolve] Aggregating store prices...')
  const storeAgg = await sql`
    WITH region_stores AS (
      SELECT s.id AS store_id
      FROM openclaw.stores s
      JOIN openclaw.zip_centroids zc ON zc.zip = s.zip
      WHERE zc.pricing_region_id = ${region.id}
        AND s.is_active = true
    ),
    product_prices AS (
      SELECT
        nm.canonical_ingredient_id,
        ci.standard_unit,
        COALESCE(sp.sale_price_cents, sp.price_cents) AS effective_price,
        sp.last_seen_at
      FROM region_stores rs
      JOIN openclaw.store_products sp ON sp.store_id = rs.store_id
      JOIN openclaw.products p ON p.id = sp.product_id
      JOIN openclaw.normalization_map nm ON nm.raw_name = p.name
      JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = nm.canonical_ingredient_id
      WHERE sp.price_cents > 0
        AND sp.price_cents < 50000
        AND sp.last_seen_at > now() - INTERVAL '90 days'
        AND p.is_food = true
    )
    SELECT
      canonical_ingredient_id,
      standard_unit,
      COUNT(*)::int AS store_count,
      MIN(effective_price)::int AS min_cents,
      MAX(effective_price)::int AS max_cents,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY effective_price)::int AS median_cents,
      MAX(last_seen_at)::text AS freshest,
      MIN(last_seen_at)::text AS oldest
    FROM product_prices
    GROUP BY canonical_ingredient_id, standard_unit
    HAVING COUNT(*) >= 1
    LIMIT 10000
  `

  console.log(`[pie-resolve] Found ${storeAgg.length} ingredient aggregations`)

  if (storeAgg.length === 0) {
    console.log('[pie-resolve] No store data found for this region. Exiting.')
    await sql.end()
    return
  }

  // Upsert into resolved_prices
  let upserted = 0
  const BATCH = 100
  for (let i = 0; i < storeAgg.length; i += BATCH) {
    const batch = storeAgg.slice(i, i + BATCH)
    for (const row of batch) {
      await sql`
        INSERT INTO openclaw.resolved_prices (
          canonical_ingredient_id, pricing_region_id, price_cents, price_unit,
          price_low_cents, price_high_cents, price_median_cents,
          confidence, observation_count, source_count,
          freshest_observation, oldest_observation,
          computation_method, is_synthetic, price_type, updated_at
        ) VALUES (
          ${row.canonical_ingredient_id}, ${region.id}, ${row.median_cents},
          ${row.standard_unit || 'each'},
          ${row.min_cents}, ${row.max_cents}, ${row.median_cents},
          ${Math.min(row.store_count / 10, 1.0)},
          ${row.store_count}, ${1},
          ${row.freshest}, ${row.oldest},
          ${'median_multistore'}, ${false}, ${'regular'}, now()
        )
        ON CONFLICT (canonical_ingredient_id, pricing_region_id, price_type)
        DO UPDATE SET
          price_cents = EXCLUDED.price_cents,
          price_low_cents = EXCLUDED.price_low_cents,
          price_high_cents = EXCLUDED.price_high_cents,
          price_median_cents = EXCLUDED.price_median_cents,
          confidence = EXCLUDED.confidence,
          observation_count = EXCLUDED.observation_count,
          freshest_observation = EXCLUDED.freshest_observation,
          oldest_observation = EXCLUDED.oldest_observation,
          computation_method = EXCLUDED.computation_method,
          is_synthetic = false,
          updated_at = now()
      `
      upserted++
    }
    if (i % 500 === 0 && i > 0) console.log(`  ${i}/${storeAgg.length}...`)
  }

  console.log(`[pie-resolve] Done! Upserted ${upserted} resolved prices for ${slug}`)
  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
