import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type PricingContext = {
  perHeadPrice: number
  foodCostPercent?: number
  daysBeforeEvent?: number
  isDiscount?: boolean
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
  pricing_floor: 'Per-head price is below your committed minimum',
  margin_floor: 'Food cost percentage exceeds your committed maximum',
  no_late_discounts: 'Discount applied too close to event date',
}

export async function evaluatePricingCommitments(
  tenantId: string,
  context: PricingContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'pricing')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'pricing_floor') {
      violated = context.perHeadPrice < (rule.minPerHead ?? 0)
    } else if (rule.type === 'margin_floor') {
      if (context.foodCostPercent != null) {
        violated = context.foodCostPercent > (rule.maxFoodCostPercent ?? 100)
      }
    } else if (rule.type === 'no_late_discounts') {
      if (context.isDiscount && context.daysBeforeEvent != null) {
        violated = context.daysBeforeEvent <= (rule.freezeDaysBeforeEvent ?? 7)
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Pricing commitment violated',
    })
  }

  return results
}

export async function getPricingSuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const client = createServerClient()
  const suggestions: CommitmentSuggestion[] = []
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: events } = await client
    .from('events' as any)
    .select('id, per_head_price, event_date, status')
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('event_date', ninetyDaysAgo.toISOString())

  if (!events || events.length === 0) return suggestions

  const prices = events
    .map((e: any) => e.per_head_price)
    .filter((p: any): p is number => typeof p === 'number' && p > 0)
    .sort((a: number, b: number) => a - b)

  if (prices.length >= 3) {
    const median = prices[Math.floor(prices.length / 2)]
    if (median < 100) {
      const suggestedFloor = Math.round(median * 1.15)
      suggestions.push({
        id: generateId(),
        tenantId,
        domain: 'pricing',
        suggestedRule: { type: 'pricing_floor', minPerHead: suggestedFloor },
        rationale: `Median per-head price is $${median}. A floor at $${suggestedFloor} (median + 15%) protects against undercharging.`,
        evidence: { medianPrice: median, sampleSize: prices.length },
        status: 'pending',
        respondedAt: null,
        dismissedReason: null,
        createdAt: new Date(),
      })
    }
  }

  let lateDiscountCount = 0
  for (const event of events) {
    if (!event.event_date || !event.per_head_price) continue

    const { data: transitions } = await client
      .from('quote_state_transitions' as any)
      .select('created_at')
      .eq('event_id', event.id)
      .eq('tenant_id', tenantId)

    if (!transitions) continue

    const eventDate = new Date(event.event_date)
    const sevenDaysBefore = eventDate.getTime() - 7 * 24 * 60 * 60 * 1000

    const lateTransitions = transitions.filter(
      (t: any) => new Date(t.created_at).getTime() >= sevenDaysBefore
    )
    if (lateTransitions.length > 0) lateDiscountCount++
  }

  if (lateDiscountCount >= 3) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'pricing',
      suggestedRule: { type: 'no_late_discounts', freezeDaysBeforeEvent: 14 },
      rationale: `${lateDiscountCount} events had pricing changes within 7 days of the event. A 14-day freeze prevents last-minute margin erosion.`,
      evidence: { lateChangeCount: lateDiscountCount },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  return suggestions
}
