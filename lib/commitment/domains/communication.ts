import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type CommunicationContext = {
  clientId: string
  hoursSinceLastResponse: number | null
  missedCadenceTouchpoints: number
  daysSinceLastContact: number
  hoursAfterLastEvent: number | null
  followUpSent: boolean
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
  response_time_sla: 'Client message unanswered beyond your committed SLA',
  cadence_integrity: 'Scheduled cadence touchpoint was skipped',
  no_radio_silence: 'No contact with client beyond your committed maximum',
  post_event_followup_within: 'Post-event follow-up not sent within committed window',
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
      if (context.hoursSinceLastResponse != null) {
        violated = context.hoursSinceLastResponse > (rule.hours ?? 24)
      }
    } else if (rule.type === 'cadence_integrity') {
      violated = context.missedCadenceTouchpoints > 0
    } else if (rule.type === 'no_radio_silence') {
      violated = context.daysSinceLastContact > (rule.maxDays ?? 14)
    } else if (rule.type === 'post_event_followup_within') {
      if (context.hoursAfterLastEvent != null) {
        violated = context.hoursAfterLastEvent <= (rule.hours ?? 48) && !context.followUpSent
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
  const client = createServerClient()
  const suggestions: CommitmentSuggestion[] = []
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Look for follow-up patterns from completed events
  const { data: events } = await client
    .from('events' as any)
    .select('id, event_date, status, client_id')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('event_date', ninetyDaysAgo.toISOString())
    .order('event_date', { ascending: false })

  if (!events || events.length === 0) return suggestions

  // Suggest 48h post-event follow-up if chef has 5+ completed events
  const completedEvents = events.filter(
    (e: any) => e.status === 'completed' || e.status === 'closed'
  )

  if (completedEvents.length >= 5) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'communication',
      suggestedRule: { type: 'post_event_followup_within', hours: 48 },
      rationale:
        `${completedEvents.length} completed events in the last 90 days. ` +
        'A 48-hour follow-up commitment keeps client relationships warm and drives repeat bookings.',
      evidence: { completedEventCount: completedEvents.length },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  // Suggest radio silence guard if chef has many clients
  const uniqueClients = new Set(events.map((e: any) => e.client_id).filter(Boolean))
  if (uniqueClients.size >= 3) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'communication',
      suggestedRule: { type: 'no_radio_silence', maxDays: 14 },
      rationale:
        `${uniqueClients.size} active clients in the last 90 days. ` +
        'A 14-day radio silence cap prevents client relationships from going cold.',
      evidence: { activeClientCount: uniqueClients.size },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  return suggestions
}
