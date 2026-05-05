/**
 * PIE Intelligence: Wholesale Pricing Layer
 *
 * Professional chefs buy from wholesale distributors (Sysco, US Foods,
 * Restaurant Depot, Performance Food Group). This layer:
 *   1. Tracks wholesale pricing by distributor
 *   2. Compares wholesale vs retail for savings analysis
 *   3. Identifies when wholesale is/isn't worth it by quantity
 *   4. Maps distributor coverage by region
 *   5. Maintains distributor-specific markup models
 *
 * NOT a 'use server' file. Called by cron and server actions.
 */

import { pgClient } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WholesalePrice {
  ingredientId: string
  ingredientName: string
  distributorId: string
  distributorName: string
  /** Price in cents per unit */
  priceCents: number
  unit: string
  /** Pack size (e.g., "50 lb case") */
  packSize: string
  /** Price per standard unit (lb/oz/each) in cents */
  perStandardUnitCents: number
  /** Minimum order quantity */
  minOrder: number | null
  /** Is this currently in stock? */
  inStock: boolean
  /** Last confirmed date */
  confirmedAt: string
  /** Region/state availability */
  availableStates: string[]
}

export interface WholesaleComparison {
  ingredientId: string
  ingredientName: string
  category: string
  retailCents: number
  retailUnit: string
  wholesaleCents: number
  wholesaleUnit: string
  wholesaleDistributor: string
  savingsPct: number
  savingsCentsPerUnit: number
  /** Minimum quantity to make wholesale worthwhile */
  breakEvenQuantity: number
  /** Is wholesale available in chef's state? */
  availableLocally: boolean
}

export interface DistributorProfile {
  id: string
  name: string
  type: 'broadline' | 'specialty' | 'cash_and_carry' | 'club'
  /** States where this distributor operates */
  coverageStates: string[]
  /** Number of products tracked */
  productCount: number
  /** Average savings vs retail */
  avgSavingsPct: number
  /** Typical markup model */
  markupModel: {
    baseMarkup: number
    volumeDiscount: number
    membershipRequired: boolean
  }
  lastUpdated: string
}

export interface WholesaleRunResult {
  distributorsUpdated: number
  pricesProcessed: number
  comparisonsGenerated: number
  savingsOpportunities: number
  durationMs: number
}

// ---------------------------------------------------------------------------
// Known Distributors
// ---------------------------------------------------------------------------

const DISTRIBUTORS: DistributorProfile[] = [
  {
    id: 'sysco',
    name: 'Sysco',
    type: 'broadline',
    coverageStates: ['ALL'], // nationwide
    productCount: 0,
    avgSavingsPct: 25,
    markupModel: { baseMarkup: 0.15, volumeDiscount: 0.05, membershipRequired: false },
    lastUpdated: '',
  },
  {
    id: 'us_foods',
    name: 'US Foods',
    type: 'broadline',
    coverageStates: ['ALL'],
    productCount: 0,
    avgSavingsPct: 23,
    markupModel: { baseMarkup: 0.18, volumeDiscount: 0.04, membershipRequired: false },
    lastUpdated: '',
  },
  {
    id: 'restaurant_depot',
    name: 'Restaurant Depot',
    type: 'cash_and_carry',
    coverageStates: [
      'MA',
      'NY',
      'NJ',
      'PA',
      'CT',
      'CA',
      'TX',
      'FL',
      'IL',
      'OH',
      'GA',
      'NC',
      'VA',
      'MD',
      'CO',
      'AZ',
      'WA',
      'OR',
      'MI',
      'MN',
      'MO',
      'TN',
      'IN',
      'WI',
      'SC',
      'NV',
      'UT',
      'OK',
      'LA',
      'KY',
    ],
    productCount: 0,
    avgSavingsPct: 30,
    markupModel: { baseMarkup: 0.08, volumeDiscount: 0, membershipRequired: true },
    lastUpdated: '',
  },
  {
    id: 'performance_food',
    name: 'Performance Food Group',
    type: 'broadline',
    coverageStates: ['ALL'],
    productCount: 0,
    avgSavingsPct: 22,
    markupModel: { baseMarkup: 0.2, volumeDiscount: 0.03, membershipRequired: false },
    lastUpdated: '',
  },
  {
    id: 'costco_business',
    name: 'Costco Business Center',
    type: 'club',
    coverageStates: [
      'CA',
      'WA',
      'AZ',
      'CO',
      'TX',
      'FL',
      'GA',
      'IL',
      'NJ',
      'NY',
      'VA',
      'MD',
      'OH',
      'MN',
      'OR',
      'NV',
      'UT',
    ],
    productCount: 0,
    avgSavingsPct: 20,
    markupModel: { baseMarkup: 0.12, volumeDiscount: 0, membershipRequired: true },
    lastUpdated: '',
  },
  {
    id: 'chefs_warehouse',
    name: "Chef's Warehouse",
    type: 'specialty',
    coverageStates: [
      'NY',
      'NJ',
      'CT',
      'MA',
      'PA',
      'FL',
      'CA',
      'TX',
      'IL',
      'OH',
      'GA',
      'MD',
      'VA',
      'DC',
    ],
    productCount: 0,
    avgSavingsPct: 15,
    markupModel: { baseMarkup: 0.25, volumeDiscount: 0.08, membershipRequired: false },
    lastUpdated: '',
  },
]

