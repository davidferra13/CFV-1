// Recipe organization constants — shared between server actions and client components
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

export const CUISINE_DISPLAY: Record<string, string> = {
  italian: 'Italian',
  french: 'French',
  mexican: 'Mexican',
  japanese: 'Japanese',
  chinese: 'Chinese',
  indian: 'Indian',
  mediterranean: 'Mediterranean',
  thai: 'Thai',
  korean: 'Korean',
  american: 'American',
  southern: 'Southern',
  middle_eastern: 'Middle Eastern',
  fusion: 'Fusion',
  other: 'Other',
}

export const MEAL_TYPE_DISPLAY: Record<string, string> = {
  breakfast: 'Breakfast',
  brunch: 'Brunch',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack_passed: 'Snack / Passed',
  any: 'Any',
}
