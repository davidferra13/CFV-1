/**
 * PIE Law 8: The Census
 *
 * Builds and maintains the master manifest of every food ingredient
 * in American commerce. Coverage is measured against this, not against
 * "what we happen to have."
 *
 * NOT a 'use server' file. Called by cron/admin endpoints.
 */

import { pgClient } from '@/lib/db'
import { PIE_FOOD_CATEGORIES } from './pie-categories'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CensusStats {
  totalIngredients: number
  core: number
  extended: number
  specialty: number
  totalRegions: number
  totalPriceCellsNeeded: number
  filledPriceCells: number
  coveragePct: number
  byCategory: Array<{
    category: string
    count: number
    withPrice: number
    coveragePct: number
  }>
}

export interface CensusGap {
  ingredientId: string
  name: string
  category: string
  tier: string
  regionsWithPrice: number
  totalRegions: number
  gapPct: number
}

// ---------------------------------------------------------------------------
// Census builder: populate from canonical_ingredients
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, string> = {
  beef: 'protein',
  poultry: 'protein',
  pork: 'protein',
  lamb: 'protein',
  game: 'protein',
  veal: 'protein',
  fish: 'seafood',
  shellfish: 'seafood',
  seafood: 'seafood',
  dairy: 'dairy',
  cheese: 'dairy',
  eggs: 'dairy',
  produce: 'produce',
  vegetables: 'produce',
  fruits: 'produce',
  fruit: 'produce',
  herbs: 'herb',
  herb: 'herb',
  spices: 'spice',
  spice: 'spice',
  seasoning: 'spice',
  grains: 'grain',
  grain: 'grain',
  pasta: 'grain',
  rice: 'grain',
  cereal: 'grain',
  oils: 'oil',
  oil: 'oil',
  fats: 'oil',
  pantry: 'pantry',
  canned: 'pantry',
  dry: 'pantry',
  baking: 'pantry',
  nuts: 'nut',
  seeds: 'nut',
  nut: 'nut',
  legumes: 'legume',
  legume: 'legume',
  beans: 'legume',
  beverages: 'beverage',
  beverage: 'beverage',
  coffee: 'beverage',
  tea: 'beverage',
  bread: 'baked',
  baked: 'baked',
  bakery: 'baked',
  sweets: 'sweet',
  sugar: 'sweet',
  chocolate: 'sweet',
  condiment: 'condiment',
  sauce: 'condiment',
  dressing: 'condiment',
  uncategorized: 'pantry',
}

function mapToCensusCategory(category: string | null): string {
  if (!category) return 'pantry'
  const lower = category.toLowerCase()
  return CATEGORY_MAP[lower] || 'pantry'
}

function assignTier(storeCount: number, hasUsda: boolean): 'core' | 'extended' | 'specialty' {
  if (hasUsda || storeCount >= 5) return 'core'
  if (storeCount >= 2) return 'extended'
  return 'specialty'
}

export async function buildCensus(): Promise<{
  inserted: number
  updated: number
  durationMs: number
}> {
  const sql = pgClient
  const start = Date.now()
  let inserted = 0
  let updated = 0

  // Get all canonical food ingredients with their store presence
  const ingredients = await sql`
    WITH store_presence AS (
      SELECT
        nm.canonical_ingredient_id,
        COUNT(DISTINCT sp.store_id) AS store_count
      FROM openclaw.normalization_map nm
      JOIN openclaw.products p ON p.name = nm.raw_name
      JOIN openclaw.store_products sp ON sp.product_id = p.id
      WHERE p.is_food = true
      GROUP BY nm.canonical_ingredient_id
    ),
    usda_matches AS (
      SELECT DISTINCT ci.ingredient_id
      FROM openclaw.canonical_ingredients ci
      JOIN openclaw.usda_price_baselines ub
        ON extensions.similarity(ub.item_name, ci.name) > 0.35
    )
    SELECT
      ci.ingredient_id,
      ci.name,
      ci.category,
      ci.standard_unit,
      COALESCE(sp.store_count, 0) AS store_count,
      CASE WHEN um.ingredient_id IS NOT NULL THEN true ELSE false END AS has_usda
    FROM openclaw.canonical_ingredients ci
    LEFT JOIN store_presence sp ON sp.canonical_ingredient_id = ci.ingredient_id
    LEFT JOIN usda_matches um ON um.ingredient_id = ci.ingredient_id
    WHERE ci.standard_unit IS NOT NULL
      AND ci.category = ANY(${PIE_FOOD_CATEGORIES as unknown as string[]})
  `

  console.log(`[census] Processing ${ingredients.length} canonical ingredients...`)

  // Batch upsert into census
  const BATCH_SIZE = 500
  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE)

    for (const row of batch) {
      const censusCategory = mapToCensusCategory(row.category as string | null)
      const tier = assignTier(Number(row.store_count), row.has_usda as boolean)

      const result = await sql`
        INSERT INTO openclaw.ingredient_census (
          ingredient_id, census_category, census_tier, standard_unit,
          data_sources, updated_at
        ) VALUES (
          ${row.ingredient_id}, ${censusCategory}, ${tier},
          ${row.standard_unit || 'each'},
          ${
            Number(row.store_count) > 0
              ? ['scrape', 'usda', 'synthetic']
              : row.has_usda
                ? ['usda', 'synthetic']
                : ['synthetic']
          },
          now()
        )
        ON CONFLICT (ingredient_id) DO UPDATE SET
          census_category = EXCLUDED.census_category,
          census_tier = EXCLUDED.census_tier,
          data_sources = EXCLUDED.data_sources,
          updated_at = now()
        RETURNING (xmax = 0) AS was_insert
      `

      if (result[0]?.was_insert) inserted++
      else updated++
    }

    if ((i + BATCH_SIZE) % 2000 === 0) {
      console.log(`[census] ${Math.min(i + BATCH_SIZE, ingredients.length)}/${ingredients.length}`)
    }
  }

  const durationMs = Date.now() - start
  console.log(`[census] Done: ${inserted} inserted, ${updated} updated in ${durationMs}ms`)

  return { inserted, updated, durationMs }
}

