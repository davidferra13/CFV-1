// Priority Queue — Scoring Engine
// Pure function. No database calls. No side effects. Fully testable.

import type { ScoreInputs, QueueUrgency } from './types'

/**
 * PRIORITY SCORING ALGORITHM
 *
 * Produces a numeric score 0-1000 from universal input attributes.
 * Higher score = higher priority.
 *
 * Five weighted dimensions:
 *   TIME PRESSURE  (0-400)  — How soon? Overdue items get maximum.
 *   IMPACT         (0-250)  — Business consequence of delay.
 *   BLOCKING       (0-150)  — Is downstream work stuck?
 *   STALENESS      (0-100)  — How long has this been sitting?
 *   REVENUE        (0-100)  — Is money directly on the line?
 *
 * Total max: 1000
 */
export function computeScore(inputs: ScoreInputs): number {
  const time = scoreTimePressure(inputs.hoursUntilDue, inputs.isExpiring)
  const impact = scoreImpact(inputs.impactWeight)
  const blocking = scoreBlocking(inputs.isBlocking)
  const staleness = scoreStaleness(inputs.hoursSinceCreated)
  const revenue = scoreRevenue(inputs.revenueCents)

  return Math.round(
    Math.min(1000, time + impact + blocking + staleness + revenue)
  )
}

/**
 * TIME PRESSURE: 0-400 points
 *
 * Overdue items get 400 (maximum urgency).
 * Items due within 2 hours: 350-400
 * Items due within 24 hours: 250-350 (linear)
 * Items due within 3 days: 150-250 (linear)
 * Items due within 7 days: 50-150 (linear)
 * Items due beyond 7 days: 10-50 (logarithmic decay)
 * No deadline: 0
 */
function scoreTimePressure(hoursUntilDue: number | null, isExpiring: boolean): number {
  if (hoursUntilDue === null) return 0

  // Overdue
  if (hoursUntilDue < 0) return 400

  // Due within 2 hours
  if (hoursUntilDue <= 2) return 350 + (1 - hoursUntilDue / 2) * 50

  // Due within 24 hours
  if (hoursUntilDue <= 24) {
    const t = (24 - hoursUntilDue) / 22
    return 250 + t * 100
  }

  // Due within 3 days (72 hours)
  if (hoursUntilDue <= 72) {
    const t = (72 - hoursUntilDue) / 48
    return 150 + t * 100
  }

  // Due within 7 days (168 hours)
  if (hoursUntilDue <= 168) {
    const t = (168 - hoursUntilDue) / 96
    return 50 + t * 100
  }

  // Beyond 7 days — logarithmic decay
  const daysOut = hoursUntilDue / 24
  const decayed = Math.max(0, 50 - Math.log2(daysOut) * 8)

  // Expiring items get a 25% boost
  return isExpiring ? decayed * 1.25 : decayed
}

/**
 * IMPACT: 0-250 points
 * Linear mapping from impactWeight (0.0-1.0) to points.
 *
 * Impact weight guidelines (set by each provider):
 *   1.0 — Losing a client, legal/financial obligation
 *   0.8 — Revenue risk, client waiting for response
 *   0.6 — Standard operational task
 *   0.4 — Internal quality task (AAR, notes)
 *   0.2 — Nice-to-have, relationship maintenance
 *   0.0 — Zero-consequence deferral
 */
function scoreImpact(impactWeight: number): number {
  return Math.round(Math.max(0, Math.min(1, impactWeight)) * 250)
}

/**
 * BLOCKING: 0 or 150 points (binary)
 * If this item blocks downstream work, add 150.
 */
function scoreBlocking(isBlocking: boolean): number {
  return isBlocking ? 150 : 0
}

/**
 * STALENESS: 0-100 points
 * Items that have been sitting get a gentle upward nudge.
 * Caps at 100 after 7 days of staleness.
 */
function scoreStaleness(hoursSinceCreated: number): number {
  if (hoursSinceCreated <= 0) return 0
  const days = hoursSinceCreated / 24
  return Math.round(Math.min(100, Math.log2(days + 1) * 35))
}

/**
 * REVENUE: 0-100 points
 * Money at stake adds urgency. Logarithmic to avoid $10k dominating everything.
 * $100 = ~33 points, $500 = ~60 points, $2000 = ~80 points, $5000+ = ~100 points
 */
function scoreRevenue(revenueCents: number): number {
  if (revenueCents <= 0) return 0
  const dollars = revenueCents / 100
  return Math.round(Math.min(100, Math.log10(dollars + 1) * 28))
}

/**
 * Derive urgency tier from numeric score.
 */
export function urgencyFromScore(score: number): QueueUrgency {
  if (score >= 600) return 'critical'
  if (score >= 400) return 'high'
  if (score >= 200) return 'normal'
  return 'low'
}
