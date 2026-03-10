// Stocktake Server Actions
// Physical inventory counting: start counts, record quantities, reconcile variances, adjust inventory

'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ───────────────────────────────────────────────────────

export type Stocktake = {
  id: string
  tenantId: string
  name: string
  stocktakeDate: string
  status: 'in_progress' | 'completed' | 'cancelled'
  startedAt: string
  completedAt: string | null
  countedBy: string | null
  notes: string | null
  totalItems: number
  varianceItems: number
  varianceValueCents: number
  createdAt: string
  updatedAt: string
}

export type StocktakeItem = {
  id: string
  tenantId: string
  stocktakeId: string
  ingredientName: string
  expectedQuantity: number
  countedQuantity: number | null
  unit: string
  variance: number | null
  variancePercent: number | null
  unitCostCents: number | null
  varianceValueCents: number | null
  varianceReason: string | null
  adjusted: boolean
  notes: string | null
}

export type StocktakeWithItems = Stocktake & {
  items: StocktakeItem[]
}

export type VarianceTrendPoint = {
  stocktakeId: string
  name: string
  date: string
  varianceValueCents: number
  varianceItems: number
  totalItems: number
}

export type TopVarianceItem = {
  ingredientName: string
  occurrences: number
  totalVarianceValueCents: number
  avgVariancePercent: number
}

// ── Helpers ─────────────────────────────────────────────────────

function mapStocktake(row: any): Stocktake {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    stocktakeDate: row.stocktake_date,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    countedBy: row.counted_by,
    notes: row.notes,
    totalItems: row.total_items ?? 0,
    varianceItems: row.variance_items ?? 0,
    varianceValueCents: row.variance_value_cents ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapStocktakeItem(row: any): StocktakeItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    stocktakeId: row.stocktake_id,
    ingredientName: row.ingredient_name,
    expectedQuantity: Number(row.expected_quantity),
    countedQuantity: row.counted_quantity != null ? Number(row.counted_quantity) : null,
    unit: row.unit,
    variance: row.variance != null ? Number(row.variance) : null,
    variancePercent: row.variance_percent != null ? Number(row.variance_percent) : null,
    unitCostCents: row.unit_cost_cents,
    varianceValueCents: row.variance_value_cents,
    varianceReason: row.variance_reason,
    adjusted: row.adjusted ?? false,
    notes: row.notes,
  }
}

// ── Actions ─────────────────────────────────────────────────────

/**
 * Start a new stocktake. Pulls all current inventory items as the expected quantities.
 */
export async function startStocktake(name: string, countedBy?: string): Promise<string> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Create the stocktake header
  const { data: stocktake, error: stErr } = await supabase
    .from('stocktakes')
    .insert({
      tenant_id: tenantId,
      name,
      stocktake_date: new Date().toISOString().split('T')[0],
      status: 'in_progress',
      counted_by: countedBy ?? null,
    })
    .select()
    .single()

  if (stErr) throw new Error(`Failed to create stocktake: ${stErr.message}`)

  // Pull current inventory items
  const { data: inventoryItems, error: invErr } = await supabase
    .from('inventory_counts')
    .select('ingredient_name, current_qty, unit')
    .eq('chef_id', tenantId)
    .order('ingredient_name', { ascending: true })

  if (invErr) throw new Error(`Failed to fetch inventory: ${invErr.message}`)

  const items = (inventoryItems || []) as any[]

  if (items.length > 0) {
    // Create stocktake line items with expected quantities
    const lineItems = items.map((item: any) => ({
      tenant_id: tenantId,
      stocktake_id: stocktake.id,
      ingredient_name: item.ingredient_name,
      expected_quantity: Number(item.current_qty),
      unit: item.unit,
    }))

    const { error: liErr } = await supabase.from('stocktake_items').insert(lineItems)

    if (liErr) throw new Error(`Failed to create stocktake items: ${liErr.message}`)

    // Update total_items
    await supabase.from('stocktakes').update({ total_items: items.length }).eq('id', stocktake.id)
  }

  revalidatePath('/inventory/stocktake')
  return stocktake.id
}

/**
 * Get the currently active (in_progress) stocktake, if any.
 */
