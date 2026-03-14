import type { ScheduleRequest } from '@/lib/booking/schedule-schema'
import type { Database } from '@/types/database'

type MealSlot = Database['public']['Enums']['event_session_meal_slot']
type ExecutionType = Database['public']['Enums']['event_session_execution_type']

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const TIME_24H = /^\d{2}:\d{2}(:\d{2})?$/

const MEAL_SLOT_ORDER: Record<MealSlot, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  late_snack: 4,
  dropoff: 5,
  other: 6,
}

export type SeriesSessionPlan = {
  session_date: string
  meal_slot: MealSlot
  execution_type: ExecutionType
  start_time: string | null
  end_time: string | null
  guest_count: number | null
  notes: string | null
  sort_order: number
}

export type SeriesSchedulePlan = {
  start_date: string
  end_date: string
  sessions: SeriesSessionPlan[]
}

type BuildSeriesSchedulePlanInput = {
  scheduleRequest?: ScheduleRequest | null
  fallbackDate?: string | null
  fallbackGuestCount?: number | null
  maxSessions?: number
}

function normalizeTime(value?: string | null): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!TIME_24H.test(trimmed)) return null
  return trimmed.length === 5 ? `${trimmed}:00` : trimmed
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value || !ISO_DATE.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function enumerateDateRange(startDate: string, endDate: string): string[] {
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)
  if (!start || !end) return []
  if (end.getTime() < start.getTime()) return []

  const dates: string[] = []
  const cursor = new Date(start)
  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatIsoDate(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return dates
}

export function getDefaultServeTimeForMealSlot(mealSlot: MealSlot): string {
  switch (mealSlot) {
    case 'breakfast':
      return '08:00:00'
    case 'lunch':
      return '12:00:00'
    case 'late_snack':
      return '22:00:00'
    case 'dropoff':
      return '10:00:00'
    case 'other':
      return '18:00:00'
    case 'dinner':
    default:
      return '18:00:00'
  }
}

export function buildSeriesSchedulePlan({
  scheduleRequest,
  fallbackDate,
  fallbackGuestCount,
  maxSessions = 200,
}: BuildSeriesSchedulePlanInput): SeriesSchedulePlan {
  const providedSessions = (scheduleRequest?.sessions ?? [])
    .map((session) => ({
      session_date: session.service_date,
      meal_slot: session.meal_slot,
      execution_type: session.execution_type,
      start_time: normalizeTime(session.start_time),
      end_time: normalizeTime(session.end_time),
      guest_count: session.guest_count ?? fallbackGuestCount ?? null,
      notes: session.notes?.trim() || null,
    }))
    .filter((session) => ISO_DATE.test(session.session_date))

  const scheduleStart = parseIsoDate(scheduleRequest?.start_date ?? null)
  const scheduleEnd = parseIsoDate(scheduleRequest?.end_date ?? null)
  const fallback = parseIsoDate(fallbackDate ?? null)
  const sessionDates = providedSessions
    .map((session) => parseIsoDate(session.session_date))
    .filter((value): value is Date => Boolean(value))

  const earliestSessionDate =
    sessionDates.length > 0
      ? new Date(Math.min(...sessionDates.map((value) => value.getTime())))
      : null
  const latestSessionDate =
    sessionDates.length > 0
      ? new Date(Math.max(...sessionDates.map((value) => value.getTime())))
      : null

  const resolvedStart = scheduleStart ?? earliestSessionDate ?? fallback
  const resolvedEnd = scheduleEnd ?? latestSessionDate ?? resolvedStart

  if (!resolvedStart || !resolvedEnd) {
    throw new Error('Unable to determine a valid schedule window')
  }

  if (resolvedEnd.getTime() < resolvedStart.getTime()) {
    throw new Error('Schedule end date must be on or after start date')
  }

  const resolvedStartIso = formatIsoDate(resolvedStart)
  const resolvedEndIso = formatIsoDate(resolvedEnd)
  let normalizedSessions = providedSessions

  if (normalizedSessions.length === 0) {
    const generatedDates = enumerateDateRange(resolvedStartIso, resolvedEndIso)
    normalizedSessions = generatedDates.map((sessionDate, index) => ({
      session_date: sessionDate,
      meal_slot: 'dinner' as const,
      execution_type: 'on_site' as const,
      start_time: null,
      end_time: null,
      guest_count: fallbackGuestCount ?? null,
      notes: index === 0 ? scheduleRequest?.outline?.trim() || null : null,
    }))
  }

  if (normalizedSessions.length > maxSessions) {
    throw new Error(`Too many sessions requested (max ${maxSessions})`)
  }

  const seen = new Set<string>()
  const deduped = normalizedSessions.filter((session) => {
    const key = `${session.session_date}|${session.meal_slot}|${session.start_time || '00:00:00'}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  const sorted = [...deduped].sort((a, b) => {
    const dateCompare = a.session_date.localeCompare(b.session_date)
    if (dateCompare !== 0) return dateCompare

    const mealCompare = MEAL_SLOT_ORDER[a.meal_slot] - MEAL_SLOT_ORDER[b.meal_slot]
    if (mealCompare !== 0) return mealCompare

    return (a.start_time || '').localeCompare(b.start_time || '')
  })

  const sessions: SeriesSessionPlan[] = sorted.map((session, index) => ({
    ...session,
    sort_order: index + 1,
  }))

  return {
    start_date: resolvedStartIso,
    end_date: resolvedEndIso,
    sessions,
  }
}
