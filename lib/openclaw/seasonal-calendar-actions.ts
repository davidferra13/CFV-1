'use server'

/**
 * Seasonal Calendar Actions
 * Data pipeline for the Heron Pond Farm-style seasonal calendar.
 * Self-reliant: all data sourced from ingredient_seasonality + ingredient_knowledge + openclaw catalog.
 */

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { unstable_cache } from 'next/cache'

// --- Types ---

export type SeasonalCalendarItem = {
  ingredientName: string
  systemIngredientId: string | null
  category: string | null
  peakMonths: number[]
  availableMonths: number[]
  isYearRound: boolean
  confidence: number | null
  imageUrl: string | null
  flavorProfile: string | null
  culinaryUses: string | null
  typicalPairings: string[]
  bestPriceCents: number | null
  bestPriceStore: string | null
}

export type SeasonalCalendarData = {
  peakingNow: SeasonalCalendarItem[]
  lastChance: SeasonalCalendarItem[]
  comingNext: SeasonalCalendarItem[]
  yearRound: SeasonalCalendarItem[]
  totalSeasonal: number
  currentMonth: number
  categories: string[]
}

export type IngredientInspirationDetail = {
  shelfLife: {
    fridgeDays: string | null
    freezerDays: string | null
    storageTips: string | null
  } | null
  recipes: Array<{
    id: string
    name: string
    photoUrl: string | null
    category: string | null
  }>
}

const MONTH_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export { MONTH_NAMES }

/**
 * Format peak months into a human-readable availability window.
 * e.g. [6,7,8,9] -> "June - September"
 */
export function formatAvailabilityWindow(peakMonths: number[]): string {
  if (!peakMonths.length) return 'Availability varies'
  const sorted = [...peakMonths].sort((a, b) => a - b)
  if (sorted.length >= 10) return 'Almost Year Round'
  return `${MONTH_NAMES[sorted[0]]} - ${MONTH_NAMES[sorted[sorted.length - 1]]}`
}

// Cached query: seasonal calendar items with images and knowledge
const getSeasonalCalendarItemsCached = unstable_cache(
  async (region: string) => {
    const sql = pgClient

    // Single query: join seasonality + knowledge + catalog images + prices
    const rows = await sql`
      SELECT
        s.ingredient_name,
        s.system_ingredient_id,
        s.peak_months,
        s.available_months,
        s.is_year_round,
        s.confidence,
        -- Image cascade: knowledge -> OFF image -> product image
        COALESCE(
          k.image_url,
          ci.off_image_url,
          (
            SELECT p.image_url
            FROM openclaw.normalization_map nm
            JOIN openclaw.products p ON p.product_id = nm.product_id
            WHERE nm.canonical_ingredient_id = ci.ingredient_id
            AND p.image_url IS NOT NULL AND p.image_url != ''
            LIMIT 1
          )
        ) AS image_url,
        -- Category from canonical_ingredients
        ci.category,
        -- Knowledge fields
        k.flavor_profile,
        k.culinary_uses,
        k.typical_pairings,
        -- Best price from system_ingredient_prices
        sip.median_price_cents AS best_price_cents,
        (
          SELECT st.name
          FROM openclaw.store_products sp2
          JOIN openclaw.stores st ON st.store_id = sp2.store_id
          JOIN openclaw.normalization_map nm2 ON nm2.product_id = sp2.product_id
          WHERE nm2.canonical_ingredient_id = ci.ingredient_id
          AND sp2.in_stock = true
          ORDER BY sp2.price_cents ASC NULLS LAST
          LIMIT 1
        ) AS best_price_store
      FROM ingredient_seasonality s
      LEFT JOIN system_ingredients si ON si.id = s.system_ingredient_id
      LEFT JOIN ingredient_knowledge k ON k.system_ingredient_id = si.id
        AND k.needs_review = false
      LEFT JOIN openclaw.canonical_ingredients ci
        ON lower(ci.name) = lower(s.ingredient_name)
      LEFT JOIN openclaw.system_ingredient_prices sip
        ON sip.system_ingredient_id = s.system_ingredient_id
      WHERE s.region = ${region}
      ORDER BY s.confidence DESC NULLS LAST, s.ingredient_name ASC
    `

    return rows.map((row: Record<string, unknown>) => ({
      ingredientName: row.ingredient_name as string,
      systemIngredientId: row.system_ingredient_id as string | null,
      category: row.category as string | null,
      peakMonths: (row.peak_months as number[]) || [],
      availableMonths: (row.available_months as number[]) || [],
      isYearRound: row.is_year_round as boolean,
      confidence: row.confidence != null ? Number(row.confidence) : null,
      imageUrl: row.image_url as string | null,
      flavorProfile: row.flavor_profile as string | null,
      culinaryUses: row.culinary_uses as string | null,
      typicalPairings: (row.typical_pairings as string[]) || [],
      bestPriceCents: row.best_price_cents != null ? Number(row.best_price_cents) : null,
      bestPriceStore: row.best_price_store as string | null,
    }))
  },
  ['seasonal-calendar-items'],
  { revalidate: 3600 } // 1 hour cache
)

