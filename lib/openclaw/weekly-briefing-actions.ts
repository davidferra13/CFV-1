'use server'

/**
 * Weekly Price Briefing
 * Computes a weekly summary of price movements for the chef's ingredients.
 * All logic is deterministic (formula > AI).
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { resolvePricesBatch } from '@/lib/pricing/resolve-price'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// --- Types ---

export type PriceMove = {
  ingredient: string
  oldCents: number
  newCents: number
  changePct: number
  store: string
  direction: 'up' | 'down'
}

export type WeeklyBriefing = {
  weekOf: string
  headline: string
  totalBasketCents: number
  basketChangePct: number | null
  biggestDrops: PriceMove[]
  biggestSpikes: PriceMove[]
  bestStoreThisWeek: string | null
  newPricesAdded: number
  coveragePct: number
  seasonalNote: null
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

function formatWeekRange(): string {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)

  const opts: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' }
  const start = monday.toLocaleDateString('en-US', opts)
  const end = friday.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${start}-${end}`
}

// --- Action ---

export async function getWeeklyPriceBriefing(): Promise<WeeklyBriefing | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // 1. Get all ingredient IDs + names from chef's recipes
  const ingredientRows = (await db.execute(sql`
    SELECT DISTINCT i.id, i.name
    FROM recipe_ingredients ri
    JOIN ingredients i ON i.id = ri.ingredient_id
    WHERE i.tenant_id = ${tenantId}
  `)) as unknown as { id: string; name: string }[]

  if (ingredientRows.length === 0) return null

  const ingredientIds = ingredientRows.map((r) => r.id)
  const ingredientNames = ingredientRows.map((r) => r.name)

  // 2. Resolve current prices
  const currentPrices = await resolvePricesBatch(ingredientIds, tenantId)

  // 3. Compute current basket total
  let totalBasketCents = 0
  let pricedCount = 0
  for (const [, price] of currentPrices) {
    if (price.cents !== null) {
      totalBasketCents += price.cents
      pricedCount++
    }
  }

  // 4. Get previous week's basket from ingredient_price_history
  const prevWeekRows = (await db.execute(sql`
    SELECT DISTINCT ON (ingredient_id) ingredient_id, price_per_unit_cents
    FROM ingredient_price_history
    WHERE tenant_id = ${tenantId}
      AND ingredient_id = ANY(${ingredientIds})
      AND purchase_date BETWEEN (CURRENT_DATE - INTERVAL '14 days') AND (CURRENT_DATE - INTERVAL '7 days')
    ORDER BY ingredient_id, purchase_date DESC
  `)) as unknown as { ingredient_id: string; price_per_unit_cents: number | null }[]

  let prevBasketCents = 0
  let prevPricedCount = 0
  for (const row of prevWeekRows) {
    if (row.price_per_unit_cents !== null) {
      prevBasketCents += row.price_per_unit_cents
      prevPricedCount++
    }
  }

  // Only compute basket change if >50% of ingredients had history
  const basketChangePct =
    prevPricedCount >= ingredientIds.length * 0.5 && prevBasketCents > 0
      ? Math.round(((totalBasketCents - prevBasketCents) / prevBasketCents) * 1000) / 10
      : null

  // 5. Get cost impact from Pi for drops/spikes
  const costResult = await fetchPi<{
    impacts: any[]
    totalIncreaseCents: number
    totalDecreaseCents: number
  }>('/api/prices/cost-impact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: ingredientNames, days: 7 }),
  })

  const impacts = costResult.data?.impacts || []
  const drops: PriceMove[] = []
  const spikes: PriceMove[] = []

  for (const impact of impacts) {
    const move: PriceMove = {
      ingredient: impact.name || '',
      oldCents: impact.oldCents || 0,
      newCents: impact.newCents || 0,
      changePct: Math.abs(impact.changePct || 0),
      store: impact.store || '',
      direction: (impact.direction === 'down' ? 'down' : 'up') as 'up' | 'down',
    }
    if (move.direction === 'down') drops.push(move)
    else spikes.push(move)
  }

  // Sort by magnitude
  drops.sort((a, b) => b.changePct - a.changePct)
  spikes.sort((a, b) => b.changePct - a.changePct)

  // 6. Determine best store this week (most price wins)
  const storeWins = new Map<string, number>()
  for (const [, price] of currentPrices) {
    if (price.store) {
      storeWins.set(price.store, (storeWins.get(price.store) || 0) + 1)
    }
  }
  let bestStore: string | null = null
  let bestWins = 0
  for (const [store, wins] of storeWins) {
    if (wins > bestWins) {
      bestStore = store
      bestWins = wins
    }
  }

  // 7. Coverage
  const coveragePct =
    ingredientIds.length > 0 ? Math.round((pricedCount / ingredientIds.length) * 100) : 0

  // 8. Headline (deterministic, no AI)
  let headline: string
  if (basketChangePct === null) {
    headline = `Your ingredients cost $${(totalBasketCents / 100).toFixed(2)} total this week`
  } else if (basketChangePct < -1) {
    headline = `Your ingredient costs dropped ${Math.abs(basketChangePct)}% this week`
  } else if (basketChangePct > 1) {
    const topSpike = spikes[0]?.ingredient || 'rising prices'
    headline = `Ingredient costs up ${basketChangePct}% this week, driven by ${topSpike}`
  } else {
    headline = 'Prices stable this week'
  }

  return {
    weekOf: formatWeekRange(),
    headline,
    totalBasketCents,
    basketChangePct,
    biggestDrops: drops.slice(0, 5),
    biggestSpikes: spikes.slice(0, 5),
    bestStoreThisWeek: bestStore,
    newPricesAdded: 0,
    coveragePct,
    seasonalNote: null,
  }
}
