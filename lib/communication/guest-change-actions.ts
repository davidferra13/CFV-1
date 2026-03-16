'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ==========================================
// TYPES
// ==========================================

export type GuestCountChange = {
  id: string
  event_id: string
  tenant_id: string
  previous_count: number
  new_count: number
  reason: string | null
  cost_impact_cents: number | null
  approved: boolean
  requested_by: string
  requested_by_role: 'chef' | 'client'
  surcharge_applied: boolean
  surcharge_cents: number
  acknowledged_by_client: boolean
  acknowledged_at: string | null
  notes: string | null
  created_at: string
  approved_at: string | null
}

// ==========================================
// QUERIES
// ==========================================

export async function getGuestChanges(eventId: string): Promise<{
  data: GuestCountChange[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('guest_count_changes')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getGuestChanges] Error:', error)
    return { data: null, error: 'Failed to fetch guest count changes' }
  }

  return { data: data as GuestCountChange[], error: null }
}

// ==========================================
// MUTATIONS
// ==========================================

export async function requestGuestChange(input: {
  event_id: string
  previous_count: number
  new_count: number
  reason?: string
  cost_impact_cents?: number
}): Promise<{ data: GuestCountChange | null; error: string | null }> {
  const user = await requireChef()
  const supabase = createServerClient()

  if (input.new_count < 0) {
    return { data: null, error: 'Guest count cannot be negative' }
  }

  if (input.new_count === input.previous_count) {
    return { data: null, error: 'New count must differ from previous count' }
  }

  const { data, error } = await supabase
    .from('guest_count_changes')
    .insert({
      event_id: input.event_id,
      tenant_id: user.entityId,
      previous_count: input.previous_count,
      new_count: input.new_count,
      reason: input.reason || null,
      cost_impact_cents: input.cost_impact_cents || null,
      requested_by: user.id,
      requested_by_role: 'chef',
    })
    .select()
    .single()

  if (error) {
    console.error('[requestGuestChange] Error:', error)
    return { data: null, error: 'Failed to request guest count change' }
  }

  revalidatePath(`/events/${input.event_id}`)
  return { data: data as GuestCountChange, error: null }
}

export async function approveGuestChange(id: string): Promise<{
  data: GuestCountChange | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('guest_count_changes')
    .update({
      approved: true,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[approveGuestChange] Error:', error)
    return { data: null, error: 'Failed to approve guest count change' }
  }

  // Update the event's guest_count to the new value
  try {
    await supabase
      .from('events')
      .update({ guest_count: data.new_count })
      .eq('id', data.event_id)
      .eq('tenant_id', user.entityId)
  } catch (err) {
    // Non-blocking: the change record is approved even if event update fails
    console.error('[approveGuestChange] Non-blocking event update error:', err)
  }

  revalidatePath(`/events/${data.event_id}`)
  return { data: data as GuestCountChange, error: null }
}
