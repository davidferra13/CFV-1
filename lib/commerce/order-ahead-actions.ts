// Commerce Engine - Order-Ahead Server Actions
// Enables chefs to offer pre-order items (meal kits, prepared meals, baked goods, etc.)
// Requires the 'commerce' Pro module.
//
// NOTE: This feature requires database tables that do not yet exist:
//   - order_ahead_items (menu of available items)
//   - order_ahead_orders (placed orders)
//   - order_ahead_order_items (line items per order)
// Functions return stub errors until migrations are applied.

'use server'

import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export type OrderAheadItemStatus = 'active' | 'paused' | 'archived'
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled'

export interface OrderAheadItem {
  id: string
  chefId: string
  name: string
  description: string | null
  priceCents: number
  category: string | null
  imageUrl: string | null
  maxQuantityPerOrder: number | null
  availableFrom: string | null // ISO date
  availableUntil: string | null // ISO date
  leadTimeDays: number // minimum days notice
  status: OrderAheadItemStatus
  createdAt: string
}

export interface OrderAheadOrder {
  id: string
  chefId: string
  clientId: string | null
  clientName: string
  clientEmail: string
  clientPhone: string | null
  requestedDate: string
  totalCents: number
  status: OrderStatus
  notes: string | null
  items: OrderLineItem[]
  createdAt: string
}

export interface OrderLineItem {
  itemId: string
  itemName: string
  quantity: number
  unitPriceCents: number
  totalCents: number
}

// ============================================
// STUB ERROR
// ============================================

const MIGRATION_ERROR = 'Feature requires database migration. Contact support.'

async function checkTableExists(supabase: any, tableName: string): Promise<boolean> {
  try {
    const { error } = await supabase.from(tableName).select('id').limit(0)
    // If the table doesn't exist, Supabase returns a specific error
    return !error || !error.message?.includes('does not exist')
  } catch {
    return false
  }
}

// ============================================
// ITEM MANAGEMENT
// ============================================

/**
 * Create an order-ahead menu item.
 */
export async function createOrderAheadItem(input: {
  name: string
  description?: string | null
  priceCents: number
  category?: string | null
  maxQuantityPerOrder?: number | null
  availableFrom?: string | null
  availableUntil?: string | null
  leadTimeDays?: number
}): Promise<OrderAheadItem | { error: string }> {
  const user = await requirePro('commerce')
  const supabase: any = createServerClient()

  const tableExists = await checkTableExists(supabase, 'order_ahead_items')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { data, error } = await (supabase as any)
    .from('order_ahead_items')
    .insert({
      chef_id: user.tenantId!,
      name: input.name,
      description: input.description ?? null,
      price_cents: input.priceCents,
      category: input.category ?? null,
      max_quantity_per_order: input.maxQuantityPerOrder ?? null,
      available_from: input.availableFrom ?? null,
      available_until: input.availableUntil ?? null,
      lead_time_days: input.leadTimeDays ?? 1,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('[createOrderAheadItem] Error:', error)
    return { error: 'Failed to create order-ahead item' }
  }

  revalidatePath('/commerce')
  return mapItem(data)
}

/**
 * Get all order-ahead items for the current chef.
 */
export async function getOrderAheadMenu(
  statusFilter?: OrderAheadItemStatus
): Promise<OrderAheadItem[] | { error: string }> {
  const user = await requirePro('commerce')
  const supabase: any = createServerClient()

  const tableExists = await checkTableExists(supabase, 'order_ahead_items')
  if (!tableExists) return { error: MIGRATION_ERROR }

  let query = (supabase as any)
    .from('order_ahead_items')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('name')

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query

  if (error) {
    console.error('[getOrderAheadMenu] Error:', error)
    return { error: 'Failed to load order-ahead menu' }
  }

  return (data ?? []).map(mapItem)
}

/**
 * Update an order-ahead item (price, status, etc.)
 */
export async function updateOrderAheadItem(
  itemId: string,
  input: Partial<{
    name: string
    description: string | null
    priceCents: number
    category: string | null
    maxQuantityPerOrder: number | null
    availableFrom: string | null
    availableUntil: string | null
    leadTimeDays: number
    status: OrderAheadItemStatus
  }>
): Promise<OrderAheadItem | { error: string }> {
  const user = await requirePro('commerce')
  const supabase: any = createServerClient()

  const tableExists = await checkTableExists(supabase, 'order_ahead_items')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const updateData: Record<string, unknown> = {}
  if (input.name !== undefined) updateData.name = input.name
  if (input.description !== undefined) updateData.description = input.description
  if (input.priceCents !== undefined) updateData.price_cents = input.priceCents
  if (input.category !== undefined) updateData.category = input.category
  if (input.maxQuantityPerOrder !== undefined)
    updateData.max_quantity_per_order = input.maxQuantityPerOrder
  if (input.availableFrom !== undefined) updateData.available_from = input.availableFrom
  if (input.availableUntil !== undefined) updateData.available_until = input.availableUntil
  if (input.leadTimeDays !== undefined) updateData.lead_time_days = input.leadTimeDays
  if (input.status !== undefined) updateData.status = input.status

  const { data, error } = await (supabase as any)
    .from('order_ahead_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateOrderAheadItem] Error:', error)
    return { error: 'Failed to update order-ahead item' }
  }

  revalidatePath('/commerce')
  return mapItem(data)
}

