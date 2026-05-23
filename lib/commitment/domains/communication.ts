import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type CommunicationContext = {
  eventId?: string
  hoursSinceLastClientMessage?: number
  daysSinceLastContact?: number
  skippedCadenceEmail: boolean
  inquiryAcknowledged: boolean
  hoursSinceInquiry?: number
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
  response_time_sla: 'Client message not responded to within committed timeframe',
  cadence_integrity: 'Scheduled cadence email skipped',
  no_radio_silence: 'No contact with client beyond committed maximum days',
  inquiry_acknowledgment_within: 'Inquiry not acknowledged within committed timeframe',
}

export async function evaluateCommunicationCommitments(
  tenantId: string,
  context: CommunicationContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'communication')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'response_time_sla') {
      if (context.hoursSinceLastClientMessage != null) {
        violated = context.hoursSinceLastClientMessage > (rule.hours ?? 24)
      }
    } else if (rule.type === 'cadence_integrity') {
      violated = context.skippedCadenceEmail
    } else if (rule.type === 'no_radio_silence') {
      if (context.daysSinceLastContact != null) {
        violated = context.daysSinceLastContact > (rule.maxDays ?? 7)
      }
    } else if (rule.type === 'inquiry_acknowledgment_within') {
      if (!context.inquiryAcknowledged && context.hoursSinceInquiry != null) {
        violated = context.hoursSinceInquiry > (rule.hours ?? 4)
      }
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Communication commitment violated',
    })
  }

  return results
}

export async function getCommunicationSuggestions(
  tenantId: string
): Promise<CommitmentSuggestion[]> {
  const suggestions: CommitmentSuggestion[] = []

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'communication',
    suggestedRule: { type: 'response_time_sla', hours: 24 },
    rationale:
      'Responding to every client message within 24 hours builds trust and prevents lost bookings.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'communication',
    suggestedRule: { type: 'inquiry_acknowledgment_within', hours: 4 },
    rationale:
      'Acknowledging new inquiries within 4 hours dramatically increases conversion rates.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'communication',
    suggestedRule: { type: 'no_radio_silence', maxDays: 7 },
    rationale:
      'Never going more than 7 days without client contact keeps relationships warm and prevents ghosting.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
