// Google Calendar Sync - Core Utilities
// ICS generation + Google Calendar API calls.
// Uses google_connections table (not chef_settings - that table does not exist).
// All token management is delegated to lib/gmail/google-auth.ts.

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { getGoogleAccessToken } from '@/lib/google/auth'

const GCAL_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CalendarConnection {
  connected: boolean
  email: string | null
  lastSync: string | null
}

// ─── Calendar Connection Status ───────────────────────────────────────────────

export async function getCalendarConnection(): Promise<CalendarConnection> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('google_connections')
    .select('connected_email, calendar_connected')
    .eq('chef_id', chef.entityId)
    .single()

  if (!data) {
    return { connected: false, email: null, lastSync: null }
  }

  return {
    connected: (data as any)?.calendar_connected || false,
    email: (data as any)?.connected_email || null,
    lastSync: null,
  }
}

// ─── Initiate Google Calendar OAuth ──────────────────────────────────────────

export async function initiateGoogleCalendarConnect(): Promise<{ redirectUrl: string }> {
  const { initiateGoogleConnect } = await import('@/lib/google/auth')
  return initiateGoogleConnect([
    'https://www.googleapis.com/auth/calendar.events',
    'email',
    'profile',
  ])
}

// ─── Disconnect Google Calendar ───────────────────────────────────────────────

export async function disconnectGoogleCalendar() {
  const { disconnectGoogle } = await import('@/lib/google/auth')
  return disconnectGoogle('calendar')
}

// ─── Availability Check ───────────────────────────────────────────────────────

/**
 * Check if a date is available by querying ChefFlow's own events table.
 * Returns available=true if no confirmed/in-progress events exist on that date.
 * Used by the Ask Remy orchestrator for calendar.availability tasks.
 */
export async function checkCalendarAvailability(date: string): Promise<{
  available: boolean
  conflicts: Array<{ occasion: string; time: string }>
}> {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`

  const { data: events } = await supabase
    .from('events')
    .select('occasion, serve_time, status')
    .eq('tenant_id', chef.entityId!)
    .gte('event_date', dayStart)
    .lte('event_date', dayEnd)
    .not('status', 'in', '("cancelled","draft")')

  const conflicts = (events ?? []).map((e: Record<string, unknown>) => ({
    occasion: (e.occasion as string) || 'Event',
    time: (e.serve_time as string) || 'TBD',
  }))

  return {
    available: conflicts.length === 0,
    conflicts,
  }
}

// ─── Sync Event → Google Calendar ────────────────────────────────────────────

/**
 * Creates or updates a Google Calendar event for a ChefFlow event.
 * Stores the returned google event ID back on the events row.
 * Skips silently if calendar is not connected.
 */
export async function syncEventToGoogleCalendar(
  eventId: string
): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
  try {
    const chef = await requireChef()
    const supabase: any = createServerClient()

    // Check calendar connection
    const { data: conn } = await supabase
      .from('google_connections')
      .select('calendar_connected')
      .eq('chef_id', chef.entityId)
      .single()

    if (!(conn as any)?.calendar_connected) {
      return { success: false, error: 'Google Calendar not connected' }
    }

    // Fetch event details - cast to any because google_calendar_event_id may not be in
    // the generated types yet (migration pending push)
    const { data: event } = await supabase
      .from('events')
      .select(
        'id, occasion, event_date, serve_time, guest_count, location_address, location_city, location_state, special_requests, google_calendar_event_id'
      )
      .eq('id', eventId)
      .eq('tenant_id', chef.tenantId!)
      .single()

    if (!event) return { success: false, error: 'Event not found' }

    // Get valid access token (auto-refreshes if expired)
    const accessToken = await getGoogleAccessToken(chef.entityId!)

    // Build event date+time strings
    const dateStr = (event.event_date as string).slice(0, 10)
    const serveTime = (event.serve_time as string | null) ?? '18:00'
    const startDateTime = `${dateStr}T${serveTime}:00`
    const endDateTime = `${dateStr}T22:00:00` // default 4-hour window

    const location = [event.location_address, event.location_city, event.location_state]
      .filter(Boolean)
      .join(', ')

    const description = [
      event.special_requests ? `Notes: ${event.special_requests}` : '',
      event.guest_count ? `Guests: ${event.guest_count}` : '',
      `ChefFlow Event ID: ${event.id}`,
    ]
      .filter(Boolean)
      .join('\n')

    const calendarBody = {
      summary: (event.occasion as string | null) || 'Private Chef Event',
      start: { dateTime: startDateTime, timeZone: 'America/New_York' },
      end: { dateTime: endDateTime, timeZone: 'America/New_York' },
      ...(location && { location }),
      description,
    }

    const existingGoogleId = event.google_calendar_event_id as string | null

    let googleEventId: string

    if (existingGoogleId) {
      // Update existing Google Calendar event
      const response = await fetch(`${GCAL_API}/${existingGoogleId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarBody),
      })
      if (!response.ok) {
        const err = await response.text()
        return { success: false, error: `Google Calendar update failed: ${err}` }
      }
      googleEventId = existingGoogleId
    } else {
      // Create new Google Calendar event
      const response = await fetch(GCAL_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(calendarBody),
      })
      if (!response.ok) {
        const err = await response.text()
        return { success: false, error: `Google Calendar create failed: ${err}` }
      }
      const created = await response.json()
      googleEventId = created.id
    }

    // Store Google event ID back on the ChefFlow event
    // cast as any - columns not in generated types until migration is pushed
    await supabase
      .from('events')
      .update({
        google_calendar_event_id: googleEventId,
        google_calendar_synced_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    // Update last_sync on the connection
    await supabase
      .from('google_connections')
      .update({ calendar_last_sync_at: new Date().toISOString() } as any)
      .eq('chef_id', chef.entityId)

    return { success: true, googleEventId }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ─── Delete Event from Google Calendar ───────────────────────────────────────

/**
 * Deletes a ChefFlow event from Google Calendar when the event is cancelled.
 * Skips silently if no google_calendar_event_id is set.
 */
export async function deleteEventFromGoogleCalendar(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const chef = await requireChef()
    const supabase: any = createServerClient()

    const { data: event } = await supabase
      .from('events')
      .select('google_calendar_event_id')
      .eq('id', eventId)
      .eq('tenant_id', chef.tenantId!)
      .single()

    const googleEventId = (event as any)?.google_calendar_event_id
    if (!googleEventId) {
      return { success: true } // Nothing to delete
    }

    const accessToken = await getGoogleAccessToken(chef.entityId!)

    const response = await fetch(`${GCAL_API}/${googleEventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    // 404 means already deleted - treat as success
    if (!response.ok && response.status !== 404) {
      const err = await response.text()
      return { success: false, error: `Google Calendar delete failed: ${err}` }
    }

    // Clear the stored Google event ID
    await supabase
      .from('events')
      .update({
        google_calendar_event_id: null,
        google_calendar_synced_at: null,
      } as any)
      .eq('id', eventId)

    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
