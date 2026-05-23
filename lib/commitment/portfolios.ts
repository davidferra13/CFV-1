import type { CommitmentDomain, CommitmentRule, FrictionTier } from './types'

// ── Commitment Portfolios (Preset Bundles) ──────────────────────────────────
// One-click setup: chef picks a portfolio, system activates matching commitments.
// Each portfolio is a curated set of rules tuned for a specific operating style.

export type PortfolioId = 'quality_first' | 'growth' | 'sustainability' | 'recovery'

export interface PortfolioCommitment {
  domain: CommitmentDomain
  rule: CommitmentRule
  frictionLevel: FrictionTier
  rationale: string
}

export interface Portfolio {
  id: PortfolioId
  name: string
  description: string
  icon: string
  commitments: PortfolioCommitment[]
}

export const PORTFOLIOS: Record<PortfolioId, Portfolio> = {
  quality_first: {
    id: 'quality_first',
    name: 'Quality First',
    description:
      'Prioritize excellence over volume. Strict dietary safety, generous prep time, controlled event count. Best for chefs building a premium reputation.',
    icon: 'star',
    commitments: [
      {
        domain: 'dietary',
        rule: { type: 'allergens_verified_before_confirm', required: true },
        frictionLevel: 4,
        rationale: 'Zero tolerance for allergen errors protects clients and reputation.',
      },
      {
        domain: 'dietary',
        rule: { type: 'no_unverified_substitutions', required: true },
        frictionLevel: 3,
        rationale: 'Every substitution must be verified for dietary safety.',
      },
      {
        domain: 'scheduling',
        rule: { type: 'max_events_per_week', limit: 3 },
        frictionLevel: 2,
        rationale: 'Fewer events means more prep time and higher quality per service.',
      },
      {
        domain: 'scheduling',
        rule: { type: 'max_consecutive_work_days', limit: 4 },
        frictionLevel: 2,
        rationale: 'Rest days preserve creativity and prevent burnout.',
      },
      {
        domain: 'menu',
        rule: { type: 'no_new_dishes_within', days: 7 },
        frictionLevel: 2,
        rationale: 'New dishes need testing. Never debut untested food at a client event.',
      },
      {
        domain: 'menu',
        rule: { type: 'recipe_required_before_lock', required: true },
        frictionLevel: 3,
        rationale: 'Every menu item must have a documented recipe before finalization.',
      },
      {
        domain: 'pricing',
        rule: { type: 'margin_floor', maxFoodCostPercent: 30 },
        frictionLevel: 2,
        rationale: 'Quality ingredients cost more. Protect margins to sustain quality.',
      },
    ],
  },

  growth: {
    id: 'growth',
    name: 'Growth Mode',
    description:
      'Maximize bookings and revenue. Lighter scheduling constraints, strong communication standards. Best for chefs scaling their business.',
    icon: 'trending-up',
    commitments: [
      {
        domain: 'communication',
        rule: { type: 'response_time_sla', hours: 4 },
        frictionLevel: 2,
        rationale: 'Fast responses convert more inquiries into bookings.',
      },
      {
        domain: 'communication',
        rule: { type: 'no_radio_silence', maxDays: 3 },
        frictionLevel: 2,
        rationale: 'Staying in touch keeps clients engaged and rebooking.',
      },
      {
        domain: 'closeout',
        rule: { type: 'invoice_within_days', days: 3 },
        frictionLevel: 2,
        rationale: 'Fast invoicing improves cash flow for growth investment.',
      },
      {
        domain: 'closeout',
        rule: { type: 'payment_followup_within_days', days: 5 },
        frictionLevel: 1,
        rationale: 'Timely follow-ups reduce outstanding receivables.',
      },
      {
        domain: 'pricing',
        rule: { type: 'pricing_floor', minPerHead: 50 },
        frictionLevel: 1,
        rationale: 'Even in growth mode, never undervalue your work.',
      },
      {
        domain: 'dietary',
        rule: { type: 'allergens_verified_before_confirm', required: true },
        frictionLevel: 3,
        rationale: 'Safety is non-negotiable regardless of growth pace.',
      },
      {
        domain: 'business_health',
        rule: { type: 'revenue_concentration_cap', maxPercent: 40 },
        frictionLevel: 1,
        rationale: 'Diversify your client base to reduce risk.',
      },
    ],
  },

  sustainability: {
    id: 'sustainability',
    name: 'Sustainability',
    description:
      'Balance workload with wellbeing. Strong rest requirements, reasonable financial floors, proactive closeout. Best for long-term career health.',
    icon: 'heart',
    commitments: [
      {
        domain: 'scheduling',
        rule: { type: 'min_rest_days', days: 2, perWeeks: 1 },
        frictionLevel: 3,
        rationale: 'Two rest days per week prevents chronic burnout.',
      },
      {
        domain: 'scheduling',
        rule: { type: 'max_events_per_week', limit: 4 },
        frictionLevel: 2,
        rationale: 'Sustainable pace allows consistent quality.',
      },
      {
        domain: 'pricing',
        rule: { type: 'margin_floor', maxFoodCostPercent: 35 },
        frictionLevel: 2,
        rationale: 'Healthy margins mean less financial stress.',
      },
      {
        domain: 'business_health',
        rule: { type: 'savings_reserve_percent', percent: 10 },
        frictionLevel: 1,
        rationale: 'Building reserves protects against slow seasons.',
      },
      {
        domain: 'closeout',
        rule: { type: 'cost_reconciliation_required', required: true },
        frictionLevel: 2,
        rationale: 'Know your real costs after every event.',
      },
      {
        domain: 'communication',
        rule: { type: 'post_event_followup_within', hours: 48 },
        frictionLevel: 1,
        rationale: 'Thank-you notes build lasting relationships.',
      },
      {
        domain: 'business_health',
        rule: { type: 'weekly_financial_review', required: true },
        frictionLevel: 1,
        rationale: 'Weekly check-ins catch problems before they compound.',
      },
    ],
  },

  recovery: {
    id: 'recovery',
    name: 'Recovery',
    description:
      'Rebuild after a rough patch. Minimal commitments, high friction on safety-critical items, gentle scheduling. Best after burnout or business setback.',
    icon: 'refresh-cw',
    commitments: [
      {
        domain: 'dietary',
        rule: { type: 'allergens_verified_before_confirm', required: true },
        frictionLevel: 5,
        rationale: 'Safety is the foundation. Maximum friction prevents shortcuts.',
      },
      {
        domain: 'scheduling',
        rule: { type: 'max_events_per_week', limit: 2 },
        frictionLevel: 3,
        rationale: 'Start slow. Two events per week while rebuilding stamina.',
      },
      {
        domain: 'scheduling',
        rule: { type: 'min_rest_days', days: 3, perWeeks: 1 },
        frictionLevel: 3,
        rationale: 'Extra rest during recovery. Three days off per week.',
      },
      {
        domain: 'pricing',
        rule: { type: 'pricing_floor', minPerHead: 65 },
        frictionLevel: 2,
        rationale: 'Do not discount during recovery. Your work has value.',
      },
      {
        domain: 'communication',
        rule: { type: 'response_time_sla', hours: 24 },
        frictionLevel: 1,
        rationale: 'Respond within a day, but no pressure for instant replies.',
      },
    ],
  },
}

/**
 * Get all available portfolios.
 */
export function getAllPortfolios(): Portfolio[] {
  return Object.values(PORTFOLIOS)
}

/**
 * Get a specific portfolio by ID.
 */
export function getPortfolio(id: PortfolioId): Portfolio | null {
  return PORTFOLIOS[id] ?? null
}

/**
 * Get the commitments that would be created for a portfolio.
 * Does not create them; just returns the list for preview.
 */
export function previewPortfolio(id: PortfolioId): PortfolioCommitment[] {
  const portfolio = PORTFOLIOS[id]
  if (!portfolio) return []
  return portfolio.commitments
}
