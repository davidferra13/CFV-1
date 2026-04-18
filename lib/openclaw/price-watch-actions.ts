'use server'

/**
 * Price Watch List Actions
 * Lets chefs set target prices for ingredients they buy regularly.
 * When prices drop below the target, they get alerted on the dashboard.
 */

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

const OPENCLAW_API = process.env.OPENCLAW_API_URL || 'http://10.0.0.177:8081'

// --- Types ---

export type PriceWatch = {
  id: string
  ingredientName: string
  targetPriceCents: number
  priceUnit: string
  notes: string | null
  isActive: boolean
  lastAlertedAt: string | null
  createdAt: string
}

export type PriceWatchAlert = {
  watchId: string
  ingredientName: string
  targetPriceCents: number
  currentPriceCents: number
  store: string
  priceUnit: string
  savingsPct: number
}

// --- Actions ---

export async function getPriceWatchList(): Promise<PriceWatch[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('price_watch_list')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPriceWatchList]', error)
    return []
  }

  return (data || []).map((w: any) => ({
    id: w.id,
    ingredientName: w.ingredient_name,
    targetPriceCents: w.target_price_cents,
    priceUnit: w.price_unit,
    notes: w.notes,
    isActive: w.is_active,
    lastAlertedAt: w.last_alerted_at,
    createdAt: w.created_at,
  }))
}

export async function addPriceWatch(input: {
  ingredientName: string
  targetPriceCents: number
  priceUnit?: string
  notes?: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (!input.ingredientName?.trim()) {
    return { success: false, error: 'Ingredient name is required' }
  }
  if (!input.targetPriceCents || input.targetPriceCents <= 0) {
    return { success: false, error: 'Target price must be positive' }
  }

  const { error } = await db.from('price_watch_list').insert({
    chef_id: user.entityId,
    ingredient_name: input.ingredientName.trim(),
    target_price_cents: input.targetPriceCents,
    price_unit: input.priceUnit || 'lb',
    notes: input.notes || null,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Already watching this ingredient' }
    }
    console.error('[addPriceWatch]', error)
    return { success: false, error: 'Failed to add price watch' }
  }

  revalidatePath('/culinary/ingredients')
  return { success: true }
}

export async function removePriceWatch(watchId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('price_watch_list')
    .delete()
    .eq('id', watchId)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[removePriceWatch]', error)
    return { success: false }
  }

  revalidatePath('/culinary/ingredients')
  return { success: true }
}

export async function togglePriceWatch(
  watchId: string,
  isActive: boolean
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('price_watch_list')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', watchId)
    .eq('chef_id', user.entityId)

  if (error) {
    console.error('[togglePriceWatch]', error)
    return { success: false }
  }

  revalidatePath('/culinary/ingredients')
  return { success: true }
}

/**
 * Check active watches against current Pi prices.
 * Returns alerts for watches where the current price is at or below the target.
 */
export async function checkPriceWatchAlerts(): Promise<PriceWatchAlert[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get active watches
  const { data: watches } = await db
    .from('price_watch_list')
    .select('*')
    .eq('chef_id', user.entityId)
    .eq('is_active', true)

  if (!watches?.length) return []

  // Look up current prices from Pi
  const names = watches.map((w: any) => w.ingredient_name)
  const alerts: PriceWatchAlert[] = []

  try {
    const res = await fetch(`${OPENCLAW_API}/api/lookup/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: names }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return []

    const data = await res.json()
    const results = data.results || {}

    for (const watch of watches) {
      const piResult = results[watch.ingredient_name]
      if (!piResult?.bestPrice) continue

      const currentCents = piResult.bestPrice.cents
      if (currentCents <= watch.target_price_cents) {
        alerts.push({
          watchId: watch.id,
          ingredientName: watch.ingredient_name,
          targetPriceCents: watch.target_price_cents,
          currentPriceCents: currentCents,
          store: piResult.bestPrice.store || '',
          priceUnit: watch.price_unit,
          savingsPct: Math.round(
            ((watch.target_price_cents - currentCents) / watch.target_price_cents) * 100
          ),
        })
      }
    }
  } catch {
    // Pi offline
  }

  // Stamp last_alerted_at on triggered watches to prevent duplicate alerts
  if (alerts.length > 0) {
    const alertedIds = alerts.map((a) => a.watchId)
    try {
      for (const id of alertedIds) {
        await db
          .from('price_watch_list')
          .update({ last_alerted_at: new Date().toISOString() })
          .eq('id', id)
          .eq('chef_id', user.entityId)
      }
    } catch (err) {
      console.error('[checkPriceWatchAlerts] Failed to stamp last_alerted_at:', err)
    }
  }

  return alerts
}
