import type { UnifiedCalendarItem } from '@/lib/calendar/types'
import type { SchedulingGap } from '@/lib/scheduling/types'

export type CalendarConflictSeverity = 'critical' | 'warning' | 'info'

export type CalendarConflict = {
  id: string
  severity: CalendarConflictSeverity
  date: string
  title: string
  description: string
  itemIds: string[]
  itemTitles: string[]
  itemTypes: string[]
}

export type CalendarHealthSummary = {
  conflictCount: number
  criticalConflictCount: number
  prepGapCount: number
  criticalPrepGapCount: number
  publicSignalCount: number
  waitlistOpportunityCount: number
  unpaidEventCount: number
  conflicts: CalendarConflict[]
  prepGaps: SchedulingGap[]
}

type DateSpan = {
  date: string
  startMinute: number
  endMinute: number
  allDay: boolean
}

function parseTimeToMinute(value?: string): number | null {
  if (!value) return null
  const [hourRaw, minuteRaw] = value.split(':')
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  return hour * 60 + minute
}

function addDays(date: string, days: number) {
  const current = new Date(`${date}T12:00:00`)
  current.setDate(current.getDate() + days)
  return [
    current.getFullYear(),
    String(current.getMonth() + 1).padStart(2, '0'),
    String(current.getDate()).padStart(2, '0'),
  ].join('-')
}

function expandItemDates(item: UnifiedCalendarItem): DateSpan[] {
  const spans: DateSpan[] = []
  let current = item.startDate

  while (current <= item.endDate) {
    const startMinute = item.allDay ? 0 : (parseTimeToMinute(item.startTime) ?? 0)
    const endMinute = item.allDay
      ? 24 * 60
      : (parseTimeToMinute(item.endTime) ?? Math.min(startMinute + 60, 24 * 60))

    spans.push({
      date: current,
      startMinute,
      endMinute,
      allDay: item.allDay,
    })

    current = addDays(current, 1)
  }

  return spans
}

function overlaps(a: DateSpan, b: DateSpan) {
  if (a.date !== b.date) return false
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute
}

function isEventHardConflict(a: UnifiedCalendarItem, b: UnifiedCalendarItem) {
  if (a.type === 'event' && b.type === 'event') return true
  if (a.type === 'event' && b.isBlocking) return true
  if (b.type === 'event' && a.isBlocking) return true
  return false
}

function isEventSoftConflict(a: UnifiedCalendarItem, b: UnifiedCalendarItem) {
  if (a.type === 'event' && ['call', 'prep_block'].includes(b.type)) return true
  if (b.type === 'event' && ['call', 'prep_block'].includes(a.type)) return true
  return false
}

function conflictTitle(a: UnifiedCalendarItem, b: UnifiedCalendarItem) {
  if (a.type === 'event' && b.type === 'event') return 'Double-booked events'
  if (a.type === 'event' || b.type === 'event') return 'Event schedule conflict'
  return 'Calendar overlap'
}

function conflictDescription(
  a: UnifiedCalendarItem,
  b: UnifiedCalendarItem,
  severity: CalendarConflictSeverity
) {
  if (severity === 'critical') {
    return `${a.title} overlaps ${b.title}. Review before accepting or moving more work onto this date.`
  }

  return `${a.title} shares time with ${b.title}. Check whether the timing is intentional.`
}

export function detectCalendarConflicts(items: UnifiedCalendarItem[]): CalendarConflict[] {
  const conflicts: CalendarConflict[] = []

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      const hardConflict = isEventHardConflict(a, b)
      const softConflict = isEventSoftConflict(a, b)
      if (!hardConflict && !softConflict) continue

      const aSpans = expandItemDates(a)
      const bSpans = expandItemDates(b)
      const overlap = aSpans.find((aSpan) => bSpans.some((bSpan) => overlaps(aSpan, bSpan)))
      if (!overlap) continue

      const severity: CalendarConflictSeverity = hardConflict ? 'critical' : 'warning'
      conflicts.push({
        id: [a.id, b.id, overlap.date].sort().join(':'),
        severity,
        date: overlap.date,
        title: conflictTitle(a, b),
        description: conflictDescription(a, b, severity),
        itemIds: [a.id, b.id],
        itemTitles: [a.title, b.title],
        itemTypes: [a.type, b.type],
      })
    }
  }

  return conflicts.sort((a, b) => {
    const severityRank = { critical: 0, warning: 1, info: 2 }
    const severityDiff = severityRank[a.severity] - severityRank[b.severity]
    if (severityDiff !== 0) return severityDiff
    return a.date.localeCompare(b.date)
  })
}

export function getConflictsForMove(
  items: UnifiedCalendarItem[],
  eventId: string,
  newDate: string
): CalendarConflict[] {
  const movedItems = items.map((item) =>
    item.id === eventId && item.type === 'event'
      ? { ...item, startDate: newDate, endDate: newDate }
      : item
  )

  return detectCalendarConflicts(movedItems).filter((conflict) =>
    conflict.itemIds.includes(eventId)
  )
}

export function summarizeCalendarHealth(
  items: UnifiedCalendarItem[],
  prepGaps: SchedulingGap[]
): CalendarHealthSummary {
  const conflicts = detectCalendarConflicts(items)
  const publicSignalCount = items.filter(
    (item) => item.type === 'calendar_entry' && item.subType === 'target_booking'
  ).length
  const waitlistOpportunityCount = items.filter((item) => item.type === 'waitlist').length
  const unpaidEventCount = items.filter(
    (item) =>
      item.type === 'event' &&
      item.paymentStatus != null &&
      !['paid', 'succeeded', 'complete'].includes(item.paymentStatus)
  ).length

  return {
    conflictCount: conflicts.length,
    criticalConflictCount: conflicts.filter((conflict) => conflict.severity === 'critical').length,
    prepGapCount: prepGaps.length,
    criticalPrepGapCount: prepGaps.filter((gap) => gap.severity === 'critical').length,
    publicSignalCount,
    waitlistOpportunityCount,
    unpaidEventCount,
    conflicts,
    prepGaps,
  }
}
