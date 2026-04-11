#!/usr/bin/env node
/**
 * Propagate Ingredient Density
 *
 * Two idempotent operations run weekly after the price sync:
 *
 * 1. Compute density_g_per_ml from cup_weight_grams on system_ingredients.
 *    Formula: density = cup_weight_grams / 236.588 (ml per cup).
 *    Safe to re-run: only fills NULL cells.
 *
 * 2. Copy weight_to_volume_ratio from system_ingredients to chef ingredients
 *    via confirmed/exact alias links. Enables cross-type unit conversion
 *    (cups -> lb) during recipe costing without relying solely on the
 *    static COMMON_DENSITIES lookup table.
 *    Safe to re-run: only fills NULL cells.
 *
 * 3. Refresh category_price_baselines materialized view so the Tier 9
 *    category-level price fallback reflects current system_ingredient_prices.
 */

import postgres from 'postgres'

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres', {
  idle_timeout: 120,
  connect_timeout: 30,
})

async function main() {
  console.log('=== Ingredient Density Propagation ===')
  console.log('')

  // Step 1: compute density_g_per_ml from cup_weight_grams
  const densityComputed = await sql`
    UPDATE system_ingredients
    SET density_g_per_ml = ROUND(cup_weight_grams / 236.588, 4),
        updated_at = now()
    WHERE cup_weight_grams IS NOT NULL
      AND density_g_per_ml IS NULL
  `
  console.log('density_g_per_ml computed from cup_weight:', densityComputed.count)

  // Step 2: propagate weight_to_volume_ratio to chef ingredients
  const propagated = await sql`
    UPDATE ingredients i
    SET weight_to_volume_ratio = si.weight_to_volume_ratio,
        updated_at = now()
    FROM ingredient_aliases ia
    JOIN system_ingredients si ON si.id = ia.system_ingredient_id
    WHERE ia.ingredient_id = i.id
      AND ia.tenant_id = i.tenant_id
      AND ia.match_method != 'dismissed'
      AND i.weight_to_volume_ratio IS NULL
      AND si.weight_to_volume_ratio IS NOT NULL
  `
  console.log('weight_to_volume_ratio propagated to chef ingredients:', propagated.count)

  // Step 3: refresh category baselines
  console.log('Refreshing category_price_baselines...')
  await sql`REFRESH MATERIALIZED VIEW category_price_baselines`

  const baselines = await sql`
    SELECT category, ingredient_count, round(median_cents_per_unit) as median_cents, most_common_unit
    FROM category_price_baselines ORDER BY ingredient_count DESC
  `
  console.log('\nCategory baselines after refresh:')
  for (const r of baselines) {
    console.log(`  ${r.category}: ${r.ingredient_count} ingredients, median=${r.median_cents}c/${r.most_common_unit}`)
  }

  console.log('\nDone.')
  await sql.end()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