// ============================================
// ORDER MANAGEMENT
// ============================================

/**
 * Place a new order-ahead order.
 */
export async function placeOrder(input: {
  clientName: string
  clientEmail: string
  clientPhone?: string | null
  clientId?: string | null
  requestedDate: string
  notes?: string | null
  items: { itemId: string; quantity: number }[]
}): Promise<OrderAheadOrder | { error: string }> {
  const user = await requirePro('commerce')
  const supabase: any = createServerClient()

  const tableExists = await checkTableExists(supabase, 'order_ahead_orders')
  if (!tableExists) return { error: MIGRATION_ERROR }

  if (!input.items.length) return { error: 'Order must have at least one item' }

  // Look up item prices
  const itemIds = input.items.map((i) => i.itemId)
  const { data: itemRows } = await (supabase as any)
    .from('order_ahead_items')
    .select('id, name, price_cents')
    .eq('chef_id', user.tenantId!)
    .in('id', itemIds)

  if (!itemRows?.length) return { error: 'No valid items found' }

  const priceMap = new Map<string, { name: string; priceCents: number }>()
  for (const row of itemRows) {
    priceMap.set(row.id, { name: row.name, priceCents: row.price_cents })
  }

  // Calculate total and build line items
  const lineItems: OrderLineItem[] = []
  let totalCents = 0
  for (const item of input.items) {
    const info = priceMap.get(item.itemId)
    if (!info) continue
    const lineTotalCents = info.priceCents * item.quantity
    totalCents += lineTotalCents
    lineItems.push({
      itemId: item.itemId,
      itemName: info.name,
      quantity: item.quantity,
      unitPriceCents: info.priceCents,
      totalCents: lineTotalCents,
    })
  }

  // Insert order
  const { data: order, error } = await (supabase as any)
    .from('order_ahead_orders')
    .insert({
      chef_id: user.tenantId!,
      client_id: input.clientId ?? null,
      client_name: input.clientName,
      client_email: input.clientEmail,
      client_phone: input.clientPhone ?? null,
      requested_date: input.requestedDate,
      total_cents: totalCents,
      status: 'pending',
      notes: input.notes ?? null,
      items_json: lineItems, // store as JSONB for now
    })
    .select()
    .single()

  if (error) {
    console.error('[placeOrder] Error:', error)
    return { error: 'Failed to place order' }
  }

  revalidatePath('/commerce')
  return {
    id: order.id,
    chefId: order.chef_id,
    clientId: order.client_id,
    clientName: order.client_name,
    clientEmail: order.client_email,
    clientPhone: order.client_phone,
    requestedDate: order.requested_date,
    totalCents: order.total_cents,
    status: order.status,
    notes: order.notes,
    items: lineItems,
    createdAt: order.created_at,
  }
}

/**
 * Get orders for the current chef, optionally filtered by status.
 */
export async function getOrders(
  statusFilter?: OrderStatus
): Promise<OrderAheadOrder[] | { error: string }> {
  const user = await requirePro('commerce')
  const supabase: any = createServerClient()

  const tableExists = await checkTableExists(supabase, 'order_ahead_orders')
  if (!tableExists) return { error: MIGRATION_ERROR }

  let query = (supabase as any)
    .from('order_ahead_orders')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (statusFilter) query = query.eq('status', statusFilter)

  const { data, error } = await query

  if (error) {
    console.error('[getOrders] Error:', error)
    return { error: 'Failed to load orders' }
  }

  return (data ?? []).map((o: any) => ({
    id: o.id,
    chefId: o.chef_id,
    clientId: o.client_id,
    clientName: o.client_name,
    clientEmail: o.client_email,
    clientPhone: o.client_phone,
    requestedDate: o.requested_date,
    totalCents: o.total_cents,
    status: o.status,
    notes: o.notes,
    items: o.items_json ?? [],
    createdAt: o.created_at,
  }))
}

/**
 * Update the status of an order (confirm, prepare, deliver, cancel).
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ success: boolean } | { error: string }> {
  const user = await requirePro('commerce')
  const supabase: any = createServerClient()

  const tableExists = await checkTableExists(supabase, 'order_ahead_orders')
  if (!tableExists) return { error: MIGRATION_ERROR }

  const { error } = await (supabase as any)
    .from('order_ahead_orders')
    .update({ status: newStatus })
    .eq('id', orderId)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[updateOrderStatus] Error:', error)
    return { error: 'Failed to update order status' }
  }

  revalidatePath('/commerce')
  return { success: true }
}

// ============================================
// HELPERS
// ============================================

function mapItem(row: any): OrderAheadItem {
  return {
    id: row.id,
    chefId: row.chef_id,
    name: row.name,
    description: row.description,
    priceCents: row.price_cents,
    category: row.category,
    imageUrl: row.image_url ?? null,
    maxQuantityPerOrder: row.max_quantity_per_order,
    availableFrom: row.available_from,
    availableUntil: row.available_until,
    leadTimeDays: row.lead_time_days ?? 1,
    status: row.status,
    createdAt: row.created_at,
  }
}
