// Google Calendar Sync - Core Utilities
// ICS generation + Google Calendar API calls.
// Uses google_connections table (not chef_settings - that table does not exist).
// All token management is delegated to lib/gmail/google-auth.ts.

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { getGoogleAccessToken } from '@/lib/google/auth'
import type { GoogleCalendarServiceStatus } from '@/lib/google/types'
import { dateToDateString } from '@/lib/utils/format'
import { normalizeEventTimezoneTruthValue } from '@/lib/events/time-truth'

const GCAL_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const GCAL_API_ROOT = 'https://www.googleapis.com/calendar/v3'
const DEFAULT_CALENDAR_TRUTH_LOOKAHEAD_DAYS = 45
const GOOGLE_CALENDAR_SYNC_STATUSES = ['confirmed', 'in_progress', 'paid', 'accepted'] as const

type DbClient = any

type GoogleCalendarListEntry = {
  id: string
  label: string
}

type ExternalCalendarBusyRange = {
  startAt: string
  endAt: string
  source: string
  calendarId: string
  calendarLabel: string
  googleEventId: string | null
  summary: string | null
  startDay: string
  endDay: string
  allDay: boolean
}

type ChefFlowSyncedEventMeta = {
  dateKey: string
  googleEventId: string | null
}

type CalendarTruthWindow = {
  connection: CalendarConnection
  externalBusy: ExternalCalendarBusyRange[]
  busyDates: string[]
}

export type CalendarConnection = GoogleCalendarServiceStatus

function defaultCalendarConnection(
  input?: Partial<Pick<CalendarConnection, 'connected' | 'email' | 'lastSync'>>
): CalendarConnection {
  return {
    connected: input?.connected === true,
    email: input?.email ?? null,
    lastSync: input?.lastSync ?? null,
    checkedAt: null,
    health: 'unknown',
    healthDetail: null,
    busyRangeCount: 0,
    conflictCount: 0,
    calendarCount: 0,
  }
}

function getDefaultTruthWindow() {
  const windowStart = new Date()
  windowStart.setUTCHours(0, 0, 0, 0)
  const windowEnd = new Date(windowStart)
  windowEnd.setUTCDate(windowEnd.getUTCDate() + DEFAULT_CALENDAR_TRUTH_LOOKAHEAD_DAYS)

  return {
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
  }
}

async function getLatestOutboundCalendarSync(chefId: string, db: DbClient): Promise<string | null> {
  const { data, error } = await db
    .from('events')
    .select('google_calendar_synced_at')
    .eq('tenant_id', chefId)
    .not('google_calendar_synced_at', 'is', null)
    .order('google_calendar_synced_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to load Google Calendar sync state: ${error.message}`)
  }

  return (data?.[0] as any)?.google_calendar_synced_at ?? null
}

function getDatePart(value: { date?: string | null; dateTime?: string | null } | null | undefined) {
  if (typeof value?.date === 'string' && value.date.length >= 10) {
    return value.date.slice(0, 10)
  }
  if (typeof value?.dateTime === 'string' && value.dateTime.length >= 10) {
    return value.dateTime.slice(0, 10)
  }
  return null
}

