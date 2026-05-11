'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { differenceInDays } from 'date-fns'

export interface DietaryReminderStatus {
  needsConfirmation: boolean
  daysUntilEvent: number
  guestsWithoutDietary: number
}

/**
 * Check if dietary info is confirmed for an upcoming event.
 * Returns reminder status for events within 7 days that have guests
 * missing dietary information.
 */
export async function getDietaryReminderStatus(
  eventId: string
): Promise<DietaryReminderStatus | null> {
  const user = await requireClient()
  const db: any = createServerClient()

  // Fetch event basics
  const { data: event } = await db
    .from('events')
    .select('id, status, event_date, pre_event_checklist_confirmed_at, client_id')
    .eq('id', eventId)
    .eq('client_id', user.entityId)
    .single()

  if (!event) return null

  // Only relevant for upcoming confirmed/paid/in_progress events
  if (!['confirmed', 'paid', 'in_progress'].includes(event.status)) return null

  // Already confirmed checklist? No reminder needed
  if (event.pre_event_checklist_confirmed_at) {
    return { needsConfirmation: false, daysUntilEvent: 0, guestsWithoutDietary: 0 }
  }

  const daysUntilEvent = differenceInDays(new Date(event.event_date), new Date())

  // Only show for events within 7 days
  if (daysUntilEvent > 7 || daysUntilEvent < 0) return null

  // Count guests without dietary info
  const { data: guests } = await db
    .from('event_guests')
    .select('id, dietary_restrictions, allergies')
    .eq('event_id', eventId)
    .eq('rsvp_status', 'attending')

  const guestsWithoutDietary = (guests ?? []).filter(
    (g: any) =>
      (!g.dietary_restrictions || g.dietary_restrictions.length === 0) &&
      (!g.allergies || g.allergies.length === 0)
  ).length

  // Need confirmation if checklist not done (regardless of guest dietary data)
  const needsConfirmation = true

  return {
    needsConfirmation,
    daysUntilEvent,
    guestsWithoutDietary,
  }
}
