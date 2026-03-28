'use server'

/**
 * OpenClaw Catalog Actions - Admin-only server actions for browsing
 * the full 9,000+ ingredient catalog on the Pi.
 *
 * These call the Pi directly (not synced data) because most catalog
 * items are not synced to ChefFlow.
 */

import { requireAdmin } from '@/lib/auth/admin'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// --- Types ---

export type CatalogItem = {
  id: string
  name: string
  category: string
  bestPriceCents: number | null
  bestPriceStore: string | null
  bestPriceUnit: string | null
  priceCount: number
  lastUpdated: string | null
}

export type CatalogItemDetail = {
  store: string
  priceCents: number
  unit: string
  tier: string
  confidence: string
  lastConfirmedAt: string
}

export type CatalogStats = {
  total: number
  priced: number
  categories: { name: string; count: number }[]
}

export type CatalogSearchResult = {
  items: CatalogItem[]
  total: number
  categories: { name: string; count: number }[]
}

// --- Actions ---

export async function searchCatalog(params: {
  search?: string
  category?: string
  pricedOnly?: boolean
  page?: number
  limit?: number
}): Promise<CatalogSearchResult> {
  await requireAdmin()

  const { search, category, pricedOnly, page = 1, limit = 50 } = params

  try {
    const searchParams = new URLSearchParams()
    if (search) searchParams.set('search', search)
    if (category) searchParams.set('category', category)
    if (pricedOnly) searchParams.set('priced_only', '1')
    searchParams.set('page', String(page))
    searchParams.set('limit', String(limit))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${OPENCLAW_API}/api/ingredients?${searchParams}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[catalog] Search returned ${res.status}`)
      return { items: [], total: 0, categories: [] }
    }

    const data = await res.json()

    // Map Pi response to our types
    const items: CatalogItem[] = (data.ingredients || data.items || []).map((item: any) => ({
      id: String(item.id),
      name: item.name || '',
      category: item.category || 'uncategorized',
      bestPriceCents: item.best_price_cents ?? item.price_cents ?? null,
      bestPriceStore: item.best_price_store ?? item.store ?? null,
      bestPriceUnit: item.best_price_unit ?? item.unit ?? null,
      priceCount: item.price_count ?? item.store_count ?? 0,
      lastUpdated: item.last_updated ?? item.last_confirmed_at ?? null,
    }))

    return {
      items,
      total: data.total ?? data.count ?? items.length,
      categories: data.categories || [],
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('[catalog] Search timed out')
    } else {
      console.warn(`[catalog] Search error: ${err instanceof Error ? err.message : 'unknown'}`)
    }
    return { items: [], total: 0, categories: [] }
  }
}

export async function getCatalogStats(): Promise<CatalogStats> {
  await requireAdmin()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(`${OPENCLAW_API}/api/stats`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      return { total: 0, priced: 0, categories: [] }
    }

    const data = await res.json()

    return {
      total: data.canonicalIngredients ?? 0,
      priced: data.currentPrices ?? 0,
      categories: data.categories || [],
    }
  } catch {
    return { total: 0, priced: 0, categories: [] }
  }
}

export async function getCatalogItemPrices(ingredientId: string): Promise<CatalogItemDetail[]> {
  await requireAdmin()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(`${OPENCLAW_API}/api/prices/ingredient/${ingredientId}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) return []

    const data = await res.json()

    return (data.prices || []).map((p: any) => ({
      store: p.source_name ?? p.store ?? 'Unknown',
      priceCents: p.price_cents,
      unit: p.price_unit ?? p.unit ?? 'lb',
      tier: p.pricing_tier ?? p.tier ?? 'unknown',
      confidence: p.confidence ?? 'medium',
      lastConfirmedAt: p.last_confirmed_at ?? '',
    }))
  } catch {
    return []
  }
}
