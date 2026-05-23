import { createServerClient } from '@/lib/db/server'
import type { FrictionTier, CommitmentDomain, OverrideCategory } from './types'
import { DOMAIN_LABELS, OVERRIDE_CATEGORY_LABELS } from './types'

// Override Ceremony (#4)
// Server-side ceremony logic: what the UI needs to render
// the override ceremony based on friction tier.
//
// Friction tiers:
//   1 = banner (simple acknowledgment)
//   2 = countdown (10-second wait)
//   3 = reason required (must categorize and explain)
//   4 = witness + future-self letter (reflection required)
//   5 = full ceremony (all of the above, plus consequence review)

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface CeremonyRequirements {
  commitmentId: string
  domain: CommitmentDomain
  domainLabel: string
  frictionTier: FrictionTier
  steps: CeremonyStep[]
  streakAtRisk: number | null
  overrideCount: number
  consequenceScore: number | null // 0-100 if available
  ruleDescription: string
}

export interface CeremonyStep {
  type: CeremonyStepType
  required: boolean
  label: string
  config: Record<string, unknown>
}

export type CeremonyStepType =
  | 'banner'
  | 'countdown'
  | 'category_select'
  | 'reason_text'
  | 'consequence_review'
  | 'future_self_letter'
  | 'witness_confirmation'
  | 'regret_prediction'

export interface CeremonyContext {
  commitmentId: string
  eventId: string | null
  overrideCategory: OverrideCategory | null
  reason: string | null
  futureSelfletter: string | null
  regretPrediction: number | null // 1-10
  witnessConfirmed: boolean
  consequenceAcknowledged: boolean
}

export interface CeremonyValidation {
  valid: boolean
  missingSteps: CeremonyStepType[]
  errors: string[]
}

/**
 * Get the ceremony requirements for overriding a commitment.
 * Returns the steps the UI must render based on the friction tier.
 */
export async function getCeremonyRequirements(
  tenantId: string,
  commitmentId: string,
  frictionTierOverride?: FrictionTier
): Promise<CeremonyRequirements | null> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('id', commitmentId)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (!rows || rows.length === 0) return null

  const row = rows[0] as any
  const domain = row.domain as CommitmentDomain
  const frictionTier = frictionTierOverride ?? (row.friction_level as FrictionTier)
  const rule = row.rule as Record<string, any>

  const steps = buildCeremonySteps(frictionTier)

  // Check for consequence data
  let consequenceScore: number | null = null
  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('context')
    .eq('commitment_id', commitmentId)
    .eq('tenant_id', tenantId)

  if (overrideRows && overrideRows.length > 0) {
    let withConsequences = 0
    for (const o of overrideRows) {
      const ctx = o.context as Record<string, unknown> | null
      if (ctx?.consequence) withConsequences++
    }
    consequenceScore = overrideRows.length > 0
      ? Math.round((withConsequences / overrideRows.length) * 100)
      : null
  }

  return {
    commitmentId,
    domain,
    domainLabel: DOMAIN_LABELS[domain],
    frictionTier,
    steps,
    streakAtRisk: (row.current_streak as number) > 0 ? row.current_streak as number : null,
    overrideCount: row.override_count as number,
    consequenceScore,
    ruleDescription: rule.type ?? 'commitment',
  }
}

/**
 * Build ceremony context from override data.
 * Enriches the override with ceremony metadata.
 */
export async function buildCeremonyContext(
  _tenantId: string,
  commitmentId: string,
  overrideData: {
    eventId?: string
    category?: OverrideCategory
    reason?: string
    futureSelfletter?: string
    regretPrediction?: number
  }
): Promise<CeremonyContext> {
  return {
    commitmentId,
    eventId: overrideData.eventId ?? null,
    overrideCategory: overrideData.category ?? null,
    reason: overrideData.reason ?? null,
    futureSelfletter: overrideData.futureSelfletter ?? null,
    regretPrediction: overrideData.regretPrediction ?? null,
    witnessConfirmed: false,
    consequenceAcknowledged: false,
  }
}

/**
 * Validate that all required ceremony steps have been completed.
 */
