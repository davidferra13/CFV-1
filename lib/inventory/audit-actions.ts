// Inventory Audit Server Actions
// Chef-only: Physical count workflow — create audit, count items, finalize with variance adjustments.
// Finalizing posts audit_adjustment transactions to the inventory ledger for each variance.

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type InventoryAuditType = 'full' | 'cycle' | 'spot' | 'pre_event' | 'post_event'
export type InventoryAuditStatus = 'draft' | 'in_progress' | 'pending_review' | 'finalized'

export type InventoryAudit = {
  id: string
  chefId: string
  auditType: InventoryAuditType
  status: InventoryAuditStatus
  eventId: string | null
  locationId: string | null
  auditDate: string
  totalItemsCounted: number | null
  itemsWithVariance: number | null
  totalVarianceCents: number | null
  photoUrl: string | null
  notes: string | null
  startedAt: string | null
  finalizedAt: string | null
  createdAt: string
}

export type AuditItem = {
  id: string
  auditId: string
  ingredientId: string | null
  ingredientName: string
  unit: string
  expectedQty: number | null
  actualQty: number | null
  varianceQty: number | null
  unitCostCents: number | null
  varianceCostCents: number | null
  locationId: string | null
  photoUrl: string | null
  notes: string | null
  countedAt: string | null
}

// ─── Schemas ─────────────────────────────────────────────────────

const AuditTypeEnum = z.enum(['full', 'cycle', 'spot', 'pre_event', 'post_event'])

const CreateAuditSchema = z.object({
  auditType: AuditTypeEnum,
  eventId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  notes: z.string().optional(),
})

const UpdateAuditItemSchema = z.object({
  actualQty: z.number().min(0, 'Actual quantity cannot be negative'),
  notes: z.string().optional(),
  photoUrl: z.string().url().optional(),
})

export type CreateAuditInput = z.infer<typeof CreateAuditSchema>
export type UpdateAuditItemInput = z.infer<typeof UpdateAuditItemSchema>

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Create a new inventory audit.
 * Queries current stock from the inventory ledger and pre-fills audit items
 * with expected quantities. Sets status to 'in_progress'.
 */
