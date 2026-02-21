// USDA FoodData Central (FDC) API
// Free with registration. DEMO_KEY works at 30 req/hour without a key.
// Best for whole/raw ingredients (chicken breast, garlic, heavy cream).
// Set USDA_FDC_API_KEY in env for production rate limits (1,000 req/hour).
// https://fdc.nal.usda.gov/

export interface FdcNutritionResult {
  name: string
  brandOwner?: string
  dataType: string
  per100g: {
    calories: number | null
    protein: number | null
    fat: number | null
    carbs: number | null
    fiber: number | null
    sugar: number | null
    sodium: number | null
  }
}

// USDA nutrient IDs we care about
const NUTRIENT_IDS = {
  calories: 1008, // Energy (kcal)
  protein: 1003,
  fat: 1004,
  carbs: 1005, // Carbohydrate, by difference
  fiber: 1079, // Fiber, total dietary
  sugar: 2000, // Sugars, total
  sodium: 1093, // Sodium, Na (mg)
}

function getNutrient(nutrients: any[], id: number): number | null {
  const n = nutrients?.find((n: any) => n.nutrientId === id || n.number === String(id))
  return n?.value ?? null
}

export async function searchFdc(query: string): Promise<FdcNutritionResult[]> {
  if (!query.trim()) return []

  const apiKey = process.env.USDA_FDC_API_KEY || 'DEMO_KEY'

  try {
    const res = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&pageSize=5&api_key=${apiKey}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []

    const data = await res.json()
    const foods = data.foods ?? []

    return foods.map(
      (f: any): FdcNutritionResult => ({
        name: f.description,
        brandOwner: f.brandOwner || undefined,
        dataType: f.dataType ?? '',
        per100g: {
          calories: getNutrient(f.foodNutrients, NUTRIENT_IDS.calories),
          protein: getNutrient(f.foodNutrients, NUTRIENT_IDS.protein),
          fat: getNutrient(f.foodNutrients, NUTRIENT_IDS.fat),
          carbs: getNutrient(f.foodNutrients, NUTRIENT_IDS.carbs),
          fiber: getNutrient(f.foodNutrients, NUTRIENT_IDS.fiber),
          sugar: getNutrient(f.foodNutrients, NUTRIENT_IDS.sugar),
          sodium: getNutrient(f.foodNutrients, NUTRIENT_IDS.sodium),
        },
      })
    )
  } catch {
    return []
  }
}
