import { cacheFetch } from '@/lib/cache/upstash'

const FOODDATA_CENTRAL_BASE = 'https://api.nal.usda.gov/fdc/v1'
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

export type FoodDataCentralFood = {
  fdcId: number
  description: string
  dataType?: string
  brandOwner?: string
  foodNutrients?: Array<{
    nutrientName?: string
    nutrientNumber?: string
    value?: number
    unitName?: string
  }>
}

export type FoodDataNutritionSummary = {
  caloriesPer100g: number | null
  proteinPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  fiberPer100g: number | null
  sodiumMgPer100g: number | null
}

function getApiKey(): string | null {
  return process.env.USDA_FOODDATA_CENTRAL_API_KEY ?? null
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getNutrientValue(
  food: FoodDataCentralFood,
  names: string[],
  nutrientNumbers: string[]
): number | null {
  for (const nutrient of food.foodNutrients ?? []) {
    const name = normalizeToken(nutrient.nutrientName ?? '')
    const number = String(nutrient.nutrientNumber ?? '').trim()
    const value = Number(nutrient.value)
    if (!Number.isFinite(value)) continue

    if (nutrientNumbers.includes(number)) return value
    if (names.some((target) => name.includes(target))) return value
  }

  return null
}

export function summarizeFoodNutrition(food: FoodDataCentralFood): FoodDataNutritionSummary {
  return {
    caloriesPer100g: getNutrientValue(food, ['energy'], ['208']),
    proteinPer100g: getNutrientValue(food, ['protein'], ['203']),
    carbsPer100g: getNutrientValue(food, ['carbohydrate'], ['205']),
    fatPer100g: getNutrientValue(food, ['total lipid', 'fat'], ['204']),
    fiberPer100g: getNutrientValue(food, ['fiber'], ['291']),
    sodiumMgPer100g: getNutrientValue(food, ['sodium'], ['307']),
  }
}

function tokenOverlapRatio(query: string, candidate: string): number {
  const queryTokens = new Set(normalizeToken(query).split(' ').filter(Boolean))
  const candidateTokens = new Set(normalizeToken(candidate).split(' ').filter(Boolean))
  if (queryTokens.size === 0 || candidateTokens.size === 0) return 0

  let overlap = 0
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) overlap += 1
  }

  return overlap / queryTokens.size
}

export function isReasonableFoodDataMatch(query: string, food: FoodDataCentralFood): boolean {
  const ratio = tokenOverlapRatio(query, food.description ?? '')
  return ratio >= 0.5 || normalizeToken(food.description ?? '').includes(normalizeToken(query))
}

export async function searchFoodDataCentral(
  query: string,
  options?: { pageSize?: number }
): Promise<FoodDataCentralFood[]> {
  const apiKey = getApiKey()
  const normalizedQuery = query.trim()
  if (!apiKey || !normalizedQuery) return []

  const pageSize = Math.max(1, Math.min(10, options?.pageSize ?? 5))

  return cacheFetch<FoodDataCentralFood[]>(
    `public-data:fdc:search:${normalizedQuery.toLowerCase()}:${pageSize}`,
    CACHE_TTL_SECONDS,
    async () => {
      try {
        const res = await fetch(`${FOODDATA_CENTRAL_BASE}/foods/search?api_key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: normalizedQuery,
            pageSize,
            sortBy: 'dataType.keyword',
            sortOrder: 'asc',
          }),
          next: { revalidate: CACHE_TTL_SECONDS },
        })

        if (!res.ok) return []

        const json = await res.json()
        const foods = Array.isArray(json?.foods) ? (json.foods as FoodDataCentralFood[]) : []
        return foods.filter((food) => isReasonableFoodDataMatch(normalizedQuery, food))
      } catch {
        return []
      }
    }
  )
}

export async function getBestFoodDataCentralMatch(
  query: string
): Promise<FoodDataCentralFood | null> {
  const foods = await searchFoodDataCentral(query, { pageSize: 5 })
  return foods[0] ?? null
}