export async function getActiveStocktake(): Promise<Stocktake | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('stocktakes')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active stocktake: ${error.message}`)
  if (!data) return null

  return mapStocktake(data)
}

/**
 * Get a full stocktake with all its items.
 */
export async function getStocktake(id: string): Promise<StocktakeWithItems> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: stocktake, error: stErr } = await supabase
    .from('stocktakes')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (stErr) throw new Error(`Failed to fetch stocktake: ${stErr.message}`)

  const { data: items, error: itErr } = await supabase
    .from('stocktake_items')
    .select('*')
    .eq('stocktake_id', id)
    .eq('tenant_id', user.tenantId!)
    .order('ingredient_name', { ascending: true })

  if (itErr) throw new Error(`Failed to fetch stocktake items: ${itErr.message}`)

  return {
    ...mapStocktake(stocktake),
    items: ((items || []) as any[]).map(mapStocktakeItem),
  }
}

/**
 * Record a single count for one stocktake item. Auto-computes variance.
 */
export async function updateCount(itemId: string, countedQuantity: number): Promise<StocktakeItem> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get the item to compute variance
  const { data: existing, error: getErr } = await supabase
    .from('stocktake_items')
    .select('*')
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (getErr) throw new Error(`Failed to fetch stocktake item: ${getErr.message}`)

  const expected = Number(existing.expected_quantity)
  const variance = countedQuantity - expected
  const variancePercent = expected !== 0 ? (variance / expected) * 100 : null
  const unitCostCents = existing.unit_cost_cents ?? 0
  const varianceValueCents = unitCostCents !== 0 ? Math.round(variance * unitCostCents) : null

  const { data: updated, error: upErr } = await supabase
    .from('stocktake_items')
    .update({
      counted_quantity: countedQuantity,
      variance,
      variance_percent: variancePercent,
      variance_value_cents: varianceValueCents,
    })
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (upErr) throw new Error(`Failed to update count: ${upErr.message}`)

  revalidatePath('/inventory/stocktake')
  return mapStocktakeItem(updated)
}

/**
 * Batch update multiple counts at once.
 */
export async function batchUpdateCounts(
  items: { id: string; countedQuantity: number }[]
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  for (const item of items) {
    // Get expected quantity for variance calc
    const { data: existing, error: getErr } = await supabase
      .from('stocktake_items')
      .select('expected_quantity, unit_cost_cents')
      .eq('id', item.id)
      .eq('tenant_id', tenantId)
      .single()

    if (getErr) continue // Skip items that can't be found

    const expected = Number(existing.expected_quantity)
    const variance = item.countedQuantity - expected
    const variancePercent = expected !== 0 ? (variance / expected) * 100 : null
    const unitCostCents = existing.unit_cost_cents ?? 0
    const varianceValueCents = unitCostCents !== 0 ? Math.round(variance * unitCostCents) : null

    await supabase
      .from('stocktake_items')
      .update({
        counted_quantity: item.countedQuantity,
        variance,
        variance_percent: variancePercent,
        variance_value_cents: varianceValueCents,
      })
      .eq('id', item.id)
      .eq('tenant_id', tenantId)
  }

  revalidatePath('/inventory/stocktake')
}

/**
 * Set the reason for a variance and optional notes.
 */
export async function setVarianceReason(
  itemId: string,
  reason: string,
  notes?: string
): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('stocktake_items')
    .update({
      variance_reason: reason,
      notes: notes ?? null,
    })
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to set variance reason: ${error.message}`)

  revalidatePath('/inventory/stocktake')
}

/**
 * Mark an item as "adjusted" (inventory will be updated to match the counted quantity).
 */
export async function toggleAdjusted(itemId: string, adjusted: boolean): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('stocktake_items')
    .update({ adjusted })
    .eq('id', itemId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to toggle adjustment: ${error.message}`)

  revalidatePath('/inventory/stocktake')
}

/**
 * Complete a stocktake. Calculates summary stats and marks as done.
 */
export async function completeStocktake(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch all items
  const { data: items, error: itErr } = await supabase
    .from('stocktake_items')
    .select('*')
    .eq('stocktake_id', id)
    .eq('tenant_id', tenantId)

  if (itErr) throw new Error(`Failed to fetch stocktake items: ${itErr.message}`)

  const allItems = (items || []) as any[]
  const totalItems = allItems.length
  const varianceItems = allItems.filter(
    (i: any) => i.counted_quantity != null && Number(i.variance) !== 0
  ).length
  const varianceValueCents = allItems.reduce(
    (sum: number, i: any) => sum + Math.abs(Number(i.variance_value_cents || 0)),
    0
  )

  const { error } = await supabase
    .from('stocktakes')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      total_items: totalItems,
      variance_items: varianceItems,
      variance_value_cents: varianceValueCents,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to complete stocktake: ${error.message}`)

  revalidatePath('/inventory/stocktake')
}

/**
 * Adjust system inventory to match counted quantities for items marked adjusted=true.
 */
