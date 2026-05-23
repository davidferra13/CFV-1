'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  getActiveCommitments,
  createCommitment,
  updateCommitment,
  getOverridesForCommitment,
  recordOverride,
} from '@/lib/commitment/engine'
import { calculateFrictionTier } from '@/lib/commitment/friction'
import { calculateIntegrityScore } from '@/lib/commitment/integrity'
import { updateAllStreaks, getStreakMilestones, resetStreak } from '@/lib/commitment/streak'
import { describeRule } from '@/lib/commitment/rule-descriptions'
import {
  evaluatePricingCommitments,
  getPricingSuggestions,
  type PricingContext,
} from '@/lib/commitment/domains/pricing'
import {
  evaluateDietaryCommitments,
  getDietarySuggestions,
  type DietaryContext,
} from '@/lib/commitment/domains/dietary'
import {
  evaluateBusinessHealthCommitments,
  getBusinessHealthSuggestions,
  type BusinessHealthContext,
} from '@/lib/commitment/domains/business-health'
import type {
  Commitment,
  CommitmentDomain,
  CommitmentOverride,
  CommitmentRule,
  CommitmentSource,
  CommitmentStatus,
  CommitmentSeason,
  CommitmentIntegrityScore,
  CommitmentSuggestion,
  FrictionTier,
  FrictionCheckResult,
  OverrideCategory,
} from '@/lib/commitment/types'

// ── Helper ─────────────────────────────────────────────────────────────────────

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

// ── Read Actions ───────────────────────────────────────────────────────────────

/**
 * Get all active commitments for the current chef, optionally filtered by domain.
 */
export async function getMyCommitmentsAction(
  domain?: CommitmentDomain
): Promise<ActionResult<Commitment[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const commitments = await getActiveCommitments(tenantId, domain)
    return ok(commitments)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load commitments')
  }
}

/**
 * Get overrides for a specific commitment.
 */
export async function getOverridesAction(
  commitmentId: string
): Promise<ActionResult<CommitmentOverride[]>> {
  try {
    if (!commitmentId || typeof commitmentId !== 'string') {
      return fail('Invalid commitment ID')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string
    const overrides = await getOverridesForCommitment(commitmentId, tenantId)
    return ok(overrides)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load overrides')
  }
}

/**
 * Get the integrity score for the current chef.
 */
export async function getIntegrityScoreAction(): Promise<ActionResult<CommitmentIntegrityScore>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const score = await calculateIntegrityScore(tenantId)
    return ok(score)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to calculate integrity score')
  }
}

/**
 * Get commitments at streak milestones (30, 60, 90, 180, 365 days).
 */
export async function getStreakMilestonesAction(): Promise<ActionResult<Commitment[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const milestones = await getStreakMilestones(tenantId)
    return ok(milestones)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load streak milestones')
  }
}

/**
 * Get a human-readable description of a commitment rule.
 */
export async function describeRuleAction(rule: CommitmentRule): Promise<ActionResult<string>> {
  try {
    await requireChef() // auth gate
    const description = describeRule(rule)
    return ok(description)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to describe rule')
  }
}

// ── Write Actions ──────────────────────────────────────────────────────────────

/**
 * Create a new commitment for the current chef.
 */
