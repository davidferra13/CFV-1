'use server'

/**
 * OpenClaw Catalog Actions - Admin-only server actions for browsing
 * the full 9,000+ ingredient catalog on the Pi.
 *
 * These call the Pi directly (not synced data) because most catalog
 * items are not synced to ChefFlow.
 */

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { ingredients } from '@/lib/db/schema/schema'
import { eq, and, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

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
  trendPct: number | null
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

export type CatalogStore = {
  id: string
  name: string
  tier: string
  status: string
  logoUrl: string | null
  storeColor: string | null
  region: string | null
  city: string | null
  state: string | null
}

// --- Actions ---

export async function searchCatalog(params: {
  search?: string
  category?: string
  store?: string
  pricedOnly?: boolean
  sort?: 'name' | 'price' | 'stores' | 'updated'
  page?: number
  limit?: number
}): Promise<CatalogSearchResult> {
  await requireAdmin()

  const { search, category, store, pricedOnly, sort, page = 1, limit = 50 } = params

  try {
    const searchParams = new URLSearchParams()
    if (search) searchParams.set('search', search)
    if (category) searchParams.set('category', category)
    if (store) searchParams.set('store', store)
    if (pricedOnly) searchParams.set('priced_only', '1')
    if (sort) searchParams.set('sort', sort)
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
      id: String(item.ingredient_id || item.id),
      name: item.name || '',
      category: item.category || 'uncategorized',
      bestPriceCents: item.best_price_cents ?? item.price_cents ?? null,
      bestPriceStore: item.best_price_store ?? item.store ?? null,
      bestPriceUnit: item.best_price_unit ?? item.unit ?? null,
      priceCount: item.price_count ?? item.store_count ?? 0,
      lastUpdated: item.last_updated ?? item.last_confirmed_at ?? null,
      trendPct: item.recent_change_pct ?? null,
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

export async function getCatalogStores(): Promise<CatalogStore[]> {
  await requireAdmin()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(`${OPENCLAW_API}/api/sources`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) return []

    const data = await res.json()
    return (data.sources || []).map((s: any) => ({
      id: s.source_id,
      name: s.name,
      tier: s.pricing_tier || 'retail',
      status: s.status || 'active',
      logoUrl: s.logo_url ?? null,
      storeColor: s.store_color ?? null,
      region: s.region ?? null,
      city: s.city ?? null,
      state: s.state ?? null,
    }))
  } catch {
    return []
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

// --- Chef-facing catalog types ---

export type CatalogItemV2 = {
  id: string
  name: string
  category: string
  standardUnit: string
  bestPriceCents: number | null
  bestPriceStore: string | null
  bestPriceUnit: string | null
  imageUrl: string | null
  brand: string | null
  priceCount: number
  inStockCount: number
  outOfStockCount: number
  hasSourceUrl: boolean
  lastUpdated: string | null
}

export type CatalogDetailPrice = {
  store: string
  storeCity: string | null
  storeState: string | null
  storeWebsite: string | null
  priceCents: number
  priceUnit: string
  priceType: string
  pricingTier: string
  confidence: string
  inStock: boolean
  sourceUrl: string | null
  imageUrl: string | null
  brand: string | null
  aisleCat: string | null
  lastConfirmedAt: string
  lastChangedAt: string
  packageSize: string | null
}

export type CatalogDetailResult = {
  ingredient: { id: string; name: string; category: string; standardUnit: string }
  prices: CatalogDetailPrice[]
  summary: {
    storeCount: number
    inStockCount: number
    outOfStockCount: number
    cheapestCents: number | null
    cheapestStore: string | null
    avgCents: number | null
    hasSourceUrls: boolean
  }
}

export type CategoryCoverage = {
  category: string
  total: number
  priced: number
  coveragePct: number
}

export type ShoppingOptResult = {
  itemCount: number
  found: number
  notFound: number
  optimal: {
    totalCents: number
    totalDisplay: string
    missing: number
    items: { name: string; priceCents: number; store: string }[]
    savings: number
  }
  singleStoreRanking: {
    store: string
    totalCents: number
    totalDisplay: string
    available: number
    missing: number
  }[]
}

// --- Chef-facing catalog actions (requireChef, not requireAdmin) ---

export async function searchCatalogV2(params: {
  search?: string
  category?: string
  store?: string
  pricedOnly?: boolean
  inStockOnly?: boolean
  tier?: string
  sort?: string
  limit?: number
  after?: string
}): Promise<{ items: CatalogItemV2[]; total: number; hasMore: boolean; nextCursor?: string }> {
  await requireChef()

  const { search, category, store, pricedOnly, inStockOnly, tier, sort, limit = 50, after } = params

  try {
    const searchParams = new URLSearchParams()
    if (search) searchParams.set('search', search)
    if (category) searchParams.set('category', category)
    if (store) searchParams.set('store', store)
    if (pricedOnly) searchParams.set('priced_only', '1')
    if (inStockOnly) searchParams.set('in_stock_only', '1')
    if (tier) searchParams.set('tier', tier)
    if (sort) searchParams.set('sort', sort)
    searchParams.set('limit', String(limit))
    if (after) searchParams.set('after', after)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${OPENCLAW_API}/api/ingredients?${searchParams}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[catalog-v2] Search returned ${res.status}`)
      return { items: [], total: 0, hasMore: false }
    }

    const data = await res.json()

    const items: CatalogItemV2[] = (data.ingredients || data.items || []).map((item: any) => ({
      id: String(item.ingredient_id || item.id),
      name: item.name || '',
      category: item.category || 'uncategorized',
      standardUnit: item.standard_unit || item.unit || '',
      bestPriceCents: item.best_price_cents ?? item.price_cents ?? null,
      bestPriceStore: item.best_price_store ?? item.store ?? null,
      bestPriceUnit: item.best_price_unit ?? item.unit ?? null,
      imageUrl: item.image_url ?? null,
      brand: item.brand ?? null,
      priceCount: item.price_count ?? item.store_count ?? 0,
      inStockCount: item.in_stock_count ?? 0,
      outOfStockCount: item.out_of_stock_count ?? 0,
      hasSourceUrl: item.has_source_url ?? false,
      lastUpdated: item.last_updated ?? item.last_confirmed_at ?? null,
    }))

    return {
      items,
      total: data.total ?? data.count ?? items.length,
      hasMore: data.has_more ?? data.hasMore ?? false,
      nextCursor: data.next_cursor ?? data.nextCursor ?? undefined,
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('[catalog-v2] Search timed out')
    } else {
      console.warn(`[catalog-v2] Search error: ${err instanceof Error ? err.message : 'unknown'}`)
    }
    return { items: [], total: 0, hasMore: false }
  }
}

export async function getCatalogDetail(ingredientId: string): Promise<CatalogDetailResult | null> {
  await requireChef()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${OPENCLAW_API}/api/ingredients/detail/${ingredientId}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[catalog-v2] Detail returned ${res.status}`)
      return null
    }

    const data = await res.json()
    return data as CatalogDetailResult
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('[catalog-v2] Detail timed out')
    } else {
      console.warn(`[catalog-v2] Detail error: ${err instanceof Error ? err.message : 'unknown'}`)
    }
    return null
  }
}

export async function getCatalogCategories(): Promise<string[]> {
  await requireChef()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${OPENCLAW_API}/api/categories`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[catalog-v2] Categories returned ${res.status}`)
      return []
    }

    const data = await res.json()
    return (data.categories || data || []) as string[]
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('[catalog-v2] Categories timed out')
    } else {
      console.warn(
        `[catalog-v2] Categories error: ${err instanceof Error ? err.message : 'unknown'}`
      )
    }
    return []
  }
}

