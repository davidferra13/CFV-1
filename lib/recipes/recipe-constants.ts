// Recipe organization constants - shared between server actions and client components
// This file is NOT a server action file, so it can export plain objects.

export const SEASON_OPTIONS = ['Spring', 'Summer', 'Fall', 'Winter', 'Year-Round'] as const

export const OCCASION_SUGGESTIONS = [
  'Date Night',
  'Holiday',
  'Wedding',
  'Corporate',
  'Kids Party',
  'Outdoor/BBQ',
  'Tasting Menu',
  'Comfort Food',
  'Quick Weeknight',
] as const

// Derived from master cuisine list. Shows cuisines with popularity >= 60 in recipe contexts.
import { buildCuisineDisplayRecord } from '@/lib/constants/cuisines'
export const CUISINE_DISPLAY: Record<string, string> = buildCuisineDisplayRecord(60)

export const MEAL_TYPE_DISPLAY: Record<string, string> = {
  breakfast: 'Breakfast',
  brunch: 'Brunch',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack_passed: 'Snack / Passed',
  any: 'Any',
}
