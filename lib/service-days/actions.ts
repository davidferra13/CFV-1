'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────

export type ServiceDay = {
  id: string
  chef_id: string
  service_date: string
  shift_label: string
  status: string
  expected_covers: number | null
  actual_covers: number | null
  notes: string | null
  opened_at: string | null
  closed_at: string | null
  total_revenue_cents: number | null
  total_food_cost_cents: number | null
  total_labor_cost_cents: number | null
  total_waste_cents: number | null
  items_sold: number | null
  items_86d: number | null
  created_at: string
  updated_at: string
}

export type ServiceDaySummary = {
  service_day_id: string
  chef_id: string
  service_date: string
  shift_label: string
  status: string
  expected_covers: number | null
  actual_covers: number | null
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

// ── List service days (summary view) ─────────────────────────────────────

export async function listServiceDays(): Promise<ServiceDaySummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('service_day_summary')
    .select('*')
    .eq('chef_id', chefId)
    .order('service_date', { ascending: false })
    .limit(90)

  if (error) {
    console.error('[service-days] list error', error)
    return []
  }
  return data ?? []
}

// ── Get single service day ──────────────────────────────────────────────

export async function getServiceDay(id: string): Promise<ServiceDay | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('service_days')
    .select('*')
    .eq('id', id)
    .eq('chef_id', chefId)
    .single()

  if (error) {
    console.error('[service-days] get error', error)
    return null
  }
  return data
}

// ── Create service day ──────────────────────────────────────────────────

export async function createServiceDay(input: {
  service_date: string
  shift_label: string
  expected_covers: number | null
  notes: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('service_days')
    .insert({
      chef_id: chefId,
      service_date: input.service_date,
      shift_label: input.shift_label || 'dinner',
      expected_covers: input.expected_covers,
      notes: input.notes,
      status: 'planning',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[service-days] create error', error)
    return { success: false, error: error.message || 'Failed to create service day' }
  }

  revalidatePath('/stations/service-log')
  return { success: true, id: data.id }
}

// ── Open service day ────────────────────────────────────────────────────

export async function openServiceDay(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data: current, error: lookupError } = await db
    .from('service_days')
    .select('id, status')
    .eq('id', id)
    .eq('chef_id', chefId)
    .single()

  if (lookupError || !current) {
    console.error('[service-days] open lookup error', lookupError)
    return { success: false, error: 'Service day not found' }
  }

  if (current.status === 'closed') {
    return { success: false, error: 'Closed service days cannot be reopened from this action.' }
  }

  const { error } = await db
    .from('service_days')
    .update({
      status: 'active',
      opened_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[service-days] open error', error)
    return { success: false, error: error.message || 'Failed to open service day' }
  }

  revalidatePath('/stations/service-log')
  revalidatePath(`/stations/service-log/${id}`)
  return { success: true }
}

// ── Close service day ───────────────────────────────────────────────────

export async function closeServiceDay(
  id: string,
  input: {
    actual_covers: number | null
    total_revenue_cents: number | null
    total_food_cost_cents: number | null
    total_labor_cost_cents: number | null
    total_waste_cents: number | null
    notes: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data: current, error: lookupError } = await db
    .from('service_days')
    .select(
      'id, status, actual_covers, total_revenue_cents, total_food_cost_cents, total_labor_cost_cents, total_waste_cents, notes'
    )
    .eq('id', id)
    .eq('chef_id', chefId)
    .single()

  if (lookupError || !current) {
    console.error('[service-days] close lookup error', lookupError)
    return { success: false, error: 'Service day not found' }
  }

  if (current.status !== 'active') {
    return { success: false, error: 'Open the service day before closing it.' }
  }

  const { error } = await db
    .from('service_days')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      actual_covers: input.actual_covers ?? current.actual_covers,
      total_revenue_cents: input.total_revenue_cents ?? current.total_revenue_cents,
      total_food_cost_cents: input.total_food_cost_cents ?? current.total_food_cost_cents,
      total_labor_cost_cents: input.total_labor_cost_cents ?? current.total_labor_cost_cents,
      total_waste_cents: input.total_waste_cents ?? current.total_waste_cents,
      notes: input.notes ?? current.notes,
    })
    .eq('id', id)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[service-days] close error', error)
    return { success: false, error: error.message || 'Failed to close service day' }
  }

  revalidatePath('/stations/service-log')
  revalidatePath(`/stations/service-log/${id}`)
  return { success: true }
}
