// Event Countdown Server Actions
// Provides countdown data and toggle for events.
// Uses existing events table (countdown_enabled BOOLEAN column added by migration 20260312000007)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Types ---

export type EventCountdown = {
  eventId: string
  eventName: string
  eventDate: string
  status: string
  countdownEnabled: boolean
  daysUntil: number
  hoursUntil: number
}

// --- Schemas ---

const EventIdSchema = z.string().uuid()
const ToggleCountdownSchema = z.object({
  eventId: z.string().uuid(),
  enabled: z.boolean(),
})

// --- Actions ---

/**
 * Get countdown information for an event.
 * Returns the event date, time until the event, and whether countdown is enabled.
 */
export async function getEventCountdown(eventId: string): Promise<EventCountdown | null> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }

  const supabase = createServerClient()
  const validatedEventId = EventIdSchema.parse(eventId)

  let query = supabase
    .from('events')
    .select('id, occasion, event_date, serve_time, status, countdown_enabled')
    .eq('id', validatedEventId)

  if (user.role === 'chef') {
    query = query.eq('tenant_id', user.tenantId!)
  } else {
    query = query.eq('client_id', user.entityId).not('status', 'eq', 'draft')
  }

  const { data: event, error } = await query.single()

  if (error || !event) {
    return null
  }

  // Calculate time until event
  const now = new Date()
  const serveTime = event.serve_time || '18:00'
  const eventDateTime = new Date(`${event.event_date}T${serveTime}:00`)

  const diffMs = eventDateTime.getTime() - now.getTime()
  const daysUntil = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hoursUntil = Math.floor(diffMs / (1000 * 60 * 60))

  return {
    eventId: event.id,
    eventName: event.occasion || 'Untitled Event',
    eventDate: event.event_date,
    status: event.status,
    countdownEnabled: event.countdown_enabled ?? true,
    daysUntil: Math.max(daysUntil, 0),
    hoursUntil: Math.max(hoursUntil, 0),
  }
}

/**
 * Toggle the countdown display for an event.
 */
export async function toggleCountdown(
  eventId: string,
  enabled: boolean
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const validated = ToggleCountdownSchema.parse({ eventId, enabled })

  // Verify the event belongs to this tenant
  const { data: event } = await supabase
    .from('events')
    .select('id')
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  const { error } = await supabase
    .from('events')
    .update({
      countdown_enabled: validated.enabled,
      updated_by: user.id,
    })
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleCountdown] Error:', error)
    throw new Error('Failed to toggle countdown')
  }

  revalidatePath(`/events/${validated.eventId}`)
  revalidatePath(`/my-events/${validated.eventId}`)
  revalidatePath('/dashboard')

  return { success: true }
}

/**
 * Get countdowns for all upcoming events (for dashboard display).
 * Only returns events where countdown_enabled is true.
 */
export async function getUpcomingCountdowns(): Promise<EventCountdown[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: events, error } = await supabase
    .from('events')
    .select('id, occasion, event_date, serve_time, status, countdown_enabled')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', today)
    .not('status', 'in', '("cancelled","completed")')
    .eq('countdown_enabled', true)
    .order('event_date', { ascending: true })
    .limit(5)

  if (error) {
    console.error('[getUpcomingCountdowns] Error:', error)
    return []
  }

  const now = new Date()

  return (events || []).map((event: any) => {
    const serveTime = event.serve_time || '18:00'
    const eventDateTime = new Date(`${event.event_date}T${serveTime}:00`)
    const diffMs = eventDateTime.getTime() - now.getTime()

    return {
      eventId: event.id,
      eventName: event.occasion || 'Untitled Event',
      eventDate: event.event_date,
      status: event.status,
      countdownEnabled: event.countdown_enabled ?? true,
      daysUntil: Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0),
      hoursUntil: Math.max(Math.floor(diffMs / (1000 * 60 * 60)), 0),
    }
  })
}
