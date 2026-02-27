// Open Food Facts — free, open-source food product database
// https://world.openfoodfacts.org/data
// No key, no signup, unlimited, community-maintained
// 2.8M+ products from 150+ countries

const OFF_BASE = 'https://world.openfoodfacts.org'

export interface FoodProduct {
  barcode: string
  name: string
  brand: string | null
  categories: string[]
  ingredients: string | null
  allergens: string[]
  nutriScore: string | null // A, B, C, D, E
  novaGroup: number | null // 1-4 (processing level)
  imageUrl: string | null
  nutrition: {
    calories: number | null // per 100g
    fat: number | null
    saturatedFat: number | null
    carbs: number | null
    sugar: number | null
    fiber: number | null
    protein: number | null
    sodium: number | null
  }
}

/**
 * Look up a food product by barcode.
 * Scan a packaged ingredient → get allergens, nutrition, ingredients list.
 */
export async function getProductByBarcode(barcode: string): Promise<FoodProduct | null> {
  try {
    const res = await fetch(`${OFF_BASE}/api/v2/product/${barcode}.json`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null
    return mapProduct(data.product, barcode)
  } catch {
    return null
  }
}

/**
 * Search for food products by name.
 * e.g. "organic olive oil", "coconut milk", "sriracha"
 */
export async function searchProducts(query: string, pageSize = 10): Promise<FoodProduct[]> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      page_size: String(pageSize),
      json: '1',
    })
    const res = await fetch(`${OFF_BASE}/cgi/search.pl?${params}`, { next: { revalidate: 86400 } })
    if (!res.ok) return []
    const data = await res.json()
    return (data.products ?? []).map((p: any) => mapProduct(p, p.code ?? ''))
  } catch {
    return []
  }
}

/**
 * Get allergen info for a product by barcode.
 * Returns a simple list of allergens (e.g. ["milk", "wheat", "soy"]).
 */
export async function getAllergens(barcode: string): Promise<string[]> {
  const product = await getProductByBarcode(barcode)
  return product?.allergens ?? []
}

function mapProduct(raw: any, barcode: string): FoodProduct {
  const nutrients = raw.nutriments ?? {}

  return {
    barcode,
    name: raw.product_name ?? raw.product_name_en ?? '',
    brand: raw.brands ?? null,
    categories: (raw.categories_tags ?? []).map((c: string) => c.replace(/^en:/, '')),
    ingredients: raw.ingredients_text ?? raw.ingredients_text_en ?? null,
    allergens: (raw.allergens_tags ?? []).map((a: string) => a.replace(/^en:/, '')),
    nutriScore: raw.nutriscore_grade ?? null,
    novaGroup: raw.nova_group ?? null,
    imageUrl: raw.image_front_url ?? raw.image_url ?? null,
    nutrition: {
      calories: nutrients['energy-kcal_100g'] ?? null,
      fat: nutrients.fat_100g ?? null,
      saturatedFat: nutrients['saturated-fat_100g'] ?? null,
      carbs: nutrients.carbohydrates_100g ?? null,
      sugar: nutrients.sugars_100g ?? null,
      fiber: nutrients.fiber_100g ?? null,
      protein: nutrients.proteins_100g ?? null,
      sodium: nutrients.sodium_100g ?? null,
    },
  }
}
