'use server'

/**
 * OpenClaw Price Intelligence Actions
 * Server actions for price drop alerts and shopping optimizer.
 * These call the Pi API directly.
 */

import { requireChef } from '@/lib/auth/get-user'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// --- Types ---

export type PriceDrop = {
  ingredientName: string
  currentPriceCents: number
  previousPriceCents: number
  dropPct: number
  store: string
  unit: string
}

export type PriceFreshness = {
  total: number
  current: number
  stale: number
  expired: number
  currentPct: number
}

export type ShoppingOptResult = {
  singleStore: {
    store: string
    totalCents: number
    itemCount: number
    missingCount: number
  } | null
  multiStore: {
    totalCents: number
    stores: { store: string; items: string[]; subtotalCents: number }[]
    savings: number
  } | null
}

// --- Actions ---

export async function getPriceDropAlerts(limit = 10): Promise<PriceDrop[]> {
  await requireChef()

  try {
    const res = await fetch(`${OPENCLAW_API}/api/alerts/price-drops?limit=${limit}`, {
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return []

    const data = await res.json()
    return (data.alerts || data.drops || []).slice(0, limit).map((a: any) => ({
      ingredientName: a.ingredient_name || a.name || '',
      currentPriceCents: a.current_price_cents || a.best_price_cents || 0,
      previousPriceCents: a.avg_price_cents || a.previous_price_cents || 0,
      dropPct: a.drop_pct || a.percent_drop || 0,
      store: a.store || a.best_store || '',
      unit: a.unit || a.price_unit || 'lb',
    }))
  } catch {
    return []
  }
}

export async function getPriceFreshness(): Promise<PriceFreshness> {
  await requireChef()

  try {
    const res = await fetch(`${OPENCLAW_API}/api/freshness`, {
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) return { total: 0, current: 0, stale: 0, expired: 0, currentPct: 0 }

    const data = await res.json()
    const breakdown = data.breakdown || []
    const current = breakdown.find((b: any) => b.freshness === 'current')?.count || 0
    const stale = breakdown.find((b: any) => b.freshness === 'stale')?.count || 0
    const expired = breakdown.find((b: any) => b.freshness === 'expired')?.count || 0
    const total = data.total || current + stale + expired

    return {
      total,
      current,
      stale,
      expired,
      currentPct: total > 0 ? Math.round((current / total) * 100) : 0,
    }
  } catch {
    return { total: 0, current: 0, stale: 0, expired: 0, currentPct: 0 }
  }
}

export async function getShoppingOptimization(
  ingredientNames: string[]
): Promise<ShoppingOptResult> {
  await requireChef()

  if (ingredientNames.length === 0) {
    return { singleStore: null, multiStore: null }
  }

  try {
    const res = await fetch(`${OPENCLAW_API}/api/optimize/shopping-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients: ingredientNames }),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    if (!res.ok) return { singleStore: null, multiStore: null }

    const data = await res.json()

    const singleStore = data.single_store
      ? {
          store: data.single_store.store || data.single_store.name || '',
          totalCents: data.single_store.total_cents || 0,
          itemCount: data.single_store.item_count || 0,
          missingCount: data.single_store.missing_count || 0,
        }
      : null

    const multiStore = data.multi_store
      ? {
          totalCents: data.multi_store.total_cents || 0,
          stores: (data.multi_store.stores || []).map((s: any) => ({
            store: s.store || s.name || '',
            items: s.items || [],
            subtotalCents: s.subtotal_cents || 0,
          })),
          savings: data.multi_store.savings_cents || 0,
        }
      : null

    return { singleStore, multiStore }
  } catch {
    return { singleStore: null, multiStore: null }
  }
}
