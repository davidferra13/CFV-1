import { createServerClient } from '@/lib/db/server'
import type {
  Commitment,
  CommitmentSuggestion,
  FrictionCheckResult,
  FrictionTier,
} from '@/lib/commitment/types'

// -- Types --------------------------------------------------------------------

export type VendorContext = {
  vendorId: string
  orderLeadDays: number
  isSameDayRun: boolean
  qualityTier: string | null
  isPreferredVendor: boolean
}

// -- Helpers ------------------------------------------------------------------

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    source: row.source,
    rule: typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule,
    status: row.status,
    frictionLevel: row.friction_level,
    overrideCount: row.override_count ?? 0,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    futureSelfletter: row.future_self_letter ?? null,
    seasonalProfile: row.seasonal_profile ?? null,
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

// -- Rule Descriptions --------------------------------------------------------

const RULE_DESCRIPTIONS: Record<string, string> = {
  preferred_vendor_lock: 'Order placed with non-preferred vendor when preferred is available',
  order_lead_time: 'Order placed without required lead time',
  no_same_day_market_runs: 'Same-day market run violates planning commitment',
  quality_tier_lock: 'Vendor quality tier below your committed minimum',
}

// -- Core Functions -----------------------------------------------------------

/**
 * Evaluate vendor/supplier commitments against a purchase context.
 * Checks preferred vendor locks, lead time rules, same-day run bans,
 * and quality tier floors.
 */
export async function evaluateVendorCommitments(
  tenantId: string,
  context: VendorContext
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

  const QUALITY_ORDER = ['premium', 'standard', 'budget', 'unknown']

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>
    let violated = false

    if (rule.type === 'preferred_vendor_lock') {
      violated = !context.isPreferredVendor
    } else if (rule.type === 'order_lead_time') {
      violated = context.orderLeadDays < (rule.minDays ?? 2)
    } else if (rule.type === 'no_same_day_market_runs') {
      violated = context.isSameDayRun
    } else if (rule.type === 'quality_tier_lock') {
      if (context.qualityTier) {
        const minIdx = QUALITY_ORDER.indexOf(rule.minTier ?? 'standard')
        const actualIdx = QUALITY_ORDER.indexOf(context.qualityTier)
        violated = actualIdx > minIdx
      }
    } else {
      continue
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
      ruleDescription: RULE_DESCRIPTIONS[rule.type] || 'Vendor commitment violated',
    })
  }

  return results
}

/**
 * Suggest vendor/supplier commitments based on common best practices.
 */
export async function getVendorSuggestions(tenantId: string): Promise<CommitmentSuggestion[]> {
  const suggestions: CommitmentSuggestion[] = []

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'business_health',
    suggestedRule: { type: 'backup_vendor_list', required: true },
    rationale:
      'Maintaining a preferred vendor list prevents last-minute scrambling and ensures consistent ingredient quality.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  suggestions.push({
    id: generateId(),
    tenantId,
    domain: 'business_health',
    suggestedRule: { type: 'equipment_failure_plan' as any, required: true },
    rationale:
      'A 2-day minimum order lead time avoids rush fees, ensures availability, and reduces stress.',
    evidence: null,
    status: 'pending',
    respondedAt: null,
    dismissedReason: null,
    createdAt: new Date(),
  })

  return suggestions
}
