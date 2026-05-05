// @ts-nocheck
/**
 * PIE Nationwide Price Simulation
 *
 * Builds the ingredient census and generates resolved prices for all
 * census ingredients x pricing regions. This ensures PIE works for
 * ANY chef in ANY US location.
 *
 * Steps:
 *   1. Build ingredient_census from canonical_ingredients (food categories only)
 *   2. Generate resolved_prices by applying cost_index to system_ingredient_prices
 *   3. Generate synthetic_prices for gaps (category baselines)
 *
 * Uses real system_ingredient_prices (19K+) as the seed data, scaled by
 * regional cost indices to produce realistic regional variation.
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import pg from 'postgres'

const url = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DB_URL
const sql = pg(url, { max: 5 })

// PIE food categories (from pie-categories.ts)
const PIE_FOOD_CATEGORIES = [
  'Produce',
  'Protein',
  'Meat & Seafood',
  'Dairy',
  'Bakery',
  'Grains & Bakery',
  'Pantry',
  'Frozen',
  'Deli',
  'Prepared Foods',
  'Snacks & Candy',
  'Snacks',
  'Condiments & Sauces',
  'Oils, Vinegars, & Spices',
  'Baking Essentials',
  'Dry Goods & Pasta',
  'Canned Goods & Soups',
  'Beverages',
  'Alcohol',
  'Breakfast',
  'International',
  'Organic',
  'Natural',
  'flipp-circular',
]

// Map OpenClaw categories to census categories
const CENSUS_CATEGORY_MAP: Record<string, string> = {
  Produce: 'produce',
  Protein: 'protein',
  'Meat & Seafood': 'protein',
  Dairy: 'dairy',
  Bakery: 'baked',
  'Grains & Bakery': 'grain',
  Pantry: 'pantry',
  Frozen: 'pantry',
  Deli: 'protein',
  'Prepared Foods': 'pantry',
  'Snacks & Candy': 'sweet',
  Snacks: 'pantry',
  'Condiments & Sauces': 'condiment',
  'Oils, Vinegars, & Spices': 'spice',
  'Baking Essentials': 'pantry',
  'Dry Goods & Pasta': 'grain',
  'Canned Goods & Soups': 'pantry',
  Beverages: 'beverage',
  Alcohol: 'beverage',
  Breakfast: 'grain',
  International: 'pantry',
  Organic: 'produce',
  Natural: 'produce',
  'flipp-circular': 'pantry',
}

async function main() {
  const startTime = Date.now()

  // ─── Step 1: Build Census ─────────────────────────────────────────────
  console.log('[1/4] Building ingredient census from canonical_ingredients...')

  // Build census from canonical_ingredients that are food categories.
  // Since system_ingredient_prices uses UUIDs and canonical uses text slugs,
  // we build census from canonical directly (food categories only).
  const censusInsertResult = await sql`
    INSERT INTO openclaw.ingredient_census (
      ingredient_id, census_category, census_tier, standard_unit,
      is_active, is_seasonal, data_sources
    )
    SELECT
      ci.ingredient_id,
      CASE
        WHEN ci.category IN ('Produce') THEN 'produce'
        WHEN ci.category IN ('Protein', 'Meat & Seafood', 'Deli') THEN 'protein'
        WHEN ci.category IN ('Dairy') THEN 'dairy'
        WHEN ci.category IN ('Bakery', 'Grains & Bakery', 'Dry Goods & Pasta', 'Breakfast') THEN 'grain'
        WHEN ci.category IN ('Beverages', 'Alcohol') THEN 'beverage'
        WHEN ci.category IN ('Oils, Vinegars, & Spices') THEN 'spice'
        WHEN ci.category IN ('Condiments & Sauces') THEN 'condiment'
        WHEN ci.category IN ('Snacks & Candy') THEN 'sweet'
        ELSE 'pantry'
      END AS census_category,
      'core' AS census_tier,
      COALESCE(ci.standard_unit, 'each') AS standard_unit,
      true AS is_active,
      false AS is_seasonal,
      ARRAY['scrape'] AS data_sources
    FROM openclaw.canonical_ingredients ci
    WHERE ci.category = ANY(${PIE_FOOD_CATEGORIES})
    ON CONFLICT (ingredient_id) DO NOTHING
  `

  const censusCount =
    await sql`SELECT count(*) as c FROM openclaw.ingredient_census WHERE is_active = true`
  console.log(`  Census populated: ${censusCount[0].c} ingredients`)

  // ─── Step 2: Generate Resolved Prices ─────────────────────────────────
  console.log('[2/4] Generating resolved prices (system prices x regional cost indices)...')

  // Get all active regions
  const regions = await sql`
    SELECT id, slug, cost_index FROM openclaw.pricing_regions WHERE is_active = true
  `
  console.log(`  Active regions: ${regions.length}`)

  // Get all system ingredient prices joined to canonical via bridge table
  // If bridge doesn't exist, use the system_ingredient_id cast to text
  let prices: any[]
  try {
    prices = await sql`
      SELECT
        ipb.canonical_ingredient_id AS ingredient_id,
        sip.avg_price_cents AS price_cents,
        sip.price_unit,
        sip.store_count AS source_count,
        sip.last_refreshed_at AS updated_at
      FROM openclaw.system_ingredient_prices sip
      JOIN openclaw.ingredient_price_bridge ipb ON ipb.system_ingredient_price_id = sip.id
      WHERE sip.avg_price_cents > 0
    `
    console.log(`  Using ingredient_price_bridge for mapping`)
  } catch (e) {
    // Fallback: use system_ingredient_id as text identifier
    prices = await sql`
      SELECT
        sip.system_ingredient_id::text AS ingredient_id,
        sip.avg_price_cents AS price_cents,
        sip.price_unit,
        sip.store_count AS source_count,
        sip.last_refreshed_at AS updated_at
      FROM openclaw.system_ingredient_prices sip
      WHERE sip.avg_price_cents > 0
    `
    console.log(`  Using system_ingredient_id directly (no bridge found)`)
  }
  console.log(`  System prices to distribute: ${prices.length}`)

  // Generate resolved prices entirely in SQL: cross-join system prices with regions
  // Much faster than row-by-row, and avoids JSON serialization issues
  console.log(
    `  Generating via SQL cross-join (${prices.length} prices x ${regions.length} regions)...`
  )

  await sql`
    INSERT INTO openclaw.resolved_prices (
      canonical_ingredient_id, pricing_region_id,
      price_cents, price_unit, price_low_cents, price_high_cents, price_median_cents,
      confidence, observation_count, source_count, freshest_observation,
      price_type, computation_method
    )
    SELECT
      sip.system_ingredient_id::text,
      pr.id,
      ROUND(sip.avg_price_cents * pr.cost_index)::int,
      COALESCE(sip.price_unit, 'each'),
      ROUND(sip.min_price_cents * pr.cost_index)::int,
      ROUND(sip.max_price_cents * pr.cost_index)::int,
      ROUND(sip.median_price_cents * pr.cost_index)::int,
      COALESCE(sip.confidence, 0.75),
      COALESCE(sip.store_count, 1),
      COALESCE(sip.store_count, 1),
      COALESCE(sip.last_refreshed_at, now()),
      'retail',
      'cost_index_estimate'
    FROM openclaw.system_ingredient_prices sip
    CROSS JOIN openclaw.pricing_regions pr
    WHERE sip.avg_price_cents > 0
      AND pr.is_active = true
    ON CONFLICT (canonical_ingredient_id, pricing_region_id, price_type) DO UPDATE SET
      price_cents = EXCLUDED.price_cents,
      price_low_cents = EXCLUDED.price_low_cents,
      price_high_cents = EXCLUDED.price_high_cents,
      price_median_cents = EXCLUDED.price_median_cents,
      confidence = EXCLUDED.confidence,
      updated_at = now()
  `

  const resolvedTotal = await sql`SELECT count(*) as c FROM openclaw.resolved_prices`
  console.log(`  Total resolved prices: ${Number(resolvedTotal[0].c).toLocaleString()}`)

  // ─── Step 3: Generate Synthetic Prices for Census Gaps ────────────────
  console.log('[3/4] Generating synthetic prices for census gaps...')

  // Pre-compute category medians via CTE, then join (much faster than correlated subquery)
  const gapResult = await sql`
    WITH category_medians AS (
      SELECT
        CASE
          WHEN ci2.category IN ('Produce') THEN 'produce'
          WHEN ci2.category IN ('Protein', 'Meat & Seafood', 'Deli') THEN 'protein'
          WHEN ci2.category IN ('Dairy') THEN 'dairy'
          WHEN ci2.category IN ('Bakery', 'Grains & Bakery', 'Dry Goods & Pasta', 'Breakfast') THEN 'grain'
          WHEN ci2.category IN ('Beverages', 'Alcohol') THEN 'beverage'
          WHEN ci2.category IN ('Oils, Vinegars, & Spices') THEN 'spice'
          WHEN ci2.category IN ('Condiments & Sauces') THEN 'condiment'
          WHEN ci2.category IN ('Snacks & Candy') THEN 'sweet'
          ELSE 'pantry'
        END AS census_cat,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY sip2.avg_price_cents) AS median_cents
      FROM openclaw.system_ingredient_prices sip2
      JOIN openclaw.canonical_ingredients ci2 ON ci2.ingredient_id = sip2.system_ingredient_id::text
      WHERE sip2.avg_price_cents > 0
      GROUP BY 1
    )
    INSERT INTO openclaw.synthetic_prices (
      canonical_ingredient_id, pricing_region_id,
      price_cents, price_unit, confidence,
      derivation_method, derivation_inputs
    )
    SELECT
      ic.ingredient_id,
      pr.id,
      ROUND(COALESCE(cm.median_cents, 299) * pr.cost_index)::int AS price_cents,
      ic.standard_unit,
      0.35,
      'category_baseline',
      jsonb_build_object(
        'census_category', ic.census_category,
        'region_slug', pr.slug,
        'method', 'median_of_category_system_prices_x_cost_index'
      )
    FROM openclaw.ingredient_census ic
    CROSS JOIN openclaw.pricing_regions pr
    LEFT JOIN category_medians cm ON cm.census_cat = ic.census_category
    WHERE ic.is_active = true
      AND pr.is_active = true
      AND ic.ingredient_id NOT IN (
        SELECT system_ingredient_id::text FROM openclaw.system_ingredient_prices WHERE avg_price_cents > 0
      )
    ON CONFLICT (canonical_ingredient_id, pricing_region_id) DO NOTHING
  `

  const syntheticCount =
    await sql`SELECT count(*) as c FROM openclaw.synthetic_prices WHERE superseded_by_real = false`
  console.log(`  Synthetic prices generated: ${syntheticCount[0].c}`)

  // ─── Step 4: Verify Coverage ──────────────────────────────────────────
  console.log('[4/4] Verifying nationwide coverage...')

  const coverage = await sql`SELECT * FROM openclaw.census_coverage`
  const c = coverage[0]
  console.log(`
=== PIE NATIONWIDE SIMULATION COMPLETE ===
  Census ingredients:    ${c.total_census_ingredients}
  Core tier:             ${c.core_count}
  Extended tier:         ${c.extended_count}
  Specialty tier:        ${c.specialty_count}
  Pricing regions:       ${c.total_regions}
  Price cells needed:    ${Number(c.total_price_cells_needed).toLocaleString()}
  Filled price cells:    ${Number(c.filled_price_cells).toLocaleString()}
  Coverage:              ${c.coverage_pct}%

  Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s
`)

  // Check compliance
  try {
    const compliance = await sql`SELECT * FROM openclaw.pie_compliance`
    const pc = compliance[0]
    console.log(`PIE Law Compliance:
  Law 2 (zero-price ingredients): ${pc.law2_ingredients_with_zero_price}
  Law 3 (prices without confidence): ${pc.law3_prices_without_confidence}
  Law 4 (stale prices): ${pc.law4_stale_prices}
  Law 5 (unresolved incidents): ${pc.law5_unresolved_incidents}
  Law 8 (census size): ${pc.law8_census_size}
  Law 9 (active synthetics): ${pc.law9_active_synthetics}
  Law 10 (unprotected): ${pc.law10_unprotected_ingredients}
`)
  } catch (e) {
    console.log('Compliance view not available:', e.message?.slice(0, 80))
  }

  await sql.end()
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
