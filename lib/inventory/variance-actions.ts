// Variance Analysis Server Actions
// Chef-only: Compare expected vs actual ingredient usage per event, track trends

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { convertQuantity, normalizeUnit } from '@/lib/units/conversion-engine'

// ─── Types ───────────────────────────────────────────────────────

export type VarianceItem = {
  ingredientId: string
  ingredientName: string
  unit: string
  expectedQty: number
  actualQty: number
  varianceQty: number
  costImpactCents: number
}

export type EventVarianceReport = {
  eventId: string
  items: VarianceItem[]
  totalExpectedCostCents: number
  totalActualCostCents: number
  totalVarianceCents: number
}

export type VarianceTrendPoint = {
  month: string // YYYY-MM
  expectedCostCents: number
  actualCostCents: number
  varianceCents: number
  variancePct: number
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Walk event → menu → dishes → components → recipes → recipe_ingredients
 * to compute the expected ingredient quantities for an event.
 * Returns Map<ingredientId, { ingredientName, unit, expectedQty, lastPriceCents }>
 */
async function getExpectedForEvent(
  db: any,
  tenantId: string,
  eventId: string
): Promise<
  Map<string, { ingredientName: string; unit: string; expectedQty: number; lastPriceCents: number }>
> {
  const result = new Map<
    string,
    { ingredientName: string; unit: string; expectedQty: number; lastPriceCents: number }
  >()

  // Fetch menus for this event
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  if (!menus || menus.length === 0) return result

  const menuIds = (menus as any[]).map((m: any) => m.id)

  // Fetch dishes
  const { data: dishes } = await db
    .from('dishes')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('menu_id', menuIds)

  if (!dishes || dishes.length === 0) return result

  const dishIds = (dishes as any[]).map((d: any) => d.id)

  // Fetch components with recipe links
  const { data: components } = await db
    .from('components')
    .select('recipe_id, scale_factor')
    .eq('tenant_id', tenantId)
    .in('dish_id', dishIds)
    .not('recipe_id', 'is', null)

  if (!components || components.length === 0) return result

  // Build recipe_id → total scale factor (sum across all components using that recipe)
  const recipeScaleMap = new Map<string, number>()
  for (const comp of components as any[]) {
    const current = recipeScaleMap.get(comp.recipe_id) || 0
    recipeScaleMap.set(comp.recipe_id, current + (Number(comp.scale_factor) || 1))
  }

  const recipeIds = [...recipeScaleMap.keys()]

  // Fetch recipe_ingredients with ingredient details
  const { data: recipeIngredients } = await db
    .from('recipe_ingredients')
    .select(
      `
      recipe_id, ingredient_id, quantity, unit,
      ingredient:ingredients(id, name, last_price_cents)
    `
    )
    .in('recipe_id', recipeIds)

  if (!recipeIngredients) return result

  for (const ri of recipeIngredients as any[]) {
    const ingredient = ri.ingredient as any
    if (!ingredient || !ingredient.id) continue

    const qty = parseFloat(ri.quantity) || 0
    const scaleFactor = recipeScaleMap.get(ri.recipe_id) || 1
    const scaledQty = qty * scaleFactor

    const existing = result.get(ingredient.id) || {
      ingredientName: ingredient.name,
      unit: ri.unit || '',
      expectedQty: 0,
      lastPriceCents: Number(ingredient.last_price_cents) || 0,
    }

    existing.expectedQty += scaledQty
    result.set(ingredient.id, existing)
  }

  return result
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Get variance report for a specific event.
 * Compares expected ingredient usage (from recipes) against actual deductions
 * (inventory_transactions with type='event_deduction' and this event_id).
 */
export async function getEventVarianceReport(eventId: string): Promise<EventVarianceReport> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get expected ingredient quantities from the recipe chain
  const expectedMap = await getExpectedForEvent(db, user.tenantId!, eventId)

  // Get actual deductions from inventory_transactions for this event
  const { data: transactions, error: txError } = await db
    .from('inventory_transactions' as any)
    .select('ingredient_id, ingredient_name, quantity, unit')
    .eq('chef_id', user.tenantId!)
    .eq('event_id', eventId)
    .eq('type', 'event_deduction')

  if (txError) throw new Error(`Failed to fetch event transactions: ${txError.message}`)

  // Aggregate actual usage per ingredient (quantities are negative, so we take abs)
  const actualMap = new Map<string, { ingredientName: string; unit: string; totalQty: number }>()
  for (const tx of (transactions as any[]) || []) {
    if (!tx.ingredient_id) continue
    const existing = actualMap.get(tx.ingredient_id) || {
      ingredientName: tx.ingredient_name,
      unit: tx.unit || '',
      totalQty: 0,
    }
    // inventory_transactions quantities are negative for deductions, so take absolute value
    existing.totalQty += Math.abs(parseFloat(tx.quantity) || 0)
    actualMap.set(tx.ingredient_id, existing)
  }

  // Merge all ingredient IDs from both expected and actual
  const allIngredientIds = new Set([...expectedMap.keys(), ...actualMap.keys()])

  const items: VarianceItem[] = []
  let totalExpectedCostCents = 0
  let totalActualCostCents = 0

  for (const ingredientId of allIngredientIds) {
    const expected = expectedMap.get(ingredientId)
    const actual = actualMap.get(ingredientId)

    const ingredientName = expected?.ingredientName || actual?.ingredientName || 'Unknown'
    const expectedUnit = normalizeUnit(expected?.unit || '')
    const actualUnit = normalizeUnit(actual?.unit || '')
    const unit = expectedUnit || actualUnit || ''
    const expectedQty = expected?.expectedQty || 0
    let actualQty = actual?.totalQty || 0
    const lastPriceCents = expected?.lastPriceCents || 0

    // Normalize actual quantity to expected unit if they differ
    if (expectedUnit && actualUnit && expectedUnit !== actualUnit && actualQty > 0) {
      const converted = convertQuantity(actualQty, actualUnit, expectedUnit)
      if (converted !== null) {
        actualQty = converted
      }
      // If conversion not possible (e.g., volume vs weight without density), use as-is
    }

    const varianceQty = actualQty - expectedQty
    const costImpactCents = Math.round(varianceQty * lastPriceCents)

    totalExpectedCostCents += Math.round(expectedQty * lastPriceCents)
    totalActualCostCents += Math.round(actualQty * lastPriceCents)

    items.push({
      ingredientId,
      ingredientName,
      unit,
      expectedQty: Math.round(expectedQty * 100) / 100,
      actualQty: Math.round(actualQty * 100) / 100,
      varianceQty: Math.round(varianceQty * 100) / 100,
      costImpactCents,
    })
  }

  // Sort by absolute cost impact descending (biggest variances first)
  items.sort((a, b) => Math.abs(b.costImpactCents) - Math.abs(a.costImpactCents))

  return {
    eventId,
    items,
    totalExpectedCostCents,
    totalActualCostCents,
    totalVarianceCents: totalActualCostCents - totalExpectedCostCents,
  }
}

/**
 * Get monthly variance trend over the specified number of months.
 * Compares actual event deductions (inventory_transactions) to expected usage
 * (from event recipes) grouped by month.
 */
export async function getVarianceTrend(months: number = 6): Promise<VarianceTrendPoint[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Compute date range
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
  const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`

  // Fetch all event_deduction transactions in the range
  const { data: transactions, error: txError } = await db
    .from('inventory_transactions' as any)
    .select('event_id, ingredient_id, quantity, cost_cents, created_at')
    .eq('chef_id', user.tenantId!)
    .eq('type', 'event_deduction')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true })

  if (txError) throw new Error(`Failed to fetch variance trend data: ${txError.message}`)

  // Bucket actual costs by month
  const actualByMonth = new Map<string, number>()
  const eventIdsByMonth = new Map<string, Set<string>>()

  for (const tx of (transactions as any[]) || []) {
    const date = new Date(tx.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const currentCost = actualByMonth.get(key) || 0
    actualByMonth.set(key, currentCost + Math.abs(Number(tx.cost_cents) || 0))

    if (tx.event_id) {
      const eventsForMonth = eventIdsByMonth.get(key) || new Set()
      eventsForMonth.add(tx.event_id)
      eventIdsByMonth.set(key, eventsForMonth)
    }
  }

  // Fetch completed events in the range for expected cost calculation
  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, event_date')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'in_progress'])
    .gte('event_date', startDate)
    .order('event_date', { ascending: true })

  if (eventsError)
    throw new Error(`Failed to fetch events for variance trend: ${eventsError.message}`)

  // Compute expected costs per event, then bucket by month
  const expectedByMonth = new Map<string, number>()

  for (const event of (events as any[]) || []) {
    const eventDate = new Date(event.event_date)
    const key = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`

    const expectedMap = await getExpectedForEvent(db, user.tenantId!, event.id)
    let eventExpectedCost = 0
    for (const info of expectedMap.values()) {
      eventExpectedCost += Math.round(info.expectedQty * info.lastPriceCents)
    }

    const current = expectedByMonth.get(key) || 0
    expectedByMonth.set(key, current + eventExpectedCost)
  }

  // Build ordered trend points (fill gaps with zeros)
  const result: VarianceTrendPoint[] = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)

  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const expectedCostCents = expectedByMonth.get(key) || 0
    const actualCostCents = actualByMonth.get(key) || 0
    const varianceCents = actualCostCents - expectedCostCents
    const variancePct =
      expectedCostCents > 0 ? Math.round((varianceCents / expectedCostCents) * 10000) / 100 : 0

    result.push({
      month: key,
      expectedCostCents,
      actualCostCents,
      varianceCents,
      variancePct,
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return result
}

/**
 * Get per-ingredient monthly usage history from event deductions.
 * Returns array of { month, totalUsed, eventCount } for the specified months.
 */
export async function getIngredientVarianceHistory(
  ingredientId: string,
  months: number = 6
): Promise<Array<{ month: string; totalUsed: number; eventCount: number }>> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Compute date range
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)
  const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`

  // Fetch event_deduction transactions for this ingredient
  const { data: transactions, error } = await db
    .from('inventory_transactions' as any)
    .select('event_id, quantity, created_at')
    .eq('chef_id', user.tenantId!)
    .eq('ingredient_id', ingredientId)
    .eq('type', 'event_deduction')
    .gte('created_at', startDate)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch ingredient variance history: ${error.message}`)

  // Bucket by month
  const buckets = new Map<string, { totalUsed: number; eventIds: Set<string> }>()

  for (const tx of (transactions as any[]) || []) {
    const date = new Date(tx.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    const existing = buckets.get(key) || { totalUsed: 0, eventIds: new Set<string>() }
    existing.totalUsed += Math.abs(parseFloat(tx.quantity) || 0)
    if (tx.event_id) {
      existing.eventIds.add(tx.event_id)
    }
    buckets.set(key, existing)
  }

  // Build ordered result (fill gaps with zeros)
  const result: Array<{ month: string; totalUsed: number; eventCount: number }> = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)

  while (cursor <= now) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    const bucket = buckets.get(key)

    result.push({
      month: key,
      totalUsed: bucket ? Math.round(bucket.totalUsed * 100) / 100 : 0,
      eventCount: bucket ? bucket.eventIds.size : 0,
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return result
}
