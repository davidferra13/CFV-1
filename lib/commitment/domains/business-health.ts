import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

export type BusinessHealthContext = {
  dashboardViewedAt: Date | null
  lastRateReviewAt: Date | null
  certificationsExpireAt: Date | null
  savingsReservePercent: number | null
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
  weekly_financial_review: 'Financial dashboard not reviewed within the last 7 days',
  quarterly_rate_review: 'Rates have not been reviewed this quarter',
  certification_currency: 'One or more certifications have expired',
  savings_reserve_percent: 'Savings reserve is below the committed threshold',
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Evaluate active business_health commitments against current context.
 * weekly_financial_review: dashboard must be viewed within 7 days
 * quarterly_rate_review: rates must be reviewed within 90 days
 * certification_currency: blocks if certifications are expired
 * savings_reserve_percent: advisory when savings below threshold
 */
export async function evaluateBusinessHealthCommitments(
  tenantId: string,
  context: BusinessHealthContext
): Promise<FrictionCheckResult[]> {
  const client = createServerClient()
  const results: FrictionCheckResult[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('domain', 'business_health')
    .eq('status', 'active')

  if (!rows || rows.length === 0) return results

  const now = Date.now()

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'weekly_financial_review') {
      if (!context.dashboardViewedAt) {
        violated = true
      } else {
        const daysSinceView = (now - context.dashboardViewedAt.getTime()) / MS_PER_DAY
        violated = daysSinceView > 7
      }
    } else if (rule.type === 'quarterly_rate_review') {
      if (!context.lastRateReviewAt) {
        violated = true
      } else {
        const daysSinceReview = (now - context.lastRateReviewAt.getTime()) / MS_PER_DAY
        violated = daysSinceReview > 90
      }
    } else if (rule.type === 'certification_currency') {
      if (!context.certificationsExpireAt) {
        // No expiration data means we cannot verify currency
        violated = false
      } else {
        violated = context.certificationsExpireAt.getTime() < now
      }
    } else if (rule.type === 'savings_reserve_percent') {
      if (context.savingsReservePercent != null) {
        const threshold = (rule.percent as number) ?? 10
        violated = context.savingsReservePercent < threshold
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Business health commitment violated',
    })
  }

  return results
}

/**
 * Generate business health suggestions based on chef activity patterns.
 */
export async function getBusinessHealthSuggestions(
  tenantId: string
): Promise<CommitmentSuggestion[]> {
  const client = createServerClient()
  const suggestions: CommitmentSuggestion[] = []

  // Check if chef has any business_health commitments already
  const { data: existing } = await client
    .from('commitments' as any)
    .select('rule')
    .eq('tenant_id', tenantId)
    .eq('domain', 'business_health')
    .in('status', ['active', 'paused'])

  const existingTypes = new Set(
    (existing ?? []).map((r: any) => {
      const rule = typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule
      return rule?.type
    })
  )

  // Suggest weekly financial review if not already committed
  if (!existingTypes.has('weekly_financial_review')) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'business_health',
      suggestedRule: { type: 'weekly_financial_review', required: true },
      rationale:
        'Regular financial review keeps you aware of cash flow, outstanding invoices, and upcoming expenses. A weekly check prevents surprises.',
      evidence: null,
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  // Suggest quarterly rate review if not already committed
  if (!existingTypes.has('quarterly_rate_review')) {
    suggestions.push({
      id: generateId(),
      tenantId,
      domain: 'business_health',
      suggestedRule: { type: 'quarterly_rate_review', required: true },
      rationale:
        'Food costs, labor rates, and market conditions shift quarterly. Reviewing your rates every 90 days ensures you stay profitable.',
      evidence: null,
      status: 'pending',
      respondedAt: null,
      dismissedReason: null,
      createdAt: new Date(),
    })
  }

  return suggestions
}
