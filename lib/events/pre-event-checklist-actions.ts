// @ts-nocheck
'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Client confirms their pre-event details are correct.
 * Sets pre_event_checklist_confirmed_at on the event.
 * Only allowed when event is in confirmed status.
 */
export async function confirmPreEventChecklist(eventId: string) {
  const user = await requireClient()
  const supabase = createServerClient()

  // Verify ownership and status
  const { data: event } = await supabase
    .from('events')
    .select('id, status, client_id, tenant_id')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) throw new Error('Event not found')
  if (!['confirmed', 'paid', 'in_progress'].includes(event.status)) {
    throw new Error('Pre-event checklist is only available for confirmed events')
  }

  const { error } = await supabase
    .from('events')
    .update({
      pre_event_checklist_confirmed_at: new Date().toISOString(),
      pre_event_checklist_confirmed_by: user.id,
    })
    .eq('id', eventId)
    .eq('client_id', user.entityId)

  if (error) throw new Error('Failed to confirm checklist')

  revalidatePath(`/my-events/${eventId}`)
  revalidatePath(`/my-events/${eventId}/pre-event-checklist`)
  return { success: true as const }
}

/**
 * Client saves a personal journey note on their event.
 * Visible to client only — not shown in chef dashboard.
 */
export async function updateClientJourneyNote(eventId: string, note: string) {
  const user = await requireClient()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('events')
    .update({ client_journey_note: note.trim() || null })
    .eq('id', eventId)
    .eq('client_id', user.entityId)

  if (error) throw new Error('Failed to save note')

  revalidatePath(`/my-events/${eventId}`)
  return { success: true as const }
}

/**
 * Fetch the client's profile data needed for the pre-event checklist.
 * Returns dietary preferences, kitchen info, and event details.
 */
export async function getPreEventChecklistData(eventId: string) {
  const user = await requireClient()
  const supabase = createServerClient()

  const [{ data: event }, { data: client }] = await Promise.all([
    supabase
      .from('events')
      .select(
        `
        id, status, occasion, event_date, guest_count,
        location_address, location_city, location_state, location_zip,
        special_requests,
        pre_event_checklist_confirmed_at,
        client_journey_note
      `
      )
      .eq('id', eventId)
      .eq('client_id', user.entityId)
      .single(),

    supabase
      .from('clients')
      .select(
        `
        id, full_name, preferred_name,
        dietary_restrictions, allergies, dislikes, spice_tolerance,
        favorite_cuisines, dietary_protocols,
        parking_instructions, access_instructions,
        kitchen_size, kitchen_constraints, equipment_available,
        house_rules
      `
      )
      .eq('id', user.entityId)
      .single(),
  ])

  if (!event) throw new Error('Event not found')

  return { event, client }
}