function toIsoBoundary(
  value: { date?: string | null; dateTime?: string | null } | null | undefined
) {
  if (typeof value?.dateTime === 'string') {
    const normalized = new Date(value.dateTime)
    if (!Number.isNaN(normalized.getTime())) {
      return normalized.toISOString()
    }
  }

  const datePart = getDatePart(value)
  return datePart ? `${datePart}T00:00:00.000Z` : null
}

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function expandDateKeys(startDay: string, endDayInclusive: string) {
  const keys: string[] = []
  const cursor = new Date(`${startDay}T00:00:00.000Z`)
  const end = new Date(`${endDayInclusive}T00:00:00.000Z`)

  while (cursor.getTime() <= end.getTime()) {
    keys.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return keys
}

function getBusyDateKeys(range: ExternalCalendarBusyRange) {
  const endDayInclusive = range.allDay ? shiftDateKey(range.endDay, -1) : range.endDay
  if (endDayInclusive < range.startDay) {
    return [range.startDay]
  }
  return expandDateKeys(range.startDay, endDayInclusive)
}

function normalizeBusyRange(
  item: any,
  calendar: GoogleCalendarListEntry
): ExternalCalendarBusyRange | null {
  if (!item || item.status === 'cancelled' || item.transparency === 'transparent') {
    return null
  }

  const startDay = getDatePart(item.start)
  const endDay = getDatePart(item.end)
  const startAt = toIsoBoundary(item.start)
  const endAt = toIsoBoundary(item.end)
  if (!startDay || !endDay || !startAt || !endAt) return null

  if (Date.parse(endAt) <= Date.parse(startAt)) {
    return null
  }

  return {
    startAt,
    endAt,
    source: `google:${calendar.label}`,
    calendarId: calendar.id,
    calendarLabel: calendar.label,
    googleEventId: typeof item.id === 'string' ? item.id : null,
    summary: typeof item.summary === 'string' ? item.summary : null,
    startDay,
    endDay,
    allDay: Boolean(item.start?.date || item.end?.date),
  }
}

async function listGoogleCalendars(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const calendars: GoogleCalendarListEntry[] = []
  let pageToken: string | null = null

  do {
    const params = new URLSearchParams({
      showHidden: 'false',
      minAccessRole: 'reader',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const response = await fetch(`${GCAL_API_ROOT}/users/me/calendarList?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Google Calendar list failed: ${await response.text()}`)
    }

    const payload = await response.json()
    for (const item of payload.items ?? []) {
      if (!item?.id || item.deleted === true || item.hidden === true) continue
      if (item.selected === false && item.primary !== true) continue

      calendars.push({
        id: String(item.id),
        label:
          typeof item.summaryOverride === 'string'
            ? item.summaryOverride
            : typeof item.summary === 'string'
              ? item.summary
              : item.primary
                ? 'Primary'
                : 'Google Calendar',
      })
    }

    pageToken = typeof payload.nextPageToken === 'string' ? payload.nextPageToken : null
  } while (pageToken)

  if (calendars.length === 0) {
    return [{ id: 'primary', label: 'Primary' }]
  }

  const unique = new Map<string, GoogleCalendarListEntry>()
  for (const calendar of calendars) {
    if (!unique.has(calendar.id)) {
      unique.set(calendar.id, calendar)
    }
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.id === 'primary') return -1
    if (right.id === 'primary') return 1
    return left.label.localeCompare(right.label)
  })
}

