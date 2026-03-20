'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---------- Types ----------

export type PriceEntry = {
  id: string
  chef_id: string
  ingredient_name: string
  unit: string
  price_cents: number
  quantity: number
  store_name: string | null
  receipt_date: string
  notes: string | null
  created_at: string
}

export type PriceEntryInput = {
  ingredient_name: string
  unit: string
  price_cents: number
  quantity?: number
  store_name?: string
  receipt_date?: string
  notes?: string
}

export type PriceTrend = 'up' | 'down' | 'stable'

export type IngredientPriceStats = {
  ingredient_name: string
  min_cents: number
  max_cents: number
  avg_cents: number
  latest_cents: number
  latest_date: string
  entry_count: number
  trend: PriceTrend
}

export type StoreSummary = {
  store_name: string
  total_spend_cents: number
  visit_count: number
  avg_basket_cents: number
}

// ---------- Actions ----------

export async function addPriceEntry(
  data: PriceEntryInput
): Promise<{ success: boolean; error?: string; entry?: PriceEntry }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: entry, error } = await supabase
    .from('grocery_price_entries')
    .insert({
      chef_id: user.tenantId!,
      ingredient_name: data.ingredient_name.trim().toLowerCase(),
      unit: data.unit,
      price_cents: data.price_cents,
      quantity: data.quantity ?? 1,
      store_name: data.store_name?.trim() || null,
      receipt_date: data.receipt_date || new Date().toISOString().split('T')[0],
      notes: data.notes?.trim() || null,
    })
    .select()
    .single()

  if (error) {
    console.error('[grocery-price] addPriceEntry failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/finance')
  return { success: true, entry: entry as PriceEntry }
}

export async function bulkAddPrices(
  entries: PriceEntryInput[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const rows = entries.map((e) => ({
    chef_id: user.tenantId!,
    ingredient_name: e.ingredient_name.trim().toLowerCase(),
    unit: e.unit,
    price_cents: e.price_cents,
    quantity: e.quantity ?? 1,
    store_name: e.store_name?.trim() || null,
    receipt_date: e.receipt_date || new Date().toISOString().split('T')[0],
    notes: e.notes?.trim() || null,
  }))

  const { error, count } = await supabase.from('grocery_price_entries').insert(rows)

  if (error) {
    console.error('[grocery-price] bulkAddPrices failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/finance')
  return { success: true, count: count ?? rows.length }
}

export async function deletePriceEntry(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('grocery_price_entries')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[grocery-price] deletePriceEntry failed:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/finance')
  return { success: true }
}

export async function getPriceHistory(
  ingredientName?: string,
  storeFilter?: string,
  limit = 100
): Promise<{ success: boolean; error?: string; entries?: PriceEntry[] }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('grocery_price_entries')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('receipt_date', { ascending: false })
    .limit(limit)

  if (ingredientName) {
    query = query.eq('ingredient_name', ingredientName.trim().toLowerCase())
  }
  if (storeFilter) {
    query = query.eq('store_name', storeFilter.trim())
  }

  const { data, error } = await query

  if (error) {
    console.error('[grocery-price] getPriceHistory failed:', error)
    return { success: false, error: error.message }
  }

  return { success: true, entries: (data ?? []) as PriceEntry[] }
}

/**
 * Compute price stats for a single ingredient.
 * Trend is deterministic: compare average of last 5 entries vs previous 5.
 * Up = latest avg > previous avg by 5%+, down = lower by 5%+, else stable.
 */
export async function getIngredientPriceStats(
  ingredientName: string
): Promise<{ success: boolean; error?: string; stats?: IngredientPriceStats }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('grocery_price_entries')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('ingredient_name', ingredientName.trim().toLowerCase())
    .order('receipt_date', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[grocery-price] getIngredientPriceStats failed:', error)
    return { success: false, error: error.message }
  }

  const entries = (data ?? []) as PriceEntry[]
  if (entries.length === 0) {
    return { success: false, error: 'No price data found for this ingredient' }
  }

  // Compute unit price (price_cents / quantity) for fair comparison
  const unitPrices = entries.map((e) => e.price_cents / (e.quantity || 1))

  const minCents = Math.round(Math.min(...unitPrices))
  const maxCents = Math.round(Math.max(...unitPrices))
  const avgCents = Math.round(unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length)
  const latestCents = Math.round(unitPrices[0])
  const latestDate = entries[0].receipt_date

  // Trend: compare recent 5 vs previous 5
  const recent5 = unitPrices.slice(0, Math.min(5, unitPrices.length))
  const previous5 = unitPrices.slice(5, Math.min(10, unitPrices.length))

  let trend: PriceTrend = 'stable'
  if (previous5.length >= 2) {
    const recentAvg = recent5.reduce((a, b) => a + b, 0) / recent5.length
    const prevAvg = previous5.reduce((a, b) => a + b, 0) / previous5.length
    const changePercent = ((recentAvg - prevAvg) / prevAvg) * 100
    if (changePercent > 5) trend = 'up'
    else if (changePercent < -5) trend = 'down'
  }

  return {
    success: true,
    stats: {
      ingredient_name: ingredientName.trim().toLowerCase(),
      min_cents: minCents,
      max_cents: maxCents,
      avg_cents: avgCents,
      latest_cents: latestCents,
      latest_date: latestDate,
      entry_count: entries.length,
      trend,
    },
  }
}

