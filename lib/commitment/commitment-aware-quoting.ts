import { createServerClient } from '@/lib/db/server'
import type { Commitment, CommitmentDomain } from '@/lib/commitment/types'

// -- Types --------------------------------------------------------------------

export interface QuoteData {
  eventId?: string
  quoteId?: string
  perHeadPrice: number
  totalGuests: number
  foodCostPercent?: number
  distanceMiles?: number
  eventDate?: string
  revisionNumber?: number
  isNewDish?: boolean
  daysSinceLastMenuChange?: number
  hasAllergenVerification?: boolean
  hasDietarySummary?: boolean
  travelSurchargeIncluded?: boolean
  consultationMinutes?: number
  tastingFeeIncluded?: boolean
}

export type ConflictSeverity = 'hard_block' | 'warning' | 'info'

export interface CommitmentConflict {
  commitment: Commitment
  severity: ConflictSeverity
  description: string
  suggestedAdjustment: string | null
}

export interface CompatibilityReport {
  quoteId: string | null
  compatible: boolean
  conflicts: CommitmentConflict[]
  warnings: CommitmentConflict[]
  info: CommitmentConflict[]
  summary: string
}

// -- Helpers ------------------------------------------------------------------

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

// -- Conflict Checkers --------------------------------------------------------

function checkPricingConflicts(
  commitment: Commitment,
  quoteData: QuoteData
): CommitmentConflict | null {
  const rule = commitment.rule as Record<string, any>

  if (rule.type === 'pricing_floor') {
    if (quoteData.perHeadPrice < (rule.minPerHead ?? 0)) {
      return {
        commitment,
        severity: 'hard_block',
        description: `Per-head price $${quoteData.perHeadPrice} is below floor $${rule.minPerHead}`,
        suggestedAdjustment: `Raise per-head to at least $${rule.minPerHead}`,
      }
    }
  }

  if (rule.type === 'margin_floor') {
    if (
      quoteData.foodCostPercent != null &&
      quoteData.foodCostPercent > (rule.maxFoodCostPercent ?? 100)
    ) {
      return {
        commitment,
        severity: 'hard_block',
        description: `Food cost ${quoteData.foodCostPercent}% exceeds maximum ${rule.maxFoodCostPercent}%`,
        suggestedAdjustment: `Reduce food cost to ${rule.maxFoodCostPercent}% or raise price`,
      }
    }
  }

  if (rule.type === 'no_late_discounts') {
    if (quoteData.eventDate) {
      const daysUntil = Math.ceil(
        (new Date(quoteData.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysUntil <= (rule.freezeDaysBeforeEvent ?? 7)) {
        return {
          commitment,
          severity: 'warning',
          description: `Event is ${daysUntil} days away; quote changes frozen ${rule.freezeDaysBeforeEvent} days before`,
          suggestedAdjustment: 'Keep original pricing or override with reason',
        }
      }
    }
  }

  return null
}

function checkFreeWorkConflicts(
  commitment: Commitment,
  quoteData: QuoteData
): CommitmentConflict | null {
  const rule = commitment.rule as Record<string, any>

  if (rule.type === 'no_free_work_tasting_fee' && !quoteData.tastingFeeIncluded) {
    return {
      commitment,
      severity: 'warning',
      description: 'Tasting fee commitment active but not included in quote',
      suggestedAdjustment: `Add tasting fee (minimum $${rule.minFee})`,
    }
  }

  if (rule.type === 'no_free_work_revision_cap') {
    if (quoteData.revisionNumber != null && quoteData.revisionNumber > (rule.included ?? 2)) {
      return {
        commitment,
        severity: 'warning',
        description: `Revision #${quoteData.revisionNumber} exceeds cap of ${rule.included}; overage fee $${rule.overageFee} applies`,
        suggestedAdjustment: `Add $${rule.overageFee} revision overage fee`,
      }
    }
  }

  if (rule.type === 'travel_surcharge_required') {
    if (
      quoteData.distanceMiles != null &&
      quoteData.distanceMiles > 20 &&
      !quoteData.travelSurchargeIncluded
    ) {
      return {
        commitment,
        severity: 'warning',
        description: 'Travel surcharge required but not included',
        suggestedAdjustment: 'Add travel surcharge to quote',
      }
    }
  }

  return null
}

function checkMenuConflicts(
  commitment: Commitment,
  quoteData: QuoteData
): CommitmentConflict | null {
  const rule = commitment.rule as Record<string, any>

  if (rule.type === 'no_new_dishes_within') {
    if (quoteData.isNewDish && quoteData.eventDate) {
      const daysUntil = Math.ceil(
        (new Date(quoteData.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysUntil <= (rule.days ?? 14)) {
        return {
          commitment,
          severity: 'warning',
          description: `New dish added within ${rule.days}-day lockout before event`,
          suggestedAdjustment: 'Use a tested dish or override with documented reason',
        }
      }
    }
  }

  if (rule.type === 'max_menu_revisions') {
    if (quoteData.revisionNumber != null && quoteData.revisionNumber > (rule.limit ?? 3)) {
      return {
        commitment,
        severity: 'info',
        description: `Menu revision #${quoteData.revisionNumber} exceeds limit of ${rule.limit}`,
        suggestedAdjustment: 'Consider finalizing menu to protect scope',
      }
    }
  }

  return null
}

function checkDietaryConflicts(
  commitment: Commitment,
  quoteData: QuoteData
): CommitmentConflict | null {
  const rule = commitment.rule as Record<string, any>

  if (rule.type === 'allergens_verified_before_confirm' && !quoteData.hasAllergenVerification) {
    return {
      commitment,
      severity: 'hard_block',
      description: 'Allergen verification required before confirming quote',
      suggestedAdjustment: 'Complete allergen verification for all guests',
    }
  }

  if (rule.type === 'dietary_summary_sent_before' && !quoteData.hasDietarySummary) {
    return {
      commitment,
      severity: 'warning',
      description: 'Dietary summary should be sent to client before finalizing',
      suggestedAdjustment: 'Generate and send dietary summary',
    }
  }

  return null
}

function checkCapacityConflicts(
  commitment: Commitment,
  quoteData: QuoteData
): CommitmentConflict | null {
  const rule = commitment.rule as Record<string, any>

  if (rule.type === 'max_guests_without_sous') {
    if (quoteData.totalGuests > (rule.limit ?? 20)) {
      return {
        commitment,
        severity: 'warning',
        description: `${quoteData.totalGuests} guests exceeds solo limit of ${rule.limit}`,
        suggestedAdjustment: 'Add sous chef or reduce guest count',
      }
    }
  }

  return null
}

// -- Core Functions -----------------------------------------------------------

/**
 * Check a quote against all active commitments. Returns conflicts sorted by severity.
 */
export async function checkQuoteCompatibility(
  tenantId: string,
  quoteData: QuoteData
): Promise<CommitmentConflict[]> {
  const client = createServerClient()

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!rows || rows.length === 0) return []

  const conflicts: CommitmentConflict[] = []
  const checkers = [
    checkPricingConflicts,
    checkFreeWorkConflicts,
    checkMenuConflicts,
    checkDietaryConflicts,
    checkCapacityConflicts,
  ]

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    for (const checker of checkers) {
      const conflict = checker(commitment, quoteData)
      if (conflict) conflicts.push(conflict)
    }
  }

  const severityOrder: Record<ConflictSeverity, number> = {
    hard_block: 0,
    warning: 1,
    info: 2,
  }
  conflicts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return conflicts
}

/**
 * Get only the conflicting commitments for a quote (convenience wrapper).
 */
export async function getConflictingCommitments(
  tenantId: string,
  quoteData: QuoteData
): Promise<Commitment[]> {
  const conflicts = await checkQuoteCompatibility(tenantId, quoteData)
  const seen = new Set<string>()
  const result: Commitment[] = []
  for (const c of conflicts) {
    if (!seen.has(c.commitment.id)) {
      seen.add(c.commitment.id)
      result.push(c.commitment)
    }
  }
  return result
}

/**
 * Generate a full compatibility report for a quote, suitable for UI display.
 */
export async function generateCompatibilityReport(
  tenantId: string,
  quoteId: string | null,
  quoteData: QuoteData
): Promise<CompatibilityReport> {
  const allConflicts = await checkQuoteCompatibility(tenantId, quoteData)

  const hardBlocks = allConflicts.filter((c) => c.severity === 'hard_block')
  const warnings = allConflicts.filter((c) => c.severity === 'warning')
  const info = allConflicts.filter((c) => c.severity === 'info')

  const compatible = hardBlocks.length === 0

  let summary: string
  if (allConflicts.length === 0) {
    summary = 'Quote is fully compatible with all active commitments.'
  } else if (compatible) {
    summary = `Quote has ${warnings.length} warning(s) but no hard blocks.`
  } else {
    summary = `Quote blocked by ${hardBlocks.length} commitment(s). Resolve before sending.`
  }

  return {
    quoteId,
    compatible,
    conflicts: hardBlocks,
    warnings,
    info,
    summary,
  }
}
