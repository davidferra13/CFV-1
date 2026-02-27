// Spoonacular Wine Pairing — uses existing SPOONACULAR_API_KEY
// https://spoonacular.com/food-api/docs#Wine-Pairing
// Part of the same free tier (150 req/day)

const SPOONACULAR_BASE = 'https://api.spoonacular.com'

export interface WinePairing {
  pairedWines: string[]
  pairingText: string
  productMatches: WineProduct[]
}

export interface WineProduct {
  id: number
  title: string
  description: string
  price: string
  imageUrl: string
  averageRating: number
  ratingCount: number
  link: string
}

export interface DishPairing {
  pairings: string[]
  text: string
}

function getApiKey(): string {
  const key = process.env.SPOONACULAR_API_KEY
  if (!key) throw new Error('SPOONACULAR_API_KEY not set in .env.local')
  return key
}

/**
 * Get wine pairing suggestions for a dish.
 * e.g. "grilled salmon" → ["chardonnay", "pinot noir"]
 */
export async function getWinePairing(food: string, maxPrice?: number): Promise<WinePairing | null> {
  try {
    const params = new URLSearchParams({
      food,
      apiKey: getApiKey(),
    })
    if (maxPrice) params.set('maxPrice', String(maxPrice))

    const res = await fetch(
      `${SPOONACULAR_BASE}/food/wine/pairing?${params}`,
      { next: { revalidate: 86400 } } // cache 24h
    )
    if (!res.ok) return null
    const data = await res.json()
    if (!data.pairedWines?.length) return null
    return {
      pairedWines: data.pairedWines,
      pairingText: data.pairingText ?? '',
      productMatches: (data.productMatches ?? []).map((p: any) => ({
        id: p.id,
        title: p.title ?? '',
        description: p.description ?? '',
        price: p.price ?? '',
        imageUrl: p.imageUrl ?? '',
        averageRating: p.averageRating ?? 0,
        ratingCount: p.ratingCount ?? 0,
        link: p.link ?? '',
      })),
    }
  } catch {
    return null
  }
}

/**
 * Get dish suggestions for a wine.
 * e.g. "merlot" → ["beef stew", "lamb", "mushroom risotto"]
 */
export async function getDishPairing(wine: string): Promise<DishPairing | null> {
  try {
    const params = new URLSearchParams({
      wine,
      apiKey: getApiKey(),
    })
    const res = await fetch(`${SPOONACULAR_BASE}/food/wine/dishes?${params}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.pairings?.length) return null
    return {
      pairings: data.pairings,
      text: data.text ?? '',
    }
  } catch {
    return null
  }
}

/**
 * Get a wine description/recommendation by type.
 * e.g. "merlot" → description, food pairings, flavor profile
 */
export async function getWineDescription(wine: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      wine,
      apiKey: getApiKey(),
    })
    const res = await fetch(`${SPOONACULAR_BASE}/food/wine/description?${params}`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.wineDescription ?? null
  } catch {
    return null
  }
}