async function listBusyGoogleCalendarRanges(
  accessToken: string,
  calendars: GoogleCalendarListEntry[],
  windowStart: string,
  windowEnd: string
) {
  const calendarResults = await Promise.all(
    calendars.map(async (calendar) => {
      const busyRanges: ExternalCalendarBusyRange[] = []
      let pageToken: string | null = null

      do {
        const params = new URLSearchParams({
          singleEvents: 'true',
          orderBy: 'startTime',
          timeMin: windowStart,
          timeMax: windowEnd,
          maxResults: '2500',
          fields: 'items(id,status,summary,transparency,start,end),nextPageToken',
        })
        if (pageToken) params.set('pageToken', pageToken)

        const response = await fetch(
          `${GCAL_API_ROOT}/calendars/${encodeURIComponent(calendar.id)}/events?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          }
        )

        if (!response.ok) {
          throw new Error(
            `Google Calendar events failed for ${calendar.label}: ${await response.text()}`
          )
        }

        const payload = await response.json()
        for (const item of payload.items ?? []) {
          const normalized = normalizeBusyRange(item, calendar)
          if (normalized) busyRanges.push(normalized)
        }

        pageToken = typeof payload.nextPageToken === 'string' ? payload.nextPageToken : null
      } while (pageToken)

      return busyRanges
    })
  )

  return calendarResults.flat()
}

async function listChefFlowSyncedEventMeta(
  chefId: string,
  startDate: string,
  endDate: string,
  db: DbClient
) {
  const { data, error } = await db
    .from('events')
    .select('event_date, google_calendar_event_id')
    .eq('tenant_id', chefId)
    .in('status', [...GOOGLE_CALENDAR_SYNC_STATUSES])
    .gte('event_date', startDate)
    .lte('event_date', `${endDate}T23:59:59Z`)

  if (error) {
    throw new Error(`Failed to load ChefFlow calendar events: ${error.message}`)
  }

  return ((data ?? []) as Array<any>).map((event) => ({
    dateKey: dateToDateString(event.event_date as Date | string),
    googleEventId:
      typeof event.google_calendar_event_id === 'string' &&
      event.google_calendar_event_id.length > 0
        ? event.google_calendar_event_id
        : null,
  })) satisfies ChefFlowSyncedEventMeta[]
}

function reconcileBusyRanges(
  busyRanges: ExternalCalendarBusyRange[],
  syncedEvents: ChefFlowSyncedEventMeta[]
) {
  const syncedGoogleIds = new Set(
    syncedEvents
      .map((event) => event.googleEventId)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
  )
  const syncedDateKeys = new Set(syncedEvents.map((event) => event.dateKey))

  const reconciled = busyRanges.filter(
    (range) => !(range.googleEventId && syncedGoogleIds.has(range.googleEventId))
  )

  const externalBusyDates = new Set<string>()
  for (const range of reconciled) {
    for (const dateKey of getBusyDateKeys(range)) {
      externalBusyDates.add(dateKey)
    }
  }

  let conflictCount = 0
  for (const dateKey of syncedDateKeys) {
    if (externalBusyDates.has(dateKey)) {
      conflictCount += 1
    }
  }

  return {
    reconciled,
    externalBusyDates: Array.from(externalBusyDates).sort(),
    conflictCount,
  }
}

export const __calendarTruthTestUtils = {
  getBusyDateKeys,
  normalizeBusyRange,
  reconcileBusyRanges,
}

export async function getGoogleCalendarTruthForRange(
  chefId: string,
  windowStart: string,
  windowEnd: string,
  options?: { db?: DbClient }
): Promise<CalendarTruthWindow> {
  const db = (options?.db || createServerClient({ admin: true })) as DbClient
  const [{ data: connectionRow, error: connectionError }, lastSync] = await Promise.all([
    db
      .from('google_connections')
      .select('connected_email, calendar_connected')
      .eq('chef_id', chefId)
      .maybeSingle(),
    getLatestOutboundCalendarSync(chefId, db),
  ])

  if (connectionError) {
    throw new Error(`Failed to load Google Calendar connection: ${connectionError.message}`)
  }

  const baseConnection = defaultCalendarConnection({
    connected: connectionRow?.calendar_connected === true,
    email: connectionRow?.connected_email || null,
    lastSync,
  })

  if (!baseConnection.connected) {
    return {
      connection: baseConnection,
      externalBusy: [],
      busyDates: [],
    }
  }

  try {
    const accessToken = await getGoogleAccessToken(chefId, {
      skipSessionCheck: true,
      service: 'calendar',
    })
    const calendars = await listGoogleCalendars(accessToken)
    const startDate = windowStart.slice(0, 10)
    const endDate = windowEnd.slice(0, 10)

    const [busyRanges, syncedEvents] = await Promise.all([
      listBusyGoogleCalendarRanges(accessToken, calendars, windowStart, windowEnd),
      listChefFlowSyncedEventMeta(chefId, startDate, endDate, db),
    ])

    const { reconciled, externalBusyDates, conflictCount } = reconcileBusyRanges(
      busyRanges,
      syncedEvents
    )
    const checkedAt = new Date().toISOString()
    const healthDetail =
      conflictCount > 0
        ? `${conflictCount} upcoming date${conflictCount === 1 ? '' : 's'} already carry other Google Calendar busy time.`
        : `Live Google Calendar verification succeeded across ${calendars.length} calendar${calendars.length === 1 ? '' : 's'}.`

    return {
      connection: {
        ...baseConnection,
        checkedAt,
        health: conflictCount > 0 ? 'warning' : 'ok',
        healthDetail,
        busyRangeCount: reconciled.length,
        conflictCount,
        calendarCount: calendars.length,
      },
      externalBusy: reconciled,
      busyDates: externalBusyDates,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Google Calendar busy time could not be verified'
    return {
      connection: {
        ...baseConnection,
        checkedAt: null,
        health: 'error',
        healthDetail: message,
        busyRangeCount: 0,
        conflictCount: 0,
        calendarCount: 0,
      },
      externalBusy: [],
      busyDates: [],
    }
  }
}

export async function getCalendarConnectionForChef(chefId: string): Promise<CalendarConnection> {
  const { windowStart, windowEnd } = getDefaultTruthWindow()
  const truth = await getGoogleCalendarTruthForRange(chefId, windowStart, windowEnd)
  return truth.connection
}

// Calendar Connection Status

export async function getCalendarConnection(): Promise<CalendarConnection> {
  const chef = await requireChef()
  return getCalendarConnectionForChef(chef.entityId)
}

// ─── Initiate Google Calendar OAuth ──────────────────────────────────────────

export async function initiateGoogleCalendarConnect(): Promise<{ redirectUrl: string }> {
  const { initiateGoogleConnect } = await import('@/lib/google/auth')
  return initiateGoogleConnect([
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly',
  ])
}

// ─── Disconnect Google Calendar ───────────────────────────────────────────────

export async function disconnectGoogleCalendar() {
  const { disconnectGoogle } = await import('@/lib/google/auth')
  return disconnectGoogle('calendar')
}

// ─── Availability Check ───────────────────────────────────────────────────────

/**
 * Check if a date is available by querying ChefFlow events and live Google Calendar busy time.
 * Returns available=true only when neither internal nor external conflicts are found.
 * Used by the Ask Remy orchestrator for calendar.availability tasks.
 */
export async function checkCalendarAvailability(date: string): Promise<{
  available: boolean
  conflicts: Array<{ occasion: string; time: string }>
}> {
  const chef = await requireChef()
  const db: any = createServerClient()

  const dayStart = `${date}T00:00:00`
  const dayEnd = `${date}T23:59:59`

  const { data: events } = await db
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

  const truth = await getGoogleCalendarTruthForRange(
    chef.entityId,
    `${date}T00:00:00.000Z`,
    `${date}T23:59:59.999Z`,
    { db }
  )

  if (truth.connection.connected && truth.connection.health === 'error') {
    conflicts.push({
      occasion: 'Google Calendar verification unavailable',
      time: truth.connection.healthDetail || 'Unknown issue',
    })
  } else if (truth.busyDates.includes(date)) {
    conflicts.push({
      occasion: 'Google Calendar busy time',
      time: 'External calendar busy',
    })
  }

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
    const db: any = createServerClient()

    // Check calendar connection
    const { data: conn } = await db
      .from('google_connections')
      .select('calendar_connected')
      .eq('chef_id', chef.entityId)
      .single()

    if (!(conn as any)?.calendar_connected) {
      return { success: false, error: 'Google Calendar not connected' }
    }

    // Fetch event details - cast to any because google_calendar_event_id may not be in
    // the generated types yet (migration pending push)
    const { data: event } = await db
      .from('events')
      .select(
        'id, occasion, event_date, serve_time, event_timezone, guest_count, location_address, location_city, location_state, special_requests, ambiance_notes, google_calendar_event_id'
      )
      .eq('id', eventId)
      .eq('tenant_id', chef.tenantId!)
      .single()

    if (!event) return { success: false, error: 'Event not found' }

    // Get valid access token (auto-refreshes if expired)
    const accessToken = await getGoogleAccessToken(chef.entityId!, { service: 'calendar' })

    // Build event date+time strings
    const dateStr = dateToDateString(event.event_date as Date | string)
    const serveTime = (event.serve_time as string | null) ?? '18:00'
    const eventTimezone = normalizeEventTimezoneTruthValue((event as any).event_timezone)
    const startDateTime = `${dateStr}T${serveTime}:00`
    const [hours = '18', minutes = '00'] = serveTime.split(':')
    const startHour = Number.parseInt(hours, 10)
    const endHour = Math.min(23, (Number.isFinite(startHour) ? startHour : 18) + 4)
    const endDateTime = `${dateStr}T${String(endHour).padStart(2, '0')}:${minutes}:00`

    const location = [event.location_address, event.location_city, event.location_state]
      .filter(Boolean)
      .join(', ')

    const description = [
      event.special_requests ? `Notes: ${event.special_requests}` : '',
      (event as any).ambiance_notes ? `Atmosphere: ${(event as any).ambiance_notes}` : '',
      event.guest_count ? `Guests: ${event.guest_count}` : '',
      `ChefFlow Event ID: ${event.id}`,
    ]
      .filter(Boolean)
      .join('\n')

    const calendarBody = {
      summary: (event.occasion as string | null) || 'Private Chef Event',
      start: { dateTime: startDateTime, timeZone: eventTimezone },
      end: { dateTime: endDateTime, timeZone: eventTimezone },
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
    await db
      .from('events')
      .update({
        google_calendar_event_id: googleEventId,
        google_calendar_synced_at: new Date().toISOString(),
      })
      .eq('id', eventId)

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
    const db: any = createServerClient()

    const { data: event } = await db
      .from('events')
      .select('google_calendar_event_id')
      .eq('id', eventId)
      .eq('tenant_id', chef.tenantId!)
      .single()

    const googleEventId = (event as any)?.google_calendar_event_id
    if (!googleEventId) {
      return { success: true } // Nothing to delete
    }

    const accessToken = await getGoogleAccessToken(chef.entityId!, { service: 'calendar' })

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
    await db
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
