// Pure utility functions for the Revenue Path Calculator.
// No 'use server' — this file is imported by both server actions and client components.

import type {
  ServiceType,
  ServiceTypePricingModel,
  ServiceMixItem,
  ServiceMixPlan,
  ServiceSlotClientMatch,
} from './types'

// ── Effective price computation ───────────────────────────────────────────────

/**
 * Computes the effective price for a service type at a given guest count.
 *   flat_rate  → basePriceCents
 *   per_person → perPersonCents × guestCount
 *   hybrid     → basePriceCents + (perPersonCents × guestCount)
 */
export function computeEffectivePrice(
  pricingModel: ServiceTypePricingModel,
  basePriceCents: number,
  perPersonCents: number,
  guestCount: number
): number {
  if (pricingModel === 'flat_rate') return basePriceCents
  if (pricingModel === 'per_person') return perPersonCents * guestCount
  // hybrid
  return basePriceCents + perPersonCents * guestCount
}

// ── Service mix plan computation ──────────────────────────────────────────────

/**
 * Computes the full ServiceMixPlan from the current calculator state.
 * Pure function — no side effects, no server calls.
 */
export function computeServiceMixPlan(
  items: Array<{
    serviceType: ServiceType
    quantity: number
    clientMatches: ServiceSlotClientMatch[]
  }>,
  goalTargetCents: number,
  alreadyBookedCents: number
): ServiceMixPlan {
  const gapCents = Math.max(0, goalTargetCents - alreadyBookedCents)
  const totalPlannedCents = items.reduce(
    (sum, item) => sum + item.serviceType.effectivePriceCents * item.quantity,
    0
  )
  return {
    items: items.map((item) => ({
      ...item,
      lineRevenueCents: item.serviceType.effectivePriceCents * item.quantity,
    })),
    totalPlannedCents,
    goalTargetCents,
    alreadyBookedCents,
    gapCents,
    unfilledCents: Math.max(0, gapCents - totalPlannedCents),
    exceededByCents: Math.max(0, totalPlannedCents - gapCents),
  }
}

// ── Greedy auto-suggest algorithm ─────────────────────────────────────────────

/**
 * Suggests the most efficient mix of service types to close a revenue gap.
 * Uses a greedy algorithm: always picks the highest-value service that fits
 * within the remaining gap, repeatedly, until the gap is closed.
 *
 * If no single service fits the remaining gap, adds 1 of the cheapest service
 * to ensure the chef sees something useful rather than an empty suggestion.
 *
 * Returns a Record<serviceTypeId, quantity>.
 */
export function computeAutoSuggestMix(
  serviceTypes: ServiceType[],
  gapCents: number
): Record<string, number> {
  const result: Record<string, number> = {}
  if (gapCents <= 0 || serviceTypes.length === 0) return result

  const active = serviceTypes.filter((st) => st.isActive && st.effectivePriceCents > 0)
  if (active.length === 0) return result

  // Sort descending by effective price
  const sorted = [...active].sort((a, b) => b.effectivePriceCents - a.effectivePriceCents)
  let remaining = gapCents

  while (remaining > 0) {
    const best = sorted.find((st) => st.effectivePriceCents <= remaining)
    if (!best) {
      // Nothing fits — add 1 of the cheapest available to give the chef a starting point
      const cheapest = sorted[sorted.length - 1]
      result[cheapest.id] = (result[cheapest.id] ?? 0) + 1
      break
    }
    result[best.id] = (result[best.id] ?? 0) + 1
    remaining -= best.effectivePriceCents
  }

  return result
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString('en-US')}`
}

export function formatPricingModelLabel(model: ServiceTypePricingModel): string {
  if (model === 'flat_rate') return 'Flat rate'
  if (model === 'per_person') return 'Per person'
  return 'Hybrid'
}