export async function addCatalogIngredientToLibrary(input: {
  name: string
  category: string
  defaultUnit: string
  priceCents?: number
  priceStore?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  try {
    // Check for existing ingredient by case-insensitive name match
    const existing = await db
      .select({ id: ingredients.id })
      .from(ingredients)
      .where(
        and(
          eq(ingredients.tenantId, tenantId),
          sql`lower(${ingredients.name}) = lower(${input.name})`
        )
      )
      .limit(1)

    if (existing.length > 0) {
      return { success: false, error: 'Already in your library' }
    }

    const [inserted] = await db
      .insert(ingredients)
      .values({
        tenantId,
        name: input.name,
        category: input.category as any,
        defaultUnit: input.defaultUnit,
        lastPriceCents: input.priceCents ?? null,
        lastPriceStore: input.priceStore ?? null,
        lastPriceDate: input.priceCents ? new Date().toISOString().split('T')[0] : null,
      })
      .returning({ id: ingredients.id })

    revalidatePath('/culinary/ingredients')

    return { success: true, id: inserted.id }
  } catch (err) {
    console.error('[catalog-v2] Add to library error:', err instanceof Error ? err.message : err)
    return { success: false, error: 'Failed to add ingredient' }
  }
}

export async function searchCatalogForExport(params: {
  search?: string
  category?: string
  store?: string
  pricedOnly?: boolean
  sort?: 'name' | 'price' | 'stores' | 'updated'
}): Promise<CatalogItem[]> {
  await requireAdmin()

  const { search, category, store, pricedOnly, sort } = params

  try {
    const searchParams = new URLSearchParams()
    if (search) searchParams.set('search', search)
    if (category) searchParams.set('category', category)
    if (store) searchParams.set('store', store)
    if (pricedOnly) searchParams.set('priced_only', '1')
    if (sort) searchParams.set('sort', sort)
    searchParams.set('limit', '10000')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${OPENCLAW_API}/api/ingredients?${searchParams}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[catalog-export] Search returned ${res.status}`)
      return []
    }

    const data = await res.json()

    return (data.ingredients || data.items || []).map((item: any) => ({
      id: String(item.ingredient_id || item.id),
      name: item.name || '',
      category: item.category || 'uncategorized',
      bestPriceCents: item.best_price_cents ?? item.price_cents ?? null,
      bestPriceStore: item.best_price_store ?? item.store ?? null,
      bestPriceUnit: item.best_price_unit ?? item.unit ?? null,
      priceCount: item.price_count ?? item.store_count ?? 0,
      lastUpdated: item.last_updated ?? item.last_confirmed_at ?? null,
      trendPct: item.recent_change_pct ?? null,
    }))
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('[catalog-export] Search timed out')
    } else {
      console.warn(
        `[catalog-export] Search error: ${err instanceof Error ? err.message : 'unknown'}`
      )
    }
    return []
  }
}

export async function getCategoryCoverage(): Promise<CategoryCoverage[]> {
  await requireAdmin()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${OPENCLAW_API}/api/stats/category-coverage`, {
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[catalog-coverage] Returned ${res.status}`)
      return []
    }

    const data = await res.json()

    return (data.categories || data || []).map((c: any) => ({
      category: c.category || 'unknown',
      total: c.total ?? 0,
      priced: c.priced ?? 0,
      coveragePct: c.total > 0 ? Math.round((c.priced / c.total) * 100) : 0,
    }))
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('[catalog-coverage] Timed out')
    } else {
      console.warn(`[catalog-coverage] Error: ${err instanceof Error ? err.message : 'unknown'}`)
    }
    return []
  }
}

export async function getShoppingOptimizationAdmin(
  items: string[]
): Promise<ShoppingOptResult | null> {
  await requireAdmin()

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const res = await fetch(`${OPENCLAW_API}/api/optimize/shopping-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[shopping-opt] Returned ${res.status}`)
      return null
    }

    const data = await res.json()
    return data as ShoppingOptResult
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn('[shopping-opt] Timed out')
    } else {
      console.warn(`[shopping-opt] Error: ${err instanceof Error ? err.message : 'unknown'}`)
    }
    return null
  }
}
