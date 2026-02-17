// @ts-nocheck
// TODO: References chef_settings table that doesn't exist. Should use google_connections instead.
// DEFERRED: Calendar sync. References chef_settings table that should be google_connections. Will be updated when Google Calendar integration is completed.
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CalendarConnection {
  connected: boolean
  email: string | null
  lastSync: string | null
}

export interface ICSEvent {
  uid: string
  summary: string
  dtstart: string
  dtend: string
  location: string | null
  description: string | null
  sequence: number
}

// ─── Generate ICS for Event ─────────────────────────────────────────────────

export function generateICS(event: {
  id: string
  title: string
  eventDate: string
  startTime?: string
  endTime?: string
  location?: string
  description?: string
  guestCount?: number
}, sequence = 0): string {
  const start = event.startTime
    ? `${event.eventDate.replace(/-/g, '')}T${event.startTime.replace(/:/g, '')}00`
    : `${event.eventDate.replace(/-/g, '')}T180000`
  const end = event.endTime
    ? `${event.eventDate.replace(/-/g, '')}T${event.endTime.replace(/:/g, '')}00`
    : `${event.eventDate.replace(/-/g, '')}T220000`

  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChefFlow//V1//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${event.id}@chefflow.app`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeICS(event.title)}`,
    `SEQUENCE:${sequence}`,
  ]

  if (event.location) lines.push(`LOCATION:${escapeICS(event.location)}`)

  const desc = [
    event.description || '',
    event.guestCount ? `Guests: ${event.guestCount}` : '',
    'Managed by ChefFlow',
  ].filter(Boolean).join('\\n')
  lines.push(`DESCRIPTION:${escapeICS(desc)}`)

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

// ─── Google Calendar Connection Status ──────────────────────────────────────

export async function getCalendarConnection(): Promise<CalendarConnection> {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('chef_settings')
    .select('google_calendar_email, google_calendar_connected, google_calendar_last_sync')
    .eq('chef_id', chef.id)
    .single()

  if (!data) {
    return { connected: false, email: null, lastSync: null }
  }

  return {
    connected: data.google_calendar_connected || false,
    email: data.google_calendar_email || null,
    lastSync: data.google_calendar_last_sync || null,
  }
}

// ─── Initiate Google Calendar OAuth ─────────────────────────────────────────

export async function initiateGoogleCalendarConnect(): Promise<{ redirectUrl: string }> {
  await requireChef()

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('Google Calendar integration not configured')

  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/google/callback`
  const scope = 'https://www.googleapis.com/auth/calendar.events'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
  })

  return { redirectUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }
}

// ─── Disconnect Google Calendar ─────────────────────────────────────────────

export async function disconnectGoogleCalendar() {
  const chef = await requireChef()
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('chef_settings')
    .update({
      google_calendar_connected: false,
      google_calendar_email: null,
      google_calendar_token: null,
      google_calendar_refresh_token: null,
    })
    .eq('chef_id', chef.id)

  if (error) throw new Error(error.message)
  return { success: true }
}

// ─── Sync Event to Google Calendar ──────────────────────────────────────────

export async function syncEventToGoogleCalendar(eventId: string) {
  const chef = await requireChef()
  const supabase = await createServerClient()

  // Get calendar token
  const { data: settings } = await supabase
    .from('chef_settings')
    .select('google_calendar_token, google_calendar_connected')
    .eq('chef_id', chef.id)
    .single()

  if (!settings?.google_calendar_connected || !settings.google_calendar_token) {
    throw new Error('Google Calendar not connected')
  }

  // Get event details
  const { data: event } = await supabase
    .from('events')
    .select('id, title, event_date, start_time, end_time, location, notes, guest_count')
    .eq('id', eventId)
    .eq('chef_id', chef.id)
    .single()

  if (!event) throw new Error('Event not found')

  // Create Google Calendar event via API
  const calendarEvent = {
    summary: event.title || `Private Dinner`,
    start: {
      dateTime: `${event.event_date}T${event.start_time || '18:00'}:00`,
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: `${event.event_date}T${event.end_time || '22:00'}:00`,
      timeZone: 'America/New_York',
    },
    location: event.location || undefined,
    description: [
      event.notes || '',
      event.guest_count ? `Guests: ${event.guest_count}` : '',
      `ChefFlow Event ID: ${event.id}`,
    ].filter(Boolean).join('\n'),
  }

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.google_calendar_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(calendarEvent),
    },
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Google Calendar sync failed: ${err}`)
  }

  return { success: true }
}
