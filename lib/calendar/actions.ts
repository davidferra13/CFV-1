// Unified Calendar Aggregator - Server Actions
// Single source of truth for all calendar data across:
// - Events (any status)
// - Prep blocks
// - Scheduled calls
// - Chef availability blocks
// - Waitlist entries (as lead indicators)
// - Chef calendar entries (personal, business, intentions)
// - Inquiries with targeted event dates (as soft lead indicators)
//
// Consumers apply CalendarFilters client-side to show/hide categories.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getCalendarColor, getCalendarBorderStyle } from './colors'
import { DEFAULT_CALENDAR_FILTERS } from './constants'
// CalendarFilters type is defined in and should be imported from './constants' directly.

function localDateISO(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

// postgres.js 3.x returns DATE/TIMESTAMPTZ columns as Date objects at runtime.
// TypeScript types may say "string" but the runtime value is a Date.
// This helper normalizes to YYYY-MM-DD regardless.
function dateFieldToISO(val: Date | string | null | undefined): string | null {
  if (!val) return null
  return val instanceof Date ? localDateISO(val) : (val as string).slice(0, 10)
}

// Extract HH:MM time string from a TIMESTAMPTZ Date object (local time).
function tsToLocalTime(val: Date | string | null | undefined): string | null {
  if (!val) return null
  const d = val instanceof Date ? val : new Date(val as string)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ============================================
// TYPES
// ============================================

export type UnifiedCalendarItemType =
  | 'event'
  | 'prep_block'
  | 'call'
  | 'availability_block'
  | 'waitlist'
  | 'calendar_entry'
  | 'inquiry'

export type CalendarCategory =
  | 'events'
  | 'draft'
  | 'prep'
  | 'calls'
  | 'personal'
  | 'business'
  | 'intentions'
  | 'leads'
  | 'blocked'

export type UnifiedCalendarItem = {
  id: string
  type: UnifiedCalendarItemType
  category: CalendarCategory
  title: string
  startDate: string // ISO YYYY-MM-DD
  endDate: string // ISO YYYY-MM-DD (same as startDate for single-day)
  startTime?: string // HH:MM (omit for all-day)
  endTime?: string // HH:MM
  allDay: boolean
  color: string // hex
  borderStyle: 'solid' | 'dashed' | 'dotted'
  url?: string // deep link to detail page
  isBlocking: boolean // whether this item blocks a booking
  status?: string // event/call status
  subType?: string // prep_block_type, calendar entry_type, etc.
  isMultiDay: boolean // convenience: endDate !== startDate
}

// CalendarFilters type and DEFAULT_CALENDAR_FILTERS live in lib/calendar/constants.ts

// ============================================
// UNIFIED CALENDAR AGGREGATOR
// ============================================

export async function getUnifiedCalendar(
  startDate: string,
  endDate: string
): Promise<UnifiedCalendarItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!
  const items: UnifiedCalendarItem[] = []

  // Run all queries in parallel for performance
  const [
    eventsResult,
    prepBlocksResult,
    callsResult,
    availBlocksResult,
    waitlistResult,
    calendarEntriesResult,
    inquiriesResult,
  ] = await Promise.all([
    // 1. Events
    db
      .from('events')
      .select('id, occasion, event_date, serve_time, status, location_city')
      .eq('tenant_id', chefId)
      .gte('event_date', startDate)
      .lte('event_date', endDate)
      .not('status', 'eq', 'cancelled'),

    // 2. Prep blocks
    db
      .from('event_prep_blocks' as any)
      .select('id, block_date, start_time, end_time, block_type, title, is_completed, event_id')
      .eq('chef_id', chefId)
      .gte('block_date', startDate)
      .lte('block_date', endDate) as any,

    // 3. Scheduled calls
    db
      .from('scheduled_calls')
      .select('id, title, call_type, scheduled_at, duration_minutes, status, client_id')
      .eq('tenant_id', chefId)
      .gte('scheduled_at', `${startDate}T00:00:00Z`)
      .lte('scheduled_at', `${endDate}T23:59:59Z`)
      .not('status', 'in', '("cancelled","no_show")'),

    // 4. Manual availability blocks
    db
      .from('chef_availability_blocks')
      .select('id, block_date, reason, is_event_auto')
      .eq('chef_id', chefId)
      .gte('block_date', startDate)
      .lte('block_date', endDate)
      .eq('is_event_auto', false), // event-auto blocks already covered by events

    // 5. Waitlist entries (lead indicators)
    db
      .from('waitlist_entries')
      .select('id, requested_date, requested_date_end, occasion, status')
      .eq('chef_id', chefId)
      .eq('status', 'waiting')
      .gte('requested_date', startDate)
      .lte('requested_date', endDate),

    // 6. Chef calendar entries
    db
      .from('chef_calendar_entries')
      .select(
        'id, entry_type, title, start_date, end_date, all_day, start_time, end_time, blocks_bookings, color_override, is_completed'
      )
      .eq('chef_id', chefId)
      .lte('start_date', endDate)
      .gte('end_date', startDate),

    // 7. Inquiries with an event date target
    db
      .from('inquiries')
      .select('id, occasion, preferred_date, status')
      .eq('tenant_id', chefId)
      .not('preferred_date', 'is', null)
      .gte('preferred_date', startDate)
      .lte('preferred_date', endDate)
      .in('status', ['new', 'contacted', 'menu_drafting', 'sent_to_client']) as any,
  ])

  // -- 1. Events --
  for (const event of eventsResult.data ?? []) {
    const isDraft = ['draft', 'proposed', 'accepted'].includes(event.status)
    const subType = isDraft ? 'event_draft' : 'event_confirmed'
    items.push({
      id: event.id,
      type: 'event',
      category: isDraft ? 'draft' : 'events',
      title: event.occasion ?? 'Private Event',
      startDate: dateFieldToISO(event.event_date as Date | string) ?? '',
      endDate: dateFieldToISO(event.event_date as Date | string) ?? '',
      startTime: event.serve_time ?? undefined,
      allDay: !event.serve_time,
      color: getCalendarColor('event', subType, event.status),
      borderStyle: 'solid',
      url: `/events/${event.id}`,
      isBlocking: true,
      status: event.status,
      subType,
      isMultiDay: false,
    })
  }

  // -- 2. Prep Blocks --
  for (const block of prepBlocksResult.data ?? []) {
    items.push({
      id: block.id,
      type: 'prep_block',
      category: 'prep',
      title: block.title,
      startDate: dateFieldToISO(block.block_date as Date | string) ?? '',
      endDate: dateFieldToISO(block.block_date as Date | string) ?? '',
      startTime: block.start_time ?? undefined,
      endTime: block.end_time ?? undefined,
      allDay: !block.start_time,
      color: getCalendarColor('prep_block', block.block_type),
      borderStyle: 'solid',
      url: block.event_id ? `/events/${block.event_id}` : undefined,
      isBlocking: false,
      subType: block.block_type,
      isMultiDay: false,
    })
  }

  // -- 3. Scheduled Calls --
  for (const call of callsResult.data ?? []) {
    const callDate = dateFieldToISO(call.scheduled_at as Date | string) ?? ''
    const callTime = tsToLocalTime(call.scheduled_at as Date | string) ?? undefined // HH:MM (local time)
    const endMinutes =
      call.duration_minutes && callTime
        ? addMinutesToTime(callTime, call.duration_minutes)
        : undefined
    items.push({
      id: call.id,
      type: 'call',
      category: 'calls',
      title: call.title ?? formatCallType(call.call_type),
      startDate: callDate,
      endDate: callDate,
      startTime: callTime,
      endTime: endMinutes,
      allDay: false,
      color: getCalendarColor('call'),
      borderStyle: 'solid',
      url: `/calls/${call.id}`,
      isBlocking: false,
      status: call.status,
      isMultiDay: false,
    })
  }

  // -- 4. Manual Availability Blocks --
  for (const block of availBlocksResult.data ?? []) {
    items.push({
      id: block.id,
      type: 'availability_block',
      category: 'blocked',
      title: block.reason ?? 'Blocked',
      startDate: dateFieldToISO(block.block_date as Date | string) ?? '',
      endDate: dateFieldToISO(block.block_date as Date | string) ?? '',
      allDay: true,
      color: getCalendarColor('availability_block'),
      borderStyle: 'solid',
      isBlocking: true,
      isMultiDay: false,
    })
  }

  // -- 5. Waitlist Entries --
  for (const entry of waitlistResult.data ?? []) {
    const wStart = dateFieldToISO(entry.requested_date as Date | string) ?? ''
    const wEnd = dateFieldToISO(entry.requested_date_end as Date | string | null) ?? wStart
    items.push({
      id: entry.id,
      type: 'waitlist',
      category: 'leads',
      title: entry.occasion ? `Waitlist: ${entry.occasion}` : 'Waitlist Request',
      startDate: wStart,
      endDate: wEnd,
      allDay: true,
      color: getCalendarColor('waitlist'),
      borderStyle: getCalendarBorderStyle('waitlist'),
      url: '/inquiries',
      isBlocking: false,
      isMultiDay: !!(entry.requested_date_end && wEnd !== wStart),
    })
  }

  // -- 6. Chef Calendar Entries --
  const PERSONAL_TYPES = new Set(['vacation', 'time_off', 'personal'])
  const INTENTION_TYPES = new Set(['target_booking', 'soft_preference'])

  for (const entry of calendarEntriesResult.data ?? []) {
    let category: CalendarCategory = 'business'
    if (PERSONAL_TYPES.has(entry.entry_type)) category = 'personal'
    else if (INTENTION_TYPES.has(entry.entry_type)) category = 'intentions'

    const eStart = dateFieldToISO(entry.start_date as Date | string) ?? ''
    const eEnd = dateFieldToISO(entry.end_date as Date | string) ?? eStart
    const isMultiDay = eEnd !== eStart

    items.push({
      id: entry.id,
      type: 'calendar_entry',
      category,
      title: entry.title,
      startDate: eStart,
      endDate: eEnd,
      startTime: entry.all_day ? undefined : (entry.start_time ?? undefined),
      endTime: entry.all_day ? undefined : (entry.end_time ?? undefined),
      allDay: entry.all_day,
      color: getCalendarColor('calendar_entry', entry.entry_type, undefined, entry.color_override),
      borderStyle: getCalendarBorderStyle('calendar_entry', entry.entry_type),
      url: `/calendar/entry/${entry.id}`,
      isBlocking: entry.blocks_bookings,
      subType: entry.entry_type,
      isMultiDay,
    })
  }

  // -- 7. Inquiries (date-targeted) --
  for (const inquiry of inquiriesResult.data ?? []) {
    if (!inquiry.preferred_date) continue
    const iDate = dateFieldToISO(inquiry.preferred_date as Date | string) ?? ''
    items.push({
      id: inquiry.id,
      type: 'inquiry',
      category: 'leads',
      title: inquiry.occasion ? `Inquiry: ${inquiry.occasion}` : 'Inquiry',
      startDate: iDate,
      endDate: iDate,
      allDay: true,
      color: getCalendarColor('inquiry'),
      borderStyle: getCalendarBorderStyle('inquiry'),
      url: `/inquiries/${inquiry.id}`,
      isBlocking: false,
      status: inquiry.status,
      isMultiDay: false,
    })
  }

  // Sort by startDate, then startTime
  items.sort((a, b) => {
    const dateComp = a.startDate.localeCompare(b.startDate)
    if (dateComp !== 0) return dateComp
    if (a.allDay && !b.allDay) return -1
    if (!a.allDay && b.allDay) return 1
    return (a.startTime ?? '').localeCompare(b.startTime ?? '')
  })

  return items
}

// ============================================
// HELPERS
// ============================================

function formatCallType(callType: string): string {
  return callType
    .split('_')
    .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = h * 60 + m + minutes
  const newH = Math.floor(totalMinutes / 60) % 24
  const newM = totalMinutes % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

// ============================================
// FILTERED CALENDAR (server-side, for initial load)
// ============================================

export async function getFilteredCalendar(
  startDate: string,
  endDate: string,
  filters: Partial<import('./constants').CalendarFilters> = {}
): Promise<UnifiedCalendarItem[]> {
  const allItems = await getUnifiedCalendar(startDate, endDate)
  const f = { ...DEFAULT_CALENDAR_FILTERS, ...filters }

  return allItems.filter((item) => {
    if (item.category === 'events' && !f.showEvents) return false
    if (item.category === 'draft' && !f.showDraftEvents) return false
    if (item.category === 'prep' && !f.showPrepBlocks) return false
    if (item.category === 'calls' && !f.showCalls) return false
    if (item.category === 'personal' && !f.showPersonal) return false
    if (item.category === 'business' && !f.showBusiness) return false
    if (item.category === 'intentions' && !f.showIntentions) return false
    if (
      (item.category === 'leads' || item.type === 'waitlist' || item.type === 'inquiry') &&
      !f.showLeads
    )
      return false
    return true
  })
}

// ============================================
// YEAR DENSITY (for year view)
// ============================================

export type WeekDensity = {
  weekStart: string // Monday of the week, ISO date
  eventCount: number
  prepBlockCount: number
  calendarEntryCount: number
  callCount: number
  hasGap: boolean
  dominantCategory?: CalendarCategory
}

export async function getYearDensity(year: number): Promise<WeekDensity[]> {
  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`
  const items = await getUnifiedCalendar(startDate, endDate)

  // Build a map of date => items
  const byDate: Record<string, UnifiedCalendarItem[]> = {}
  for (const item of items) {
    // Expand multi-day entries to all their dates
    let current = item.startDate
    while (current <= item.endDate) {
      if (!byDate[current]) byDate[current] = []
      byDate[current].push(item)
      const [cy, cm, cd] = current.split('-').map(Number)
      current = localDateISO(new Date(cy, cm - 1, cd + 1))
    }
  }

  const weeks: WeekDensity[] = []
  // Walk week-by-week from Jan 1 of year
  const jan1 = new Date(`${year}-01-01`)
  // Start from the Monday of that week
  const dayOfWeek = jan1.getDay()
  const monday = new Date(jan1)
  monday.setDate(jan1.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  while (monday.getFullYear() <= year) {
    const weekStart = localDateISO(monday)
    const weekItems: UnifiedCalendarItem[] = []

    for (let d = 0; d < 7; d++) {
      const dayDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + d)
      const dateStr = localDateISO(dayDate)
      if (byDate[dateStr]) weekItems.push(...byDate[dateStr])
    }

    const eventCount = weekItems.filter((i) => i.type === 'event' && i.category === 'events').length
    const prepBlockCount = weekItems.filter((i) => i.type === 'prep_block').length
    const calendarEntryCount = weekItems.filter((i) => i.type === 'calendar_entry').length
    const callCount = weekItems.filter((i) => i.type === 'call').length

    // Dominant category for week tinting
    const categoryCounts: Record<string, number> = {}
    for (const item of weekItems) {
      categoryCounts[item.category] = (categoryCounts[item.category] ?? 0) + 1
    }
    const dominantCategory = Object.entries(categoryCounts).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0] as CalendarCategory | undefined

    weeks.push({
      weekStart,
      eventCount,
      prepBlockCount,
      calendarEntryCount,
      callCount,
      hasGap: false, // gap detection done separately by prep-block engine
      dominantCategory,
    })

    monday.setDate(monday.getDate() + 7)
    if (monday.getFullYear() > year + 1) break
  }

  return weeks
}
