'use server'

// Service Day Lifecycle - CRUD + state transitions for daily restaurant service.
// service_days is the connective tissue: ties prep, stations, tasks, staff,
// inventory, and sales into one daily operating entity.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────

export type ServiceDayStatus = 'planning' | 'prep' | 'active' | 'closed'

export interface ServiceDay {
  id: string
  chef_id: string
  service_date: string
  shift_label: string
  status: ServiceDayStatus
  expected_covers: number | null
  actual_covers: number | null
  notes: string | null
  opened_at: string | null
  closed_at: string | null
  opened_by: string | null
  closed_by: string | null
  total_revenue_cents: number | null
  total_food_cost_cents: number | null
  total_labor_cost_cents: number | null
  total_waste_cents: number | null
  items_sold: number | null
  items_86d: number | null
  created_at: string
  updated_at: string
}

export interface CreateServiceDayInput {
  service_date: string
  shift_label?: string
  expected_covers?: number
  notes?: string
  menu_ids?: string[]
}

export interface ServiceDaySummary {
  service_day_id: string
  chef_id: string
  service_date: string
  shift_label: string
  status: ServiceDayStatus
  expected_covers: number | null
  actual_covers: number | null
  opened_at: string | null
  closed_at: string | null
  revenue_cents: number | null
  food_cost_cents: number | null
  labor_cost_cents: number | null
  items_sold: number | null
  unique_items_sold: number | null
  total_waste_qty: number | null
  total_waste_cents: number | null
  total_prep_items: number | null
  completed_prep_items: number | null
}

// ── Valid Transitions ─────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<ServiceDayStatus, ServiceDayStatus[]> = {
  planning: ['prep', 'active'],
  prep: ['active'],
  active: ['closed'],
  closed: [],
}

// ── CRUD ──────────────────────────────────────────────────────────────────

export async function createServiceDay(input: CreateServiceDayInput) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('service_days')
    .insert({
      chef_id: user.tenantId!,
      service_date: input.service_date,
      shift_label: input.shift_label || 'dinner',
      expected_covers: input.expected_covers,
      notes: input.notes,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        error: `Service day already exists for ${input.service_date} (${input.shift_label || 'dinner'})`,
      }
    }
    return { success: false, error: error.message }
  }

  // Link menus if provided
  if (input.menu_ids?.length) {
    const menuLinks = input.menu_ids.map((menuId) => ({
      chef_id: user.tenantId!,
      service_day_id: data.id,
      menu_id: menuId,
    }))
    await db.from('service_menus').insert(menuLinks)
  }

  revalidatePath('/ops')
  return { success: true, data }
}

export async function getServiceDay(id: string): Promise<ServiceDay | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('service_days')
    .select('*')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  return data
}

export async function getServiceDayByDate(
  date: string,
  shiftLabel?: string
): Promise<ServiceDay | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('service_days')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('service_date', date)

  if (shiftLabel) {
    query = query.eq('shift_label', shiftLabel)
  }

  const { data } = await query.order('created_at', { ascending: false }).limit(1).single()
  return data
}

export async function listServiceDays(options?: {
  startDate?: string
  endDate?: string
  status?: ServiceDayStatus
  limit?: number
}): Promise<ServiceDay[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('service_days')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('service_date', { ascending: false })

  if (options?.startDate) query = query.gte('service_date', options.startDate)
  if (options?.endDate) query = query.lte('service_date', options.endDate)
  if (options?.status) query = query.eq('status', options.status)
  if (options?.limit) query = query.limit(options.limit)

  const { data } = await query
  return data || []
}

export async function getServiceDaySummaries(options?: {
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<ServiceDaySummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('service_day_summary')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('service_date', { ascending: false })

  if (options?.startDate) query = query.gte('service_date', options.startDate)
  if (options?.endDate) query = query.lte('service_date', options.endDate)
  if (options?.limit) query = query.limit(options.limit)

  const { data } = await query
  return data || []
}

// ── State Transitions ─────────────────────────────────────────────────────

export async function transitionServiceDay(
  id: string,
  toStatus: ServiceDayStatus,
  meta?: { actual_covers?: number; staff_member_id?: string }
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: current } = await db
    .from('service_days')
    .select('status')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (!current) return { success: false, error: 'Service day not found' }

  const allowed = VALID_TRANSITIONS[current.status as ServiceDayStatus]
  if (!allowed?.includes(toStatus)) {
    return { success: false, error: `Cannot transition from ${current.status} to ${toStatus}` }
  }

  const updates: Record<string, any> = { status: toStatus }

  if (toStatus === 'active') {
    updates.opened_at = new Date().toISOString()
    if (meta?.staff_member_id) updates.opened_by = meta.staff_member_id
  }

  if (toStatus === 'closed') {
    updates.closed_at = new Date().toISOString()
    if (meta?.actual_covers != null) updates.actual_covers = meta.actual_covers
    if (meta?.staff_member_id) updates.closed_by = meta.staff_member_id

    // Snapshot totals from sales
    const { data: salesAgg } = await db
      .from('menu_item_sales')
      .select('quantity_sold, revenue_cents, food_cost_cents, waste_cents')
      .eq('service_day_id', id)

    if (salesAgg?.length) {
      updates.total_revenue_cents = salesAgg.reduce(
        (s: number, r: any) => s + (r.revenue_cents || 0),
        0
      )
      updates.total_food_cost_cents = salesAgg.reduce(
        (s: number, r: any) => s + (r.food_cost_cents || 0),
        0
      )
      updates.total_waste_cents = salesAgg.reduce(
        (s: number, r: any) => s + (r.waste_cents || 0),
        0
      )
      updates.items_sold = salesAgg.reduce((s: number, r: any) => s + (r.quantity_sold || 0), 0)
    }
  }

  const { error } = await db
    .from('service_days')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath('/ops')
  return { success: true }
}

export async function updateServiceDay(
  id: string,
  updates: Partial<Pick<ServiceDay, 'expected_covers' | 'notes' | 'shift_label'>>
) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('service_days')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath('/ops')
  return { success: true }
}

// ── Service Menus ─────────────────────────────────────────────────────────

export async function getServiceMenus(serviceDayId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('service_menus')
    .select('*, menus(id, name, status)')
    .eq('service_day_id', serviceDayId)
    .eq('chef_id', user.tenantId!)

  return data || []
}

export async function addServiceMenu(serviceDayId: string, menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('service_menus').insert({
    chef_id: user.tenantId!,
    service_day_id: serviceDayId,
    menu_id: menuId,
  })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Menu already linked' }
    return { success: false, error: error.message }
  }

  revalidatePath('/ops')
  return { success: true }
}

export async function removeServiceMenu(serviceDayId: string, menuId: string) {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('service_menus')
    .delete()
    .eq('service_day_id', serviceDayId)
    .eq('menu_id', menuId)
    .eq('chef_id', user.tenantId!)

  revalidatePath('/ops')
  return { success: true }
}

// ── Quick: Today or Create ────────────────────────────────────────────────

export async function getOrCreateToday(shiftLabel = 'dinner'): Promise<ServiceDay> {
  const today = new Date().toISOString().split('T')[0]
  const existing = await getServiceDayByDate(today, shiftLabel)
  if (existing) return existing

  const result = await createServiceDay({
    service_date: today,
    shift_label: shiftLabel,
  })

  if (!result.success) {
    // Race condition: another call created it
    const retry = await getServiceDayByDate(today, shiftLabel)
    if (retry) return retry
    throw new Error(result.error || 'Failed to create service day')
  }

  return result.data
}
