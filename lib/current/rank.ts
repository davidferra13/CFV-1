// The Current - Ranking Function
// Single priority function that scores all CurrentUnits on a 0-1000 scale.

import type { CurrentUnit } from './types'

// Weight distribution (must sum to 1.0)
const W_DEADLINE = 0.35
const W_REVENUE = 0.25
const W_EFFORT = 0.2
const W_MOMENTUM = 0.1
const W_FRESHNESS = 0.1

function deadlineScore(unit: CurrentUnit): number {
  if (!unit.dueAt) return 200

  const hoursUntil = (new Date(unit.dueAt).getTime() - Date.now()) / (1000 * 60 * 60)

  if (hoursUntil < 0) return 1000 // overdue
  if (hoursUntil < 24) return 900 // due in <24h
  if (hoursUntil < 72) return 700 // due in 1-3 days
  if (hoursUntil < 168) return 500 // due in 3-7 days
  return 300 // due in >7 days
}

function revenueScore(unit: CurrentUnit): number {
  if (unit.revenueCents == null) return 200

  const dollars = unit.revenueCents / 100
  if (dollars > 2000) return 900
  if (dollars > 500) return 700
  if (dollars > 100) return 500
  return 300
}

function effortScore(unit: CurrentUnit): number {
  if (unit.estimatedMinutes == null) return 500

  if (unit.estimatedMinutes <= 2) return 900 // quick wins surface
  if (unit.estimatedMinutes <= 10) return 700
  if (unit.estimatedMinutes <= 30) return 400
  return 200 // deep work sinks
}

// V1: no behavioral tracking, always neutral
function momentumScore(): number {
  return 500
}

function freshnessScore(unit: CurrentUnit): number {
  const hoursOld = (Date.now() - new Date(unit.createdAt).getTime()) / (1000 * 60 * 60)

  if (hoursOld < 1) return 900
  if (hoursOld < 24) return 700
  if (hoursOld < 72) return 500
  if (hoursOld < 168) return 300
  return 100
}

/**
 * Apply urgency floor: critical/high units get a minimum score
 * so they never sink below growth/optimization items.
 */
function urgencyFloor(unit: CurrentUnit, rawScore: number): number {
  if (unit.urgency === 'critical') return Math.max(rawScore, 700)
  if (unit.urgency === 'high') return Math.max(rawScore, 450)
  return rawScore
}

/**
 * Rank a single unit. Returns score 0-1000.
 */
export function rankUnit(unit: CurrentUnit): number {
  const raw = Math.round(
    deadlineScore(unit) * W_DEADLINE +
      revenueScore(unit) * W_REVENUE +
      effortScore(unit) * W_EFFORT +
      momentumScore() * W_MOMENTUM +
      freshnessScore(unit) * W_FRESHNESS
  )

  return urgencyFloor(unit, raw)
}

/**
 * Rank all units in place. Returns sorted (highest first).
 */
export function rankAll(units: CurrentUnit[]): CurrentUnit[] {
  for (const unit of units) {
    unit.score = rankUnit(unit)
  }

  return units.sort((a, b) => b.score - a.score)
}
