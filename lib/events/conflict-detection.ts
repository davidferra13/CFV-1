/**
 * Event Scheduling Conflict Detection
 *
 * Pure utility functions, no 'use server', no DB calls.
 * Detects same-day and back-to-back scheduling conflicts
 * from an array of events.
 */

export type EventConflict = {
  eventA: { id: string; occasion: string | null; event_date: string }
  eventB: { id: string; occasion: string | null; event_date: string }
  type: 'same_day' | 'back_to_back'
  message: string
}

type ConflictCandidate = {
  id: string
  occasion: string | null
  event_date: string
  serve_time: string | null
  status: string
}

/** Statuses excluded from conflict detection (terminal states). */
const EXCLUDED_STATUSES = new Set(['cancelled', 'completed'])

/**
 * Parse a YYYY-MM-DD date string into a numeric day value
 * for easy comparison. Returns NaN for invalid strings.
 */
function dateToDayNumber(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  // Use UTC to avoid timezone offset issues
  return Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24)
}

function eventLabel(occasion: string | null): string {
  return occasion || 'Untitled Event'
}

/**
 * Detect scheduling conflicts in a list of events.
 *
 * Returns an array of conflicts sorted by date:
 *  - `same_day`: two or more events share the same event_date
 *  - `back_to_back`: events on consecutive calendar days
 *
 * Only considers non-cancelled, non-completed events.
 */
export function detectEventConflicts(events: ConflictCandidate[]): EventConflict[] {
  // Filter to active events only
  const active = events.filter((e) => !EXCLUDED_STATUSES.has(e.status))

  if (active.length < 2) return []

  const conflicts: EventConflict[] = []

  // Group by event_date
  const byDate = new Map<string, ConflictCandidate[]>()
  for (const event of active) {
    const date = event.event_date
    if (!date) continue
    const group = byDate.get(date)
    if (group) {
      group.push(event)
    } else {
      byDate.set(date, [event])
    }
  }

  // Same-day conflicts: any date with 2+ events
  for (const [, group] of byDate) {
    if (group.length < 2) continue
    // Generate a conflict pair for each combination
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        conflicts.push({
          eventA: { id: a.id, occasion: a.occasion, event_date: a.event_date },
          eventB: { id: b.id, occasion: b.occasion, event_date: b.event_date },
          type: 'same_day',
          message: `"${eventLabel(a.occasion)}" and "${eventLabel(b.occasion)}" are both on ${a.event_date}`,
        })
      }
    }
  }

  // Back-to-back: events on consecutive calendar days
  const sortedDates = Array.from(byDate.keys()).sort()
  for (let i = 0; i < sortedDates.length - 1; i++) {
    const dateA = sortedDates[i]
    const dateB = sortedDates[i + 1]
    const dayA = dateToDayNumber(dateA)
    const dayB = dateToDayNumber(dateB)

    if (dayB - dayA !== 1) continue

    const groupA = byDate.get(dateA)!
    const groupB = byDate.get(dateB)!

    // Pair the first event from each day (one warning per consecutive pair)
    for (const a of groupA) {
      for (const b of groupB) {
        conflicts.push({
          eventA: { id: a.id, occasion: a.occasion, event_date: a.event_date },
          eventB: { id: b.id, occasion: b.occasion, event_date: b.event_date },
          type: 'back_to_back',
          message: `"${eventLabel(a.occasion)}" (${a.event_date}) and "${eventLabel(b.occasion)}" (${b.event_date}) are back-to-back`,
        })
      }
    }
  }

  // Sort by earliest date in each conflict
  conflicts.sort((a, b) => {
    const dateA =
      a.eventA.event_date < a.eventB.event_date ? a.eventA.event_date : a.eventB.event_date
    const dateB =
      b.eventA.event_date < b.eventB.event_date ? b.eventA.event_date : b.eventB.event_date
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    // same_day before back_to_back for same date
    if (a.type !== b.type) return a.type === 'same_day' ? -1 : 1
    return 0
  })

  return conflicts
}
