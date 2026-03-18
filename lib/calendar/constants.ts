// Calendar constants - exported separately from server actions so they can be
// used in client components without triggering the 'use server' object export restriction.

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

// ── Calendar Saved Views (Calendar Sets) ────────────────────────────────────

export type CalendarSavedView = {
  id: string
  name: string
  filters: CalendarFilters
  isBuiltIn: boolean
}

const ALL_OFF: CalendarFilters = {
  showEvents: false,
  showDraftEvents: false,
  showPrepBlocks: false,
  showCalls: false,
  showPersonal: false,
  showBusiness: false,
  showIntentions: false,
  showLeads: false,
}

export const BUILT_IN_VIEWS: CalendarSavedView[] = [
  {
    id: 'full',
    name: 'Full View',
    filters: DEFAULT_CALENDAR_FILTERS,
    isBuiltIn: true,
  },
  {
    id: 'events-only',
    name: 'Events Only',
    filters: { ...ALL_OFF, showEvents: true, showDraftEvents: true },
    isBuiltIn: true,
  },
  {
    id: 'ops',
    name: 'Ops View',
    filters: { ...ALL_OFF, showEvents: true, showPrepBlocks: true, showCalls: true },
    isBuiltIn: true,
  },
  {
    id: 'planning',
    name: 'Planning View',
    filters: { ...ALL_OFF, showDraftEvents: true, showIntentions: true, showLeads: true },
    isBuiltIn: true,
  },
]
