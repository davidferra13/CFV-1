// Recurring service constants - exported separately from actions.ts
// so they can be imported by client components without triggering 'use server' restrictions.

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  weekly_meal_prep: 'Weekly Meal Prep',
  weekly_dinners: 'Weekly Dinners',
  daily_meals: 'Daily Meals',
  biweekly_prep: 'Bi-Weekly Prep',
  other: 'Other',
}

export const REACTION_LABELS: Record<string, string> = {
  loved: 'Loved it',
  liked: 'Liked it',
  neutral: 'Neutral',
  disliked: 'Disliked',
}
