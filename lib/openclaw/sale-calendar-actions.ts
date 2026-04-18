'use server'

/**
 * Sale Calendar Actions
 * Surfaces current sale items from OpenClaw Pi.
 */

import { requireChef } from '@/lib/auth/get-user'
import { getMyPrimaryStoreName } from '@/lib/openclaw/store-preference-actions'
import { getPreferredStores } from '@/lib/grocery/store-shopping-actions'
import { unstable_cache } from 'next/cache'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// --- Types ---

export type SaleItem = {
  ingredientName: string
  canonicalId: string
  store: string
  salePriceCents: number
  regularPriceCents: number | null
  savingsPct: number | null
  unit: string
  validThrough: string | null
  category: string
}

// --- Helpers ---

async function fetchPi<T>(
  path: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const res = await fetch(`${OPENCLAW_API}${path}`, {
      ...options,
      signal: controller.signal,
      cache: 'no-store',
    })
    clearTimeout(timeout)
    if (!res.ok) return { data: null, error: `Pi returned ${res.status}` }
    return { data: await res.json(), error: null }
  } catch {
    clearTimeout(timeout)
    return { data: null, error: 'Price data temporarily unavailable' }
  }
}

function mapSaleItems(items: any[]): SaleItem[] {
  return items.map((item: any) => ({
    ingredientName: item.ingredient || item.name || '',
    canonicalId: item.canonical_id || '',
    store: item.store || '',
    salePriceCents: item.price_cents || 0,
    regularPriceCents: item.regular_price_cents || null,
    savingsPct: item.savings_pct || null,
    unit: item.unit || 'each',
    validThrough: item.valid_through || null,
    category: item.category || 'uncategorized',
  }))
}

// --- Actions ---

export async function getCurrentSales(
  stores?: string[]
): Promise<{ sales: SaleItem[]; error: string | null }> {
  await requireChef()

  // Default to chef's preferred stores if none specified
  let storeFilter = stores
  if (!storeFilter || storeFilter.length === 0) {
    const preferred = await getPreferredStores().catch(() => [])
    storeFilter = preferred.map((s) => s.store_name)
  }

  const storeKey = (storeFilter || []).sort().join(',')

  const fetchSales = unstable_cache(
    async (storeParam: string) => {
      const result = await fetchPi<{ sales: any[]; count: number }>(
        `/api/sales/current${storeParam}`
      )
      if (!result.data) return { sales: [] as SaleItem[], error: result.error }
      return { sales: mapSaleItems(result.data.sales || []), error: null }
    },
    ['sale-calendar', storeKey],
    { revalidate: 3600, tags: ['sale-calendar'] }
  )

  const storeParam =
    storeFilter.length > 0 ? `?stores=${encodeURIComponent(storeFilter.join(','))}` : ''
  return fetchSales(storeParam)
}

export async function getSalesByCategory(
  category: string,
  stores?: string[]
): Promise<{ sales: SaleItem[]; error: string | null }> {
  await requireChef()

  let storeFilter = stores
  if (!storeFilter || storeFilter.length === 0) {
    const preferred = await getPreferredStores().catch(() => [])
    storeFilter = preferred.map((s) => s.store_name)
  }

  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (storeFilter.length > 0) params.set('stores', storeFilter.join(','))

  const result = await fetchPi<{ sales: any[]; count: number }>(
    `/api/sales/current?${params.toString()}`
  )

  if (!result.data) return { sales: [], error: result.error }
  return { sales: mapSaleItems(result.data.sales || []), error: null }
}
