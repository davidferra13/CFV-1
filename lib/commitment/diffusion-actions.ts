'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getActiveCommitments, getOverridesForCommitment } from '@/lib/commitment/engine'
import type {
  Commitment,
  CommitmentDomain,
  CommitmentRule,
  DOMAIN_LABELS,
} from '@/lib/commitment/types'

// ── Types ─────────────────────────────────────────────────────────────────────

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

export interface SuccessfulPattern {
  commitment: Commitment
  score: number
  reason: string
}

export interface CrossDomainSuggestion {
  id: string
  sourceDomain: CommitmentDomain
  sourceRuleType: string
  targetDomain: CommitmentDomain
  suggestedRule: CommitmentRule
  rationale: string
  confidence: number
  createdAt: Date
}

export interface DiffusionRecord {
  id: string
  tenantId: string
  sourceDomain: CommitmentDomain
  targetDomain: CommitmentDomain
  sourceRuleType: string
  suggestedRuleType: string
  status: 'suggested' | 'accepted' | 'dismissed'
  createdAt: Date
}

// ── Cross-domain rule mapping ─────────────────────────────────────────────────

/**
 * Maps rule types to analogous rules in other domains. Each entry
 * describes a pattern that can transfer across domains.
 */
const DIFFUSION_MAP: Record<
  string,
  { targetDomain: CommitmentDomain; rule: CommitmentRule; rationale: string }[]
> = {
  pricing_floor: [
    {
      targetDomain: 'scheduling',
      rule: { type: 'max_events_per_week', limit: 5 },
      rationale:
        'You protect your pricing floor. Consider also protecting your schedule capacity to avoid burnout.',
    },
  ],
  no_late_discounts: [
    {
      targetDomain: 'menu',
      rule: { type: 'menu_lock_cooldown', hours: 48 },
      rationale:
        'You resist last-minute price pressure. Consider locking menus early too, preventing scope drift.',
    },
  ],
  response_time_sla: [
    {
      targetDomain: 'closeout',
      rule: { type: 'invoice_within_days', days: 3 },
      rationale:
        'You respond to clients fast. Apply the same discipline to invoicing after events.',
    },
  ],
  max_events_per_week: [
    {
      targetDomain: 'capacity',
      rule: { type: 'max_guests_without_sous', limit: 20 },
      rationale:
        'You cap your weekly events. Consider also capping solo guest counts to maintain quality.',
    },
  ],
  allergens_verified_before_confirm: [
    {
      targetDomain: 'communication',
      rule: { type: 'no_radio_silence', maxDays: 5 },
      rationale:
        'You verify dietary safety diligently. Extend that care to regular client communication.',
    },
  ],
  invoice_within_days: [
    {
      targetDomain: 'business_health',
      rule: { type: 'weekly_financial_review', required: true },
      rationale:
        'You invoice promptly. Add a weekly financial review to complete the money discipline.',
    },
  ],
  min_rest_days: [
    {
      targetDomain: 'contingency',
      rule: { type: 'emergency_contacts_before_confirm', required: true },
      rationale:
        'You protect rest time. Also set up emergency contacts so rest stays uninterrupted.',
    },
  ],
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreCommitmentSuccess(commitment: Commitment): { score: number; reason: string } {
  const streakWeight = Math.min(commitment.currentStreak / 90, 1.0) * 40
  const overrideRate =
    commitment.overrideCount > 0
      ? Math.max(0, 1 - commitment.overrideCount / Math.max(commitment.currentStreak, 1))
      : 1
  const overrideWeight = overrideRate * 30
  const longevityDays = (Date.now() - commitment.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  const longevityWeight = Math.min(longevityDays / 180, 1.0) * 20
  const frictionWeight = (commitment.frictionLevel / 5) * 10

  const score = Math.round(streakWeight + overrideWeight + longevityWeight + frictionWeight)

  const reasons: string[] = []
  if (commitment.currentStreak >= 30) reasons.push(`${commitment.currentStreak}-day streak`)
  if (overrideRate >= 0.9) reasons.push('rarely overridden')
  if (longevityDays >= 60) reasons.push(`active for ${Math.round(longevityDays)} days`)

  return { score, reason: reasons.join(', ') || 'recently created' }
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Find commitments that are working well (high streak, low overrides, long-lived).
 * These are candidates for cross-domain diffusion.
 */
export async function detectSuccessfulPatterns(
  minScore?: number
): Promise<ActionResult<SuccessfulPattern[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const commitments = await getActiveCommitments(tenantId)

    const threshold = minScore ?? 50
    const patterns: SuccessfulPattern[] = []

    for (const c of commitments) {
      const { score, reason } = scoreCommitmentSuccess(c)
      if (score >= threshold) {
        patterns.push({ commitment: c, score, reason })
      }
    }

    patterns.sort((a, b) => b.score - a.score)
    return ok(patterns)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to detect successful patterns')
  }
}

/**
 * For each successful commitment, suggest analogous commitments in other domains
 * that the chef does not already have.
 */
export async function suggestCrossDomainCommitments(): Promise<
  ActionResult<CrossDomainSuggestion[]>
> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const commitments = await getActiveCommitments(tenantId)

    const existingRuleTypes = new Set(commitments.map((c) => c.rule.type))
    const suggestions: CrossDomainSuggestion[] = []

    for (const c of commitments) {
      const { score } = scoreCommitmentSuccess(c)
      if (score < 40) continue

      const candidates = DIFFUSION_MAP[c.rule.type]
      if (!candidates) continue

      for (const candidate of candidates) {
        // Skip if the chef already has a commitment with this rule type in the target domain
        if (existingRuleTypes.has(candidate.rule.type)) continue

        // Skip if suggesting into the same domain
        if (candidate.targetDomain === c.domain) continue

        suggestions.push({
          id: `diff_${c.id}_${candidate.targetDomain}_${candidate.rule.type}`,
          sourceDomain: c.domain,
          sourceRuleType: c.rule.type,
          targetDomain: candidate.targetDomain,
          suggestedRule: candidate.rule,
          rationale: candidate.rationale,
          confidence: Math.min(score / 100, 0.95),
          createdAt: new Date(),
        })
      }
    }

    suggestions.sort((a, b) => b.confidence - a.confidence)
    return ok(suggestions)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to suggest cross-domain commitments')
  }
}

