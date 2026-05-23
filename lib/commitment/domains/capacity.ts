import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type CapacityContext = {
  guestCount: number
  hasSousChef: boolean
  clientRevenuePercent: number | null
  prepTimeHours: number | null
  minutesSincePreviousEvent: number | null
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

function getGuestTierKey(guestCount: number): string {
  if (guestCount <= 10) return '1-10'
  if (guestCount <= 20) return '11-20'
  if (guestCount <= 40) return '21-40'
  if (guestCount <= 60) return '41-60'
  return '60+'
}

const RULE_DESCRIPTIONS: Record<string, string> = {
  max_guests_without_sous: 'Guest count exceeds your solo capacity limit',
  revenue_concentration_cap: 'Single client revenue share exceeds your diversification cap',
  min_prep_time_per_tier: 'Prep time is below your minimum for this guest count tier',
  min_gap_between_events: 'Gap between same-day events is below your committed minimum',
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
      violated = !context.hasSousChef && context.guestCount > (rule.limit ?? Infinity)
    } else if (rule.type === 'revenue_concentration_cap') {
      if (context.clientRevenuePercent != null) {
        violated = context.clientRevenuePercent > (rule.maxPercent ?? 100)
      }
    } else if (rule.type === 'min_prep_time_per_tier') {
      if (context.prepTimeHours != null) {
        const tierKey = getGuestTierKey(context.guestCount)
        const hoursPerTier = (rule.hoursPerGuestTier ?? {}) as Record<string, number>
        const requiredHours = hoursPerTier[tierKey]
        if (requiredHours != null) {
          violated = context.prepTimeHours < requiredHours
        }
      }
    } else if (rule.type === 'min_gap_between_events') {
      if (context.minutesSincePreviousEvent != null) {
        violated = context.minutesSincePreviousEvent < (rule.minutes ?? 0)
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

  const { data: events } = await client
    .from('events' as any)
    .select('id, event_date, guest_count, client_id, per_head_price, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('event_date', ninetyDaysAgo.toISOString())

  if (!events || events.length === 0) return suggestions

  // Suggest solo guest cap if chef regularly does large events
  const largeSoloEvents = events.filter(
    (e: any) => typeof e.guest_count === 'number' && e.guest_count > 20
  )
  if (largeSoloEvents.length >= 2) {
    const maxGuests = Math.max(...largeSoloEvents.map((e: any) => e.guest_count as number))
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'capacity',
      suggestedRule: { type: 'max_guests_without_sous', limit: 20 },
      rationale:
        `${largeSoloEvents.length} events with 20+ guests in the last 90 days (max: ${maxGuests}). ` +
        'A solo cap at 20 guests protects food quality and prevents burnout.',
      evidence: { largeEventCount: largeSoloEvents.length, maxGuestCount: maxGuests },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  // Suggest revenue concentration cap via Herfindahl-style analysis
  const clientRevenue = new Map<string, number>()
  let totalRevenue = 0
  for (const event of events) {
    if (!event.client_id || !event.per_head_price || !event.guest_count) continue
    const revenue = (event.per_head_price as number) * (event.guest_count as number)
    clientRevenue.set(
      event.client_id as string,
      (clientRevenue.get(event.client_id as string) || 0) + revenue
    )
    totalRevenue += revenue
  }

  if (totalRevenue > 0 && clientRevenue.size >= 3) {
    let maxPercent = 0
    for (const rev of clientRevenue.values()) {
      const pct = (rev / totalRevenue) * 100
      if (pct > maxPercent) maxPercent = pct
    }

    if (maxPercent > 40) {
      suggestions.push({
        id: generateId(),
        tenantId,
        domain: 'capacity',
        suggestedRule: { type: 'revenue_concentration_cap', maxPercent: 40 },
        rationale:
          `One client accounts for ${Math.round(maxPercent)}% of your revenue. ` +
          'Capping at 40% reduces business risk if that client leaves.',
        evidence: {
          topClientPercent: Math.round(maxPercent),
          clientCount: clientRevenue.size,
          totalRevenue: Math.round(totalRevenue),
        },
        status: 'pending',
        respondedAt: null,
        dismissedReason: null,
        createdAt: new Date(),
      })
    }
  }

  // Suggest same-day gap if chef had overlapping event days
  const eventsByDate = new Map<string, number>()
  for (const event of events) {
    if (!event.event_date) continue
    const dateKey = new Date(event.event_date as string).toISOString().slice(0, 10)
    eventsByDate.set(dateKey, (eventsByDate.get(dateKey) || 0) + 1)
  }
  const doubleDays = [...eventsByDate.values()].filter((c) => c >= 2).length
  if (doubleDays >= 2) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'capacity',
      suggestedRule: { type: 'min_gap_between_events', minutes: 180 },
      rationale:
        `${doubleDays} days with 2+ events in the last 90 days. ` +
        'A 3-hour minimum gap between events protects transit, setup, and food quality.',
      evidence: { doubleDayCount: doubleDays },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  return suggestions
}
