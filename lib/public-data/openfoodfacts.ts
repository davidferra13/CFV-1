import { cacheFetch } from '@/lib/cache/upstash'

const OPEN_FOOD_FACTS_BASE = 'https://world.openfoodfacts.org'
const CACHE_TTL_SECONDS = 24 * 60 * 60

export type OpenFoodFactsProduct = {
  code: string
  product_name?: string
  brands?: string
  image_url?: string
  allergens_tags?: string[]
  ingredients_text?: string
}

export async function lookupOpenFoodFactsByBarcode(
  barcode: string
): Promise<OpenFoodFactsProduct | null> {
  const normalized = barcode.replace(/[^\d]/g, '')
  if (!normalized) return null

  return cacheFetch<OpenFoodFactsProduct | null>(
    `public-data:openfoodfacts:barcode:${normalized}`,
    CACHE_TTL_SECONDS,
    async () => {
      try {
        const res = await fetch(`${OPEN_FOOD_FACTS_BASE}/api/v2/product/${normalized}.json`, {
          next: { revalidate: CACHE_TTL_SECONDS },
        })
        if (!res.ok) return null

        const json = await res.json()
        return json?.product ?? null
      } catch {
        return null
      }
    }
  )
}
