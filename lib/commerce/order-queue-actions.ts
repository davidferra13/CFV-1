// Commerce Engine V1 — Order Queue Actions
// Manage order-ahead items through received → preparing → ready → picked_up.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { OrderQueueStatus } from './constants'

// ─── Allowed Transitions ─────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<OrderQueueStatus, OrderQueueStatus[]> = {
  received: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['picked_up'],
  picked_up: [],
  cancelled: [],
}

// ─── Create Order Queue Entry ────────────────────────────────────

export async function createOrderQueueEntry(input: {
  saleId: string
  customerName?: string
  estimatedReadyAt?: string
  assignedTo?: string
  notes?: string
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('order_queue')
    .insert({
      tenant_id: user.tenantId!,
      sale_id: input.saleId,
      status: 'received',
      customer_name: input.customerName ?? null,
      estimated_ready_at: input.estimatedReadyAt ?? null,
      assigned_to: input.assignedTo ?? null,
      notes: input.notes ?? null,
    } as any)
    .select('id, order_number, status')
    .single()

  if (error) throw new Error(`Failed to create order queue entry: ${error.message}`)

  revalidatePath('/commerce/orders')
  return data
}

// ─── Update Order Status ─────────────────────────────────────────

export async function updateOrderStatus(orderId: string, newStatus: OrderQueueStatus) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch current status
  const { data: order, error: fetchErr } = await supabase
    .from('order_queue')
    .select('status, received_at')
    .eq('id', orderId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !order) throw new Error('Order not found')

  const currentStatus = (order as any).status as OrderQueueStatus
  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`)
  }

  const now = new Date().toISOString()
  const updates: Record<string, any> = { status: newStatus }

  // Set timestamp for the new status
  switch (newStatus) {
    case 'preparing':
      updates.preparing_at = now
      break
    case 'ready':
      updates.ready_at = now
      break
    case 'picked_up': {
      updates.picked_up_at = now
      // Compute actual wait time
      const receivedAt = new Date((order as any).received_at)
      updates.actual_wait_minutes = Math.round((Date.now() - receivedAt.getTime()) / 60000)
      break
    }
    case 'cancelled':
      updates.cancelled_at = now
      break
  }

  const { error } = await supabase
    .from('order_queue')
    .update(updates as any)
    .eq('id', orderId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update order status: ${error.message}`)

  revalidatePath('/commerce/orders')
}

// ─── Cancel Order ────────────────────────────────────────────────

export async function cancelOrder(orderId: string, reason: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: order, error: fetchErr } = await supabase
    .from('order_queue')
    .select('status')
    .eq('id', orderId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (fetchErr || !order) throw new Error('Order not found')

  const currentStatus = (order as any).status as OrderQueueStatus
  if (!ALLOWED_TRANSITIONS[currentStatus]?.includes('cancelled')) {
    throw new Error(`Cannot cancel an order in ${currentStatus} status`)
  }

  const { error } = await supabase
    .from('order_queue')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: reason,
    } as any)
    .eq('id', orderId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to cancel order: ${error.message}`)

  revalidatePath('/commerce/orders')
}

// ─── Get Active Orders ───────────────────────────────────────────

export async function getActiveOrders() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('order_queue')
    .select('*, sales!inner(sale_number, total_cents, client_id)')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['received', 'preparing', 'ready'])
    .order('received_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch active orders: ${error.message}`)
  return data ?? []
}

// ─── Get Order Queue History ─────────────────────────────────────

export async function getOrderQueueHistory(filters?: {
  status?: OrderQueueStatus
  from?: string
  to?: string
  limit?: number
  offset?: number
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  let query = supabase
    .from('order_queue')
    .select('*, sales!inner(sale_number, total_cents)', { count: 'exact' })
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (filters?.status) query = query.eq('status', filters.status)
  if (filters?.from) query = query.gte('created_at', filters.from)
  if (filters?.to) query = query.lte('created_at', filters.to)

  if (filters?.limit) {
    const from = filters.offset ?? 0
    query = query.range(from, from + filters.limit - 1)
  }

  const { data, error, count } = await query
  if (error) throw new Error(`Failed to fetch order history: ${error.message}`)

  return { orders: data ?? [], total: count ?? 0 }
}

// ─── Get Order By ID ─────────────────────────────────────────────

export async function getOrder(orderId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('order_queue')
    .select('*, sales!inner(*, sale_items(*))')
    .eq('id', orderId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) throw new Error(`Order not found: ${error.message}`)
  return data
}
