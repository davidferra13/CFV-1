// lib/monetization/respectful-types.ts
// Respectful Monetization types (P61)
// No new tables. Standalone guardrails and event tracking.

export type MonetizationGuardrail = {
  id: string
  name: string
  description: string
  /** Maximum allowed percentage increase per billing cycle */
  maxPriceIncreasePercent: number
  /** Minimum days between price changes */
  minDaysBetweenChanges: number
  /** Whether this guardrail is currently enforced */
  enforced: boolean
  category: 'pricing' | 'billing' | 'feature-gating' | 'trial'
}

export type MonetizationEventType =
  | 'price-change'
  | 'plan-upgrade'
  | 'plan-downgrade'
  | 'trial-start'
  | 'trial-end'
  | 'feature-gate-added'
  | 'feature-gate-removed'
  | 'billing-frequency-change'
  | 'discount-applied'
  | 'discount-removed'

export type MonetizationEvent = {
  id: string
  eventType: MonetizationEventType
  description: string
  /** Who triggered this (admin email or system) */
  actor: string
  /** Affected user/tenant ID, if applicable */
  affectedTenantId?: string
  metadata: Record<string, unknown>
  createdAt: string
}

export type PricingFairnessResult = {
  fair: boolean
  currentPrice: number
  proposedPrice: number
  increasePercent: number
  violations: string[]
  suggestions: string[]
}
