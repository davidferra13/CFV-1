import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type TravelContext = {
  eventId: string
  distanceMiles: number
  hasTravelPlan: boolean
  hasOvernightBooking: boolean
  travelSurchargeIncluded: boolean
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
  travel_time_buffer: 'Event scheduled without required travel time buffer',
  travel_plan_before_confirm: 'Event confirmed without a travel plan in place',
  max_distance_without_overnight: 'Event exceeds maximum distance without overnight booking',
  travel_surcharge_required: 'Event missing required travel surcharge',
}

export async function evaluateTravelCommitments(
  tenantId: string,
  context: TravelContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'travel')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'travel_time_buffer') {
      // Travel buffer is checked externally; context signals whether buffer is met
      // If distance > 0, a buffer commitment exists, and no plan is set, it's violated
      violated = context.distanceMiles > 0 && !context.hasTravelPlan
    } else if (rule.type === 'travel_plan_before_confirm') {
      violated = !context.hasTravelPlan
    } else if (rule.type === 'max_distance_without_overnight') {
      const maxMiles = rule.miles ?? 100
      violated = context.distanceMiles > maxMiles && !context.hasOvernightBooking
    } else if (rule.type === 'travel_surcharge_required') {
      violated = context.distanceMiles > 0 && !context.travelSurchargeIncluded
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Travel commitment violated',
    })
  }

  return results
}

export async function getTravelSuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const suggestions: CommitmentSuggestion[] = []

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'travel',
    suggestedRule: { type: 'travel_plan_before_confirm', required: true },
    rationale:
      'Requiring a travel plan before confirming distant events prevents last-minute logistics scrambles.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'travel',
    suggestedRule: { type: 'max_distance_without_overnight', miles: 100 },
    rationale:
      'Events over 100 miles away should include overnight accommodations to avoid fatigue-related quality issues.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'travel',
    suggestedRule: { type: 'travel_surcharge_required', required: true },
    rationale:
      'Auto-including a travel surcharge ensures travel costs are never absorbed into your margin.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
