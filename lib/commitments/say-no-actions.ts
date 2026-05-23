'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getActiveCommitments } from '@/lib/commitment/engine'
import type { Commitment, CommitmentRule } from '@/lib/commitment/types'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RefusalCategory =
  | 'under_minimum_value'
  | 'over_max_distance'
  | 'cancelled_without_prepay'
  | 'too_many_dietary'
  | 'custom'

export interface RefusalRule {
  category: RefusalCategory
  label: string
  /** The commitment rule type that backs this refusal */
  commitmentRuleType: CommitmentRule['type'] | null
  /** True if a matching commitment is active */
  active: boolean
  /** The backing commitment, if active */
  commitment: Commitment | null
}

export interface InquiryEvaluation {
  autoDecline: boolean
  violations: Array<{
    category: RefusalCategory
    reason: string
    commitment: Commitment
  }>
  /** Inquiries that pass all rules but are flagged for manual review */
  flags: string[]
}

export interface RefusalHistoryEntry {
  category: RefusalCategory
  reason: string
  inquiryContext: Record<string, unknown> | null
  createdAt: Date
}

interface ActionResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

function fail<T>(error: string): ActionResult<T> {
  return { success: false, error }
}

function ok<T>(data?: T): ActionResult<T> {
  return { success: true, data }
}

// ── Refusal Category to Commitment Rule Mapping ──────────────────────────────

const REFUSAL_MAP: Array<{
  category: RefusalCategory
  label: string
  ruleType: CommitmentRule['type']
}> = [
  {
    category: 'under_minimum_value',
    label: 'Under minimum event value',
    ruleType: 'say_no_min_event_value',
  },
  {
    category: 'over_max_distance',
    label: 'Over maximum distance',
    ruleType: 'say_no_max_distance',
  },
  {
    category: 'cancelled_without_prepay',
    label: 'Previously cancelled without prepay',
    ruleType: 'say_no_cancelled_clients_require_prepay',
  },
  { category: 'too_many_dietary', label: 'Too many dietary accommodations', ruleType: 'custom' },
]

// ── Actions ──────────────────────────────────────────────────────────────────

/**
 * Get pre-declared refusal rules and whether each is backed by an active commitment.
 */
export async function defineRefusalRules(): Promise<ActionResult<RefusalRule[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const commitments = await getActiveCommitments(tenantId)

    const rules: RefusalRule[] = REFUSAL_MAP.map((mapping) => {
      const match = commitments.find((c) => c.rule.type === mapping.ruleType)
      return {
        category: mapping.category,
        label: mapping.label,
        commitmentRuleType: mapping.ruleType,
        active: !!match,
        commitment: match ?? null,
      }
    })

    return ok(rules)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load refusal rules')
  }
}

/**
 * Evaluate an inquiry against active refusal commitments.
 * Returns auto-decline decision plus list of violations.
 */
export async function evaluateInquiry(context: {
  estimatedTotal?: number
  distanceMiles?: number
  clientId?: string
  dietaryRestrictionCount?: number
}): Promise<ActionResult<InquiryEvaluation>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const commitments = await getActiveCommitments(tenantId)

    const violations: InquiryEvaluation['violations'] = []
    const flags: string[] = []

    for (const c of commitments) {
      const rule = c.rule

      // Under minimum event value
      if (
        rule.type === 'say_no_min_event_value' &&
        context.estimatedTotal != null &&
        context.estimatedTotal < rule.minTotal
      ) {
        violations.push({
          category: 'under_minimum_value',
          reason: `Estimated total $${context.estimatedTotal} is below minimum $${rule.minTotal}`,
          commitment: c,
        })
      }

      // Over max distance
      if (
        rule.type === 'say_no_max_distance' &&
        context.distanceMiles != null &&
        context.distanceMiles > rule.maxMiles
      ) {
        violations.push({
          category: 'over_max_distance',
          reason: `Distance ${context.distanceMiles} mi exceeds maximum ${rule.maxMiles} mi`,
          commitment: c,
        })
      }

      // Cancelled client requires prepay
      if (rule.type === 'say_no_cancelled_clients_require_prepay' && context.clientId) {
        const hasPriorCancellation = await checkClientCancellationHistory(
          tenantId,
          context.clientId
        )
        if (hasPriorCancellation) {
          violations.push({
            category: 'cancelled_without_prepay',
            reason: 'Client has prior cancellation; prepay required before booking',
            commitment: c,
          })
        }
      }
    }

    // Dietary accommodation flag (not auto-decline, just flagged)
    if (context.dietaryRestrictionCount != null && context.dietaryRestrictionCount > 5) {
      flags.push(
        `High dietary accommodation count (${context.dietaryRestrictionCount}); review capacity before accepting`
      )
    }

    return ok({
      autoDecline: violations.length > 0,
      violations,
      flags,
    })
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to evaluate inquiry')
  }
}

/**
 * Get past refusal history from commitment overrides tagged with refusal categories.
 */
export async function getRefusalHistory(): Promise<ActionResult<RefusalHistoryEntry[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string

    const client = createServerClient()
    const { data, error } = await client
      .from('commitment_overrides' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return fail(error.message)

    const refusalRuleTypes = new Set(REFUSAL_MAP.map((m) => m.ruleType))

    // Cross-reference with commitments to find refusal-related overrides
    const commitments = await getActiveCommitments(tenantId)
    const refusalCommitmentIds = new Set(
      commitments.filter((c) => refusalRuleTypes.has(c.rule.type)).map((c) => c.id)
    )

    const entries: RefusalHistoryEntry[] = (data ?? [])
      .filter((row: any) => refusalCommitmentIds.has(row.commitment_id))
      .map((row: any) => ({
        category: mapOverrideCategoryToRefusal(row.category),
        reason: row.reason as string,
        inquiryContext: row.context ?? null,
        createdAt: new Date(row.created_at),
      }))

    return ok(entries)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load refusal history')
  }
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

async function checkClientCancellationHistory(
  tenantId: string,
  clientId: string
): Promise<boolean> {
  const client = createServerClient()
  const { data, error } = await client
    .from('events' as any)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('status', 'cancelled')

  if (error) return false
  return (data as any)?.length > 0 || false
}

function mapOverrideCategoryToRefusal(category: string | null): RefusalCategory {
  switch (category) {
    case 'financial_pressure':
      return 'under_minimum_value'
    case 'client_request':
      return 'cancelled_without_prepay'
    default:
      return 'custom'
  }
}
