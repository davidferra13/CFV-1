// Inventory Batch Server Actions
// Chef-only: Track ingredient batches, expiry alerts, FIFO consumption, waste-on-expiry

'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type ExpiryAlert = {
  batchId: string
  ingredientId: string | null
  ingredientName: string
  expiryDate: string
  remainingQty: number
  unit: string
  unitCostCents: number | null
  atRiskCostCents: number
  locationName: string | null
  urgency: 'expired' | 'critical' | 'warning' | 'ok'
}

export type IngredientBatch = {
  id: string
  ingredientName: string
  receivedDate: string
  expiryDate: string | null
  lotNumber: string | null
  initialQty: number
  remainingQty: number
  unit: string
  unitCostCents: number | null
  isDepleted: boolean
  isExpired: boolean
}

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Get expiry alerts for all active (non-depleted) batches within the given lookahead window.
 * Returns items sorted by urgency: expired first, then critical, then warning.
 */
export async function getExpiryAlerts(daysAhead: number = 7): Promise<ExpiryAlert[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Compute the cutoff date: now + daysAhead days
  const _c = new Date()
  const cutoff = new Date(_c.getFullYear(), _c.getMonth(), _c.getDate() + daysAhead)
  const cutoffIso = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  // Fetch active batches with an expiry date within the window
  const { data: batches, error } = await db
    .from('inventory_batches' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_depleted', false)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', cutoffIso)
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch expiry alerts: ${error.message}`)

  if (!batches || batches.length === 0) return []

  // Fetch storage locations for location names
  const locationIds = [
    ...new Set((batches as any[]).map((b: any) => b.storage_location_id).filter(Boolean)),
  ]
  let locationMap = new Map<string, string>()

  if (locationIds.length > 0) {
    const { data: locations } = await db
      .from('storage_locations' as any)
      .select('id, name')
      .in('id', locationIds)

    if (locations) {
      for (const loc of locations as any[]) {
        locationMap.set(loc.id, loc.name)
      }
    }
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  return (batches as any[]).map((batch: any) => {
    const expiryDate = new Date(batch.expiry_date)
    expiryDate.setHours(0, 0, 0, 0)
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    let urgency: ExpiryAlert['urgency']
    if (daysUntilExpiry <= 0) {
      urgency = 'expired'
    } else if (daysUntilExpiry <= 3) {
      urgency = 'critical'
    } else if (daysUntilExpiry <= 7) {
      urgency = 'warning'
    } else {
      urgency = 'ok'
    }

    const remainingQty = parseFloat(batch.remaining_qty) || 0
    const unitCostCents = batch.unit_cost_cents != null ? Number(batch.unit_cost_cents) : null
    const atRiskCostCents = unitCostCents != null ? Math.round(remainingQty * unitCostCents) : 0

    return {
      batchId: batch.id,
      ingredientId: batch.ingredient_id ?? null,
      ingredientName: batch.ingredient_name,
      expiryDate: batch.expiry_date,
      remainingQty,
      unit: batch.unit,
      unitCostCents,
      atRiskCostCents,
      locationName: batch.storage_location_id
        ? (locationMap.get(batch.storage_location_id) ?? null)
        : null,
      urgency,
    }
  })
}

/**
 * Consume a quantity from a batch (FIFO deduction).
 * If the remaining quantity hits 0, the batch is marked depleted.
 */
export async function consumeFromBatch(
  batchId: string,
  quantity: number
): Promise<{ remainingQty: number; isDepleted: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  if (quantity <= 0) throw new Error('Quantity must be positive')

  // Fetch the batch - verify ownership
  const { data: batch, error: fetchError } = await db
    .from('inventory_batches' as any)
    .select('id, remaining_qty, is_depleted')
    .eq('id', batchId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !batch) throw new Error('Batch not found or access denied')

  const currentQty = parseFloat((batch as any).remaining_qty) || 0

  if ((batch as any).is_depleted) {
    throw new Error('Batch is already depleted')
  }

  // Compute new remaining quantity, floor at 0
  const newRemainingQty = Math.max(0, currentQty - quantity)
  const isDepleted = newRemainingQty <= 0

  const { error: updateError } = await db
    .from('inventory_batches' as any)
    .update({
      remaining_qty: newRemainingQty,
      is_depleted: isDepleted,
    })
    .eq('id', batchId)
    .eq('chef_id', user.tenantId!)

  if (updateError) throw new Error(`Failed to consume from batch: ${updateError.message}`)

  revalidatePath('/inventory')

  return { remainingQty: newRemainingQty, isDepleted }
}

/**
 * Mark a batch as expired and log the remaining quantity as waste.
 * Creates a negative inventory_transaction (type: 'waste') for the remaining amount,
 * then sets remaining_qty = 0, is_expired = true, is_depleted = true.
 */
export async function markBatchExpired(batchId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch the batch - verify ownership
  const { data: batch, error: fetchError } = await db
    .from('inventory_batches' as any)
    .select('*')
    .eq('id', batchId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !batch) throw new Error('Batch not found or access denied')

  const batchData = batch as any
  const remainingQty = parseFloat(batchData.remaining_qty) || 0

  // Log the waste transaction if there's remaining quantity
  if (remainingQty > 0) {
    const unitCostCents = batchData.unit_cost_cents != null ? Number(batchData.unit_cost_cents) : 0
    const wasteCostCents = Math.round(remainingQty * unitCostCents)

    try {
      await db.from('inventory_transactions' as any).insert({
        chef_id: user.tenantId!,
        ingredient_id: batchData.ingredient_id ?? null,
        ingredient_name: batchData.ingredient_name,
        batch_id: batchId,
        type: 'waste',
        quantity: -remainingQty,
        unit: batchData.unit,
        cost_cents: wasteCostCents,
        notes: `Batch expired - ${remainingQty} ${batchData.unit} written off`,
      })
    } catch (err) {
      console.error('[non-blocking] Failed to log waste transaction for expired batch', err)
    }
  }

  // Mark batch as expired and depleted
  const { error: updateError } = await db
    .from('inventory_batches' as any)
    .update({
      is_expired: true,
      is_depleted: true,
      remaining_qty: 0,
    })
    .eq('id', batchId)
    .eq('chef_id', user.tenantId!)

  if (updateError) throw new Error(`Failed to mark batch expired: ${updateError.message}`)

  revalidatePath('/inventory')
}

/**
 * Get all active (non-depleted) batches for a specific ingredient, ordered by received_date ASC (FIFO).
 */
export async function getBatchesForIngredient(ingredientId: string): Promise<IngredientBatch[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('inventory_batches' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('ingredient_id', ingredientId)
    .eq('is_depleted', false)
    .order('received_date', { ascending: true })

  if (error) throw new Error(`Failed to fetch batches for ingredient: ${error.message}`)

  return ((data as any[]) || []).map((row: any) => ({
    id: row.id,
    ingredientName: row.ingredient_name,
    receivedDate: row.received_date,
    expiryDate: row.expiry_date ?? null,
    lotNumber: row.lot_number ?? null,
    initialQty: parseFloat(row.initial_qty) || 0,
    remainingQty: parseFloat(row.remaining_qty) || 0,
    unit: row.unit,
    unitCostCents: row.unit_cost_cents != null ? Number(row.unit_cost_cents) : null,
    isDepleted: row.is_depleted,
    isExpired: row.is_expired,
  }))
}