// ---------------------------------------------------------------------------
// Wholesale Price Modeling
// ---------------------------------------------------------------------------

/**
 * Estimate wholesale price from retail price using distributor markup models.
 * Used when we don't have direct wholesale data.
 */
function estimateWholesaleFromRetail(
  retailCents: number,
  distributor: DistributorProfile,
  quantity: number
): number {
  const baseDiscount = 1 - distributor.markupModel.baseMarkup
  const volumeBonus = quantity >= 10 ? distributor.markupModel.volumeDiscount : 0
  const totalDiscount = baseDiscount - volumeBonus
  return Math.round(retailCents * totalDiscount)
}

/**
 * Calculate break-even quantity (where wholesale savings cover delivery/membership).
 */
function calculateBreakEven(
  retailCents: number,
  wholesaleCents: number,
  deliveryFeeCents: number,
  membershipAnnualCents: number,
  monthlyUsage: number
): number {
  const savingsPerUnit = retailCents - wholesaleCents
  if (savingsPerUnit <= 0) return Infinity

  const monthlyMembershipCost = membershipAnnualCents / 12
  const fixedCostPerOrder = deliveryFeeCents + monthlyMembershipCost
  return Math.ceil(fixedCostPerOrder / savingsPerUnit)
}

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

/**
 * Process wholesale data and generate comparisons.
 * Runs on cron after main price resolution.
 */
