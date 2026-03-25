// Burnout Risk Computation - Pure Functions
// No server context, no calls.
// Import this file anywhere (server or client) without restrictions.

export type BurnoutLevel = 'low' | 'moderate' | 'high'

export type BurnoutSignals = {
  eventsThisWeek: number // how many events in last 7 days
  eventsLastMonth: number // how many events in last 30 days
  daysSinceLastDayOff: number // days since last calendar gap
  avgSatisfactionLast90d: number | null // 1-10 scale from growth checkins
  daysSinceJournalEntry: number // days since last journal entry
}

/**
 * Compute a burnout risk level from observable work signals.
 * Scoring:
 *   eventsThisWeek >= 4  → +2
 *   eventsThisWeek >= 6  → +1 more
 *   eventsLastMonth >= 12 → +2
 *   daysSinceLastDayOff >= 14 → +2
 *   daysSinceLastDayOff >= 21 → +1 more
 *   avgSatisfactionLast90d <= 5 → +2
 *   avgSatisfactionLast90d <= 3 → +1 more
 *   daysSinceJournalEntry >= 30 → +1
 *
 * Result bands:
 *   0-2 = 'low'
 *   3-5 = 'moderate'
 *   6+  = 'high'
 */
export function computeBurnoutLevel(signals: BurnoutSignals): BurnoutLevel {
  let score = 0

  if (signals.eventsThisWeek >= 4) score += 2
  if (signals.eventsThisWeek >= 6) score += 1

  if (signals.eventsLastMonth >= 12) score += 2

  if (signals.daysSinceLastDayOff >= 14) score += 2
  if (signals.daysSinceLastDayOff >= 21) score += 1

  if (signals.avgSatisfactionLast90d !== null) {
    if (signals.avgSatisfactionLast90d <= 5) score += 2
    if (signals.avgSatisfactionLast90d <= 3) score += 1
  }

  if (signals.daysSinceJournalEntry >= 30) score += 1

  if (score >= 6) return 'high'
  if (score >= 3) return 'moderate'
  return 'low'
}

export const BURNOUT_SUGGESTIONS: Record<BurnoutLevel, string> = {
  low: 'Your pace looks sustainable. Keep protecting your rest days.',
  moderate: 'Signs of accumulating load. Consider blocking a recovery day this week.',
  high: 'High load detected. Block tomorrow off if possible. Decline the next non-essential booking.',
}