export async function validateCeremonyCompletion(
  tenantId: string,
  commitmentId: string,
  ceremonyData: CeremonyContext
): Promise<CeremonyValidation> {
  const requirements = await getCeremonyRequirements(tenantId, commitmentId)
  if (!requirements) {
    return { valid: false, missingSteps: [], errors: ['Commitment not found'] }
  }

  const missingSteps: CeremonyStepType[] = []
  const errors: string[] = []

  for (const step of requirements.steps) {
    if (!step.required) continue

    switch (step.type) {
      case 'banner':
        // Banner is always satisfied (just shown)
        break

      case 'countdown':
        // Countdown is enforced client-side, no server validation needed
        break

      case 'category_select':
        if (!ceremonyData.overrideCategory) {
          missingSteps.push('category_select')
          errors.push('Override category is required')
        }
        break

      case 'reason_text':
        if (!ceremonyData.reason || ceremonyData.reason.trim().length < 10) {
          missingSteps.push('reason_text')
          errors.push('A reason of at least 10 characters is required')
        }
        break

      case 'consequence_review':
        if (!ceremonyData.consequenceAcknowledged) {
          missingSteps.push('consequence_review')
          errors.push('You must acknowledge past consequences before overriding')
        }
        break

      case 'future_self_letter':
        if (!ceremonyData.futureSelfletter || ceremonyData.futureSelfletter.trim().length < 20) {
          missingSteps.push('future_self_letter')
          errors.push('A future-self letter of at least 20 characters is required')
        }
        break

      case 'witness_confirmation':
        if (!ceremonyData.witnessConfirmed) {
          missingSteps.push('witness_confirmation')
          errors.push('Witness confirmation is required for this override')
        }
        break

      case 'regret_prediction':
        if (ceremonyData.regretPrediction == null || ceremonyData.regretPrediction < 1 || ceremonyData.regretPrediction > 10) {
          missingSteps.push('regret_prediction')
          errors.push('A regret prediction (1-10) is required')
        }
        break
    }
  }

  return {
    valid: missingSteps.length === 0,
    missingSteps,
    errors,
  }
}

/**
 * Build the ceremony steps for a given friction tier.
 */
function buildCeremonySteps(tier: FrictionTier): CeremonyStep[] {
  const steps: CeremonyStep[] = []

  // Tier 1+: Banner acknowledgment
  steps.push({
    type: 'banner',
    required: true,
    label: 'You are about to override a commitment',
    config: {},
  })

  if (tier >= 2) {
    // Tier 2+: Countdown timer
    steps.push({
      type: 'countdown',
      required: true,
      label: 'Wait before confirming',
      config: { seconds: tier >= 4 ? 30 : 10 },
    })
  }

  if (tier >= 3) {
    // Tier 3+: Category selection
    steps.push({
      type: 'category_select',
      required: true,
      label: 'Why are you overriding this commitment?',
      config: { categories: Object.keys(OVERRIDE_CATEGORY_LABELS) },
    })

    // Tier 3+: Reason text
    steps.push({
      type: 'reason_text',
      required: true,
      label: 'Explain your reasoning',
      config: { minLength: 10, placeholder: 'Why does this override make sense right now?' },
    })

    // Tier 3+: Regret prediction
    steps.push({
      type: 'regret_prediction',
      required: true,
      label: 'How likely will you regret this? (1 = no regret, 10 = certain regret)',
      config: { min: 1, max: 10 },
    })
  }

  if (tier >= 4) {
    // Tier 4+: Future-self letter
    steps.push({
      type: 'future_self_letter',
      required: true,
      label: 'Write a note to your future self explaining this decision',
      config: { minLength: 20 },
    })

    // Tier 4+: Witness confirmation
    steps.push({
      type: 'witness_confirmation',
      required: true,
      label: 'Confirm: "I understand the consequences and choose to proceed"',
      config: {},
    })
  }

  if (tier >= 5) {
    // Tier 5: Consequence review (must review past consequences)
    steps.push({
      type: 'consequence_review',
      required: true,
      label: 'Review past consequences of overriding this commitment',
      config: {},
    })
  }

  return steps
}
