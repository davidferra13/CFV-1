import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type FinancialContext = {
  eventId?: string
  daysSinceEvent?: number
  invoiceSent: boolean
  paymentFollowedUp: boolean
  costTracked: boolean
  savingsReservePercent?: number
  lastTaxPrepDate?: string
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
  invoice_within_days: 'Invoice not sent within committed timeframe',
  payment_followup_within_days: 'Payment follow-up not sent within committed timeframe',
  cost_tracking_per_event: 'Event costs not tracked',
  savings_reserve_percent: 'Savings reserve below committed percentage',
  tax_prep_quarterly: 'Quarterly tax prep not completed on schedule',
  weekly_financial_review: 'Weekly financial review not completed',
}

export async function evaluateFinancialCommitments(
  tenantId: string,
  context: FinancialContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'financial')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'invoice_within_days') {
      if (context.daysSinceEvent != null) {
        violated = !context.invoiceSent && context.daysSinceEvent > (rule.days ?? 2)
      }
    } else if (rule.type === 'payment_followup_within_days') {
      if (context.daysSinceEvent != null) {
        violated = !context.paymentFollowedUp && context.daysSinceEvent > (rule.days ?? 7)
      }
    } else if (rule.type === 'cost_tracking_per_event') {
      violated = !context.costTracked
    } else if (rule.type === 'savings_reserve_percent') {
      if (context.savingsReservePercent != null) {
        violated = context.savingsReservePercent < (rule.percent ?? 10)
      }
    } else if (rule.type === 'tax_prep_quarterly') {
      if (context.lastTaxPrepDate) {
        const lastPrep = new Date(context.lastTaxPrepDate)
        const daysSincePrep = (Date.now() - lastPrep.getTime()) / (24 * 60 * 60 * 1000)
        violated = daysSincePrep > 90
      }
    } else if (rule.type === 'weekly_financial_review') {
      // Evaluated externally; context would include last review date
      violated = false
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Financial commitment violated',
    })
  }

  return results
}

export async function getFinancialSuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const client = createServerClient()
  const suggestions: CommitmentSuggestion[] = []
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  // Check for events without invoices
  const { data: events } = await client
    .from('events' as any)
    .select('id, event_date, status')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .gte('event_date', ninetyDaysAgo.toISOString())

  if (events && events.length >= 3) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'financial',
      suggestedRule: { type: 'invoice_within_days', days: 2 },
      rationale:
        'Invoicing within 48 hours of an event keeps cash flow healthy and signals professionalism.',
      evidence: { completedEvents: events.length },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })

    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'financial',
      suggestedRule: { type: 'cost_tracking_per_event', required: true },
      rationale:
        'Tracking costs per event reveals true profitability and prevents margin erosion over time.',
      evidence: { completedEvents: events.length },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'financial',
    suggestedRule: { type: 'savings_reserve_percent', percent: 15 },
    rationale:
      'Setting aside 15% of revenue as a reserve protects against slow seasons and unexpected expenses.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
