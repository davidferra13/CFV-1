// Auto-Block Calendar for Event Dates
// Creates/removes calendar entries when events are accepted/cancelled
// via the proposal signing flow. Non-blocking side effect.

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Create a calendar entry blocking the event date when a proposal is signed.
 * Idempotent: checks for existing block before inserting.
 * Uses admin client since this runs in the public proposal flow (no auth session).
 */
export async function autoBlockEventDate(
  eventId: string,
  tenantId: string
): Promise<{ blocked: boolean; calendarEntryId: string | null }> {
  const supabase: any = createServerClient({ admin: true })

  // Fetch event details for the calendar entry
  const { data: event } = await supabase
    .from('events')
    .select('id, occasion, event_date, start_time, end_time, guest_count')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event || !event.event_date) {
    return { blocked: false, calendarEntryId: null }
  }

  // Check for existing block (idempotent)
  const { data: existing } = await supabase
    .from('chef_calendar_entries')
    .select('id')
    .eq('chef_id', tenantId)
    .eq('description', `auto-block:event:${eventId}`)
    .maybeSingle()

  if (existing) {
    return { blocked: true, calendarEntryId: existing.id }
  }

  const occasion = event.occasion || 'Private Event'
  const guestLabel = event.guest_count ? ` (${event.guest_count} guests)` : ''

  const { data: entry, error } = await supabase
    .from('chef_calendar_entries')
    .insert({
      chef_id: tenantId,
      entry_type: 'other',
      title: `${occasion}${guestLabel}`,
      description: `auto-block:event:${eventId}`,
      start_date: event.event_date,
      end_date: event.event_date,
      all_day: !event.start_time,
      start_time: event.start_time ?? null,
      end_time: event.end_time ?? null,
      blocks_bookings: true,
      is_revenue_generating: false,
      is_public: false,
      is_private: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[autoBlockEventDate] Failed to create calendar block:', error)
    return { blocked: false, calendarEntryId: null }
  }

  revalidatePath('/calendar')
  return { blocked: true, calendarEntryId: entry.id }
}

/**
 * Remove the calendar block when an event is cancelled.
 * Uses admin client for system-level access.
 */
export async function removeEventDateBlock(
  eventId: string,
  tenantId: string
): Promise<{ removed: boolean }> {
  const supabase: any = createServerClient({ admin: true })

  const { error } = await supabase
    .from('chef_calendar_entries')
    .delete()
    .eq('chef_id', tenantId)
    .eq('description', `auto-block:event:${eventId}`)

  if (error) {
    console.error('[removeEventDateBlock] Failed to remove calendar block:', error)
    return { removed: false }
  }

  revalidatePath('/calendar')
  return { removed: true }
}
