// Meal Prep - Delivery Scheduling Server Actions
// Schedule deliveries with time windows, mark as delivered.
//
// NOTE: This feature requires database tables that do not yet exist:
//   - meal_prep_deliveries (delivery schedule and tracking)
// Functions return stub errors until migrations are applied.

'use server'

import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type DeliveryStatus = 'scheduled' | 'in_transit' | 'delivered' | 'cancelled' | 'missed'

export interface Delivery {
  id: string
  chefId: string
  clientId: string
  clientName: string
  deliveryDate: string
  windowStart: string | null // HH:MM
  windowEnd: string | null // HH:MM
  address: string | null
  status: DeliveryStatus
  notes: string | null
  deliveredAt: string | null
  createdAt: string
}

// ============================================
// STUB ERROR
// ============================================

const MIGRATION_ERROR = 'Feature requires database migration. Contact support.'

async function checkTableExists(db: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await db.from(tableName).select('id').limit(0)
    return !error || !error.message?.includes('does not exist')
  } catch {
    return false
  }
}

// ============================================
// ACTIONS
// ============================================

/**
 * Schedule a new delivery.
 */
export async function scheduleDelivery(input: {
  clientId: string
  clientName: string
  deliveryDate: string
  windowStart?: string | null
  windowEnd?: string | null
  address?: string | null
  notes?: string | null
}): Promise<Delivery | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_deliveries')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { data, error } = await (db as any)
    .from('meal_prep_deliveries')
    .insert({
      chef_id: user.tenantId!,
      client_id: input.clientId,
      client_name: input.clientName,
      delivery_date: input.deliveryDate,
      window_start: input.windowStart ?? null,
      window_end: input.windowEnd ?? null,
      address: input.address ?? null,
      status: 'scheduled',
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[scheduleDelivery] Error:', error)
    return { error: 'Failed to schedule delivery' }
  }

  revalidatePath('/meal-prep')
  return mapDelivery(data)
}

/**
 * Update a delivery (reschedule, change address, etc.)
 */
export async function updateDelivery(
  deliveryId: string,
  input: Partial<{
    deliveryDate: string
    windowStart: string | null
    windowEnd: string | null
    address: string | null
    notes: string | null
    status: DeliveryStatus
  }>
): Promise<Delivery | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_deliveries')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const updateData: Record<string, unknown> = {}
  if (input.deliveryDate !== undefined) updateData.delivery_date = input.deliveryDate
  if (input.windowStart !== undefined) updateData.window_start = input.windowStart
  if (input.windowEnd !== undefined) updateData.window_end = input.windowEnd
  if (input.address !== undefined) updateData.address = input.address
  if (input.notes !== undefined) updateData.notes = input.notes
  if (input.status !== undefined) updateData.status = input.status

  const { data, error } = await (db as any)
    .from('meal_prep_deliveries')
    .update(updateData)
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateDelivery] Error:', error)
    return { error: 'Failed to update delivery' }
  }

  revalidatePath('/meal-prep')
  return mapDelivery(data)
}

/**
 * Mark a delivery as delivered.
 */
export async function markDelivered(deliveryId: string): Promise<Delivery | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_deliveries')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { data, error } = await (db as any)
    .from('meal_prep_deliveries')
    .update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    })
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[markDelivered] Error:', error)
    return { error: 'Failed to mark delivery' }
  }

  revalidatePath('/meal-prep')
  return mapDelivery(data)
}

/**
 * Cancel a delivery.
 */
export async function cancelDelivery(
  deliveryId: string
): Promise<{ success: boolean } | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_deliveries')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { error } = await (db as any)
    .from('meal_prep_deliveries')
    .update({ status: 'cancelled' })
    .eq('id', deliveryId)
    .eq('chef_id', user.tenantId!)

  if (error) return { error: 'Failed to cancel delivery' }

  revalidatePath('/meal-prep')
  return { success: true }
}

/**
 * Get deliveries for a date range.
 */
export async function getDeliveries(
  startDate: string,
  endDate: string,
  statusFilter?: DeliveryStatus
): Promise<Delivery[] | { error: string }> {
  const user = await requirePro('meal-prep')
  const db: any = createServerClient()

  const tableExists = await checkTableExists(db, 'meal_prep_deliveries')
  if (!tableExists) return { error: MIGRATION_ERROR }

  let query = (db as any)
    .from('meal_prep_deliveries')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .gte('delivery_date', startDate)
    .lte('delivery_date', endDate)
    .order('delivery_date')

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query

  if (error) return { error: 'Failed to load deliveries' }

  return (data ?? []).map(mapDelivery)
}

/**
 * Get today's deliveries for the dashboard.
 */
export async function getTodaysDeliveries(): Promise<Delivery[] | { error: string }> {
  const _td = new Date()
  const today = `${_td.getFullYear()}-${String(_td.getMonth() + 1).padStart(2, '0')}-${String(_td.getDate()).padStart(2, '0')}`
  return getDeliveries(today, today)
}

// ============================================
// HELPERS
// ============================================

function mapDelivery(row: any): Delivery {
  return {
    id: row.id,
    chefId: row.chef_id,
    clientId: row.client_id,
    clientName: row.client_name ?? 'Unknown',
    deliveryDate: row.delivery_date,
    windowStart: row.window_start ?? null,
    windowEnd: row.window_end ?? null,
    address: row.address ?? null,
    status: row.status ?? 'scheduled',
    notes: row.notes ?? null,
    deliveredAt: row.delivered_at ?? null,
    createdAt: row.created_at,
  }
}
