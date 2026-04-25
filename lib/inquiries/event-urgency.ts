// ---------------------------------------------------------------------------
// Event-Date Urgency Scoring
// Calculates how urgent an inquiry is based on proximity of the event date.
// Pure function, no DB access, no side effects.
// ---------------------------------------------------------------------------

export type EventUrgencyLevel = 'critical' | 'high' | 'normal' | 'none'

export interface EventUrgency {
  level: EventUrgencyLevel
  label: string
  daysUntil: number | null
}

/**
 * Score urgency based on how close the event date is to now.
 *
 * - critical: event is today or tomorrow (0-1 days)
 * - high: event is within 3 days (2-3 days)
 * - normal: event is within 7 days (4-7 days)
 * - none: event is more than 7 days away, or no date set
 *
 * @param eventDate - The confirmed event date (ISO string or null)
 * @param now - Current date (injectable for testing, defaults to new Date())
 */
export function scoreEventUrgency(
  eventDate: string | null | undefined,
  now: Date = new Date()
): EventUrgency {
  if (!eventDate) {
    return { level: 'none', label: '', daysUntil: null }
  }

  // Parse the date. Event dates are stored as YYYY-MM-DD (date only).
  // Append T00:00:00 to avoid timezone offset issues.
  const event = new Date(eventDate + 'T00:00:00')
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const diffMs = event.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Past events are not urgent (they are overdue, a different concern)
  if (diffDays < 0) {
    return { level: 'none', label: '', daysUntil: diffDays }
  }

  if (diffDays <= 1) {
    const label = diffDays === 0 ? 'TODAY' : 'TOMORROW'
    return { level: 'critical', label, daysUntil: diffDays }
  }

  if (diffDays <= 3) {
    return { level: 'high', label: `${diffDays}d away`, daysUntil: diffDays }
  }

  if (diffDays <= 7) {
    return { level: 'normal', label: `${diffDays}d away`, daysUntil: diffDays }
  }

  return { level: 'none', label: '', daysUntil: diffDays }
}
