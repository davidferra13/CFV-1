// Priority Queue — Scoring Engine
// Pure function. No database calls. No side effects. Fully testable.

import type { ScoreInputs, QueueUrgency } from './types'

/**
 * PRIORITY SCORING ALGORITHM
 *
 * Produces a numeric score 0-1000 from universal input attributes.
 * Higher score = higher priority.
 *
 * Five weighted dimensions (v2 - revenue-weighted):
 *   TIME PRESSURE  (0-300)  — How soon? Overdue items get maximum.
 *   IMPACT         (0-200)  — Business consequence of delay.
 *   BLOCKING       (0-150)  — Is downstream work stuck?
 *   STALENESS      (0-100)  — How long has this been sitting? Exponential growth.
 *   REVENUE        (0-250)  — Is money directly on the line?
 *
 * Total max: 1000
 */
export function computeScore(inputs: ScoreInputs): number {
  const time = scoreTimePressure(inputs.hoursUntilDue, inputs.isExpiring)
  const impact = scoreImpact(inputs.impactWeight)
  const blocking = scoreBlocking(inputs.isBlocking)
  const staleness = scoreStaleness(inputs.hoursSinceCreated)
  const revenue = scoreRevenue(inputs.revenueCents)

  return Math.round(Math.min(1000, time + impact + blocking + staleness + revenue))
}

/**
 * TIME PRESSURE: 0-300 points (v2 - reduced from 400 to give revenue more weight)
 *
 * Overdue items get 300 (maximum urgency).
 * Items due within 2 hours: 260-300
 * Items due within 24 hours: 190-260 (linear)
 * Items due within 3 days: 110-190 (linear)
 * Items due within 7 days: 40-110 (linear)
 * Items due beyond 7 days: 10-40 (logarithmic decay)
 * No deadline: 0
 */
function scoreTimePressure(hoursUntilDue: number | null, isExpiring: boolean): number {
  if (hoursUntilDue === null) return 0

  // Overdue
  if (hoursUntilDue < 0) return 300

  // Due within 2 hours
  if (hoursUntilDue <= 2) return 260 + (1 - hoursUntilDue / 2) * 40

  // Due within 24 hours
  if (hoursUntilDue <= 24) {
    const t = (24 - hoursUntilDue) / 22
    return 190 + t * 70
  }

  // Due within 3 days (72 hours)
  if (hoursUntilDue <= 72) {
    const t = (72 - hoursUntilDue) / 48
    return 110 + t * 80
  }

  // Due within 7 days (168 hours)
  if (hoursUntilDue <= 168) {
    const t = (168 - hoursUntilDue) / 96
    return 40 + t * 70
  }

  // Beyond 7 days - logarithmic decay
  const daysOut = hoursUntilDue / 24
  const decayed = Math.max(0, 40 - Math.log2(daysOut) * 6)

  // Expiring items get a 25% boost
  return isExpiring ? decayed * 1.25 : decayed
}

/**
 * IMPACT: 0-200 points (v2 - reduced from 250)
 * Linear mapping from impactWeight (0.0-1.0) to points.
 *
 * Impact weight guidelines (set by each provider):
 *   1.0 - Losing a client, legal/financial obligation
 *   0.8 - Revenue risk, client waiting for response
 *   0.6 - Standard operational task
 *   0.4 - Internal quality task (AAR, notes)
 *   0.2 - Nice-to-have, relationship maintenance
 *   0.0 - Zero-consequence deferral
 */
function scoreImpact(impactWeight: number): number {
  return Math.round(Math.max(0, Math.min(1, impactWeight)) * 200)
}

/**
 * BLOCKING: 0 or 150 points (binary)
 * If this item blocks downstream work, add 150.
 */
function scoreBlocking(isBlocking: boolean): number {
  return isBlocking ? 150 : 0
}

/**
 * STALENESS: 0-100 points (v2 - exponential growth)
 * Items that have been sitting get escalating urgency.
 * Day 1: ~15pts, Day 2: ~30pts, Day 3: ~50pts, Day 5: ~75pts, Day 7+: 100pts
 * Exponential curve prevents items from being ignored indefinitely.
 */
function scoreStaleness(hoursSinceCreated: number): number {
  if (hoursSinceCreated <= 0) return 0
  const days = hoursSinceCreated / 24
  // Exponential: 100 * (1 - e^(-days/3)) gives smooth ramp to 100
  return Math.round(Math.min(100, 100 * (1 - Math.exp(-days / 3))))
}

/**
 * REVENUE: 0-250 points (v2 - increased from 100, log scale)
 * Money at stake is a major priority signal. Logarithmic scale:
 * $100 = ~50pts, $1,000 = ~125pts, $5,000 = ~200pts, $10,000+ = ~250pts
 */
function scoreRevenue(revenueCents: number): number {
  if (revenueCents <= 0) return 0
  const dollars = revenueCents / 100
  return Math.round(Math.min(250, 50 * Math.log10(dollars + 1)))
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
