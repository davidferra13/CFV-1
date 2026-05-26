'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath, revalidateTag } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type ReconciliationStatus = 'unreconciled' | 'partial' | 'reconciled'

export type LinkedReceipt = {
  id: string
  storeName: string
  receiptDate: string
  totalCents: number
  itemCount: number
}

export type ReconciliationResult = {
  eventId: string
  actualCostCents: number | null
  receiptCount: number
  estimatedCostCents: number | null
  varianceCents: number | null
  variancePct: number | null
  reconciledAt: string
}

export type EventCostReconciliation = {
  eventId: string
  actualCostCents: number | null
  estimatedCostCents: number | null
  receiptCount: number
  reconciledAt: string | null
  status: ReconciliationStatus
  receipts: LinkedReceipt[]
  varianceCents: number | null
  variancePct: number | null
}

export type EventReconciliationSummary = {
  eventId: string
  actualCostCents: number | null
  estimatedCostCents: number | null
  receiptCount: number
  status: ReconciliationStatus
}

// ============================================
// HELPERS
// ============================================

function deriveStatus(
  receiptCount: number,
  actualCostCents: number | null,
  estimatedCostCents: number | null
): ReconciliationStatus {
  if (receiptCount === 0 || actualCostCents == null) return 'unreconciled'
  // If there's an estimate and receipts cover less than 80% of it, partial
  if (estimatedCostCents != null && estimatedCostCents > 0) {
    const ratio = actualCostCents / estimatedCostCents
    if (ratio < 0.8) return 'partial'
  }
  return 'reconciled'
}

function computeVariance(
  actualCents: number | null,
  estimatedCents: number | null
): { varianceCents: number | null; variancePct: number | null } {
  if (actualCents == null || estimatedCents == null || estimatedCents === 0) {
    return { varianceCents: null, variancePct: null }
  }
  const varianceCents = actualCents - estimatedCents
  const variancePct = Math.round((varianceCents / estimatedCents) * 10000) / 100
  return { varianceCents, variancePct }
}

// ============================================
// 1. RECONCILE EVENT FOOD COST
// ============================================

/**
 * Sum all linked shopping receipts for an event and write the actual food cost.
 * Non-destructive: only updates cost columns, never deletes data.
 * If no receipts are linked, sets actual_food_cost_cents to NULL (not 0).
 */
export async function reconcileEventFoodCost(eventId: string): Promise<ReconciliationResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  if (!eventId) {
    throw new Error('Event ID is required')
  }

  // Verify event exists and belongs to tenant
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, tenant_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    console.error('[reconcileEventFoodCost] Event not found:', eventErr)
    throw new Error('Event not found or access denied')
  }

  // Get all receipts linked to this event
  const { data: receipts, error: receiptErr } = await db
    .from('shopping_receipts')
    .select('id, total_cents')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)

  if (receiptErr) {
    console.error('[reconcileEventFoodCost] Receipt query failed:', receiptErr)
    throw new Error('Failed to query receipts')
  }

  const rows: { id: string; total_cents: number }[] = receipts ?? []
  const receiptCount = rows.length
  // No receipts = NULL cost (not 0, per zero-hallucination rule)
  const actualCostCents =
    receiptCount > 0 ? rows.reduce((sum, r) => sum + (r.total_cents ?? 0), 0) : null

  const reconciledAt = new Date().toISOString()

  // Update the event with reconciled cost
  const { error: updateErr } = await db
    .from('events')
    .update({
      actual_food_cost_cents: actualCostCents,
      food_cost_reconciled_at: reconciledAt,
      food_cost_receipt_count: receiptCount,
      cost_needs_refresh: false,
    })
    .eq('id', eventId)
    .eq('tenant_id', tenantId)

  if (updateErr) {
    console.error('[reconcileEventFoodCost] Event update failed:', updateErr)
    throw new Error('Failed to update event food cost')
  }

  // Update matching shopping lists with actual total
  if (actualCostCents != null) {
    const { error: listErr } = await db
      .from('shopping_lists')
      .update({ total_actual_cents: actualCostCents })
      .eq('event_id', eventId)
      .eq('chef_id', tenantId)

    if (listErr) {
      // Non-fatal: log but don't fail the reconciliation
      console.error('[reconcileEventFoodCost] Shopping list update failed:', listErr)
    }
  }

  // Fetch estimated cost from shopping lists for variance calc
  const { data: lists } = await db
    .from('shopping_lists')
    .select('total_estimated_cents')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)

  const estimatedCostCents: number | null = lists?.length
    ? lists.reduce((sum: number, l: any) => sum + (l.total_estimated_cents ?? 0), 0) || null
    : null

  const { varianceCents, variancePct } = computeVariance(actualCostCents, estimatedCostCents)

  // Revalidate affected paths and tags
  revalidatePath(`/events/${eventId}`)
  revalidatePath('/dashboard')
  revalidatePath('/culinary/cost-dashboard')
  revalidateTag('event-costs')
  revalidateTag('recipe-costs')

  return {
    eventId,
    actualCostCents,
    receiptCount,
    estimatedCostCents,
    varianceCents,
    variancePct,
    reconciledAt,
  }
}

