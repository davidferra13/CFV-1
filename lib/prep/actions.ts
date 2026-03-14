// Prep Timeline Actions (Phase 5)
// CRUD for multi-day prep tracking with countdowns and alerts.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type PrepTimer = {
  id: string
  chef_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  station_id: string | null
  event_id: string | null
  status: 'active' | 'completed' | 'missed'
  alert_before_minutes: number
  created_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  station?: { id: string; name: string } | null
  event?: { id: string; title: string } | null
}

/**
 * Get all active prep timers.
 */
export async function getActivePrepTimers(): Promise<PrepTimer[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('prep_timeline')
    .select('*, station:stations(id, name), event:events(id, title)')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .order('end_at', { ascending: true })

  if (error) {
    console.error('[getActivePrepTimers] Error:', error)
    return []
  }

  return (data ?? []) as PrepTimer[]
}

/**
 * Get prep timers completing within a date range.
 */
export async function getPrepTimersForDate(date: string): Promise<PrepTimer[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const startOfDay = date + 'T00:00:00'
  const endOfDay = new Date(new Date(startOfDay).getTime() + 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('prep_timeline')
    .select('*, station:stations(id, name), event:events(id, title)')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .gte('end_at', startOfDay)
    .lt('end_at', endOfDay)
    .order('end_at', { ascending: true })

  if (error) {
    console.error('[getPrepTimersForDate] Error:', error)
    return []
  }

  return (data ?? []) as PrepTimer[]
}

/**
 * Create a new prep timer.
 */
export async function createPrepTimer(input: {
  title: string
  description?: string
  start_at?: string // defaults to now
  end_at: string // required
  station_id?: string
  event_id?: string
  alert_before_minutes?: number
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!input.title.trim()) {
    throw new Error('Title is required')
  }

  const { data, error } = await supabase
    .from('prep_timeline')
    .insert({
      chef_id: user.tenantId!,
      title: input.title.trim(),
      description: input.description?.trim() ?? null,
      start_at: input.start_at ?? new Date().toISOString(),
      end_at: input.end_at,
      station_id: input.station_id ?? null,
      event_id: input.event_id ?? null,
      alert_before_minutes: input.alert_before_minutes ?? 30,
      created_by: user.entityId,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('[createPrepTimer] Error:', error)
    throw new Error('Failed to create prep timer')
  }

  revalidatePath('/briefing')
  revalidatePath('/stations')
  return data
}

/**
 * Complete a prep timer.
 */
export async function completePrepTimer(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('prep_timeline')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[completePrepTimer] Error:', error)
    throw new Error('Failed to complete prep timer')
  }

  revalidatePath('/briefing')
  revalidatePath('/stations')
  return data
}

/**
 * Delete a prep timer.
 */
export async function deletePrepTimer(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('prep_timeline')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) {
    console.error('[deletePrepTimer] Error:', error)
    throw new Error('Failed to delete prep timer')
  }

  revalidatePath('/briefing')
  revalidatePath('/stations')
}

/**
 * Mark overdue timers as missed (call periodically).
 */
export async function markMissedPrepTimers() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('prep_timeline')
    .update({ status: 'missed' })
    .eq('chef_id', user.tenantId!)
    .eq('status', 'active')
    .lt('end_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // 2h grace period

  if (error) {
    console.error('[markMissedPrepTimers] Error:', error)
  }
}