export async function adjustInventory(stocktakeId: string): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Get items marked for adjustment
  const { data: items, error: itErr } = await supabase
    .from('stocktake_items')
    .select('*')
    .eq('stocktake_id', stocktakeId)
    .eq('tenant_id', tenantId)
    .eq('adjusted', true)

  if (itErr) throw new Error(`Failed to fetch adjustment items: ${itErr.message}`)

  const adjustItems = (items || []) as any[]
  let adjustedCount = 0

  for (const item of adjustItems) {
    if (item.counted_quantity == null) continue

    // Update inventory_counts to match the counted quantity
    const { error } = await supabase
      .from('inventory_counts')
      .update({
        current_qty: Number(item.counted_quantity),
        last_counted_at: new Date().toISOString(),
      })
      .eq('chef_id', tenantId)
      .eq('ingredient_name', item.ingredient_name)

    if (!error) adjustedCount++
  }

  revalidatePath('/inventory')
  revalidatePath('/inventory/stocktake')
  return adjustedCount
}

/**
 * Get stocktake history (completed stocktakes).
 */
export async function getStocktakeHistory(limit: number = 20): Promise<Stocktake[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('stocktakes')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['completed', 'cancelled'])
    .order('stocktake_date', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch stocktake history: ${error.message}`)

  return ((data || []) as any[]).map(mapStocktake)
}

/**
 * Variance trend over recent stocktakes. Are we getting better at inventory control?
 */
export async function getVarianceTrend(limit: number = 10): Promise<VarianceTrendPoint[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('stocktakes')
    .select('id, name, stocktake_date, variance_value_cents, variance_items, total_items')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .order('stocktake_date', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Failed to fetch variance trend: ${error.message}`)

  return ((data || []) as any[]).map((row: any) => ({
    stocktakeId: row.id,
    name: row.name,
    date: row.stocktake_date,
    varianceValueCents: row.variance_value_cents ?? 0,
    varianceItems: row.variance_items ?? 0,
    totalItems: row.total_items ?? 0,
  }))
}

/**
 * Find items with the most frequent or largest variances across recent stocktakes.
 * Indicates systematic issues (theft, spoilage patterns, recording errors).
 */
export async function getTopVarianceItems(days: number = 90): Promise<TopVarianceItem[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  // Get completed stocktakes in the date range
  const { data: stocktakes, error: stErr } = await supabase
    .from('stocktakes')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('stocktake_date', cutoffDate.toISOString().split('T')[0])

  if (stErr) throw new Error(`Failed to fetch stocktakes: ${stErr.message}`)

  const stocktakeIds = ((stocktakes || []) as any[]).map((s: any) => s.id)
  if (stocktakeIds.length === 0) return []

  // Get all items with variances from those stocktakes
  const { data: items, error: itErr } = await supabase
    .from('stocktake_items')
    .select('ingredient_name, variance, variance_percent, variance_value_cents')
    .eq('tenant_id', tenantId)
    .in('stocktake_id', stocktakeIds)
    .not('variance', 'eq', 0)
    .not('variance', 'is', null)

  if (itErr) throw new Error(`Failed to fetch variance items: ${itErr.message}`)

  // Aggregate by ingredient
  const agg = new Map<
    string,
    {
      occurrences: number
      totalVarianceValueCents: number
      totalVariancePercent: number
    }
  >()

  for (const item of (items || []) as any[]) {
    const name = item.ingredient_name
    const existing = agg.get(name) || {
      occurrences: 0,
      totalVarianceValueCents: 0,
      totalVariancePercent: 0,
    }
    existing.occurrences++
    existing.totalVarianceValueCents += Math.abs(Number(item.variance_value_cents || 0))
    existing.totalVariancePercent += Math.abs(Number(item.variance_percent || 0))
    agg.set(name, existing)
  }

  // Sort by total variance value (most costly first)
  const sorted = Array.from(agg.entries())
    .map(([ingredientName, stats]) => ({
      ingredientName,
      occurrences: stats.occurrences,
      totalVarianceValueCents: stats.totalVarianceValueCents,
      avgVariancePercent:
        stats.occurrences > 0
          ? Math.round((stats.totalVariancePercent / stats.occurrences) * 100) / 100
          : 0,
    }))
    .sort((a, b) => b.totalVarianceValueCents - a.totalVarianceValueCents)

  return sorted.slice(0, 20)
}

/**
 * Cancel an in-progress stocktake.
 */
export async function cancelStocktake(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('stocktakes')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'in_progress')

  if (error) throw new Error(`Failed to cancel stocktake: ${error.message}`)

  revalidatePath('/inventory/stocktake')
}