/**
 * Get the history of diffusion suggestions and their outcomes.
 * Since we have no dedicated table, this reconstructs from system_suggested
 * commitments that originated via diffusion (source + domain cross-reference).
 */
export async function getDiffusionHistory(): Promise<ActionResult<DiffusionRecord[]>> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId as string
    const commitments = await getActiveCommitments(tenantId)

    // Look for system-suggested commitments as evidence of past diffusion
    const allCommitments = await getActiveCommitments(tenantId)

    // Also check dismissed/paused by querying without the active filter
    // For now, build from what we have: active system_suggested commitments
    const records: DiffusionRecord[] = []

    for (const c of allCommitments) {
      if (c.source !== 'system_suggested' && c.source !== 'system_accepted') continue

      // Check if this rule type appears in the diffusion map as a target
      for (const [sourceType, candidates] of Object.entries(DIFFUSION_MAP)) {
        for (const candidate of candidates) {
          if (candidate.rule.type === c.rule.type && candidate.targetDomain === c.domain) {
            records.push({
              id: `hist_${c.id}`,
              tenantId: c.tenantId,
              sourceDomain: findDomainForRuleType(sourceType, commitments),
              targetDomain: c.domain,
              sourceRuleType: sourceType,
              suggestedRuleType: c.rule.type,
              status: c.status === 'active' ? 'accepted' : 'dismissed',
              createdAt: c.createdAt,
            })
          }
        }
      }
    }

    records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return ok(records)
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'Failed to load diffusion history')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function findDomainForRuleType(ruleType: string, commitments: Commitment[]): CommitmentDomain {
  const match = commitments.find((c) => c.rule.type === ruleType)
  return match?.domain ?? 'business_health'
}
