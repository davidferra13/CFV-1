// Calendar constants — exported separately from server actions so they can be
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
