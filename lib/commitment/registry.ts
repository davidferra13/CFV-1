import type {
  CommitmentDomain,
  CommitmentRule,
  FrictionCheckResult,
  CommitmentSuggestion,
} from './types'

// ============================================
// Commitment Registry
//
// Central plugin registry for commitment domains.
// Each domain registers an evaluator and optional suggestion generator.
// The engine dispatches through the registry instead of hard-coding domain logic.
// ============================================

export interface DomainEvaluator<TContext = Record<string, unknown>> {
  /** Domain this evaluator handles */
  domain: CommitmentDomain
  /** Human-readable domain label */
  label: string
  /**
   * Evaluate active commitments in this domain against the given context.
   * Returns friction results for any violated rules.
   */
  evaluate: (tenantId: string, context: TContext) => Promise<FrictionCheckResult[]>
  /**
   * Generate system suggestions based on tenant history.
   * Returns pending suggestions the chef can accept or dismiss.
   */
  suggest?: (tenantId: string) => Promise<CommitmentSuggestion[]>
  /**
   * Validate that a CommitmentRule belongs to this domain.
   * Returns true if the rule type is owned by this domain.
   */
  ownsRule: (rule: CommitmentRule) => boolean
}

const domainRegistry = new Map<CommitmentDomain, DomainEvaluator<any>>()

/**
 * Register a domain evaluator plugin.
 * Each domain should be registered once at module load time.
 */
export function registerDomain<TContext>(evaluator: DomainEvaluator<TContext>): void {
  if (domainRegistry.has(evaluator.domain)) {
    console.warn(
      `[commitment/registry] Domain "${evaluator.domain}" is already registered. Overwriting.`
    )
  }
  domainRegistry.set(evaluator.domain, evaluator)
}

/**
 * Get the evaluator for a specific domain.
 */
export function getDomainEvaluator(domain: CommitmentDomain): DomainEvaluator | undefined {
  return domainRegistry.get(domain)
}

/**
 * Get all registered domain evaluators.
 */
export function getAllDomainEvaluators(): DomainEvaluator[] {
  return Array.from(domainRegistry.values())
}

/**
 * Get all registered domain names.
 */
export function getRegisteredDomains(): CommitmentDomain[] {
  return Array.from(domainRegistry.keys())
}

/**
 * Check if a domain has a registered evaluator.
 */
export function isDomainRegistered(domain: CommitmentDomain): boolean {
  return domainRegistry.has(domain)
}

/**
 * Find which domain owns a given rule type.
 */
export function findDomainForRule(rule: CommitmentRule): CommitmentDomain | null {
  for (const [domain, evaluator] of domainRegistry) {
    if (evaluator.ownsRule(rule)) return domain
  }
  return null
}

/**
 * Evaluate commitments across ALL registered domains.
 * Useful for global pre-action checks (e.g., before confirming an event).
 */
export async function evaluateAllDomains(
  tenantId: string,
  contextByDomain: Partial<Record<CommitmentDomain, Record<string, unknown>>>
): Promise<FrictionCheckResult[]> {
  const results: FrictionCheckResult[] = []

  const evaluations = Object.entries(contextByDomain).map(async ([domain, context]) => {
    const evaluator = domainRegistry.get(domain as CommitmentDomain)
    if (!evaluator || !context) return []
    try {
      return await evaluator.evaluate(tenantId, context)
    } catch (err) {
      console.error(`[commitment/registry] Evaluation failed for domain "${domain}":`, err)
      return []
    }
  })

  const settled = await Promise.allSettled(evaluations)
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(...result.value)
    }
  }

  return results
}

/**
 * Gather suggestions from ALL registered domains.
 */
export async function gatherAllSuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const suggestions: CommitmentSuggestion[] = []

  const generators = Array.from(domainRegistry.values())
    .filter((e) => e.suggest)
    .map(async (evaluator) => {
      try {
        return await evaluator.suggest!(tenantId)
      } catch (err) {
        console.error(
          `[commitment/registry] Suggestion generation failed for "${evaluator.domain}":`,
          err
        )
        return []
      }
    })

  const settled = await Promise.allSettled(generators)
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      suggestions.push(...result.value)
    }
  }

  return suggestions
}

// ---- Rule-to-Domain Mapping (static, no domain module imports) ----

const PRICING_RULE_TYPES = new Set(['pricing_floor', 'margin_floor', 'no_late_discounts'])
const SCHEDULING_RULE_TYPES = new Set([
  'max_events_per_week',
  'min_rest_days',
  'max_consecutive_work_days',
  'protected_time_lock',
  'no_same_day_doubles_after',
])
const DIETARY_RULE_TYPES = new Set([
  'allergens_verified_before_confirm',
  'cross_contamination_check_required',
  'no_unverified_substitutions',
  'dietary_summary_sent_before',
])
const MENU_RULE_TYPES = new Set([
  'menu_lock_cooldown',
  'max_menu_revisions',
  'no_new_dishes_within',
  'recipe_required_before_lock',
])
const CLOSEOUT_RULE_TYPES = new Set([
  'invoice_within_days',
  'payment_followup_within_days',
  'cost_reconciliation_required',
  'no_new_events_until_closeout',
])
const COMMUNICATION_RULE_TYPES = new Set([
  'response_time_sla',
  'cadence_integrity',
  'no_radio_silence',
  'post_event_followup_within',
])
const CAPACITY_RULE_TYPES = new Set([
  'max_guests_without_sous',
  'revenue_concentration_cap',
  'min_prep_time_per_tier',
  'min_gap_between_events',
])
const CONTINGENCY_RULE_TYPES = new Set([
  'emergency_contacts_before_confirm',
  'backup_plan_for_high_value',
  'insurance_current_required',
  'equipment_checklist_before_service',
])
const TRAVEL_RULE_TYPES = new Set([
  'travel_time_buffer',
  'travel_plan_before_confirm',
  'max_distance_without_overnight',
  'travel_surcharge_required',
])
const BUSINESS_HEALTH_RULE_TYPES = new Set([
  'weekly_financial_review',
  'quarterly_rate_review',
  'certification_currency',
  'savings_reserve_percent',
])

/**
 * Check which domain owns a rule type string.
 * Pure lookup, no domain module imports needed.
 */
export function getRuleTypeDomain(ruleType: string): CommitmentDomain | null {
  if (PRICING_RULE_TYPES.has(ruleType)) return 'pricing'
  if (SCHEDULING_RULE_TYPES.has(ruleType)) return 'scheduling'
  if (DIETARY_RULE_TYPES.has(ruleType)) return 'dietary'
  if (MENU_RULE_TYPES.has(ruleType)) return 'menu'
  if (CLOSEOUT_RULE_TYPES.has(ruleType)) return 'closeout'
  if (COMMUNICATION_RULE_TYPES.has(ruleType)) return 'communication'
  if (CAPACITY_RULE_TYPES.has(ruleType)) return 'capacity'
  if (CONTINGENCY_RULE_TYPES.has(ruleType)) return 'contingency'
  if (TRAVEL_RULE_TYPES.has(ruleType)) return 'travel'
  if (BUSINESS_HEALTH_RULE_TYPES.has(ruleType)) return 'business_health'
  return null
}
