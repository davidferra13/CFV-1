// Calendar Types & Constants
// Shared between server actions (lib/calendar/actions.ts) and client components.
// Lives outside 'use server' so constants can be exported freely.

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

export type CalendarFilters = {
  showEvents: boolean
  showDraftEvents: boolean
  showPrepBlocks: boolean
  showCalls: boolean
  showPersonal: boolean
  showBusiness: boolean
  showIntentions: boolean
  showLeads: boolean
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
  showEvents: true,
  showDraftEvents: true,
  showPrepBlocks: true,
  showCalls: true,
  showPersonal: true,
  showBusiness: true,
  showIntentions: true,
  showLeads: false,
}

export type WeekDensity = {
  weekStart: string // Monday of the week, ISO date
  eventCount: number
  prepBlockCount: number
  calendarEntryCount: number
  callCount: number
  hasGap: boolean
  dominantCategory?: CalendarCategory
}
