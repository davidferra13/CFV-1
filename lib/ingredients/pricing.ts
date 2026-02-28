// Ingredient Price Intelligence Server Actions
// Track prices from receipts, compute averages, detect anomalies

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Schemas ---

const LogPriceSchema = z.object({
  ingredient_id: z.string().uuid(),
  expense_id: z.string().uuid().nullable().optional(),
  store_name: z.string().nullable().optional(),
  price_cents: z.number().int().positive(),
  quantity: z.number().positive().default(1),
  unit: z.string().nullable().optional(),
  price_per_unit_cents: z.number().int().nullable().optional(),
  purchase_date: z.string().optional(),
})

export type LogPriceInput = z.infer<typeof LogPriceSchema>

// --- Actions ---

/**
 * Record a price observation from a receipt
 */
export async function logIngredientPrice(input: LogPriceInput) {
  const user = await requireChef()
  const validated = LogPriceSchema.parse(input)
  const supabase: any = createServerClient()

  // Auto-compute price_per_unit if not provided
  const pricePerUnit =
    validated.price_per_unit_cents ?? Math.round(validated.price_cents / validated.quantity)

  const { data, error } = await supabase
    .from('ingredient_price_history')
    .insert({
      ...validated,
      price_per_unit_cents: pricePerUnit,
      tenant_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[logIngredientPrice] Error:', error)
    throw new Error('Failed to log price')
  }

  // Update the ingredient's last_price and average
  await updateIngredientPriceFields(validated.ingredient_id, user.tenantId!)

  return { success: true, entry: data }
}

/**
 * Get full price history for an ingredient
 */
export async function getIngredientPriceHistory(ingredientId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('ingredient_price_history')
    .select('*')
    .eq('ingredient_id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .order('purchase_date', { ascending: false })

  if (error) {
    console.error('[getIngredientPriceHistory] Error:', error)
    return []
  }

  return data
}

/**
 * Get average price stats for an ingredient
 */
export async function getIngredientAveragePrice(ingredientId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('ingredient_price_history')
    .select('price_per_unit_cents, store_name, purchase_date')
    .eq('ingredient_id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .order('purchase_date', { ascending: false })

  if (error || !data || data.length === 0) {
    return null
  }

  const prices = data
    .map((d: any) => d.price_per_unit_cents)
    .filter((p: any): p is number => p !== null)
  if (prices.length === 0) return null

  const avg = Math.round(prices.reduce((a: any, b: any) => a + b, 0) / prices.length)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const mostRecent = prices[0]

  // Find cheapest store
  const storeAvg: Record<string, { total: number; count: number }> = {}
  for (const entry of data) {
    if (entry.store_name && entry.price_per_unit_cents !== null) {
      if (!storeAvg[entry.store_name]) storeAvg[entry.store_name] = { total: 0, count: 0 }
      storeAvg[entry.store_name].total += entry.price_per_unit_cents
      storeAvg[entry.store_name].count++
    }
  }

  let cheapestStore: string | null = null
  let cheapestStoreAvg = Infinity
  for (const [store, { total, count }] of Object.entries(storeAvg)) {
    const avg = total / count
    if (avg < cheapestStoreAvg) {
      cheapestStore = store
      cheapestStoreAvg = avg
    }
  }

  return {
    averageCents: avg,
    minCents: min,
    maxCents: max,
    mostRecentCents: mostRecent,
    cheapestStore,
    observationCount: prices.length,
    confidence: prices.length < 3 ? 'low' : prices.length < 10 ? 'medium' : 'high',
  }
}

/**
 * Get price alerts — ingredients where recent price is 30%+ above average
 */
export async function getIngredientPriceAlerts() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all ingredients with price history
  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, average_price_cents, last_price_cents, price_unit')
    .eq('tenant_id', user.tenantId!)
    .not('average_price_cents', 'is', null)
    .not('last_price_cents', 'is', null)

  if (!ingredients) return []

  const alerts: Array<{
    ingredientId: string
    ingredientName: string
    averageCents: number
    recentCents: number
    percentAbove: number
    unit: string | null
  }> = []

  for (const ing of ingredients) {
    if (ing.average_price_cents && ing.last_price_cents) {
      const percentAbove = Math.round(
        ((ing.last_price_cents - ing.average_price_cents) / ing.average_price_cents) * 100
      )
      if (percentAbove >= 30) {
        alerts.push({
          ingredientId: ing.id,
          ingredientName: ing.name,
          averageCents: ing.average_price_cents,
          recentCents: ing.last_price_cents,
          percentAbove,
          unit: ing.price_unit,
        })
      }
    }
  }

  // Sort by highest markup first
  alerts.sort((a, b) => b.percentAbove - a.percentAbove)
  return alerts
}

/**
 * Get price comparison across stores for an ingredient
 */
export async function getStoreComparison(ingredientId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('ingredient_price_history')
    .select('store_name, price_per_unit_cents, unit')
    .eq('ingredient_id', ingredientId)
    .eq('tenant_id', user.tenantId!)
    .not('store_name', 'is', null)

  if (error || !data) return []

  const storeData: Record<string, { prices: number[]; unit: string | null }> = {}
  for (const entry of data) {
    if (!entry.store_name || entry.price_per_unit_cents === null) continue
    if (!storeData[entry.store_name]) {
      storeData[entry.store_name] = { prices: [], unit: entry.unit }
    }
    storeData[entry.store_name].prices.push(entry.price_per_unit_cents)
  }

  return Object.entries(storeData)
    .map(([store, { prices, unit }]) => ({
      store,
      averageCents: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      observationCount: prices.length,
      unit,
    }))
    .sort((a, b) => a.averageCents - b.averageCents)
}

// --- Internal helper ---

async function updateIngredientPriceFields(ingredientId: string, tenantId: string) {
  const supabase: any = createServerClient()

  const { data: history } = await supabase
    .from('ingredient_price_history')
    .select('price_per_unit_cents, purchase_date')
    .eq('ingredient_id', ingredientId)
    .eq('tenant_id', tenantId)
    .not('price_per_unit_cents', 'is', null)
    .order('purchase_date', { ascending: false })

  if (!history || history.length === 0) return

  const prices = history.map((h: any) => h.price_per_unit_cents!).filter(Boolean)
  const avg = Math.round(prices.reduce((a: any, b: any) => a + b, 0) / prices.length)

  await supabase
    .from('ingredients')
    .update({
      last_price_cents: prices[0],
      last_price_date: history[0].purchase_date,
      average_price_cents: avg,
      last_purchased_at: new Date().toISOString(),
    })
    .eq('id', ingredientId)
    .eq('tenant_id', tenantId)
}
