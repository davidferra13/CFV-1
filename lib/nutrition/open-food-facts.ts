// Open Food Facts API — completely free, no API key required
// https://world.openfoodfacts.org/

export interface NutritionResult {
  name: string
  brand?: string
  per100g: {
    calories: number | null
    protein: number | null
    fat: number | null
    carbs: number | null
    fiber: number | null
    sugar: number | null
    sodium: number | null
  }
  imageUrl?: string
  nutriscore?: string
}

export async function searchNutrition(query: string): Promise<NutritionResult[]> {
  if (!query.trim()) return []

  try {
    const params = new URLSearchParams({
      search_terms: query,
      json: '1',
      page_size: '5',
      fields: ['product_name', 'brands', 'image_small_url', 'nutriments', 'nutriscore_grade'].join(
        ','
      ),
    })

    const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []

    const data = await res.json()
    const products = data.products ?? []

    return products
      .filter((p: any) => p.product_name)
      .map((p: any): NutritionResult => {
        const n = p.nutriments ?? {}
        return {
          name: p.product_name,
          brand: p.brands || undefined,
          imageUrl: p.image_small_url || undefined,
          nutriscore: p.nutriscore_grade || undefined,
          per100g: {
            calories: n['energy-kcal_100g'] ?? n['energy_100g'] ?? null,
            protein: n['proteins_100g'] ?? null,
            fat: n['fat_100g'] ?? null,
            carbs: n['carbohydrates_100g'] ?? null,
            fiber: n['fiber_100g'] ?? null,
            sugar: n['sugars_100g'] ?? null,
            sodium: n['sodium_100g'] != null ? Math.round(n['sodium_100g'] * 1000) : null,
          },
        }
      })
  } catch {
    return []
  }
}
