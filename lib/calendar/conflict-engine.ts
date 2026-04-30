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

export type CalendarAvailabilityStatus = 'open' | 'light' | 'tight' | 'blocked' | 'overbooked'

export type CalendarAvailabilityScore = {
  date: string
  score: number
  status: CalendarAvailabilityStatus
  eventCount: number
  blockingCount: number
  conflictCount: number
  openMinutes: number
  reasons: string[]
}

export type CalendarOpenSlot = {
  id: string
  date: string
  startTime: string
  endTime: string
  score: number
  status: Exclude<CalendarAvailabilityStatus, 'overbooked'>
  reasons: string[]
}

export type CalendarOpenSlotOptions = {
  durationMinutes?: number
  dayStartMinute?: number
  dayEndMinute?: number
  maxSlots?: number
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

function listDates(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  let current = startDate
  while (current <= endDate) {
    dates.push(current)
    current = addDays(current, 1)
  }
  return dates
}

function formatMinute(minute: number) {
  const clamped = Math.max(0, Math.min(minute, 24 * 60))
  const hour = Math.floor(clamped / 60)
  const minuteOfHour = clamped % 60
  return `${String(hour).padStart(2, '0')}:${String(minuteOfHour).padStart(2, '0')}`
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

function mergeIntervals(intervals: { startMinute: number; endMinute: number }[]) {
  const sorted = intervals
    .filter((interval) => interval.endMinute > interval.startMinute)
    .sort((a, b) => a.startMinute - b.startMinute)
  const merged: { startMinute: number; endMinute: number }[] = []

  for (const interval of sorted) {
    const previous = merged[merged.length - 1]
    if (!previous || interval.startMinute > previous.endMinute) {
      merged.push({ ...interval })
      continue
    }
    previous.endMinute = Math.max(previous.endMinute, interval.endMinute)
  }

  return merged
}

function blockingIntervalsForDate(
  items: UnifiedCalendarItem[],
  date: string,
  dayStartMinute: number,
  dayEndMinute: number
) {
  return mergeIntervals(
    items.flatMap((item) => {
      if (!item.isBlocking && !['event', 'prep_block', 'call'].includes(item.type)) return []
      return expandItemDates(item)
        .filter((span) => span.date === date)
        .map((span) => ({
          startMinute: Math.max(dayStartMinute, span.startMinute),
          endMinute: Math.min(dayEndMinute, span.endMinute),
        }))
    })
  )
}

function openIntervalsForDate(
  items: UnifiedCalendarItem[],
  date: string,
  dayStartMinute: number,
  dayEndMinute: number
) {
  const blocking = blockingIntervalsForDate(items, date, dayStartMinute, dayEndMinute)
  const open: { startMinute: number; endMinute: number }[] = []
  let cursor = dayStartMinute

  for (const interval of blocking) {
    if (interval.startMinute > cursor) {
      open.push({ startMinute: cursor, endMinute: interval.startMinute })
    }
    cursor = Math.max(cursor, interval.endMinute)
  }

  if (cursor < dayEndMinute) {
    open.push({ startMinute: cursor, endMinute: dayEndMinute })
  }

  return open
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

export function scoreCalendarDate(
  items: UnifiedCalendarItem[],
  date: string,
  conflicts: CalendarConflict[] = detectCalendarConflicts(items),
  options: Pick<CalendarOpenSlotOptions, 'dayStartMinute' | 'dayEndMinute'> = {}
): CalendarAvailabilityScore {
  const dayStartMinute = options.dayStartMinute ?? 10 * 60
  const dayEndMinute = options.dayEndMinute ?? 21 * 60
  const dayItems = items.filter((item) => item.startDate <= date && item.endDate >= date)
  const dayConflicts = conflicts.filter((conflict) => conflict.date === date)
  const eventCount = dayItems.filter((item) => item.type === 'event').length
  const blockingCount = dayItems.filter((item) => item.isBlocking).length
  const openIntervals = openIntervalsForDate(items, date, dayStartMinute, dayEndMinute)
  const openMinutes = openIntervals.reduce(
    (sum, interval) => sum + interval.endMinute - interval.startMinute,
    0
  )
  const reasons: string[] = []

  if (eventCount > 0) reasons.push(`${eventCount} event${eventCount === 1 ? '' : 's'} booked`)
  if (blockingCount > 0) {
    reasons.push(`${blockingCount} blocking item${blockingCount === 1 ? '' : 's'}`)
  }
  if (dayConflicts.length > 0) {
    reasons.push(`${dayConflicts.length} conflict${dayConflicts.length === 1 ? '' : 's'}`)
  }
  if (openMinutes >= 6 * 60) reasons.push('Large booking window available')
  else if (openMinutes >= 3 * 60) reasons.push('One strong booking window remains')
  else if (openMinutes > 0) reasons.push('Only short openings remain')
  else reasons.push('No open booking window remains')

  const hasCriticalConflict = dayConflicts.some((conflict) => conflict.severity === 'critical')
  let status: CalendarAvailabilityStatus
  if (hasCriticalConflict) status = 'overbooked'
  else if (openMinutes === 0) status = 'blocked'
  else if (openMinutes < 3 * 60 || eventCount >= 2) status = 'tight'
  else if (openMinutes < 6 * 60 || eventCount === 1 || blockingCount > 0) status = 'light'
  else status = 'open'

  const rawScore = Math.round((openMinutes / (dayEndMinute - dayStartMinute)) * 100)
  const penalty = hasCriticalConflict ? 60 : dayConflicts.length * 20 + eventCount * 12
  const score = Math.max(0, Math.min(100, rawScore - penalty))

  return {
    date,
    score,
    status,
    eventCount,
    blockingCount,
    conflictCount: dayConflicts.length,
    openMinutes,
    reasons,
  }
}

export function findCalendarOpenSlots(
  items: UnifiedCalendarItem[],
  startDate: string,
  endDate: string,
  options: CalendarOpenSlotOptions = {}
): CalendarOpenSlot[] {
  const durationMinutes = options.durationMinutes ?? 180
  const dayStartMinute = options.dayStartMinute ?? 10 * 60
  const dayEndMinute = options.dayEndMinute ?? 21 * 60
  const maxSlots = options.maxSlots ?? 6
  const conflicts = detectCalendarConflicts(items)

  return listDates(startDate, endDate)
    .flatMap((date) => {
      const dayScore = scoreCalendarDate(items, date, conflicts, { dayStartMinute, dayEndMinute })
      if (dayScore.status === 'overbooked') return []

      return openIntervalsForDate(items, date, dayStartMinute, dayEndMinute)
        .filter((interval) => interval.endMinute - interval.startMinute >= durationMinutes)
        .map((interval) => {
          const startMinute = interval.startMinute
          const endMinute = startMinute + durationMinutes
          const bufferMinutes = interval.endMinute - endMinute
          const score = Math.max(
            0,
            Math.min(100, dayScore.score + Math.min(15, bufferMinutes / 12))
          )
          const status: CalendarOpenSlot['status'] =
            dayScore.status === 'open' || dayScore.status === 'light' || dayScore.status === 'tight'
              ? dayScore.status
              : 'tight'
          const reasons = [
            `${durationMinutes} minute booking window`,
            bufferMinutes >= 60 ? 'Buffer remains after service' : 'Tight exit buffer',
            ...dayScore.reasons.slice(0, 2),
          ]

          return {
            id: `${date}:${formatMinute(startMinute)}:${durationMinutes}`,
            date,
            startTime: formatMinute(startMinute),
            endTime: formatMinute(endMinute),
            score: Math.round(score),
            status,
            reasons,
          }
        })
    })
    .sort((a, b) => {
      const scoreDiff = b.score - a.score
      if (scoreDiff !== 0) return scoreDiff
      return `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)
    })
    .slice(0, maxSlots)
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
