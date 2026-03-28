'use server'

/**
 * OpenClaw Price Intelligence Actions
 * Server actions for price drop alerts, shopping optimizer,
 * store scorecards, cost impact analysis, and price history.
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

export type StockSummary = {
  total: number
  inStock: number
  outOfStock: number
  availabilityPct: number
  outOfStockItems: {
    name: string
    ingredientId: string
    storeName: string
    lastConfirmed: string
  }[]
}

export type StoreScorecard = {
  store: string
  avgCents: number
  itemCount: number
  wins: number
  coveragePct: number
  score: number
}

export type CostImpact = {
  name: string
  ingredientId: string
  oldCents: number
  newCents: number
  changePct: number
  direction: 'up' | 'down'
  store: string
  date: string
}

export type CostImpactResult = {
  lookbackDays: number
  impactCount: number
  impacts: CostImpact[]
  totalIncreaseCents: number
  totalDecreaseCents: number
}

export type PriceHistoryPoint = {
  date: string
  cents: number
}

export type PriceHistory = {
  ingredientId: string
  currentBestCents: number | null
  priceUnit: string | null
  daily: PriceHistoryPoint[]
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

export async function getStockSummary(): Promise<StockSummary> {
  await requireChef()

  try {
    const res = await fetch(`${OPENCLAW_API}/api/stock/summary`, {
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok)
      return { total: 0, inStock: 0, outOfStock: 0, availabilityPct: 100, outOfStockItems: [] }

    const data = await res.json()
    return {
      total: data.total || 0,
      inStock: data.inStock || 0,
      outOfStock: data.outOfStock || 0,
      availabilityPct: data.availabilityPct ?? 100,
      outOfStockItems: (data.outOfStockItems || []).map((item: any) => ({
        name: item.name || '',
        ingredientId: item.ingredient_id || '',
        storeName: item.store_name || '',
        lastConfirmed: item.last_confirmed_at || '',
      })),
    }
  } catch {
    return { total: 0, inStock: 0, outOfStock: 0, availabilityPct: 100, outOfStockItems: [] }
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

/**
 * Store scorecards: which stores are cheapest for a specific set of ingredients.
 */
export async function getStoreScorecard(ingredientNames: string[]): Promise<StoreScorecard[]> {
  await requireChef()

  if (ingredientNames.length === 0) return []

  try {
    const res = await fetch(`${OPENCLAW_API}/api/stores/scorecard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ingredientNames }),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    if (!res.ok) return []

    const data = await res.json()
    return (data.stores || []).map((s: any) => ({
      store: s.store || '',
      avgCents: s.avgCents || 0,
      itemCount: s.itemCount || 0,
      wins: s.wins || 0,
      coveragePct: s.coveragePct || 0,
      score: s.score || 0,
    }))
  } catch {
    return []
  }
}

/**
 * Cost impact: which of the chef's ingredients had recent price changes.
 */
export async function getCostImpact(
  ingredientNames: string[],
  days = 7
): Promise<CostImpactResult> {
  await requireChef()

  const empty: CostImpactResult = {
    lookbackDays: days,
    impactCount: 0,
    impacts: [],
    totalIncreaseCents: 0,
    totalDecreaseCents: 0,
  }

  if (ingredientNames.length === 0) return empty

  try {
    const res = await fetch(`${OPENCLAW_API}/api/prices/cost-impact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: ingredientNames, days }),
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    if (!res.ok) return empty

    const data = await res.json()
    return {
      lookbackDays: data.lookbackDays || days,
      impactCount: data.impactCount || 0,
      impacts: (data.impacts || []).map((i: any) => ({
        name: i.name || '',
        ingredientId: i.ingredientId || '',
        oldCents: i.oldCents || 0,
        newCents: i.newCents || 0,
        changePct: i.changePct || 0,
        direction: i.direction || 'up',
        store: i.store || '',
        date: i.date || '',
      })),
      totalIncreaseCents: data.totalIncreaseCents || 0,
      totalDecreaseCents: data.totalDecreaseCents || 0,
    }
  } catch {
    return empty
  }
}

/**
 * Price history: daily min prices for sparkline rendering.
 */
export async function getPriceHistory(ingredientId: string, days = 90): Promise<PriceHistory> {
  await requireChef()

  const empty: PriceHistory = {
    ingredientId,
    currentBestCents: null,
    priceUnit: null,
    daily: [],
  }

  try {
    const res = await fetch(
      `${OPENCLAW_API}/api/prices/history/${encodeURIComponent(ingredientId)}?days=${days}`,
      { signal: AbortSignal.timeout(10000), cache: 'no-store' }
    )
    if (!res.ok) return empty

    const data = await res.json()
    return {
      ingredientId,
      currentBestCents: data.currentBestCents || null,
      priceUnit: data.priceUnit || null,
      daily: (data.daily || []).map((d: any) => ({
        date: d.date || '',
        cents: d.cents || 0,
      })),
    }
  } catch {
    return empty
  }
}

