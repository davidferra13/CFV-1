import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain, CommitmentOverride, OverrideCategory } from './types'
import { DOMAIN_LABELS, OVERRIDE_CATEGORY_LABELS } from './types'

// #37 Remy Commitment Coach: Post-Override Coaching
// Non-judgmental coaching after an override. No lectures.
// Remy helps the chef understand patterns and decide if the commitment
// should change, not whether the chef was "wrong."

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    source: row.source,
    rule: typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule,
    status: row.status,
    frictionLevel: row.friction_level,
    overrideCount: row.override_count ?? 0,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    futureSelfletter: row.future_self_letter ?? null,
    seasonalProfile: row.seasonal_profile ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function mapOverrideRow(row: any): CommitmentOverride {
  return {
    id: row.id,
    commitmentId: row.commitment_id,
    tenantId: row.tenant_id,
    category: (row.category as OverrideCategory) ?? null,
    reason: row.reason,
    frictionTierAtOverride: row.friction_tier_at_override,
    regretPrediction: row.regret_prediction ?? null,
    context: row.context ?? null,
    createdAt: new Date(row.created_at),
  }
}

export interface OverrideContext {
  commitmentDomain: CommitmentDomain
  domainLabel: string
  ruleType: string
  overrideReason: string
  overrideCategory: string | null
  overrideDate: Date
  streakBroken: number
}

export interface PatternInsight {
  isRecurring: boolean
  totalOverrides: number
  sameReasonCount: number
  sameCategoryCount: number
  frequencyLabel: string
  dominantCategory: string | null
}

export interface AdjustmentSuggestion {
  shouldAdjust: boolean
  adjustmentType: 'loosen' | 'redefine' | 'seasonal' | 'none'
  rationale: string
}

export interface ReflectionPrompt {
  question: string
  context: string
}

export interface PostOverrideCoaching {
  overrideId: string
  context: OverrideContext
  patternInsight: PatternInsight
  adjustmentSuggestion: AdjustmentSuggestion
  reflectionPrompts: ReflectionPrompt[]
}

function buildPatternInsight(
  override: CommitmentOverride,
  allOverrides: CommitmentOverride[]
): PatternInsight {
  const total = allOverrides.length
  const sameReasonCount = allOverrides.filter(
    (o: CommitmentOverride) => o.reason.toLowerCase() === override.reason.toLowerCase()
  ).length
  const sameCategoryCount = override.category
    ? allOverrides.filter((o: CommitmentOverride) => o.category === override.category).length
    : 0

  const isRecurring = sameReasonCount >= 3 || sameCategoryCount >= 3

  let frequencyLabel = 'occasional'
  if (total >= 10) frequencyLabel = 'frequent'
  else if (total >= 5) frequencyLabel = 'regular'
  else if (total <= 1) frequencyLabel = 'first time'

  const categoryCounts = new Map<string, number>()
  for (const o of allOverrides) {
    if (o.category) {
      categoryCounts.set(o.category, (categoryCounts.get(o.category) || 0) + 1)
    }
  }
  let dominantCategory: string | null = null
  let maxCount = 0
  for (const [cat, count] of categoryCounts) {
    if (count > maxCount) {
      maxCount = count
      dominantCategory = cat
    }
  }

  return {
    isRecurring,
    totalOverrides: total,
    sameReasonCount,
    sameCategoryCount,
    frequencyLabel,
    dominantCategory,
  }
}

function buildAdjustmentSuggestion(
  commitment: Commitment,
  insight: PatternInsight
): AdjustmentSuggestion {
  if (insight.totalOverrides >= 8 && insight.isRecurring) {
    return {
      shouldAdjust: true,
      adjustmentType: 'redefine',
      rationale:
        'This commitment has been overridden frequently for the same reason. It may not fit your current workflow. Consider redefining it to match how you actually operate.',
    }
  }

  if (insight.dominantCategory === 'scheduling_cascade' && insight.totalOverrides >= 4) {
    return {
      shouldAdjust: true,
      adjustmentType: 'loosen',
      rationale:
        'Most overrides come from scheduling cascades. Loosening this commitment slightly could reduce friction without losing the standard you care about.',
    }
  }

  if (
    commitment.seasonalProfile &&
    (insight.dominantCategory === 'time_constraint' ||
      insight.dominantCategory === 'financial_pressure')
  ) {
    return {
      shouldAdjust: true,
      adjustmentType: 'seasonal',
      rationale:
        'This commitment may need seasonal adjustment. Consider different thresholds for peak vs. quiet seasons.',
    }
  }

  return {
    shouldAdjust: false,
    adjustmentType: 'none',
    rationale: 'This override looks situational. The commitment still fits your workflow.',
  }
}

function buildReflectionPrompts(
  ctx: OverrideContext,
  insight: PatternInsight
): ReflectionPrompt[] {
  const prompts: ReflectionPrompt[] = []

  prompts.push({
    question: 'Was this the right call for the situation?',
    context: 'You overrode your ' + ctx.domainLabel + ' commitment. Only you know if the tradeoff was worth it.',
  })

  if (ctx.streakBroken > 7) {
    prompts.push({
      question: 'You had a ' + ctx.streakBroken + '-day streak. Does that change how you feel about this override?',
      context: 'Streaks are information, not scores. Breaking one to make the right call is fine.',
    })
  }

  if (insight.isRecurring) {
    prompts.push({
      question: 'This pattern has come up before. Is the commitment set right, or is real life different from the plan?',
      context:
        'Recurring overrides often mean the commitment needs adjusting, not that you need more discipline.',
    })
  }

  if (insight.dominantCategory === 'client_request') {
    prompts.push({
      question: 'Are client requests driving most of these? Should the commitment account for that flexibility?',
      context: 'Client accommodation is part of the job. A good commitment leaves room for it.',
    })
  }

  return prompts
}

export async function generatePostOverrideCoaching(
  tenantId: string,
  overrideId: string
): Promise<PostOverrideCoaching | null> {
  const client = createServerClient()

  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('*')
    .eq('id', overrideId)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (!overrideRows || overrideRows.length === 0) return null
  const override = mapOverrideRow(overrideRows[0])

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('id', override.commitmentId)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (!commitmentRows || commitmentRows.length === 0) return null
  const commitment = mapCommitmentRow(commitmentRows[0])

  const { data: allOverrideRows } = await client
    .from('commitment_overrides' as any)
    .select('*')
    .eq('commitment_id', commitment.id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  const allOverrides = (allOverrideRows || []).map(mapOverrideRow)

  const rule = commitment.rule as Record<string, any>

  const overrideCtx: OverrideContext = {
    commitmentDomain: commitment.domain,
    domainLabel: DOMAIN_LABELS[commitment.domain],
    ruleType: rule.type,
    overrideReason: override.reason,
    overrideCategory: override.category
      ? OVERRIDE_CATEGORY_LABELS[override.category] ?? override.category
      : null,
    overrideDate: override.createdAt,
    streakBroken: commitment.currentStreak,
  }

  const patternInsight = buildPatternInsight(override, allOverrides)
  const adjustmentSuggestion = buildAdjustmentSuggestion(commitment, patternInsight)
  const reflectionPrompts = buildReflectionPrompts(overrideCtx, patternInsight)

  return {
    overrideId,
    context: overrideCtx,
    patternInsight,
    adjustmentSuggestion,
    reflectionPrompts,
  }
}