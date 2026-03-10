'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export type PreorderItem = {
  name: string
  quantity: number
  price_cents: number
  notes?: string
}

export type TruckPreorder = {
  id: string
  tenant_id: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  schedule_id: string | null
  location_name: string
  pickup_date: string
  pickup_time: string | null
  items: PreorderItem[]
  total_cents: number
  status: 'pending' | 'confirmed' | 'ready' | 'picked_up' | 'cancelled' | 'no_show'
  payment_status: 'unpaid' | 'paid' | 'refunded'
  notes: string | null
  created_at: string
  updated_at: string
}

export type PreorderSummaryItem = {
  name: string
  total_quantity: number
  total_cents: number
}

export type PreorderStats = {
  total_orders: number
  completed_orders: number
  cancelled_orders: number
  no_show_orders: number
  total_revenue_cents: number
  avg_order_cents: number
  completion_rate: number
  no_show_rate: number
}

// ---- Actions ----

export async function createPreorder(input: {
  customer_name: string
  customer_phone?: string
  customer_email?: string
  schedule_id?: string
  location_name: string
  pickup_date: string
  pickup_time?: string
  items: PreorderItem[]
  total_cents: number
  notes?: string
}): Promise<TruckPreorder> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_preorders')
    .insert({
      tenant_id: user.entityId!,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone ?? null,
      customer_email: input.customer_email ?? null,
      schedule_id: input.schedule_id ?? null,
      location_name: input.location_name,
      pickup_date: input.pickup_date,
      pickup_time: input.pickup_time ?? null,
      items: input.items as unknown as Record<string, unknown>,
      total_cents: input.total_cents,
      notes: input.notes ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create pre-order: ${error.message}`)
  revalidatePath('/food-truck/preorders')
  return data as unknown as TruckPreorder
}

export async function updatePreorderStatus(
  id: string,
  status: TruckPreorder['status'],
  paymentStatus?: TruckPreorder['payment_status']
): Promise<TruckPreorder> {
  const user = await requireChef()
  const supabase = createServerClient()

  const update: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }
  if (paymentStatus) {
    update.payment_status = paymentStatus
  }

  const { data, error } = await supabase
    .from('truck_preorders')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update pre-order status: ${error.message}`)
  revalidatePath('/food-truck/preorders')
  return data as unknown as TruckPreorder
}

export async function getPreordersForDate(date: string): Promise<TruckPreorder[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_preorders')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .eq('pickup_date', date)
    .order('pickup_time', { ascending: true })

  if (error) throw new Error(`Failed to load pre-orders: ${error.message}`)
  return (data ?? []) as unknown as TruckPreorder[]
}

export async function getPreordersForLocation(
  locationName: string,
  date: string
): Promise<TruckPreorder[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_preorders')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .eq('pickup_date', date)
    .eq('location_name', locationName)
    .order('pickup_time', { ascending: true })

  if (error) throw new Error(`Failed to load pre-orders for location: ${error.message}`)
  return (data ?? []) as unknown as TruckPreorder[]
}

export async function getPreorderSummary(date: string): Promise<{
  total_preorders: number
  total_revenue_cents: number
  items: PreorderSummaryItem[]
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('truck_preorders')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .eq('pickup_date', date)
    .neq('status', 'cancelled')

  if (error) throw new Error(`Failed to load pre-order summary: ${error.message}`)

  const preorders = (data ?? []) as unknown as TruckPreorder[]

  // Aggregate items
  const itemMap = new Map<string, PreorderSummaryItem>()
  for (const order of preorders) {
    for (const item of order.items) {
      const existing = itemMap.get(item.name)
      if (existing) {
        existing.total_quantity += item.quantity
        existing.total_cents += item.price_cents * item.quantity
      } else {
        itemMap.set(item.name, {
          name: item.name,
          total_quantity: item.quantity,
          total_cents: item.price_cents * item.quantity,
        })
      }
    }
  }

  return {
    total_preorders: preorders.length,
    total_revenue_cents: preorders.reduce((sum, o) => sum + o.total_cents, 0),
    items: Array.from(itemMap.values()).sort((a, b) => b.total_quantity - a.total_quantity),
  }
}

export async function cancelPreorder(id: string, refund: boolean = false): Promise<TruckPreorder> {
  const user = await requireChef()
  const supabase = createServerClient()

  const update: Record<string, unknown> = {
    status: 'cancelled',
    updated_at: new Date().toISOString(),
  }
  if (refund) {
    update.payment_status = 'refunded'
  }

  const { data, error } = await supabase
    .from('truck_preorders')
    .update(update)
    .eq('id', id)
    .eq('tenant_id', user.entityId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to cancel pre-order: ${error.message}`)
  revalidatePath('/food-truck/preorders')
  return data as unknown as TruckPreorder
}

export async function getPreorderStats(days: number = 30): Promise<PreorderStats> {
  const user = await requireChef()
  const supabase = createServerClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('truck_preorders')
    .select('*')
    .eq('tenant_id', user.entityId!)
    .gte('pickup_date', cutoffStr)

  if (error) throw new Error(`Failed to load pre-order stats: ${error.message}`)

  const preorders = (data ?? []) as unknown as TruckPreorder[]
  const total = preorders.length
  const completed = preorders.filter((o) => o.status === 'picked_up').length
  const cancelled = preorders.filter((o) => o.status === 'cancelled').length
  const noShow = preorders.filter((o) => o.status === 'no_show').length
  const revenue = preorders
    .filter((o) => o.status === 'picked_up')
    .reduce((sum, o) => sum + o.total_cents, 0)

  return {
    total_orders: total,
    completed_orders: completed,
    cancelled_orders: cancelled,
    no_show_orders: noShow,
    total_revenue_cents: revenue,
    avg_order_cents: completed > 0 ? Math.round(revenue / completed) : 0,
    completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    no_show_rate: total > 0 ? Math.round((noShow / total) * 100) : 0,
  }
}
