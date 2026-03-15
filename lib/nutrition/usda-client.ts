// USDA FoodData Central API client
// Free public API (380K food entries)
// https://fdc.nal.usda.gov/api-guide.html

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'

function getApiKey(): string {
  return process.env.USDA_API_KEY || 'DEMO_KEY'
}

// ============================================
// TYPES
// ============================================

export type NutrientInfo = {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sodium_mg: number
  sugar_g: number
}

export type USDAFoodSearchResult = {
  fdcId: number
  description: string
  dataType: string
  brandOwner?: string
  score: number
  nutrients: NutrientInfo
}

export type USDAFoodDetail = {
  fdcId: number
  description: string
  dataType: string
  foodNutrients: Array<{
    nutrient: {
      id: number
      name: string
      unitName: string
    }
    amount: number
  }>
}

// USDA nutrient IDs for the macros we care about
const NUTRIENT_IDS = {
  CALORIES: 1008,       // Energy (kcal)
  PROTEIN: 1003,        // Protein (g)
  CARBS: 1005,          // Carbohydrate, by difference (g)
  FAT: 1004,            // Total lipid (fat) (g)
  FIBER: 1079,          // Fiber, total dietary (g)
  SODIUM: 1093,         // Sodium (mg)
  SUGAR: 2000,          // Sugars, total including NLEA (g)
  SUGAR_ALT: 1063,      // Sugars, Total (g) - older data uses this
} as const

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Search USDA FoodData Central for foods matching a query.
 * Returns up to pageSize results (default 10).
 */
export async function searchFoods(
  query: string,
  pageSize: number = 10
): Promise<USDAFoodSearchResult[]> {
  if (!query.trim()) return []

  const params = new URLSearchParams({
    query: query.trim(),
    pageSize: String(pageSize),
    api_key: getApiKey(),
  })

  const res = await fetch(`${USDA_BASE_URL}/foods/search?${params}`, {
    next: { revalidate: 86400 }, // Cache for 24h since USDA data is stable
  })

  if (!res.ok) {
    console.error('[USDA] Search failed:', res.status, res.statusText)
    return []
  }

  const data = await res.json()

  return (data.foods || []).map((food: Record<string, unknown>) => ({
    fdcId: food.fdcId as number,
    description: food.description as string,
    dataType: food.dataType as string,
    brandOwner: (food.brandOwner as string) || undefined,
    score: (food.score as number) || 0,
    nutrients: extractNutrientsFromSearchResult(
      (food.foodNutrients as Array<Record<string, unknown>>) || []
    ),
  }))
}

/**
 * Get detailed nutrient data for a specific food by FDC ID.
 */
export async function getFoodDetails(fdcId: number): Promise<USDAFoodDetail | null> {
  const params = new URLSearchParams({
    api_key: getApiKey(),
  })

  const res = await fetch(`${USDA_BASE_URL}/food/${fdcId}?${params}`, {
    next: { revalidate: 86400 },
  })

  if (!res.ok) {
    console.error('[USDA] Detail fetch failed:', res.status, res.statusText)
    return null
  }

  return res.json()
}

/**
 * Extract our NutrientInfo from a full USDA food detail response.
 * Amounts are per 100g as returned by the USDA API.
 */
export function extractNutrients(foodDetail: USDAFoodDetail): NutrientInfo {
  const nutrients = foodDetail.foodNutrients || []

  const get = (id: number): number => {
    const found = nutrients.find((n) => n.nutrient?.id === id)
    return found?.amount ?? 0
  }

  return {
    calories: Math.round(get(NUTRIENT_IDS.CALORIES) * 10) / 10,
    protein_g: Math.round(get(NUTRIENT_IDS.PROTEIN) * 10) / 10,
    carbs_g: Math.round(get(NUTRIENT_IDS.CARBS) * 10) / 10,
    fat_g: Math.round(get(NUTRIENT_IDS.FAT) * 10) / 10,
    fiber_g: Math.round(get(NUTRIENT_IDS.FIBER) * 10) / 10,
    sodium_mg: Math.round(get(NUTRIENT_IDS.SODIUM) * 10) / 10,
    sugar_g: Math.round(
      (get(NUTRIENT_IDS.SUGAR) || get(NUTRIENT_IDS.SUGAR_ALT)) * 10
    ) / 10,
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Extract nutrients from search result format (flat array with nutrientName/value).
 */
function extractNutrientsFromSearchResult(
  foodNutrients: Array<Record<string, unknown>>
): NutrientInfo {
  const get = (id: number): number => {
    const found = foodNutrients.find((n) => n.nutrientId === id)
    return (found?.value as number) ?? 0
  }

  return {
    calories: Math.round(get(NUTRIENT_IDS.CALORIES) * 10) / 10,
    protein_g: Math.round(get(NUTRIENT_IDS.PROTEIN) * 10) / 10,
    carbs_g: Math.round(get(NUTRIENT_IDS.CARBS) * 10) / 10,
    fat_g: Math.round(get(NUTRIENT_IDS.FAT) * 10) / 10,
    fiber_g: Math.round(get(NUTRIENT_IDS.FIBER) * 10) / 10,
    sodium_mg: Math.round(get(NUTRIENT_IDS.SODIUM) * 10) / 10,
    sugar_g: Math.round(
      (get(NUTRIENT_IDS.SUGAR) || get(NUTRIENT_IDS.SUGAR_ALT)) * 10
    ) / 10,
  }
}

/**
 * Scale nutrient values from per-100g to a specific weight in grams.
 */
export function scaleNutrients(per100g: NutrientInfo, weightGrams: number): NutrientInfo {
  const factor = weightGrams / 100
  return {
    calories: Math.round(per100g.calories * factor * 10) / 10,
    protein_g: Math.round(per100g.protein_g * factor * 10) / 10,
    carbs_g: Math.round(per100g.carbs_g * factor * 10) / 10,
    fat_g: Math.round(per100g.fat_g * factor * 10) / 10,
    fiber_g: Math.round(per100g.fiber_g * factor * 10) / 10,
    sodium_mg: Math.round(per100g.sodium_mg * factor * 10) / 10,
    sugar_g: Math.round(per100g.sugar_g * factor * 10) / 10,
  }
}

/**
 * Sum multiple NutrientInfo objects together (for recipe totals).
 */
export function sumNutrients(items: NutrientInfo[]): NutrientInfo {
  const total: NutrientInfo = {
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    sodium_mg: 0,
    sugar_g: 0,
  }

  for (const item of items) {
    total.calories += item.calories
    total.protein_g += item.protein_g
    total.carbs_g += item.carbs_g
    total.fat_g += item.fat_g
    total.fiber_g += item.fiber_g
    total.sodium_mg += item.sodium_mg
    total.sugar_g += item.sugar_g
  }

  // Round totals
  total.calories = Math.round(total.calories)
  total.protein_g = Math.round(total.protein_g * 10) / 10
  total.carbs_g = Math.round(total.carbs_g * 10) / 10
  total.fat_g = Math.round(total.fat_g * 10) / 10
  total.fiber_g = Math.round(total.fiber_g * 10) / 10
  total.sodium_mg = Math.round(total.sodium_mg)
  total.sugar_g = Math.round(total.sugar_g * 10) / 10

  return total
}

/** Empty nutrient info (all zeros). */
export const EMPTY_NUTRIENTS: NutrientInfo = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fiber_g: 0,
  sodium_mg: 0,
  sugar_g: 0,
}
