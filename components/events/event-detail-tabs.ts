export const EVENT_DETAIL_TABS = [
  'overview',
  'popup',
  'chat',
  'money',
  'prep',
  'tickets',
  'ops',
  'wrap',
] as const

export type EventDetailTab = (typeof EVENT_DETAIL_TABS)[number]

export function isEventDetailTab(value: unknown): value is EventDetailTab {
  return typeof value === 'string' && EVENT_DETAIL_TABS.includes(value as EventDetailTab)
}

export function normalizeEventDetailTab(value: unknown): EventDetailTab {
  return isEventDetailTab(value) ? value : 'overview'
}
