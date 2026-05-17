import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type DietaryContext = {
  eventId: string
  allergensVerified: boolean
  crossContaminationChecked: boolean
  hasUnverifiedSubstitutions: boolean
  dietarySummarySentDaysAgo: number | null
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    source: row.source,
    rule: row.rule,
    status: row.status,
    frictionLevel: row.friction_level,
    overrideCount: row.override_count,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    futureSelfletter: row.future_self_letter,
    seasonalProfile: row.seasonal_profile,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function calculateFrictionTier(overrides: any[]): FrictionTier {
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000

  const in30 = overrides.filter((o) => new Date(o.created_at).getTime() > thirtyDaysAgo).length
  const in60 = overrides.filter((o) => new Date(o.created_at).getTime() > sixtyDaysAgo).length
  const in90 = overrides.filter((o) => new Date(o.created_at).getTime() > ninetyDaysAgo).length

  if (in90 >= 8) return 5
  if (in90 >= 5) return 4
  if (in60 >= 3) return 3
  if (in30 >= 2) return 2
  return 1
}

function countOverridesInWindow(overrides: any[]): {
  last30: number
  last60: number
  last90: number
} {
  const now = Date.now()
  return {
    last30: overrides.filter(
      (o: any) => new Date(o.created_at).getTime() > now - 30 * 24 * 60 * 60 * 1000
    ).length,
    last60: overrides.filter(
      (o: any) => new Date(o.created_at).getTime() > now - 60 * 24 * 60 * 60 * 1000
    ).length,
    last90: overrides.filter(
      (o: any) => new Date(o.created_at).getTime() > now - 90 * 24 * 60 * 60 * 1000
    ).length,
  }
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  allergens_verified_before_confirm: 'Event confirmed without verifying allergens',
  cross_contamination_check_required: 'Cross-contamination check not completed',
  no_unverified_substitutions: 'Menu contains unverified ingredient substitutions',
  dietary_summary_sent_before: 'Dietary summary not sent to client within required timeframe',
}

export async function evaluateDietaryCommitments(
  tenantId: string,
  context: DietaryContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'dietary')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'allergens_verified_before_confirm') {
      violated = !context.allergensVerified
    } else if (rule.type === 'cross_contamination_check_required') {
      violated = !context.crossContaminationChecked
    } else if (rule.type === 'no_unverified_substitutions') {
      violated = context.hasUnverifiedSubstitutions
    } else if (rule.type === 'dietary_summary_sent_before') {
      violated =
        context.dietarySummarySentDaysAgo === null ||
        context.dietarySummarySentDaysAgo > (rule.days ?? 3)
    }

    if (!violated) continue

    const { data: overrideRows } = await client
      .from('commitment_overrides' as any)
      .select('*')
      .eq('commitment_id', commitment.id)
      .order('created_at', { ascending: false })

    const overrides = overrideRows || []
    const tier = calculateFrictionTier(overrides)

    results.push({
      blocked: false,
      tier,
      commitment,
      streakAtRisk: commitment.currentStreak > 0 ? commitment.currentStreak : null,
      overridesInWindow: countOverridesInWindow(overrides),
      hasConsequenceCorrelation: false,
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Dietary commitment violated',
    })
  }

  return results
}

export async function getDietarySuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const client = createServerClient()
  const suggestions: CommitmentSuggestion[] = []
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: overrides } = await client
    .from('event_readiness_gates' as any)
    .select('gate, event_id, resolved_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'overridden')
    .in('gate', ['dietary_constraints'])
    .gte('resolved_at', ninetyDaysAgo.toISOString())

  if (!overrides || overrides.length < 2) return suggestions

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'dietary',
    suggestedRule: { type: 'allergens_verified_before_confirm', required: true },
    rationale: `${overrides.length} dietary constraint overrides in the last 90 days. Requiring allergen verification prevents safety gaps from becoming habits.`,
    evidence: { overrideCount: overrides.length, eventIds: overrides.map((o: any) => o.event_id) },
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