export async function getFrequentIngredients(): Promise<{
  success: boolean
  error?: string
  ingredients?: { name: string; count: number; latest_cents: number; unit: string }[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all entries ordered by date to compute frequency and latest price
  const { data, error } = await supabase
    .from('grocery_price_entries')
    .select('ingredient_name, price_cents, quantity, unit, receipt_date')
    .eq('chef_id', user.tenantId!)
    .order('receipt_date', { ascending: false })

  if (error) {
    console.error('[grocery-price] getFrequentIngredients failed:', error)
    return { success: false, error: error.message }
  }

  const entries = data ?? []

  // Group by ingredient, track count and latest price
  const map = new Map<string, { count: number; latest_cents: number; unit: string }>()
  for (const e of entries) {
    const name = e.ingredient_name
    const existing = map.get(name)
    if (!existing) {
      map.set(name, {
        count: 1,
        latest_cents: Math.round(e.price_cents / (e.quantity || 1)),
        unit: e.unit,
      })
    } else {
      existing.count++
    }
  }

  // Sort by count descending, take top 20
  const sorted = [...map.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([name, info]) => ({
      name,
      count: info.count,
      latest_cents: info.latest_cents,
      unit: info.unit,
    }))

  return { success: true, ingredients: sorted }
}

export async function getPriceComparison(ingredientName: string): Promise<{
  success: boolean
  error?: string
  stores?: { store_name: string; avg_cents: number; latest_cents: number; entry_count: number }[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('grocery_price_entries')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('ingredient_name', ingredientName.trim().toLowerCase())
    .not('store_name', 'is', null)
    .order('receipt_date', { ascending: false })

  if (error) {
    console.error('[grocery-price] getPriceComparison failed:', error)
    return { success: false, error: error.message }
  }

  const entries = (data ?? []) as PriceEntry[]

  // Group by store
  const storeMap = new Map<string, { prices: number[]; latestCents: number }>()
  for (const e of entries) {
    const store = e.store_name!
    const unitPrice = e.price_cents / (e.quantity || 1)
    const existing = storeMap.get(store)
    if (!existing) {
      storeMap.set(store, { prices: [unitPrice], latestCents: Math.round(unitPrice) })
    } else {
      existing.prices.push(unitPrice)
    }
  }

  const stores = [...storeMap.entries()]
    .map(([store, info]) => ({
      store_name: store,
      avg_cents: Math.round(info.prices.reduce((a, b) => a + b, 0) / info.prices.length),
      latest_cents: info.latestCents,
      entry_count: info.prices.length,
    }))
    .sort((a, b) => a.avg_cents - b.avg_cents)

  return { success: true, stores }
}

export async function getStoreSummary(): Promise<{
  success: boolean
  error?: string
  stores?: StoreSummary[]
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('grocery_price_entries')
    .select('store_name, price_cents, quantity, receipt_date')
    .eq('chef_id', user.tenantId!)
    .not('store_name', 'is', null)

  if (error) {
    console.error('[grocery-price] getStoreSummary failed:', error)
    return { success: false, error: error.message }
  }

  const entries = data ?? []

  // Group by store, count unique receipt dates as visits
  const storeMap = new Map<string, { totalCents: number; dates: Set<string> }>()
  for (const e of entries) {
    const store = e.store_name!
    const lineCost = e.price_cents * (e.quantity || 1)
    const existing = storeMap.get(store)
    if (!existing) {
      storeMap.set(store, {
        totalCents: Math.round(lineCost),
        dates: new Set([e.receipt_date]),
      })
    } else {
      existing.totalCents += Math.round(lineCost)
      existing.dates.add(e.receipt_date)
    }
  }

  const stores: StoreSummary[] = [...storeMap.entries()]
    .map(([name, info]) => ({
      store_name: name,
      total_spend_cents: info.totalCents,
      visit_count: info.dates.size,
      avg_basket_cents: Math.round(info.totalCents / info.dates.size),
    }))
    .sort((a, b) => b.total_spend_cents - a.total_spend_cents)

  return { success: true, stores }
}