export async function runWholesaleAnalysis(): Promise<WholesaleRunResult> {
  const start = Date.now()
  const sql = pgClient
  let pricesProcessed = 0
  let comparisonsGenerated = 0
  let savingsOpportunities = 0

  // 1. Seed/update distributor profiles
  for (const dist of DISTRIBUTORS) {
    const [existing] = await sql`
      SELECT product_count FROM openclaw.wholesale_distributors WHERE id = ${dist.id}
    `
    const productCount = existing ? Number(existing.product_count) : 0

    await sql`
      INSERT INTO openclaw.wholesale_distributors (
        id, name, type, coverage_states, product_count,
        avg_savings_pct, markup_base, markup_volume_discount,
        membership_required, updated_at
      ) VALUES (
        ${dist.id}, ${dist.name}, ${dist.type}, ${dist.coverageStates},
        ${productCount}, ${dist.avgSavingsPct},
        ${dist.markupModel.baseMarkup}, ${dist.markupModel.volumeDiscount},
        ${dist.markupModel.membershipRequired}, now()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        coverage_states = EXCLUDED.coverage_states,
        avg_savings_pct = EXCLUDED.avg_savings_pct,
        updated_at = now()
    `
  }

  // 2. Get existing wholesale prices from openclaw_wholesale source
  const wholesalePrices = await sql`
    SELECT
      sp.product_id,
      p.name AS product_name,
      nm.canonical_ingredient_id,
      ci.name AS ingredient_name,
      ci.category,
      sp.price_cents,
      sp.unit,
      s.chain AS distributor,
      s.state,
      sp.last_confirmed_at
    FROM openclaw.store_products sp
    JOIN openclaw.products p ON p.id = sp.product_id
    JOIN openclaw.stores s ON s.id = sp.store_id
    LEFT JOIN openclaw.normalization_map nm ON nm.raw_name = p.name
    LEFT JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = nm.canonical_ingredient_id
    WHERE sp.source = 'openclaw_wholesale'
      AND sp.last_confirmed_at > now() - interval '30 days'
    ORDER BY sp.last_confirmed_at DESC
    LIMIT 10000
  `

  pricesProcessed = wholesalePrices.length

  // 3. Generate comparisons: wholesale vs retail resolved price
  for (const wp of wholesalePrices) {
    if (!wp.canonical_ingredient_id) continue

    // Get current retail resolved price
    const [retail] = await sql`
      SELECT price_cents, computation_method
      FROM openclaw.resolved_prices
      WHERE canonical_ingredient_id = ${wp.canonical_ingredient_id}
        AND is_synthetic = false
      ORDER BY confidence DESC, freshest_observation DESC
      LIMIT 1
    `

    if (!retail) continue

    const retailCents = Number(retail.price_cents)
    const wholesaleCents = Number(wp.price_cents)

    if (retailCents <= 0 || wholesaleCents <= 0) continue

    const savingsPct = Math.round(((retailCents - wholesaleCents) / retailCents) * 100)

    if (savingsPct > 5) {
      // Only track meaningful savings
      await sql`
        INSERT INTO openclaw.wholesale_comparisons (
          canonical_ingredient_id, ingredient_name, category,
          retail_cents, wholesale_cents, distributor,
          savings_pct, savings_cents_per_unit,
          available_states, updated_at
        ) VALUES (
          ${wp.canonical_ingredient_id}, ${wp.ingredient_name || wp.product_name},
          ${wp.category || 'unknown'},
          ${retailCents}, ${wholesaleCents}, ${wp.distributor},
          ${savingsPct}, ${retailCents - wholesaleCents},
          ARRAY[${wp.state}]::text[], now()
        )
        ON CONFLICT (canonical_ingredient_id, distributor) DO UPDATE SET
          retail_cents = EXCLUDED.retail_cents,
          wholesale_cents = EXCLUDED.wholesale_cents,
          savings_pct = EXCLUDED.savings_pct,
          savings_cents_per_unit = EXCLUDED.savings_cents_per_unit,
          updated_at = now()
      `
      comparisonsGenerated++
      if (savingsPct > 15) savingsOpportunities++
    }
  }

  // 4. Generate estimated wholesale prices for ingredients without direct data
  // Using markup models from known distributors
  const uncoveredIngredients = await sql`
    SELECT
      rp.canonical_ingredient_id,
      ci.name, ci.category,
      rp.price_cents AS retail_cents
    FROM openclaw.resolved_prices rp
    JOIN openclaw.canonical_ingredients ci ON ci.ingredient_id = rp.canonical_ingredient_id
    WHERE rp.is_synthetic = false
      AND rp.confidence > 0.5
      AND NOT EXISTS (
        SELECT 1 FROM openclaw.wholesale_comparisons wc
        WHERE wc.canonical_ingredient_id = rp.canonical_ingredient_id
      )
    ORDER BY rp.confidence DESC
    LIMIT 5000
  `

  for (const ing of uncoveredIngredients) {
    const retailCents = Number(ing.retail_cents)
    if (retailCents <= 0) continue

    // Estimate from best broadline distributor
    const estimatedWholesale = estimateWholesaleFromRetail(retailCents, DISTRIBUTORS[0], 1)
    const savingsPct = Math.round(((retailCents - estimatedWholesale) / retailCents) * 100)

    if (savingsPct > 10) {
      await sql`
        INSERT INTO openclaw.wholesale_comparisons (
          canonical_ingredient_id, ingredient_name, category,
          retail_cents, wholesale_cents, distributor,
          savings_pct, savings_cents_per_unit,
          is_estimated, available_states, updated_at
        ) VALUES (
          ${ing.canonical_ingredient_id}, ${ing.name}, ${ing.category},
          ${retailCents}, ${estimatedWholesale}, 'sysco_estimated',
          ${savingsPct}, ${retailCents - estimatedWholesale},
          true, ARRAY['ALL']::text[], now()
        )
        ON CONFLICT (canonical_ingredient_id, distributor) DO NOTHING
      `
    }
  }

  return {
    distributorsUpdated: DISTRIBUTORS.length,
    pricesProcessed,
    comparisonsGenerated,
    savingsOpportunities,
    durationMs: Date.now() - start,
  }
}

