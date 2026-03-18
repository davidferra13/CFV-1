// Station Clipboard System - Order Handoff Actions
// Chef-only. Manages order requests from stations and tracks fulfillment.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const CreateOrderRequestSchema = z.object({
  component_id: z.string().uuid(),
  station_id: z.string().uuid(),
  quantity: z.number().min(0.01, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit required'),
  requested_by: z.string().optional(),
})

const MarkOrderedSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Select at least one order'),
})

const MarkReceivedSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Select at least one order'),
  fulfilled_at: z.string().optional(),
})

export type CreateOrderRequestInput = z.infer<typeof CreateOrderRequestSchema>
export type MarkOrderedInput = z.infer<typeof MarkOrderedSchema>
export type MarkReceivedInput = z.infer<typeof MarkReceivedSchema>

// ============================================
// ORDER REQUESTS
// ============================================

/**
 * Create a new order request from a station.
 */
export async function createOrderRequest(input: CreateOrderRequestInput) {
  const user = await requireChef()
  const validated = CreateOrderRequestSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('order_requests')
    .insert({
      chef_id: user.tenantId!,
      component_id: validated.component_id,
      station_id: validated.station_id,
      quantity: validated.quantity,
      unit: validated.unit,
      requested_by: validated.requested_by ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) {
    console.error('[createOrderRequest] Error:', error)
    throw new Error('Failed to create order request')
  }

  revalidatePath('/stations/orders')
  revalidatePath(`/stations/${validated.station_id}`)
  return data
}

/**
 * List all pending order requests across all stations, grouped by component.
 */
export async function listPendingOrders() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('order_requests')
    .select(
      `
      *,
      station_components (id, name, unit),
      stations (id, name)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[listPendingOrders] Error:', error)
    throw new Error('Failed to load pending orders')
  }

  // Group by component
  const grouped: Record<
    string,
    {
      component_id: string
      component_name: string
      unit: string
      total_quantity: number
      stations: Array<{
        station_id: string
        station_name: string
        quantity: number
        order_id: string
      }>
      order_ids: string[]
    }
  > = {}

  for (const order of data ?? []) {
    const compId = (order as any).component_id
    const comp = (order as any).station_components
    const station = (order as any).stations

    if (!grouped[compId]) {
      grouped[compId] = {
        component_id: compId,
        component_name: comp?.name ?? 'Unknown',
        unit: comp?.unit ?? (order as any).unit,
        total_quantity: 0,
        stations: [],
        order_ids: [],
      }
    }

    grouped[compId].total_quantity += (order as any).quantity
    grouped[compId].stations.push({
      station_id: station?.id ?? '',
      station_name: station?.name ?? 'Unknown',
      quantity: (order as any).quantity,
      order_id: (order as any).id,
    })
    grouped[compId].order_ids.push((order as any).id)
  }

  return Object.values(grouped)
}

/**
 * List all orders (any status) for a specific station.
 */
export async function listStationOrders(stationId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('order_requests')
    .select(
      `
      *,
      station_components (id, name, unit)
    `
    )
    .eq('chef_id', user.tenantId!)
    .eq('station_id', stationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[listStationOrders] Error:', error)
    throw new Error('Failed to load station orders')
  }

  return data ?? []
}

/**
 * Batch mark orders as 'ordered' (sent to vendor/supplier).
 */
export async function markOrderAsOrdered(ids: string[]) {
  const user = await requireChef()
  const validated = MarkOrderedSchema.parse({ ids })
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('order_requests')
    .update({
      status: 'ordered',
      ordered_at: new Date().toISOString(),
    })
    .in('id', validated.ids)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[markOrderAsOrdered] Error:', error)
    throw new Error('Failed to mark orders as ordered')
  }

  revalidatePath('/stations/orders')
}

/**
 * Batch mark orders as 'received' (delivered/fulfilled).
 */
export async function markOrderAsReceived(ids: string[], fulfilledAt?: string) {
  const user = await requireChef()
  const validated = MarkReceivedSchema.parse({ ids, fulfilled_at: fulfilledAt })
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('order_requests')
    .update({
      status: 'received',
      fulfilled_at: validated.fulfilled_at ?? new Date().toISOString(),
    })
    .in('id', validated.ids)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[markOrderAsReceived] Error:', error)
    throw new Error('Failed to mark orders as received')
  }

  revalidatePath('/stations/orders')
}

/**
 * Get order history within a date range.
 */
export async function getOrderHistory(startDate: string, endDate: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('order_requests')
    .select(
      `
      *,
      station_components (id, name, unit),
      stations (id, name)
    `
    )
    .eq('chef_id', user.tenantId!)
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getOrderHistory] Error:', error)
    throw new Error('Failed to load order history')
  }

  return data ?? []
}