/**
 * Get all seasonal calendar data for a given month.
 * Categorizes into: peaking now, last chance, coming next, year round.
 */
export async function getSeasonalCalendarData(
  month?: number,
  region: string = 'northeast'
): Promise<SeasonalCalendarData> {
  await requireChef()

  const currentMonth = month || new Date().getMonth() + 1
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1

  const allItems = await getSeasonalCalendarItemsCached(region)

  const peakingNow: SeasonalCalendarItem[] = []
  const lastChance: SeasonalCalendarItem[] = []
  const comingNext: SeasonalCalendarItem[] = []
  const yearRound: SeasonalCalendarItem[] = []

  for (const item of allItems) {
    if (item.isYearRound) {
      yearRound.push(item)
      continue
    }

    const isPeakNow = item.peakMonths.includes(currentMonth)
    const isPeakNext = item.peakMonths.includes(nextMonth)
    const wasPeakLast =
      item.peakMonths.includes(currentMonth) && !item.peakMonths.includes(nextMonth)

    if (wasPeakLast) {
      lastChance.push(item)
    } else if (isPeakNow) {
      peakingNow.push(item)
    } else if (isPeakNext && !isPeakNow) {
      comingNext.push(item)
    }
  }

  // Extract unique categories
  const categorySet = new Set<string>()
  for (const item of allItems) {
    if (item.category) categorySet.add(item.category)
  }
  const categories = [...categorySet].sort()

  return {
    peakingNow,
    lastChance,
    comingNext,
    yearRound,
    totalSeasonal: allItems.filter((i) => !i.isYearRound).length,
    currentMonth,
    categories,
  }
}

/**
 * Get seasonal calendar data for a specific month (used by month picker).
 */
export async function getSeasonalCalendarForMonth(
  month: number,
  region: string = 'northeast'
): Promise<SeasonalCalendarData> {
  return getSeasonalCalendarData(month, region)
}

/**
 * Get detailed inspiration data for an ingredient (loaded on panel open).
 * Includes shelf life + recipes that use this ingredient.
 */
export async function getIngredientInspirationDetail(
  ingredientName: string,
  systemIngredientId: string | null
): Promise<IngredientInspirationDetail> {
  const chef = await requireChef()
  const sql = pgClient

  // Shelf life lookup
  let shelfLife: IngredientInspirationDetail['shelfLife'] = null
  if (systemIngredientId) {
    const slRows = await sql`
      SELECT fridge_days_min, fridge_days_max,
             freezer_days_min, freezer_days_max,
             storage_tips
      FROM ingredient_shelf_life
      WHERE system_ingredient_id = ${systemIngredientId}
      LIMIT 1
    `
    if (slRows.length > 0) {
      const r = slRows[0]
      const fmtRange = (min: number | null, max: number | null) => {
        if (min == null && max == null) return null
        if (min != null && max != null && min !== max) return `${min}-${max} days`
        return `${min ?? max} days`
      }
      shelfLife = {
        fridgeDays: fmtRange(
          r.fridge_days_min as number | null,
          r.fridge_days_max as number | null
        ),
        freezerDays: fmtRange(
          r.freezer_days_min as number | null,
          r.freezer_days_max as number | null
        ),
        storageTips: r.storage_tips as string | null,
      }
    }
  }

  // Recipes that use this ingredient (bridge via ingredient name -> chef's ingredients -> recipe_ingredients)
  const recipeRows = await sql`
    SELECT DISTINCT r.id, r.name, r.photo_url, r.category
    FROM recipes r
    JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE r.tenant_id = ${chef.tenantId}
    AND r.archived = false
    AND (
      lower(i.name) = lower(${ingredientName})
      OR i.system_ingredient_id = ${systemIngredientId}
    )
    ORDER BY r.name ASC
    LIMIT 8
  `

  return {
    shelfLife,
    recipes: recipeRows.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      name: r.name as string,
      photoUrl: r.photo_url as string | null,
      category: r.category as string | null,
    })),
  }
}
