// Prep timeline constants live outside the server action file so client
// components can import them without violating Next.js 'use server' rules.

export const PREP_TIMELINE_STEP_KEYS = [
  'menu_planning',
  'ingredient_sourcing',
  'prep_work',
  'packing',
  'travel',
  'setup',
  'cooking',
  'serving',
  'cleanup',
  'complete',
] as const

export type PrepTimelineStepKey = (typeof PREP_TIMELINE_STEP_KEYS)[number]
export type PrepTimelineStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'

export const PREP_TIMELINE_LABELS: Record<PrepTimelineStepKey, string> = {
  menu_planning: 'Menu Planning',
  ingredient_sourcing: 'Ingredient Sourcing',
  prep_work: 'Prep Work',
  packing: 'Packing',
  travel: 'Travel',
  setup: 'Setup',
  cooking: 'Cooking',
  serving: 'Serving',
  cleanup: 'Cleanup',
  complete: 'Complete',
}