// ---------------------------------------------------------------------------
// Query API
// ---------------------------------------------------------------------------

/** Get wholesale savings opportunities for a chef's state */
export async function getWholesaleSavings(
  state: string,
  category?: string,
  limit = 50
): Promise<WholesaleComparison[]> {
  const sql = pgClient
  const catFilter = category ? sql`AND wc.category = ${category}` : sql``

  const rows = await sql`
    SELECT
      wc.canonical_ingredient_id AS ingredient_id,
      wc.ingredient_name,
      wc.category,
      wc.retail_cents,
      wc.wholesale_cents,
      wc.distributor AS wholesale_distributor,
      wc.savings_pct,
      wc.savings_cents_per_unit,
      wc.available_states
    FROM openclaw.wholesale_comparisons wc
    WHERE wc.savings_pct > 10
      AND (wc.available_states @> ARRAY[${state}]::text[] OR wc.available_states @> ARRAY['ALL']::text[])
      ${catFilter}
    ORDER BY wc.savings_pct DESC
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    ingredientId: r.ingredient_id as string,
    ingredientName: r.ingredient_name as string,
    category: r.category as string,
    retailCents: Number(r.retail_cents),
    retailUnit: 'lb',
    wholesaleCents: Number(r.wholesale_cents),
    wholesaleUnit: 'lb',
    wholesaleDistributor: r.wholesale_distributor as string,
    savingsPct: Number(r.savings_pct),
    savingsCentsPerUnit: Number(r.savings_cents_per_unit),
    breakEvenQuantity: 5, // default assumption
    availableLocally: true,
  }))
}

/** Get available distributors for a state */
export async function getDistributorsForState(state: string): Promise<DistributorProfile[]> {
  return DISTRIBUTORS.filter(
    (d) => d.coverageStates.includes('ALL') || d.coverageStates.includes(state)
  )
}

/** Get total potential savings for a chef's ingredient list */
export async function calculateTotalSavings(
  ingredientIds: string[],
  state: string
): Promise<{
  totalRetailCents: number
  totalWholesaleCents: number
  totalSavingsCents: number
  savingsPct: number
  bestDistributor: string | null
  ingredientsWithSavings: number
}> {
  if (ingredientIds.length === 0) {
    return {
      totalRetailCents: 0,
      totalWholesaleCents: 0,
      totalSavingsCents: 0,
      savingsPct: 0,
      bestDistributor: null,
      ingredientsWithSavings: 0,
    }
  }

  const sql = pgClient
  const rows = await sql`
    SELECT
      wc.wholesale_cents,
      wc.retail_cents,
      wc.distributor,
      wc.savings_cents_per_unit
    FROM openclaw.wholesale_comparisons wc
    WHERE wc.canonical_ingredient_id = ANY(${ingredientIds})
      AND (wc.available_states @> ARRAY[${state}]::text[] OR wc.available_states @> ARRAY['ALL']::text[])
      AND wc.savings_pct > 0
  `

  let totalRetail = 0
  let totalWholesale = 0
  const distributorSavings = new Map<string, number>()

  for (const r of rows) {
    totalRetail += Number(r.retail_cents)
    totalWholesale += Number(r.wholesale_cents)
    const dist = r.distributor as string
    distributorSavings.set(
      dist,
      (distributorSavings.get(dist) || 0) + Number(r.savings_cents_per_unit)
    )
  }

  // Find best distributor by total savings
  let bestDist: string | null = null
  let maxSavings = 0
  for (const [dist, savings] of Array.from(distributorSavings.entries())) {
    if (savings > maxSavings) {
      maxSavings = savings
      bestDist = dist
    }
  }

  return {
    totalRetailCents: totalRetail,
    totalWholesaleCents: totalWholesale,
    totalSavingsCents: totalRetail - totalWholesale,
    savingsPct:
      totalRetail > 0 ? Math.round(((totalRetail - totalWholesale) / totalRetail) * 100) : 0,
    bestDistributor: bestDist,
    ingredientsWithSavings: rows.length,
  }
}
