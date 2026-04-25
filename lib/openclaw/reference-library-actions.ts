'use server'

/**
 * OpenClaw Reference Library Actions
 * Server actions for shelf life, seasonality, waste factors,
 * and store accuracy scoring.
 */

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

// --- Types ---

export type ShelfLifeInfo = {
  ingredientName: string
  category: string | null
  fridgeDaysMin: number | null
  fridgeDaysMax: number | null
  freezerDaysMin: number | null
  freezerDaysMax: number | null
  pantryDaysMin: number | null
  pantryDaysMax: number | null
  storageTips: string | null
  afterOpeningDays: number | null
}

export type SeasonalInfo = {
  ingredientName: string
  region: string
  peakMonths: number[]
  availableMonths: number[]
  priceLowMonths: number[]
  priceHighMonths: number[]
  isYearRound: boolean
  isInSeason: boolean
  confidence: number | null
  notes: string | null
}

export type SeasonalIngredient = {
  ingredientName: string
  systemIngredientId: string | null
  peakMonths: number[]
  confidence: number | null
}

export type WasteFactor = {
  ingredientName: string
  ediblePct: number
  cookedYieldPct: number | null
  wasteType: string | null
  prepMethod: string | null
  notes: string | null
}

export type StoreAccuracy = {
  storeName: string
  chainSlug: string | null
  region: string | null
  accuracyPct: number | null
  avgDeviationPct: number | null
  comparisonCount: number
  trend: string | null
  lastComparedAt: string | null
}

// --- Shelf Life ---

