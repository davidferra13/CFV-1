'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ---- Types ----

export interface MealPrepItem {
  id: string
  chef_id: string
  name: string
  description: string | null
  price_cents: number
  category: string
  dietary_tags: string[]
  ingredients_summary: string | null
  calories: number | null
  serving_size: string | null
  photo_url: string | null
  is_available: boolean
  max_quantity: number | null
  prep_lead_days: number
  created_at: string
  updated_at: string
}

export interface MealPrepOrder {
  id: string
  chef_id: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  items: { itemId: string; name: string; quantity: number; priceCents: number }[]
  total_cents: number
  status: string
  fulfillment_type: string
  fulfillment_date: string
  fulfillment_notes: string | null
  delivery_address: string | null
  created_at: string
  updated_at: string
}

export interface MealPrepWindow {
  id: string
  chef_id: string
  day_of_week: number
  order_cutoff_time: string
  fulfillment_day_offset: number
  is_active: boolean
  created_at: string
}

export interface MealPrepStats {
  ordersToday: number
  pendingOrders: number
  revenueThisWeekCents: number
}

// ---- Menu Items ----

export async function getMealPrepItems(filters?: { category?: string; availableOnly?: boolean }) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  let query = supabase
    .from('meal_prep_items')
    .select('*')
    .eq('chef_id', chef.tenantId!)
    .order('category')
    .order('name')

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.availableOnly) {
    query = query.eq('is_available', true)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as MealPrepItem[]
}

export async function createMealPrepItem(input: {
  name: string
  description?: string
  price_cents: number
  category: string
  dietary_tags?: string[]
  ingredients_summary?: string
  calories?: number
  serving_size?: string
  photo_url?: string
  max_quantity?: number
  prep_lead_days?: number
}) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('meal_prep_items')
    .insert({
      chef_id: chef.tenantId!,
      name: input.name,
      description: input.description ?? null,
      price_cents: input.price_cents,
      category: input.category,
      dietary_tags: input.dietary_tags ?? [],
      ingredients_summary: input.ingredients_summary ?? null,
      calories: input.calories ?? null,
      serving_size: input.serving_size ?? null,
      photo_url: input.photo_url ?? null,
      max_quantity: input.max_quantity ?? null,
      prep_lead_days: input.prep_lead_days ?? 2,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/store')
  return data as MealPrepItem
}

export async function updateMealPrepItem(
  id: string,
  input: {
    name?: string
    description?: string
    price_cents?: number
    category?: string
    dietary_tags?: string[]
    ingredients_summary?: string
    calories?: number
    serving_size?: string
    photo_url?: string
    is_available?: boolean
    max_quantity?: number | null
    prep_lead_days?: number
  }
) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('meal_prep_items')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', chef.tenantId!)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/store')
  return data as MealPrepItem
}

export async function deleteMealPrepItem(id: string) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('meal_prep_items')
    .delete()
    .eq('id', id)
    .eq('chef_id', chef.tenantId!)

  if (error) throw new Error(error.message)
  revalidatePath('/store')
}

export async function toggleItemAvailability(id: string) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  // Fetch current state
  const { data: current, error: fetchErr } = await supabase
    .from('meal_prep_items')
    .select('is_available')
    .eq('id', id)
    .eq('chef_id', chef.tenantId!)
    .single()

  if (fetchErr || !current) throw new Error(fetchErr?.message ?? 'Item not found')

  const { error } = await supabase
    .from('meal_prep_items')
    .update({ is_available: !current.is_available, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', chef.tenantId!)

  if (error) throw new Error(error.message)
  revalidatePath('/store')
}

// ---- Orders ----

export async function getMealPrepOrders(filters?: {
  status?: string
  dateFrom?: string
  dateTo?: string
}) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  let query = supabase
    .from('meal_prep_orders')
    .select('*')
    .eq('chef_id', chef.tenantId!)
    .order('fulfillment_date', { ascending: true })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.dateFrom) {
    query = query.gte('fulfillment_date', filters.dateFrom)
  }
  if (filters?.dateTo) {
    query = query.lte('fulfillment_date', filters.dateTo)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as MealPrepOrder[]
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered'],
  delivered: [],
  cancelled: [],
}

export async function updateOrderStatus(id: string, newStatus: string) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  // Fetch current status
  const { data: current, error: fetchErr } = await supabase
    .from('meal_prep_orders')
    .select('status')
    .eq('id', id)
    .eq('chef_id', chef.tenantId!)
    .single()

  if (fetchErr || !current) throw new Error(fetchErr?.message ?? 'Order not found')

  const allowed = VALID_STATUS_TRANSITIONS[current.status] ?? []
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from "${current.status}" to "${newStatus}"`)
  }

  const { error } = await supabase
    .from('meal_prep_orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('chef_id', chef.tenantId!)

  if (error) throw new Error(error.message)
  revalidatePath('/store')
}

// ---- Ordering Windows ----

export async function getOrderingWindows() {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('meal_prep_windows')
    .select('*')
    .eq('chef_id', chef.tenantId!)
    .order('day_of_week')

  if (error) throw new Error(error.message)
  return (data ?? []) as MealPrepWindow[]
}

export async function saveOrderingWindows(
  windows: {
    id?: string
    day_of_week: number
    order_cutoff_time: string
    fulfillment_day_offset: number
    is_active: boolean
  }[]
) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  // Delete existing windows and replace
  const { error: delErr } = await supabase
    .from('meal_prep_windows')
    .delete()
    .eq('chef_id', chef.tenantId!)

  if (delErr) throw new Error(delErr.message)

  if (windows.length > 0) {
    const rows = windows.map((w) => ({
      chef_id: chef.tenantId!,
      day_of_week: w.day_of_week,
      order_cutoff_time: w.order_cutoff_time,
      fulfillment_day_offset: w.fulfillment_day_offset,
      is_active: w.is_active,
    }))

    const { error: insErr } = await supabase.from('meal_prep_windows').insert(rows)
    if (insErr) throw new Error(insErr.message)
  }

  revalidatePath('/store')
}

// ---- Stats ----

export async function getMealPrepStats(): Promise<MealPrepStats> {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Orders today
  const { count: ordersToday, error: e1 } = await supabase
    .from('meal_prep_orders')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chef.tenantId!)
    .eq('fulfillment_date', today)

  if (e1) throw new Error(e1.message)

  // Pending orders
  const { count: pendingOrders, error: e2 } = await supabase
    .from('meal_prep_orders')
    .select('*', { count: 'exact', head: true })
    .eq('chef_id', chef.tenantId!)
    .eq('status', 'pending')

  if (e2) throw new Error(e2.message)

  // Revenue this week (non-cancelled orders)
  const { data: weekOrders, error: e3 } = await supabase
    .from('meal_prep_orders')
    .select('total_cents')
    .eq('chef_id', chef.tenantId!)
    .neq('status', 'cancelled')
    .gte('created_at', weekAgo + 'T00:00:00Z')

  if (e3) throw new Error(e3.message)

  const revenueThisWeekCents = (weekOrders ?? []).reduce(
    (sum: any, o: any) => sum + (o.total_cents ?? 0),
    0
  )

  return {
    ordersToday: ordersToday ?? 0,
    pendingOrders: pendingOrders ?? 0,
    revenueThisWeekCents,
  }
}
