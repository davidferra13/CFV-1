// Bakery tasting appointment scheduler
// Chef-only: book, manage, and track tasting appointments

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Types

export type BakeryTasting = {
  id: string
  tenant_id: string
  client_name: string
  client_email: string | null
  client_phone: string | null
  tasting_date: string
  tasting_time: string
  duration_minutes: number
  tasting_type: 'cake' | 'pastry' | 'bread' | 'wedding' | 'general'
  items_to_sample: string[] | null
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  outcome_notes: string | null
  order_placed: boolean
  order_id: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// CRUD
// ============================================================

export async function createTasting(data: {
  client_name: string
  client_email?: string | null
  client_phone?: string | null
  tasting_date: string
  tasting_time: string
  duration_minutes?: number
  tasting_type?: string
  items_to_sample?: string[]
  notes?: string | null
}) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: tasting, error } = await supabase
    .from('bakery_tastings')
    .insert({
      tenant_id: user.tenantId!,
      client_name: data.client_name,
      client_email: data.client_email || null,
      client_phone: data.client_phone || null,
      tasting_date: data.tasting_date,
      tasting_time: data.tasting_time,
      duration_minutes: data.duration_minutes || 60,
      tasting_type: data.tasting_type || 'general',
      items_to_sample: data.items_to_sample || null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to book tasting: ${error.message}`)

  revalidatePath('/bakery/tastings')
  return tasting
}

export async function updateTasting(
  id: string,
  data: Partial<{
    client_name: string
    client_email: string | null
    client_phone: string | null
    tasting_date: string
    tasting_time: string
    duration_minutes: number
    tasting_type: string
    items_to_sample: string[]
    status: string
  }>
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: tasting, error } = await supabase
    .from('bakery_tastings')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update tasting: ${error.message}`)

  revalidatePath('/bakery/tastings')
  return tasting
}

export async function cancelTasting(id: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('bakery_tastings')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to cancel tasting: ${error.message}`)

  revalidatePath('/bakery/tastings')
}

export async function getTastingsForDate(date: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('bakery_tastings')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('tasting_date', date)
    .order('tasting_time')

  if (error) throw new Error(`Failed to load tastings: ${error.message}`)
  return (data || []) as BakeryTasting[]
}

export async function getUpcomingTastings(days: number = 14) {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('bakery_tastings')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('tasting_date', today)
    .lte('tasting_date', futureDateStr)
    .in('status', ['scheduled', 'confirmed'])
    .order('tasting_date')
    .order('tasting_time')

  if (error) throw new Error(`Failed to load upcoming tastings: ${error.message}`)
  return (data || []) as BakeryTasting[]
}

export async function recordTastingOutcome(
  id: string,
  outcome: {
    outcome_notes: string
    order_placed: boolean
    order_id?: string | null
  }
) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: tasting, error } = await supabase
    .from('bakery_tastings')
    .update({
      status: 'completed',
      outcome_notes: outcome.outcome_notes,
      order_placed: outcome.order_placed,
      order_id: outcome.order_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to record outcome: ${error.message}`)

  revalidatePath('/bakery/tastings')
  return tasting
}

// ============================================================
// Analytics
// ============================================================

export async function getTastingConversionStats(days: number = 30) {
  const user = await requireChef()
  const supabase = createServerClient()

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('bakery_tastings')
    .select('status, order_placed')
    .eq('tenant_id', user.tenantId!)
    .gte('tasting_date', startDate.toISOString().split('T')[0])

  if (error) throw new Error(`Failed to load stats: ${error.message}`)

  const total = (data || []).length
  const completed = (data || []).filter((t) => t.status === 'completed').length
  const converted = (data || []).filter((t) => t.order_placed).length
  const noShows = (data || []).filter((t) => t.status === 'no_show').length
  const cancelled = (data || []).filter((t) => t.status === 'cancelled').length

  return {
    total,
    completed,
    converted,
    conversionRate: completed > 0 ? Math.round((converted / completed) * 100) : 0,
    noShows,
    cancelled,
  }
}