// ---------------------------------------------------------------------------
// Census stats: the compliance dashboard numbers
// ---------------------------------------------------------------------------

export async function getCensusStats(): Promise<CensusStats> {
  const sql = pgClient

  const [summary] = await sql`SELECT * FROM openclaw.census_coverage`

  const byCategory = await sql`
    SELECT
      ic.census_category AS category,
      count(*) AS total,
      count(rp.canonical_ingredient_id) AS with_price,
      CASE WHEN count(*) = 0 THEN 0
        ELSE ROUND(count(rp.canonical_ingredient_id)::numeric / count(*) * 100, 1)
      END AS coverage_pct
    FROM openclaw.ingredient_census ic
    LEFT JOIN (
      SELECT DISTINCT canonical_ingredient_id
      FROM openclaw.resolved_prices
    ) rp ON rp.canonical_ingredient_id = ic.ingredient_id
    WHERE ic.is_active = true
    GROUP BY ic.census_category
    ORDER BY coverage_pct ASC
  `

  return {
    totalIngredients: Number(summary.total_census_ingredients),
    core: Number(summary.core_count),
    extended: Number(summary.extended_count),
    specialty: Number(summary.specialty_count),
    totalRegions: Number(summary.total_regions),
    totalPriceCellsNeeded: Number(summary.total_price_cells_needed),
    filledPriceCells: Number(summary.filled_price_cells),
    coveragePct: Number(summary.coverage_pct),
    byCategory: byCategory.map((r: Record<string, unknown>) => ({
      category: r.category as string,
      count: Number(r.total),
      withPrice: Number(r.with_price),
      coveragePct: Number(r.coverage_pct),
    })),
  }
}

// ---------------------------------------------------------------------------
// Census gaps: which ingredients are missing prices in the most regions?
// ---------------------------------------------------------------------------

export async function getCensusGaps(limit = 50): Promise<CensusGap[]> {
  const sql = pgClient

  const gaps = await sql`
    WITH total_regions AS (
      SELECT count(*) AS cnt FROM openclaw.pricing_regions WHERE is_active = true
    ),
    ingredient_coverage AS (
      SELECT
        ic.ingredient_id,
        ci.name,
        ic.census_category,
        ic.census_tier,
        count(rp.pricing_region_id) AS regions_with_price
      FROM openclaw.ingredient_census ic
      JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = ic.ingredient_id
      LEFT JOIN openclaw.resolved_prices rp ON rp.canonical_ingredient_id = ic.ingredient_id
      WHERE ic.is_active = true
      GROUP BY ic.ingredient_id, ci.name, ic.census_category, ic.census_tier
    )
    SELECT
      icov.ingredient_id,
      icov.name,
      icov.census_category AS category,
      icov.census_tier AS tier,
      icov.regions_with_price,
      tr.cnt AS total_regions,
      ROUND((1 - icov.regions_with_price::numeric / GREATEST(tr.cnt, 1)) * 100, 1) AS gap_pct
    FROM ingredient_coverage icov
    CROSS JOIN total_regions tr
    WHERE icov.regions_with_price < tr.cnt
    ORDER BY icov.census_tier ASC, gap_pct DESC
    LIMIT ${limit}
  `

  return gaps.map((r: Record<string, unknown>) => ({
    ingredientId: r.ingredient_id as string,
    name: r.name as string,
    category: r.category as string,
    tier: r.tier as string,
    regionsWithPrice: Number(r.regions_with_price),
    totalRegions: Number(r.total_regions),
    gapPct: Number(r.gap_pct),
  }))
}
