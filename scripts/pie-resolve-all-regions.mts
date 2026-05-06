/**
 * Resolve prices for ALL regions that have mapped stores.
 * Runs sequentially to avoid overloading the DB.
 * Usage: npx tsx scripts/pie-resolve-all-regions.mts
 */
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { max: 3 })

async function main() {
  const start = Date.now()

  // Find all regions with stores mapped via zip_centroids
  const regions = await sql`
    SELECT DISTINCT pr.slug, pr.name, pr.id, pr.cost_index
    FROM openclaw.pricing_regions pr
    JOIN openclaw.zip_centroids zc ON zc.pricing_region_id = pr.id
    JOIN openclaw.stores s ON s.zip = zc.zip AND s.is_active = true
    JOIN openclaw.store_products sp ON sp.store_id = s.id AND sp.price_cents > 0
    ORDER BY pr.name
  `

  console.log(`[pie-resolve-all] Found ${regions.length} regions with store price data`)
  let totalUpserted = 0

  for (const region of regions) {
    const regionStart = Date.now()
    console.log(`\n[${region.slug}] Processing...`)

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

    if (storeAgg.length === 0) {
      console.log(`  [${region.slug}] No aggregable prices (store_products empty or no norm_map links)`)
      continue
    }

    // Batch upsert
    let upserted = 0
    for (const row of storeAgg) {
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

    const elapsed = ((Date.now() - regionStart) / 1000).toFixed(1)
    console.log(`  [${region.slug}] ${upserted} prices in ${elapsed}s`)
    totalUpserted += upserted
  }

  const totalElapsed = ((Date.now() - start) / 1000).toFixed(0)
  console.log(`\n[pie-resolve-all] DONE: ${totalUpserted} prices across ${regions.length} regions in ${totalElapsed}s`)
  await sql.end()
}

main().catch(e => { console.error(e); process.exit(1) })
