// Live tracker constants live outside the server action file so client
// components can import them without violating Next.js 'use server' rules.

export const LIVE_TRACKER_STATUS_KEYS = [
  'en_route',
  'arrived',
  'setting_up',
  'prep_underway',
  'first_course',
  'main_course',
  'dessert',
  'cleanup',
  'complete',
] as const

export type LiveTrackerStatusKey = (typeof LIVE_TRACKER_STATUS_KEYS)[number]

export const LIVE_TRACKER_STATUS_LABELS: Record<LiveTrackerStatusKey, string> = {
  en_route: 'Chef is on the way',
  arrived: 'Chef has arrived',
  setting_up: 'Setting up the kitchen',
  prep_underway: 'Preparation in progress',
  first_course: 'First course being served',
  main_course: 'Main course being served',
  dessert: 'Dessert time',
  cleanup: 'Cleaning up',
  complete: 'Service complete',
}
