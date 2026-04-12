import type { Database } from '@/types/database'
import { dateToDateString } from '@/lib/utils/format'

type MealSlot = Database['public']['Enums']['event_session_meal_slot']

export type PlannedSessionForConflict = {
  session_date: string
  meal_slot: MealSlot
  start_time: string | null
  end_time: string | null
}

export type ExistingEventForConflict = {
  id: string
  event_date: string
  status: string
  occasion: string | null
  serve_time: string | null
  arrival_time: string | null
  departure_time: string | null
}

export type EventSessionConflict = {
  session_date: string
  meal_slot: MealSlot
  event_id: string
  reason: string
}

const TIME_24H = /^\d{2}:\d{2}(:\d{2})?$/

function toMinutes(value: string | null): number | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!TIME_24H.test(trimmed)) return null
  const [hoursStr, minutesStr] = trimmed.split(':')
  const hours = Number.parseInt(hoursStr || '0', 10)
  const minutes = Number.parseInt(minutesStr || '0', 10)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function inferMealSlotFromTime(value: string | null): MealSlot | null {
  const minutes = toMinutes(value)
  if (minutes == null) return null
  if (minutes < 11 * 60) return 'breakfast'
  if (minutes < 15 * 60) return 'lunch'
  if (minutes < 21 * 60) return 'dinner'
  return 'late_snack'
}

function buildWindow(
  startTime: string | null,
  endTime: string | null,
  fallbackDurationMinutes = 240
): { start: number; end: number } | null {
  const start = toMinutes(startTime)
  if (start == null) return null
  const end = toMinutes(endTime)
  if (end == null) return { start, end: start + fallbackDurationMinutes }
  if (end <= start) return { start, end: start + 60 }
  return { start, end }
}

function windowsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number }
): boolean {
  return a.start < b.end && b.start < a.end
}

export function detectSessionEventConflicts(params: {
  sessions: PlannedSessionForConflict[]
  events: ExistingEventForConflict[]
}): EventSessionConflict[] {
  const { sessions, events } = params
  const conflicts: EventSessionConflict[] = []

  for (const session of sessions) {
    const sessionDate = session.session_date
    const sameDateEvents = events.filter(
      (event) => dateToDateString(event.event_date as Date | string) === sessionDate
    )
    if (sameDateEvents.length === 0) continue

    const sessionWindow = buildWindow(session.start_time, session.end_time)

    for (const event of sameDateEvents) {
      const eventWindow = buildWindow(
        event.arrival_time || event.serve_time,
        event.departure_time,
        300
      )

      if (!sessionWindow && !eventWindow) {
        conflicts.push({
          session_date: sessionDate,
          meal_slot: session.meal_slot,
          event_id: event.id,
          reason: `Existing ${event.status} event on this date has no detailed timing`,
        })
        continue
      }

      if (sessionWindow && eventWindow && windowsOverlap(sessionWindow, eventWindow)) {
        conflicts.push({
          session_date: sessionDate,
          meal_slot: session.meal_slot,
          event_id: event.id,
          reason: `Time window overlaps existing ${event.status} event "${event.occasion || 'Untitled event'}"`,
        })
        continue
      }

      const eventMealSlot = inferMealSlotFromTime(event.serve_time)
      if (eventMealSlot && eventMealSlot === session.meal_slot) {
        conflicts.push({
          session_date: sessionDate,
          meal_slot: session.meal_slot,
          event_id: event.id,
          reason: `Meal slot overlaps existing ${event.status} event "${event.occasion || 'Untitled event'}"`,
        })
      }
    }
  }

  return conflicts
}
