// Menu constants — exported separately from server actions so they can be
// used in client components without triggering the 'use server' object export restriction.

export const COMPONENT_CATEGORIES = [
  'sauce',
  'protein',
  'starch',
  'vegetable',
  'fruit',
  'dessert',
  'garnish',
  'bread',
  'cheese',
  'condiment',
  'beverage',
  'other',
] as const

export const TRANSPORT_CATEGORIES = ['cold', 'frozen', 'room_temp', 'fragile', 'liquid'] as const

export type ComponentCategory = (typeof COMPONENT_CATEGORIES)[number]
export type TransportCategory = (typeof TRANSPORT_CATEGORIES)[number]

// Prep timeline constants
export const PREP_TIMES_OF_DAY = [
  'early_morning',
  'morning',
  'afternoon',
  'evening',
  'service',
] as const
export type PrepTimeOfDay = (typeof PREP_TIMES_OF_DAY)[number]

export const PREP_TIME_LABELS: Record<PrepTimeOfDay, string> = {
  early_morning: 'Early Morning (6–9am)',
  morning: 'Morning (9am–12pm)',
  afternoon: 'Afternoon (12–4pm)',
  evening: 'Evening (4–8pm)',
  service: 'During Service',
}

export const PREP_DAY_OPTIONS = [
  { value: 0, label: 'Day of service' },
  { value: -1, label: '1 day before' },
  { value: -2, label: '2 days before' },
  { value: -3, label: '3 days before' },
  { value: -4, label: '4 days before' },
  { value: -5, label: '5 days before' },
] as const

export const PREP_STATION_SUGGESTIONS = [
  'sauté',
  'grill',
  'pastry',
  'cold',
  'prep',
  'fry',
  'roast',
  'garde manger',
] as const