export async function createCommitmentAction(data: {
  domain: CommitmentDomain
  rule: CommitmentRule
  source?: CommitmentSource
  frictionLevel?: FrictionTier
  futureSelfletter?: string
}): Promise<ActionResult<Commitment>> {
  try {
    if (!data.domain || !data.rule) {
      return fail('Domain and rule are required')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string

    const commitment = await createCommitment(tenantId, {
      domain: data.domain,
      rule: data.rule,
      source: data.source,
      frictionLevel: data.frictionLevel,
      futureSelfletter: data.futureSelfletter,
    })

    return ok(commitment)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to create commitment')
  }
}

/**
 * Update a commitment status, friction level, future-self letter, or seasonal profile.
 */
export async function updateCommitmentAction(
  commitmentId: string,
  updates: Partial<{
    status: CommitmentStatus
    frictionLevel: FrictionTier
    futureSelfletter: string | null
    seasonalProfile: CommitmentSeason | null
  }>
): Promise<ActionResult> {
  try {
    if (!commitmentId || typeof commitmentId !== 'string') {
      return fail('Invalid commitment ID')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string

    await updateCommitment(commitmentId, tenantId, updates)
    return ok()
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to update commitment')
  }
}

/**
 * Pause a commitment (soft deactivate, can be resumed).
 */
export async function pauseCommitmentAction(commitmentId: string): Promise<ActionResult> {
  return updateCommitmentAction(commitmentId, { status: 'paused' })
}

/**
 * Resume a paused commitment.
 */
export async function resumeCommitmentAction(commitmentId: string): Promise<ActionResult> {
  return updateCommitmentAction(commitmentId, { status: 'active' })
}

/**
 * Dismiss a commitment (permanently deactivate).
 */
export async function dismissCommitmentAction(commitmentId: string): Promise<ActionResult> {
  return updateCommitmentAction(commitmentId, { status: 'dismissed' })
}

/**
 * Record an override against a commitment.
 * Resets the streak and increments override count.
 */
export async function recordOverrideAction(data: {
  commitmentId: string
  reason: string
  category?: OverrideCategory
  frictionTierAtOverride: FrictionTier
  regretPrediction?: number
  context?: Record<string, unknown>
}): Promise<ActionResult<CommitmentOverride>> {
  try {
    if (!data.commitmentId || typeof data.commitmentId !== 'string') {
      return fail('Invalid commitment ID')
    }
    if (!data.reason || typeof data.reason !== 'string' || data.reason.trim().length === 0) {
      return fail('Override reason is required')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string

    const override = await recordOverride(data.commitmentId, tenantId, {
      category: data.category,
      reason: data.reason.trim(),
      frictionTierAtOverride: data.frictionTierAtOverride,
      regretPrediction: data.regretPrediction,
      context: data.context,
    })

    return ok(override)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to record override')
  }
}

/**
 * Increment streaks for all active commitments (called by daily cron).
 * Returns the number of commitments updated.
 */
export async function updateStreaksAction(): Promise<ActionResult<number>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const count = await updateAllStreaks(tenantId)
    return ok(count)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to update streaks')
  }
}

/**
 * Get the current friction tier for a commitment based on its override history.
 */
export async function getFrictionTierAction(
  commitmentId: string
): Promise<ActionResult<{ tier: FrictionTier; overridesLast30: number; overridesLast90: number }>> {
  try {
    if (!commitmentId || typeof commitmentId !== 'string') {
      return fail('Invalid commitment ID')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string

    // Get the commitment and its overrides
    const commitments = await getActiveCommitments(tenantId)
    const commitment = commitments.find((c) => c.id === commitmentId)
    if (!commitment) {
      return fail('Commitment not found')
    }

    const overrides = await getOverridesForCommitment(commitmentId, tenantId)
    const tier = calculateFrictionTier(commitment, overrides)

    const now = Date.now()
    const overridesLast30 = overrides.filter(
      (o) => o.createdAt.getTime() > now - 30 * 24 * 60 * 60 * 1000
    ).length
    const overridesLast90 = overrides.filter(
      (o) => o.createdAt.getTime() > now - 90 * 24 * 60 * 60 * 1000
    ).length

    return ok({ tier, overridesLast30, overridesLast90 })
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to calculate friction tier')
  }
}

// ── Pricing Domain Actions ────────────────────────────────────────────────────

/**
 * Evaluate active pricing commitments against a pricing context.
 * Returns friction results for any violated rules.
 */
export async function evaluatePricingAction(
  context: PricingContext
): Promise<ActionResult<FrictionCheckResult[]>> {
  try {
    if (context.perHeadPrice == null || typeof context.perHeadPrice !== 'number') {
      return fail('perHeadPrice is required and must be a number')
    }
    if (context.perHeadPrice < 0) {
      return fail('perHeadPrice cannot be negative')
    }
    if (context.foodCostPercent != null && typeof context.foodCostPercent !== 'number') {
      return fail('foodCostPercent must be a number')
    }
    if (context.daysBeforeEvent != null && typeof context.daysBeforeEvent !== 'number') {
      return fail('daysBeforeEvent must be a number')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string
    const results = await evaluatePricingCommitments(tenantId, context)
    return ok(results)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to evaluate pricing commitments')
  }
}

/**
 * Get system-generated pricing commitment suggestions based on event history.
 * Analyzes recent events to suggest pricing floors and late-discount freezes.
 */
export async function getPricingSuggestionsAction(): Promise<ActionResult<CommitmentSuggestion[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const suggestions = await getPricingSuggestions(tenantId)
    return ok(suggestions)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to generate pricing suggestions')
  }
}

/**
 * Create a pricing-specific commitment with validation.
 * Convenience wrapper that enforces domain='pricing' and validates rule shape.
 */
export async function createPricingCommitmentAction(data: {
  rule:
    | { type: 'pricing_floor'; minPerHead: number }
    | { type: 'margin_floor'; maxFoodCostPercent: number }
    | { type: 'no_late_discounts'; freezeDaysBeforeEvent: number }
  frictionLevel?: FrictionTier
  futureSelfletter?: string
}): Promise<ActionResult<Commitment>> {
  try {
    if (!data.rule || !data.rule.type) {
      return fail('Rule with type is required')
    }

    // Validate rule-specific fields
    if (data.rule.type === 'pricing_floor') {
      if (typeof data.rule.minPerHead !== 'number' || data.rule.minPerHead <= 0) {
        return fail('minPerHead must be a positive number')
      }
    } else if (data.rule.type === 'margin_floor') {
      if (
        typeof data.rule.maxFoodCostPercent !== 'number' ||
        data.rule.maxFoodCostPercent <= 0 ||
        data.rule.maxFoodCostPercent > 100
      ) {
        return fail('maxFoodCostPercent must be between 0 and 100')
      }
    } else if (data.rule.type === 'no_late_discounts') {
      if (
        typeof data.rule.freezeDaysBeforeEvent !== 'number' ||
        data.rule.freezeDaysBeforeEvent < 1
      ) {
        return fail('freezeDaysBeforeEvent must be at least 1')
      }
    } else {
      return fail('Invalid pricing rule type')
    }

    const user = await requireChef()
    const tenantId = user.tenantId as string

    const commitment = await createCommitment(tenantId, {
      domain: 'pricing',
      rule: data.rule,
      source: 'chef_declared',
      frictionLevel: data.frictionLevel,
      futureSelfletter: data.futureSelfletter,
    })

    return ok(commitment)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to create pricing commitment')
  }
}

/**
 * Get all active pricing commitments for the current chef.
 */
export async function getMyPricingCommitmentsAction(): Promise<ActionResult<Commitment[]>> {
  return getMyCommitmentsAction('pricing')
}
