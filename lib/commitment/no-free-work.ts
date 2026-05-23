import { createServerClient } from '@/lib/db/server'
import type { Commitment, FrictionCheckResult, FrictionTier } from '@/lib/commitment/types'

// -- Types --------------------------------------------------------------------

export type FreeWorkAction =
  | 'tasting'
  | 'consultation'
  | 'revision'
  | 'recipe_development'
  | 'travel'

export interface FreeWorkViolation {
  action: FreeWorkAction
  rule: string
  description: string
  suggestedFee: number
  commitment: Commitment | null
}

export interface FreeWorkTracker {
  tenantId: string
  period: string
  totalWaivedFees: number
  waivedByCategory: Record<FreeWorkAction, number>
  waiverCount: number
  summary: string
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

function getQuarterKey(date: Date): string {
  const q = Math.ceil((date.getMonth() + 1) / 3)
  return `${date.getFullYear()}-Q${q}`
}

function getPeriodRange(period: string): { start: Date; end: Date } {
  const match = period.match(/^(\d{4})-Q(\d)$/)
  if (match) {
    const year = parseInt(match[1], 10)
    const quarter = parseInt(match[2], 10)
    const startMonth = (quarter - 1) * 3
    const start = new Date(year, startMonth, 1)
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
    return { start, end }
  }
  const now = new Date()
  const q = Math.ceil((now.getMonth() + 1) / 3)
  const startMonth = (q - 1) * 3
  return {
    start: new Date(now.getFullYear(), startMonth, 1),
    end: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999),
  }
}

const RULE_TO_ACTION: Record<string, FreeWorkAction> = {
  no_free_work_tasting_fee: 'tasting',
  no_free_work_revision_cap: 'revision',
  no_free_work_consultation_fee: 'consultation',
}

// -- Core Functions -----------------------------------------------------------

/**
 * Check whether a given action violates free-work commitments.
 * Returns violations with suggested fees.
 */
export async function checkFreeWorkViolation(
  tenantId: string,
  action: {
    type: FreeWorkAction
    feeCharged: number
    revisionNumber?: number
    durationMinutes?: number
  }
): Promise<FreeWorkViolation[]> {
  const client = createServerClient()
  const violations: FreeWorkViolation[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .in('domain', ['pricing', 'financial', 'business_health'])

  if (!rows || rows.length === 0) return violations

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>

    if (rule.type === 'no_free_work_tasting_fee' && action.type === 'tasting') {
      if (action.feeCharged < (rule.minFee ?? 0)) {
        violations.push({
          action: 'tasting',
          rule: 'no_free_work_tasting_fee',
          description: `Tasting fee $${action.feeCharged} is below minimum $${rule.minFee}`,
          suggestedFee: rule.minFee,
          commitment,
        })
      }
    }

    if (rule.type === 'no_free_work_revision_cap' && action.type === 'revision') {
      const included = rule.included ?? 2
      const overageFee = rule.overageFee ?? 50
      if (action.revisionNumber != null && action.revisionNumber > included) {
        if (action.feeCharged < overageFee) {
          violations.push({
            action: 'revision',
            rule: 'no_free_work_revision_cap',
            description: `Revision #${action.revisionNumber} exceeds included ${included}; overage fee $${overageFee} required`,
            suggestedFee: overageFee,
            commitment,
          })
        }
      }
    }

    if (rule.type === 'no_free_work_consultation_fee' && action.type === 'consultation') {
      const afterMinutes = rule.afterMinutes ?? 30
      if (
        action.durationMinutes != null &&
        action.durationMinutes > afterMinutes &&
        action.feeCharged < (rule.minFee ?? 0)
      ) {
        violations.push({
          action: 'consultation',
          rule: 'no_free_work_consultation_fee',
          description: `Consultation over ${afterMinutes} min without fee (minimum $${rule.minFee})`,
          suggestedFee: rule.minFee,
          commitment,
        })
      }
    }

    if (rule.type === 'travel_surcharge_required' && action.type === 'travel') {
      if (action.feeCharged <= 0) {
        violations.push({
          action: 'travel',
          rule: 'travel_surcharge_required',
          description: 'Travel surcharge required but not applied',
          suggestedFee: 50,
          commitment,
        })
      }
    }
  }

  return violations
}

/**
 * Track total waived fees for a period (quarter by default).
 * Reads from commitment_overrides tagged with free-work context.
 */
export async function getFreeWorkTracker(
  tenantId: string,
  period?: string
): Promise<FreeWorkTracker> {
  const currentPeriod = period ?? getQuarterKey(new Date())
  const { start, end } = getPeriodRange(currentPeriod)

  const client = createServerClient()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('id, rule')
    .eq('tenant_id', tenantId)
    .in('domain', ['pricing', 'financial', 'business_health'])

  const freeWorkCommitmentIds = (commitmentRows ?? [])
    .filter((r: any) => {
      const rule = typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule
      return rule.type in RULE_TO_ACTION || rule.type === 'travel_surcharge_required'
    })
    .map((r: any) => r.id)

  if (freeWorkCommitmentIds.length === 0) {
    return {
      tenantId,
      period: currentPeriod,
      totalWaivedFees: 0,
      waivedByCategory: {
        tasting: 0,
        consultation: 0,
        revision: 0,
        recipe_development: 0,
        travel: 0,
      },
      waiverCount: 0,
      summary: 'No free-work commitments active.',
    }
  }

  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('*')
    .in('commitment_id', freeWorkCommitmentIds)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  const overrides = overrideRows ?? []
  const waivedByCategory: Record<FreeWorkAction, number> = {
    tasting: 0,
    consultation: 0,
    revision: 0,
    recipe_development: 0,
    travel: 0,
  }

  let totalWaivedFees = 0

  for (const override of overrides) {
    const ctx = override.context as Record<string, any> | null
    const waivedAmount = ctx?.waivedAmount ?? 0
    const category = (ctx?.freeWorkAction as FreeWorkAction) ?? 'consultation'
    totalWaivedFees += waivedAmount
    if (category in waivedByCategory) {
      waivedByCategory[category] += waivedAmount
    }
  }

  return {
    tenantId,
    period: currentPeriod,
    totalWaivedFees,
    waivedByCategory,
    waiverCount: overrides.length,
    summary:
      totalWaivedFees > 0
        ? `$${totalWaivedFees.toLocaleString()} waived this ${currentPeriod} across ${overrides.length} instances.`
        : `No waived fees in ${currentPeriod}.`,
  }
}

/**
 * Get the total dollar amount of waived fees for a given period.
 */
export async function getWaivedFeeTotal(tenantId: string, period?: string): Promise<number> {
  const tracker = await getFreeWorkTracker(tenantId, period)
  return tracker.totalWaivedFees
}
