// Event time tracking helpers.
// Maintains legacy DB column compatibility while exposing phase names
// that match day-to-day chef workflow.

export const EVENT_TIME_ACTIVITY_TYPES = [
  'shopping',
  'prep',
  'packing',
  'driving',
  'execution',
] as const

export type EventTimeActivityType = (typeof EVENT_TIME_ACTIVITY_TYPES)[number]

type EventTimeColumn = {
  label: string
  startedAtColumn:
    | 'shopping_started_at'
    | 'prep_started_at'
    | 'reset_started_at'
    | 'travel_started_at'
    | 'service_started_at'
  completedAtColumn:
    | 'shopping_completed_at'
    | 'prep_completed_at'
    | 'reset_completed_at'
    | 'travel_completed_at'
    | 'service_completed_at'
  minutesColumn:
    | 'time_shopping_minutes'
    | 'time_prep_minutes'
    | 'time_reset_minutes'
    | 'time_travel_minutes'
    | 'time_service_minutes'
}

export const EVENT_TIME_ACTIVITY_CONFIG: Record<EventTimeActivityType, EventTimeColumn> = {
  shopping: {
    label: 'Shopping',
    startedAtColumn: 'shopping_started_at',
    completedAtColumn: 'shopping_completed_at',
    minutesColumn: 'time_shopping_minutes',
  },
  prep: {
    label: 'Prep',
    startedAtColumn: 'prep_started_at',
    completedAtColumn: 'prep_completed_at',
    minutesColumn: 'time_prep_minutes',
  },
  // Breakdown maps to existing reset columns for backward compatibility.
  packing: {
    label: 'Breakdown',
    startedAtColumn: 'reset_started_at',
    completedAtColumn: 'reset_completed_at',
    minutesColumn: 'time_reset_minutes',
  },
  driving: {
    label: 'Driving',
    startedAtColumn: 'travel_started_at',
    completedAtColumn: 'travel_completed_at',
    minutesColumn: 'time_travel_minutes',
  },
  execution: {
    label: 'Execution',
    startedAtColumn: 'service_started_at',
    completedAtColumn: 'service_completed_at',
    minutesColumn: 'time_service_minutes',
  },
}

export function getEventActivityLabel(activity: EventTimeActivityType): string {
  return EVENT_TIME_ACTIVITY_CONFIG[activity].label
}

export function safeDurationMinutes(startIso: string, endIso: string): number {
  const startMs = new Date(startIso).getTime()
  const endMs = new Date(endIso).getTime()
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return 1
  return Math.max(1, Math.round((endMs - startMs) / 60000))
}

export function formatMinutesAsDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(safeMinutes / 60)
  const mins = safeMinutes % 60
  if (hours <= 0) return `${mins}m`
  return `${hours}h ${mins}m`
}
