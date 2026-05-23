import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type CapacityContext = {
  eventId?: string
  guestCount: number
  hasSousChef: boolean
  clientRevenuePercent?: number
  seasonalEventCount?: number
  currentSeason?: string
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
  max_guests_without_sous: 'Guest count exceeds your solo capacity limit',
  revenue_concentration_cap: 'Single client revenue share exceeds your committed cap',
  seasonal_booking_limit: 'Seasonal booking count exceeds your committed limit',
}

export async function evaluateCapacityCommitments(
  tenantId: string,
  context: CapacityContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'capacity')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'max_guests_without_sous') {
      violated = !context.hasSousChef && context.guestCount > (rule.limit ?? 20)
    } else if (rule.type === 'revenue_concentration_cap') {
      if (context.clientRevenuePercent != null) {
        violated = context.clientRevenuePercent > (rule.maxPercent ?? 40)
      }
    } else if (rule.type === 'seasonal_booking_limit') {
      if (
        context.currentSeason &&
        context.seasonalEventCount != null &&
        context.currentSeason === rule.season
      ) {
        violated = context.seasonalEventCount >= (rule.maxEvents ?? 20)
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Capacity commitment violated',
    })
  }

  return results
}

export async function getCapacitySuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const client = createServerClient()
  const suggestions: CommitmentSuggestion[] = []
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Look at recent events to see if any had high guest counts solo
  const { data: events } = await client
    .from('events' as any)
    .select('id, guest_count')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('event_date', ninetyDaysAgo.toISOString())

  if (events && events.length > 0) {
    const highGuestEvents = events.filter(
      (e: any) => (e.guest_count ?? 0) > 20
    )

    if (highGuestEvents.length >= 1) {
      suggestions.push({
        id: generateId(),
        tenantId,
        domain: 'capacity',
        suggestedRule: { type: 'max_guests_without_sous', limit: 20 },
        rationale:
          'Events over 20 guests solo strain quality and timing. Requiring a sous chef protects your standards.',
        evidence: { highGuestEventCount: highGuestEvents.length },
        status: 'pending',
        respondedAt: null,
        dismissedReason: null,
        createdAt: new Date(),
      })
    }
  }

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'capacity',
    suggestedRule: { type: 'revenue_concentration_cap', maxPercent: 40 },
    rationale:
      'Capping any single client at 40% of revenue prevents catastrophic income loss if one client leaves.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
