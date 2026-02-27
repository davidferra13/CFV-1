// USDA FoodData Central — free nutrition API, government data
// https://fdc.nal.usda.gov/api-guide/
// 1,000 requests/hour, 380K+ foods, no credit card
// Complements Spoonacular with authoritative US government nutrient data

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'

export interface UsdaFood {
  fdcId: number
  description: string
  dataType: string
  brandName?: string
  ingredients?: string
  nutrients: UsdaNutrient[]
}

export interface UsdaNutrient {
  nutrientId: number
  nutrientName: string
  unitName: string
  value: number
}

export interface NutritionSummary {
  fdcId: number
  name: string
  servingSize: string | null
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  fiber: number | null
  sugar: number | null
  sodium: number | null
}

function getApiKey(): string {
  const key = process.env.USDA_API_KEY
  if (!key) throw new Error('USDA_API_KEY not set in .env.local')
  return key
}

/**
 * Search for foods by name.
 * Returns up to 10 results from the USDA database.
 */
export async function searchFoods(query: string, pageSize = 10): Promise<UsdaFood[]> {
  try {
    const res = await fetch(`${USDA_BASE}/foods/search?api_key=${getApiKey()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        pageSize,
        dataType: ['Foundation', 'SR Legacy', 'Branded'],
      }),
      next: { revalidate: 86400 }, // cache 24h — USDA data is stable
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.foods ?? []).map(mapFood)
  } catch {
    return []
  }
}

/**
 * Get detailed nutrition for a specific food by FDC ID.
 */
export async function getFoodDetails(fdcId: number): Promise<UsdaFood | null> {
  try {
    const res = await fetch(`${USDA_BASE}/food/${fdcId}?api_key=${getApiKey()}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return mapFood(data)
  } catch {
    return null
  }
}

/**
 * Get a simplified nutrition summary for a food.
 * Extracts the key macros chefs care about.
 */
export async function getNutritionSummary(fdcId: number): Promise<NutritionSummary | null> {
  const food = await getFoodDetails(fdcId)
  if (!food) return null

  const findNutrient = (name: string): number | null => {
    const n = food.nutrients.find((n) => n.nutrientName.toLowerCase().includes(name.toLowerCase()))
    return n ? Math.round(n.value * 10) / 10 : null
  }

  return {
    fdcId: food.fdcId,
    name: food.description,
    servingSize: null, // USDA reports per 100g by default
    calories: findNutrient('energy'),
    protein: findNutrient('protein'),
    fat: findNutrient('total lipid'),
    carbs: findNutrient('carbohydrate'),
    fiber: findNutrient('fiber'),
    sugar: findNutrient('sugars, total'),
    sodium: findNutrient('sodium'),
  }
}

function mapFood(raw: any): UsdaFood {
  return {
    fdcId: raw.fdcId,
    description: raw.description ?? raw.lowercaseDescription ?? '',
    dataType: raw.dataType ?? '',
    brandName: raw.brandName ?? raw.brandOwner ?? undefined,
    ingredients: raw.ingredients ?? undefined,
    nutrients: (raw.foodNutrients ?? []).map((n: any) => ({
      nutrientId: n.nutrientId ?? n.nutrient?.id ?? 0,
      nutrientName: n.nutrientName ?? n.nutrient?.name ?? '',
      unitName: n.unitName ?? n.nutrient?.unitName ?? '',
      value: n.value ?? n.amount ?? 0,
    })),
  }
}