// --- Types for Price Intelligence Summary ---

export type PriceSpike = {
  ingredientName: string
  currentPriceCents: number
  previousPriceCents: number
  spikePct: number
  store: string
  unit: string
}

export type FreshnessBreakdown = {
  total: number
  current: number
  stale: number
  expired: number
  currentPct: number
}

export type PriceIntelligenceSummary = {
  drops: PriceDrop[]
  spikes: PriceSpike[]
  freshness: FreshnessBreakdown
  topSavingsStore: string | null
  stockAlerts: number
  error: string | null
}

/**
 * Unified price intelligence summary for the dashboard.
 * Consolidates price drops, spikes, freshness, and stock data into one call.
 */
export async function getPriceIntelligenceSummary(): Promise<PriceIntelligenceSummary> {
  await requireChef()

  const empty: PriceIntelligenceSummary = {
    drops: [],
    spikes: [],
    freshness: { total: 0, current: 0, stale: 0, expired: 0, currentPct: 0 },
    topSavingsStore: null,
    stockAlerts: 0,
    error: null,
  }

  try {
    const [dropsRes, freshnessRes, costRes, stockRes] = await Promise.all([
      fetch(`${OPENCLAW_API}/api/alerts/price-drops?limit=5`, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      }).catch(() => null),
      fetch(`${OPENCLAW_API}/api/freshness`, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      }).catch(() => null),
      fetch(`${OPENCLAW_API}/api/prices/cost-impact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [], days: 7 }),
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      }).catch(() => null),
      fetch(`${OPENCLAW_API}/api/stock/summary`, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
      }).catch(() => null),
    ])

    // Parse drops
    const drops: PriceDrop[] = []
    if (dropsRes?.ok) {
      const dropsData = await dropsRes.json()
      for (const a of (dropsData.alerts || dropsData.drops || []).slice(0, 5)) {
        drops.push({
          ingredientName: a.ingredient_name || a.name || '',
          currentPriceCents: a.current_price_cents || a.best_price_cents || 0,
          previousPriceCents: a.avg_price_cents || a.previous_price_cents || 0,
          dropPct: a.drop_pct || a.percent_drop || 0,
          store: a.store || a.best_store || '',
          unit: a.unit || a.price_unit || 'lb',
        })
      }
    }

    // Parse freshness
    let freshness: FreshnessBreakdown = empty.freshness
    if (freshnessRes?.ok) {
      const fData = await freshnessRes.json()
      const breakdown = fData.breakdown || []
      const current = breakdown.find((b: any) => b.freshness === 'current')?.count || 0
      const stale = breakdown.find((b: any) => b.freshness === 'stale')?.count || 0
      const expired = breakdown.find((b: any) => b.freshness === 'expired')?.count || 0
      const total = fData.total || current + stale + expired
      freshness = {
        total,
        current,
        stale,
        expired,
        currentPct: total > 0 ? Math.round((current / total) * 100) : 0,
      }
    }

    // Parse spikes from cost impact
    const spikes: PriceSpike[] = []
    if (costRes?.ok) {
      const costData = await costRes.json()
      for (const i of (costData.impacts || [])
        .filter((x: any) => x.direction === 'up')
        .slice(0, 5)) {
        spikes.push({
          ingredientName: i.name || '',
          currentPriceCents: i.newCents || 0,
          previousPriceCents: i.oldCents || 0,
          spikePct: Math.abs(i.changePct || 0),
          store: i.store || '',
          unit: 'lb',
        })
      }
    }

    // Parse stock alerts
    let stockAlerts = 0
    if (stockRes?.ok) {
      const stockData = await stockRes.json()
      stockAlerts = stockData.outOfStock || 0
    }

    // Top savings store from drops
    const storeSavings = new Map<string, number>()
    for (const drop of drops) {
      if (drop.store) storeSavings.set(drop.store, (storeSavings.get(drop.store) || 0) + 1)
    }
    let topSavingsStore: string | null = null
    let topCount = 0
    for (const [store, count] of storeSavings) {
      if (count > topCount) {
        topSavingsStore = store
        topCount = count
      }
    }

    return { drops, spikes, freshness, topSavingsStore, stockAlerts, error: null }
  } catch {
    return { ...empty, error: 'Price data temporarily unavailable' }
  }
}
