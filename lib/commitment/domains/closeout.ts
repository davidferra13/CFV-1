import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type CloseoutContext = {
  eventId: string
  daysSinceEvent: number
  invoiceSent: boolean
  paymentFollowedUp: boolean
  costReconciled: boolean
  unclosedEventCount: number
  feedbackRequested?: boolean
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
  invoice_within_days: 'Invoice not sent within committed timeframe after event',
  payment_followup_within_days: 'Payment follow-up not sent within committed timeframe',
  cost_reconciliation_required: 'Event closed without cost reconciliation',
  no_new_events_until_closeout: 'Accepting new events while too many await closeout',
  post_event_followup_within: 'Post-event follow-up not sent within committed timeframe',
}

export async function evaluateCloseoutCommitments(
  tenantId: string,
  context: CloseoutContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'closeout')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'invoice_within_days') {
      violated = !context.invoiceSent && context.daysSinceEvent > (rule.days ?? 2)
    } else if (rule.type === 'payment_followup_within_days') {
      violated = !context.paymentFollowedUp && context.daysSinceEvent > (rule.days ?? 7)
    } else if (rule.type === 'cost_reconciliation_required') {
      violated = !context.costReconciled
    } else if (rule.type === 'no_new_events_until_closeout') {
      violated = context.unclosedEventCount >= (rule.maxUnclosed ?? 3)
    } else if (rule.type === 'post_event_followup_within') {
      const daysCutoff = (rule.hours ?? 48) / 24
      violated =
        context.feedbackRequested === false && context.daysSinceEvent > daysCutoff
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Closeout commitment violated',
    })
  }

  return results
}

export async function getCloseoutSuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const client = createServerClient()
  const suggestions: CommitmentSuggestion[] = []

  // Check for completed events without invoices
  const { data: unclosed } = await client
    .from('events' as any)
    .select('id, event_date')
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')

  const unclosedCount = unclosed?.length ?? 0

  if (unclosedCount >= 3) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'closeout',
      suggestedRule: { type: 'no_new_events_until_closeout', maxUnclosed: 3 },
      rationale: `You have ${unclosedCount} completed events awaiting closeout. Capping at 3 unclosed events prevents a backlog that bleeds cash flow.`,
      evidence: { unclosedCount },
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'closeout',
    suggestedRule: { type: 'invoice_within_days', days: 2 },
    rationale:
      'Invoicing within 48 hours of an event while details are fresh maximizes collection rate.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'closeout',
    suggestedRule: { type: 'cost_reconciliation_required', required: true },
    rationale:
      'Reconciling actual costs against estimates after every event reveals true margins and pricing accuracy.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
