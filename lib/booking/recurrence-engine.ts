// Recurrence Engine
// Generates dates from a recurrence rule within a date range.
// Pure deterministic logic, no AI, no database calls.

import { z } from 'zod'

export const RecurrenceRuleSchema = z.object({
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
  // 0=Sun, 1=Mon, ... 6=Sat. Used for weekly/biweekly.
  days_of_week: z.array(z.number().int().min(0).max(6)).optional(),
  // Day of month (1-31). Used for monthly.
  day_of_month: z.number().int().min(1).max(31).optional(),
  meal_slot: z
    .enum(['breakfast', 'lunch', 'dinner', 'late_snack', 'dropoff', 'other'])
    .default('dinner'),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  end_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
})

export type RecurrenceRule = z.infer<typeof RecurrenceRuleSchema>

type GeneratedSession = {
  session_date: string // YYYY-MM-DD
  meal_slot: RecurrenceRule['meal_slot']
  start_time: string | null
  end_time: string | null
}

/**
 * Generate all dates matching a recurrence rule within [startDate, endDate].
 * Returns sorted session objects ready for series materialization.
 */
export function generateRecurrenceDates(
  rule: RecurrenceRule,
  startDate: string,
  endDate: string,
  maxDates = 200
): GeneratedSession[] {
  const start = parseDate(startDate)
  const end = parseDate(endDate)
  if (!start || !end || end < start) return []

  const dates: GeneratedSession[] = []
  const cursor = new Date(start)

  // For biweekly: track the reference week (week 0 = start week)
  const startWeekStart = getWeekStart(start)

  while (cursor <= end && dates.length < maxDates) {
    const shouldInclude = checkDate(rule, cursor, startWeekStart)

    if (shouldInclude) {
      dates.push({
        session_date: formatDate(cursor),
        meal_slot: rule.meal_slot,
        start_time: normalizeTime(rule.start_time),
        end_time: normalizeTime(rule.end_time),
      })
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

function checkDate(rule: RecurrenceRule, date: Date, startWeekStart: Date): boolean {
  const dayOfWeek = date.getUTCDay()

  switch (rule.frequency) {
    case 'weekly': {
      const days = rule.days_of_week ?? [dayOfWeek]
      return days.includes(dayOfWeek)
    }

    case 'biweekly': {
      const days = rule.days_of_week ?? [dayOfWeek]
      if (!days.includes(dayOfWeek)) return false
      // Check if this is an "on" week (every other week from start)
      const weeksSinceStart = Math.floor(
        (getWeekStart(date).getTime() - startWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
      return weeksSinceStart % 2 === 0
    }

    case 'monthly': {
      const targetDay = rule.day_of_month ?? 1
      const dateDay = date.getUTCDate()
      // Handle months shorter than target day (e.g., Feb 30 -> Feb 28)
      if (dateDay === targetDay) return true
      if (targetDay > daysInMonth(date) && dateDay === daysInMonth(date)) return true
      return false
    }

    default:
      return false
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() - day)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

function daysInMonth(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
}

function parseDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const d = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function normalizeTime(value?: string): string | null {
  if (!value) return null
  return value.length === 5 ? `${value}:00` : value
}

/**
 * Human-readable summary of a recurrence rule.
 */
export function describeRecurrence(rule: RecurrenceRule): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  switch (rule.frequency) {
    case 'weekly': {
      const days = (rule.days_of_week ?? []).map((d) => dayNames[d]).join(', ')
      return `Weekly on ${days || 'selected days'}`
    }
    case 'biweekly': {
      const days = (rule.days_of_week ?? []).map((d) => dayNames[d]).join(', ')
      return `Every other week on ${days || 'selected days'}`
    }
    case 'monthly': {
      const day = rule.day_of_month ?? 1
      const suffix =
        day === 1 || day === 21 || day === 31
          ? 'st'
          : day === 2 || day === 22
            ? 'nd'
            : day === 3 || day === 23
              ? 'rd'
              : 'th'
      return `Monthly on the ${day}${suffix}`
    }
    default:
      return 'Custom recurrence'
  }
}