export async function createAudit(
  input: CreateAuditInput
): Promise<{ audit: InventoryAudit; items: AuditItem[] }> {
  const user = await requireChef()
  const parsed = CreateAuditSchema.parse(input)
  const supabase = createServerClient()

  // Create the audit record
  const { data: audit, error: auditError } = await supabase
    .from('inventory_audits' as any)
    .insert({
      chef_id: user.tenantId!,
      audit_type: parsed.auditType,
      status: 'in_progress',
      event_id: parsed.eventId ?? null,
      location_id: parsed.locationId ?? null,
      audit_date: new Date().toISOString().split('T')[0],
      notes: parsed.notes ?? null,
      started_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select()
    .single()

  if (auditError) throw new Error(`Failed to create audit: ${auditError.message}`)

  // Get current stock from the inventory ledger
  // SUM(quantity) grouped by ingredient, filtered by location if specified
  let stockQuery = supabase
    .from('inventory_transactions' as any)
    .select('ingredient_id, ingredient_name, unit, quantity, cost_cents')
    .eq('chef_id', user.tenantId!)

  if (parsed.locationId) {
    stockQuery = stockQuery.eq('location_id', parsed.locationId)
  }

  const { data: transactions, error: txError } = await stockQuery

  if (txError) throw new Error(`Failed to fetch stock for audit: ${txError.message}`)

  // Aggregate by ingredient_id + unit
  const stockMap = new Map<
    string,
    {
      ingredientId: string | null
      ingredientName: string
      unit: string
      totalQty: number
      latestCostCents: number | null
    }
  >()

  for (const tx of transactions || []) {
    const key = `${tx.ingredient_id || 'null'}:${tx.unit}`
    const existing = stockMap.get(key)
    if (existing) {
      existing.totalQty += parseFloat(tx.quantity)
      // Keep the most recent cost
      if (tx.cost_cents != null) {
        existing.latestCostCents = tx.cost_cents
      }
    } else {
      stockMap.set(key, {
        ingredientId: tx.ingredient_id,
        ingredientName: tx.ingredient_name,
        unit: tx.unit,
        totalQty: parseFloat(tx.quantity),
        latestCostCents: tx.cost_cents,
      })
    }
  }

  // Create audit items for each ingredient with stock
  const auditItems: Array<Record<string, any>> = []
  for (const stock of stockMap.values()) {
    // Only include items with non-zero stock (or any stock for full audits)
    if (parsed.auditType === 'full' || stock.totalQty > 0) {
      // Compute unit cost from latest transaction with cost_cents
      let unitCostCents: number | null = null
      if (stock.latestCostCents != null) {
        unitCostCents = stock.latestCostCents
      }

      auditItems.push({
        audit_id: audit.id,
        ingredient_id: stock.ingredientId,
        ingredient_name: stock.ingredientName,
        unit: stock.unit,
        expected_qty: Math.round(stock.totalQty * 1000) / 1000,
        unit_cost_cents: unitCostCents,
        location_id: parsed.locationId ?? null,
      })
    }
  }

  let createdItems: AuditItem[] = []
  if (auditItems.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('inventory_audit_items' as any)
      .insert(auditItems)
      .select()

    if (itemsError) throw new Error(`Failed to create audit items: ${itemsError.message}`)
    createdItems = (items || []).map(mapAuditItem)
  }

  revalidatePath('/inventory')
  revalidatePath('/inventory/audits')

  return {
    audit: mapAudit(audit),
    items: createdItems,
  }
}

/**
 * Update an audit item with the actual counted quantity.
 * Automatically computes variance_qty and variance_cost_cents.
 */
export async function updateAuditItem(
  itemId: string,
  input: UpdateAuditItemInput
): Promise<AuditItem> {
  const user = await requireChef()
  const parsed = UpdateAuditItemSchema.parse(input)
  const supabase = createServerClient()

  // Get the item and verify ownership via the parent audit
  const { data: item, error: fetchError } = await supabase
    .from('inventory_audit_items' as any)
    .select('*, inventory_audits!inner(chef_id, status)')
    .eq('id', itemId)
    .single()

  if (fetchError || !item) throw new Error('Audit item not found')

  const auditData = (item as any).inventory_audits
  if (auditData.chef_id !== user.tenantId!) {
    throw new Error('Audit item not found')
  }
  if (auditData.status === 'finalized') {
    throw new Error('Cannot update items on a finalized audit')
  }

  // Compute variance
  const expectedQty = item.expected_qty != null ? parseFloat(item.expected_qty) : 0
  const varianceQty = parsed.actualQty - expectedQty
  const unitCostCents = item.unit_cost_cents ?? 0
  const varianceCostCents = Math.round(varianceQty * unitCostCents)

  const { data, error } = await supabase
    .from('inventory_audit_items' as any)
    .update({
      actual_qty: parsed.actualQty,
      variance_qty: Math.round(varianceQty * 1000) / 1000,
      variance_cost_cents: varianceCostCents,
      photo_url: parsed.photoUrl ?? item.photo_url,
      notes: parsed.notes ?? item.notes,
      counted_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update audit item: ${error.message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/audits')

  return mapAuditItem(data)
}

/**
 * Finalize an audit.
 * For each item where variance_qty != 0, creates an inventory_transaction
 * (type: audit_adjustment) to reconcile the ledger with reality.
 * Updates the audit summary and sets status to 'finalized'.
 */
export async function finalizeAudit(auditId: string): Promise<InventoryAudit> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify ownership and status
  const { data: audit, error: auditError } = await supabase
    .from('inventory_audits' as any)
    .select('*')
    .eq('id', auditId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (auditError || !audit) throw new Error('Audit not found')
  if (audit.status === 'finalized') throw new Error('Audit is already finalized')

  // Get all audit items
  const { data: items, error: itemsError } = await supabase
    .from('inventory_audit_items' as any)
    .select('*')
    .eq('audit_id', auditId)

  if (itemsError) throw new Error(`Failed to fetch audit items: ${itemsError.message}`)

  const allItems = items || []

  // Count items that have been counted (actual_qty is not null)
  const countedItems = allItems.filter((i: any) => i.actual_qty != null)
  const itemsWithVariance = countedItems.filter(
    (i: any) => i.variance_qty != null && parseFloat(i.variance_qty) !== 0
  )

  // Create adjustment transactions for each variance
  const adjustmentRows: Array<Record<string, any>> = []
  let totalVarianceCents = 0

  for (const item of itemsWithVariance) {
    const varianceQty = parseFloat(item.variance_qty)
    const varianceCost = item.variance_cost_cents ?? 0
    totalVarianceCents += varianceCost

    adjustmentRows.push({
      chef_id: user.tenantId!,
      ingredient_id: item.ingredient_id ?? null,
      ingredient_name: item.ingredient_name,
      transaction_type: 'audit_adjustment',
      quantity: varianceQty, // Positive if we found MORE than expected, negative if LESS
      unit: item.unit,
      cost_cents: varianceCost !== 0 ? Math.abs(varianceCost) : null,
      location_id: item.location_id ?? audit.location_id ?? null,
      audit_id: auditId,
      notes: `Audit adjustment: expected ${item.expected_qty}, counted ${item.actual_qty}`,
      created_by: user.id,
    })
  }

  // Insert all adjustment transactions
  if (adjustmentRows.length > 0) {
    const { error: txError } = await supabase
      .from('inventory_transactions' as any)
      .insert(adjustmentRows)

    if (txError) throw new Error(`Failed to create audit adjustments: ${txError.message}`)
  }

  // Update audit summary and finalize
  const { data: finalized, error: finalizeError } = await supabase
    .from('inventory_audits' as any)
    .update({
      status: 'finalized',
      total_items_counted: countedItems.length,
      items_with_variance: itemsWithVariance.length,
      total_variance_cents: totalVarianceCents,
      finalized_at: new Date().toISOString(),
      finalized_by: user.id,
    })
    .eq('id', auditId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (finalizeError) throw new Error(`Failed to finalize audit: ${finalizeError.message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/audits')

  return mapAudit(finalized)
}

/**
 * Get audits with optional status/type filter.
 */
export async function getAudits(filters?: {
  status?: InventoryAuditStatus
  auditType?: InventoryAuditType
}): Promise<InventoryAudit[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('inventory_audits' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.auditType) {
    query = query.eq('audit_type', filters.auditType)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch audits: ${error.message}`)

  return (data || []).map(mapAudit)
}

/**
 * Get a single audit with all its items.
 */
export async function getAuditDetail(
  auditId: string
): Promise<{ audit: InventoryAudit; items: AuditItem[] }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: audit, error: auditError } = await supabase
    .from('inventory_audits' as any)
    .select('*')
    .eq('id', auditId)
    .eq('chef_id', user.tenantId!)
    .single()

  if (auditError || !audit) throw new Error('Audit not found')

  const { data: items, error: itemsError } = await supabase
    .from('inventory_audit_items' as any)
    .select('*')
    .eq('audit_id', auditId)
    .order('ingredient_name', { ascending: true })

  if (itemsError) throw new Error(`Failed to fetch audit items: ${itemsError.message}`)

  return {
    audit: mapAudit(audit),
    items: (items || []).map(mapAuditItem),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapAudit(row: any): InventoryAudit {
  return {
    id: row.id,
    chefId: row.chef_id,
    auditType: row.audit_type,
    status: row.status,
    eventId: row.event_id,
    locationId: row.location_id,
    auditDate: row.audit_date,
    totalItemsCounted: row.total_items_counted,
    itemsWithVariance: row.items_with_variance,
    totalVarianceCents: row.total_variance_cents,
    photoUrl: row.photo_url,
    notes: row.notes,
    startedAt: row.started_at,
    finalizedAt: row.finalized_at,
    createdAt: row.created_at,
  }
}

function mapAuditItem(row: any): AuditItem {
  return {
    id: row.id,
    auditId: row.audit_id,
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    unit: row.unit,
    expectedQty: row.expected_qty != null ? parseFloat(row.expected_qty) : null,
    actualQty: row.actual_qty != null ? parseFloat(row.actual_qty) : null,
    varianceQty: row.variance_qty != null ? parseFloat(row.variance_qty) : null,
    unitCostCents: row.unit_cost_cents,
    varianceCostCents: row.variance_cost_cents,
    locationId: row.location_id,
    photoUrl: row.photo_url,
    notes: row.notes,
    countedAt: row.counted_at,
  }
}
