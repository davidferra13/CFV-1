'use server'

// lib/monetization/respectful-actions.ts
// Respectful Monetization server actions (P61)
// No new tables. Standalone guardrails and event tracking.
// Admin-gated for config/evaluation, chef-gated for reads.

import { requireAdmin } from '@/lib/auth/admin'
import type {
  MonetizationGuardrail,
  MonetizationEvent,
  MonetizationEventType,
  PricingFairnessResult,
} from './respectful-types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

// ---------------------------------------------------------------------------
// In-memory guardrail store (hardcoded defaults, no DB)
// ---------------------------------------------------------------------------

const DEFAULT_GUARDRAILS: MonetizationGuardrail[] = [
  {
    id: 'max-monthly-increase',
    name: 'Maximum Monthly Price Increase',
    description:
      'No single price increase can exceed 20% of the current price within a billing cycle.',
    maxPriceIncreasePercent: 20,
    minDaysBetweenChanges: 30,
    enforced: true,
    category: 'pricing',
  },
  {
    id: 'annual-increase-cap',
    name: 'Annual Price Increase Cap',
    description: 'Total annual price increases cannot exceed 35% of the starting annual price.',
    maxPriceIncreasePercent: 35,
    minDaysBetweenChanges: 365,
    enforced: true,
    category: 'pricing',
  },
  {
    id: 'billing-frequency-stability',
    name: 'Billing Frequency Stability',
    description: 'Billing frequency cannot change more than once every 90 days.',
    maxPriceIncreasePercent: 0,
    minDaysBetweenChanges: 90,
    enforced: true,
    category: 'billing',
  },
  {
    id: 'feature-gate-notice',
    name: 'Feature Gate Notice Period',
    description: 'Features moving behind a paywall require 30 days advance notice.',
    maxPriceIncreasePercent: 0,
    minDaysBetweenChanges: 30,
    enforced: true,
    category: 'feature-gating',
  },
  {
    id: 'trial-minimum-duration',
    name: 'Trial Minimum Duration',
    description: 'Free trials must be at least 14 days. No bait trials.',
    maxPriceIncreasePercent: 0,
    minDaysBetweenChanges: 14,
    enforced: true,
    category: 'trial',
  },
  {
    id: 'no-silent-upgrades',
    name: 'No Silent Upgrades',
    description: 'Plan upgrades require explicit user confirmation. No auto-upgrades.',
    maxPriceIncreasePercent: 0,
    minDaysBetweenChanges: 0,
    enforced: true,
    category: 'billing',
  },
]

// In-memory event log (persists only within server process lifecycle)
const eventLog: MonetizationEvent[] = []

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Returns the configured monetization guardrails.
 */
export async function getMonetizationGuardrails(): Promise<ActionResult<MonetizationGuardrail[]>> {
  try {
    await requireAdmin()
    return { success: true, data: DEFAULT_GUARDRAILS }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}

/**
 * Evaluate whether a proposed pricing change is within guardrail bounds.
 */
export async function evaluatePricingFairness(
  currentPrice: number,
  proposedPrice: number
): Promise<ActionResult<PricingFairnessResult>> {
  try {
    await requireAdmin()

    if (currentPrice < 0 || proposedPrice < 0) {
      return { success: false, error: 'Prices must be non-negative.' }
    }

    const violations: string[] = []
    const suggestions: string[] = []

    // Calculate increase
    const difference = proposedPrice - currentPrice
    const increasePercent =
      currentPrice > 0 ? Math.round((difference / currentPrice) * 100) : proposedPrice > 0 ? 100 : 0

    // Check against pricing guardrails
    for (const guardrail of DEFAULT_GUARDRAILS) {
      if (!guardrail.enforced) continue
      if (guardrail.category !== 'pricing') continue

      if (
        guardrail.maxPriceIncreasePercent > 0 &&
        increasePercent > guardrail.maxPriceIncreasePercent
      ) {
        violations.push(
          `${guardrail.name}: increase of ${increasePercent}% exceeds limit of ${guardrail.maxPriceIncreasePercent}%.`
        )
        suggestions.push(
          `Consider a phased increase. Maximum single increase: ${guardrail.maxPriceIncreasePercent}%.`
        )
      }
    }

    // Price decrease is always fair
    if (difference < 0) {
      return {
        success: true,
        data: {
          fair: true,
          currentPrice,
          proposedPrice,
          increasePercent,
          violations: [],
          suggestions: ['Price decrease is always within bounds.'],
        },
      }
    }

    // Zero change is always fair
    if (difference === 0) {
      return {
        success: true,
        data: {
          fair: true,
          currentPrice,
          proposedPrice,
          increasePercent: 0,
          violations: [],
          suggestions: [],
        },
      }
    }

    return {
      success: true,
      data: {
        fair: violations.length === 0,
        currentPrice,
        proposedPrice,
        increasePercent,
        violations,
        suggestions,
      },
    }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}

/**
 * Log a monetization-related event. Stored in-memory (process lifecycle).
 * For persistent tracking, integrate with a DB table when ready.
 */
export async function logMonetizationEvent(
  eventType: MonetizationEventType,
  description: string,
  metadata?: Record<string, unknown>,
  affectedTenantId?: string
): Promise<ActionResult<MonetizationEvent>> {
  try {
    const admin = await requireAdmin()

    const event: MonetizationEvent = {
      id: `me_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventType,
      description,
      actor: admin.email,
      affectedTenantId,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
    }

    eventLog.push(event)

    // Keep log bounded (last 1000 events in memory)
    if (eventLog.length > 1000) {
      eventLog.splice(0, eventLog.length - 1000)
    }

    return { success: true, data: event }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}

/**
 * Returns recent monetization events from the in-memory log.
 */
export async function getMonetizationEvents(
  limit: number = 50
): Promise<ActionResult<MonetizationEvent[]>> {
  try {
    await requireAdmin()
    const recent = eventLog.slice(-limit).reverse()
    return { success: true, data: recent }
  } catch {
    return { success: false, error: 'Admin access required.' }
  }
}