export async function getShelfLife(ingredientId: string): Promise<ShelfLifeInfo | null> {
  await requireChef()
  const sql = pgClient

  // Try by system_ingredient_id first (via ingredient -> system_ingredient link)
  const rows = await sql`
    SELECT sl.ingredient_name, sl.category,
           sl.fridge_days_min, sl.fridge_days_max,
           sl.freezer_days_min, sl.freezer_days_max,
           sl.pantry_days_min, sl.pantry_days_max,
           sl.storage_tips, sl.after_opening_days
    FROM ingredient_shelf_life sl
    WHERE sl.system_ingredient_id = (
      SELECT system_ingredient_id FROM ingredients WHERE id = ${ingredientId}
    )
    LIMIT 1
  `

  if (rows.length > 0) return mapShelfLife(rows[0])

  // Fallback: search by ingredient name
  const nameRows = await sql`
    SELECT sl.ingredient_name, sl.category,
           sl.fridge_days_min, sl.fridge_days_max,
           sl.freezer_days_min, sl.freezer_days_max,
           sl.pantry_days_min, sl.pantry_days_max,
           sl.storage_tips, sl.after_opening_days
    FROM ingredient_shelf_life sl
    JOIN ingredients i ON lower(sl.ingredient_name) = lower(i.name)
    WHERE i.id = ${ingredientId}
    LIMIT 1
  `

  return nameRows.length > 0 ? mapShelfLife(nameRows[0]) : null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapShelfLife(row: any): ShelfLifeInfo {
  return {
    ingredientName: row.ingredient_name as string,
    category: row.category as string | null,
    fridgeDaysMin: row.fridge_days_min as number | null,
    fridgeDaysMax: row.fridge_days_max as number | null,
    freezerDaysMin: row.freezer_days_min as number | null,
    freezerDaysMax: row.freezer_days_max as number | null,
    pantryDaysMin: row.pantry_days_min as number | null,
    pantryDaysMax: row.pantry_days_max as number | null,
    storageTips: row.storage_tips as string | null,
    afterOpeningDays: row.after_opening_days as number | null,
  }
}

// --- Seasonality ---

export async function getSeasonalInfo(
  ingredientId: string,
  region: string = 'northeast'
): Promise<SeasonalInfo | null> {
  await requireChef()
  const sql = pgClient

  const rows = await sql`
    SELECT s.ingredient_name, s.region, s.peak_months, s.available_months,
           s.price_low_months, s.price_high_months, s.is_year_round,
           s.confidence, s.notes
    FROM ingredient_seasonality s
    WHERE s.system_ingredient_id = (
      SELECT system_ingredient_id FROM ingredients WHERE id = ${ingredientId}
    )
    AND s.region = ${region}
    LIMIT 1
  `

  if (rows.length === 0) return null

  const row = rows[0]
  const currentMonth = new Date().getMonth() + 1
  const peakMonths = (row.peak_months as number[]) || []

  return {
    ingredientName: row.ingredient_name as string,
    region: row.region as string,
    peakMonths,
    availableMonths: (row.available_months as number[]) || [],
    priceLowMonths: (row.price_low_months as number[]) || [],
    priceHighMonths: (row.price_high_months as number[]) || [],
    isYearRound: row.is_year_round as boolean,
    isInSeason: peakMonths.includes(currentMonth),
    confidence: row.confidence as number | null,
    notes: row.notes as string | null,
  }
}

export async function getWhatsInSeason(
  month?: number,
  region: string = 'northeast'
): Promise<SeasonalIngredient[]> {
  await requireChef()
  const sql = pgClient
  const targetMonth = month || new Date().getMonth() + 1

  const rows = await sql`
    SELECT ingredient_name, system_ingredient_id, peak_months, confidence
    FROM ingredient_seasonality
    WHERE region = ${region}
    AND ${targetMonth} = ANY(peak_months)
    AND is_year_round = false
    ORDER BY confidence DESC NULLS LAST
  `

  return rows.map((row) => ({
    ingredientName: row.ingredient_name as string,
    systemIngredientId: row.system_ingredient_id as string | null,
    peakMonths: (row.peak_months as number[]) || [],
    confidence: row.confidence as number | null,
  }))
}

// --- Waste Factors ---

export async function getWasteFactor(
  ingredientId: string,
  prepMethod?: string
): Promise<WasteFactor | null> {
  await requireChef()
  const sql = pgClient

  let rows
  if (prepMethod) {
    rows = await sql`
      SELECT w.ingredient_name, w.as_purchased_to_edible_pct, w.cooked_yield_pct,
             w.waste_type, w.prep_method, w.notes
      FROM ingredient_waste_factors w
      WHERE w.system_ingredient_id = (
        SELECT system_ingredient_id FROM ingredients WHERE id = ${ingredientId}
      )
      AND w.prep_method = ${prepMethod}
      LIMIT 1
    `
  } else {
    rows = await sql`
      SELECT w.ingredient_name, w.as_purchased_to_edible_pct, w.cooked_yield_pct,
             w.waste_type, w.prep_method, w.notes
      FROM ingredient_waste_factors w
      WHERE w.system_ingredient_id = (
        SELECT system_ingredient_id FROM ingredients WHERE id = ${ingredientId}
      )
      ORDER BY w.prep_method ASC NULLS FIRST
      LIMIT 1
    `
  }

  if (rows.length === 0) {
    // Fallback by name
    const nameRows = await sql`
      SELECT w.ingredient_name, w.as_purchased_to_edible_pct, w.cooked_yield_pct,
             w.waste_type, w.prep_method, w.notes
      FROM ingredient_waste_factors w
      JOIN ingredients i ON lower(w.ingredient_name) = lower(i.name)
      WHERE i.id = ${ingredientId}
      ORDER BY w.prep_method ASC NULLS FIRST
      LIMIT 1
    `
    if (nameRows.length === 0) return null
    rows = nameRows
  }

  const row = rows[0]
  return {
    ingredientName: row.ingredient_name as string,
    ediblePct: Number(row.as_purchased_to_edible_pct),
    cookedYieldPct: row.cooked_yield_pct != null ? Number(row.cooked_yield_pct) : null,
    wasteType: row.waste_type as string | null,
    prepMethod: row.prep_method as string | null,
    notes: row.notes as string | null,
  }
}

/**
 * Suggest yield percentage for an ingredient by name.
 * Looks up USDA waste factors and returns all matching prep methods.
 * Used by the recipe ingredient form to auto-suggest yield_pct.
 */
export async function suggestYieldByName(
  ingredientName: string
): Promise<
  Array<{ prepMethod: string | null; yieldPct: number; wasteType: string | null; source: string }>
> {
  await requireChef()
  const sql = pgClient

  const rows = await sql`
    SELECT w.prep_method, w.as_purchased_to_edible_pct, w.waste_type
    FROM ingredient_waste_factors w
    WHERE lower(w.ingredient_name) = lower(${ingredientName})
    ORDER BY w.prep_method ASC NULLS FIRST
    LIMIT 10
  `

  if (rows.length === 0) {
    // Fuzzy fallback: try partial match
    const fuzzyRows = await sql`
      SELECT w.prep_method, w.as_purchased_to_edible_pct, w.waste_type
      FROM ingredient_waste_factors w
      WHERE lower(w.ingredient_name) LIKE '%' || lower(${ingredientName}) || '%'
         OR lower(${ingredientName}) LIKE '%' || lower(w.ingredient_name) || '%'
      ORDER BY
        CASE WHEN lower(${ingredientName}) LIKE '%' || lower(w.ingredient_name) || '%' THEN 0 ELSE 1 END,
        length(w.ingredient_name) ASC,
        w.prep_method ASC NULLS FIRST
      LIMIT 5
    `
    return fuzzyRows.map((r: any) => ({
      prepMethod: r.prep_method,
      yieldPct: Math.round(Number(r.as_purchased_to_edible_pct)),
      wasteType: r.waste_type ?? null,
      source: 'USDA (partial match)',
    }))
  }

  return rows.map((r: any) => ({
    prepMethod: r.prep_method,
    yieldPct: Math.round(Number(r.as_purchased_to_edible_pct)),
    wasteType: r.waste_type ?? null,
    source: 'USDA',
  }))
}

export async function getAdjustedCost(ingredientId: string, priceCents: number): Promise<number> {
  await requireChef()

  const factor = await getWasteFactor(ingredientId)
  if (!factor || factor.ediblePct <= 0) return priceCents

  // Price adjusted for waste: if 72% edible, true cost = price / 0.72
  return Math.round(priceCents / (factor.ediblePct / 100))
}

// --- Store Accuracy ---

export async function getStoreAccuracy(storeName: string): Promise<StoreAccuracy | null> {
  await requireChef()
  const sql = pgClient

  const rows = await sql`
    SELECT store_name, chain_slug, region, accuracy_pct,
           avg_deviation_pct, comparison_count, trend, last_compared_at
    FROM store_accuracy_scores
    WHERE store_name = ${storeName}
    LIMIT 1
  `

  if (rows.length === 0) return null

  const row = rows[0]
  return {
    storeName: row.store_name as string,
    chainSlug: row.chain_slug as string | null,
    region: row.region as string | null,
    accuracyPct: row.accuracy_pct != null ? Number(row.accuracy_pct) : null,
    avgDeviationPct: row.avg_deviation_pct != null ? Number(row.avg_deviation_pct) : null,
    comparisonCount: Number(row.comparison_count),
    trend: row.trend as string | null,
    lastComparedAt: row.last_compared_at as string | null,
  }
}

export async function getStoreAccuracyRanking(region?: string): Promise<StoreAccuracy[]> {
  await requireChef()
  const sql = pgClient

  const rows = region
    ? await sql`
        SELECT store_name, chain_slug, region, accuracy_pct,
               avg_deviation_pct, comparison_count, trend, last_compared_at
        FROM store_accuracy_scores
        WHERE region = ${region}
        AND comparison_count >= 10
        ORDER BY accuracy_pct DESC NULLS LAST
      `
    : await sql`
        SELECT store_name, chain_slug, region, accuracy_pct,
               avg_deviation_pct, comparison_count, trend, last_compared_at
        FROM store_accuracy_scores
        WHERE comparison_count >= 10
        ORDER BY accuracy_pct DESC NULLS LAST
      `

  return rows.map((row) => ({
    storeName: row.store_name as string,
    chainSlug: row.chain_slug as string | null,
    region: row.region as string | null,
    accuracyPct: row.accuracy_pct != null ? Number(row.accuracy_pct) : null,
    avgDeviationPct: row.avg_deviation_pct != null ? Number(row.avg_deviation_pct) : null,
    comparisonCount: Number(row.comparison_count),
    trend: row.trend as string | null,
    lastComparedAt: row.last_compared_at as string | null,
  }))
}