// ============================================
// 2. GET EVENT COST RECONCILIATION
// ============================================

/**
 * Read-only query: returns the current reconciliation state for an event,
 * including linked receipts and variance analysis.
 */
export async function getEventCostReconciliation(
  eventId: string
): Promise<EventCostReconciliation> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  if (!eventId) {
    throw new Error('Event ID is required')
  }

  // Get event reconciliation columns
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, actual_food_cost_cents, food_cost_reconciled_at, food_cost_receipt_count')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    console.error('[getEventCostReconciliation] Event not found:', eventErr)
    throw new Error('Event not found or access denied')
  }

  // Get linked receipts with detail
  const { data: receipts, error: receiptErr } = await db
    .from('shopping_receipts')
    .select('id, store_name, receipt_date, total_cents, items')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('receipt_date', { ascending: false })

  if (receiptErr) {
    console.error('[getEventCostReconciliation] Receipt query failed:', receiptErr)
    throw new Error('Failed to query receipts')
  }

  const receiptRows = receipts ?? []
  const linkedReceipts: LinkedReceipt[] = receiptRows.map((r: any) => {
    const items = typeof r.items === 'string' ? JSON.parse(r.items) : (r.items ?? [])
    return {
      id: r.id,
      storeName: r.store_name,
      receiptDate: r.receipt_date,
      totalCents: r.total_cents,
      itemCount: Array.isArray(items) ? items.length : 0,
    }
  })

  // Get estimated cost from shopping lists
  const { data: lists } = await db
    .from('shopping_lists')
    .select('total_estimated_cents')
    .eq('event_id', eventId)
    .eq('chef_id', tenantId)

  const estimatedCostCents: number | null = lists?.length
    ? lists.reduce((sum: number, l: any) => sum + (l.total_estimated_cents ?? 0), 0) || null
    : null

  const actualCostCents: number | null = event.actual_food_cost_cents ?? null
  const receiptCount: number = event.food_cost_receipt_count ?? linkedReceipts.length

  const { varianceCents, variancePct } = computeVariance(actualCostCents, estimatedCostCents)

  return {
    eventId,
    actualCostCents,
    estimatedCostCents,
    receiptCount,
    reconciledAt: event.food_cost_reconciled_at ?? null,
    status: deriveStatus(receiptCount, actualCostCents, estimatedCostCents),
    receipts: linkedReceipts,
    varianceCents,
    variancePct,
  }
}

// ============================================
// 3. GET EVENT RECONCILIATION SUMMARY (BATCH)
// ============================================

/**
 * Batch query for dashboard: returns reconciliation summary for multiple events.
 * Efficient single-query approach instead of N+1.
 */
export async function getEventReconciliationSummary(
  eventIds: string[]
): Promise<EventReconciliationSummary[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  if (!eventIds || eventIds.length === 0) {
    return []
  }

  // Get event cost columns in batch
  const { data: events, error: eventErr } = await db
    .from('events')
    .select('id, actual_food_cost_cents, food_cost_receipt_count')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  if (eventErr) {
    console.error('[getEventReconciliationSummary] Event query failed:', eventErr)
    throw new Error('Failed to query events')
  }

  const eventRows: any[] = events ?? []

  // Get estimated costs from shopping lists in batch
  const { data: lists, error: listErr } = await db
    .from('shopping_lists')
    .select('event_id, total_estimated_cents')
    .in('event_id', eventIds)
    .eq('chef_id', tenantId)

  if (listErr) {
    // Non-fatal: proceed without estimated costs
    console.error('[getEventReconciliationSummary] Shopping list query failed:', listErr)
  }

  // Build estimated cost map: event_id -> sum of estimates
  const estimateMap = new Map<string, number>()
  if (lists) {
    for (const list of lists) {
      if (list.event_id && list.total_estimated_cents != null) {
        const current = estimateMap.get(list.event_id) ?? 0
        estimateMap.set(list.event_id, current + list.total_estimated_cents)
      }
    }
  }

  return eventRows.map((ev: any) => {
    const actualCostCents: number | null = ev.actual_food_cost_cents ?? null
    const receiptCount: number = ev.food_cost_receipt_count ?? 0
    const estimatedCostCents: number | null = estimateMap.get(ev.id) ?? null

    return {
      eventId: ev.id,
      actualCostCents,
      estimatedCostCents,
      receiptCount,
      status: deriveStatus(receiptCount, actualCostCents, estimatedCostCents),
    }
  })
}
