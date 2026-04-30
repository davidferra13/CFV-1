import type {
  NoBlankPriceSummary,
  NoBlankReliabilityVerdict,
} from '@/lib/pricing/no-blank-price-contract'

export type PricingEnforcementStatus = 'ready' | 'verify_first' | 'blocked' | 'not_applicable'

export type PricingEnforcementDisplayMode =
  | 'final_quote'
  | 'verification_required'
  | 'planning_estimate'
  | 'manual_quote'

export type PricingRepairKind =
  | 'resolve_ingredient'
  | 'find_observed_price'
  | 'refresh_stale_price'
  | 'replace_modeled_fallback'
  | 'collect_local_proof'

export type PricingRepairItem = {
  kind: PricingRepairKind
  priority: 'critical' | 'high' | 'normal'
  label: string
  reason: string
}

export type PricingEnforcementInput = {
  totalIngredientCount: number
  verdict: NoBlankReliabilityVerdict
  safeToQuoteCount: number
  verifyFirstCount: number
  planningOnlyCount: number
  unsupportedCount: number
  modeledCount: number
  averageConfidence: number
  missingProof: string[]
}

export type PricingEnforcementDecision = {
  status: PricingEnforcementStatus
  displayMode: PricingEnforcementDisplayMode
  label: string
  message: string
  requiredAction: string
  canPresentAsFinalQuote: boolean
  canSendQuote: boolean
  repairQueue: PricingRepairItem[]
}

function positive(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function includesProof(missingProof: string[], text: string): boolean {
  const needle = text.toLowerCase()
  return missingProof.some((proof) => proof.toLowerCase().includes(needle))
}

function buildRepairQueue(input: PricingEnforcementInput): PricingRepairItem[] {
  const queue: PricingRepairItem[] = []

  if (positive(input.unsupportedCount) > 0) {
    queue.push({
      kind: 'resolve_ingredient',
      priority: 'critical',
      label: 'Resolve unsupported ingredient text',
      reason: `${input.unsupportedCount} ingredient${input.unsupportedCount === 1 ? '' : 's'} could not enter the pricing contract.`,
    })
  }

  if (positive(input.planningOnlyCount) > 0 || includesProof(input.missingProof, 'observed')) {
    queue.push({
      kind: 'find_observed_price',
      priority: 'critical',
      label: 'Find observed market price',
      reason: 'Planning-only prices need observed proof before final quoting.',
    })
  }

  if (positive(input.modeledCount) > 0) {
    queue.push({
      kind: 'replace_modeled_fallback',
      priority: 'high',
      label: 'Replace modeled fallback',
      reason: `${input.modeledCount} modeled fallback price${input.modeledCount === 1 ? '' : 's'} should be replaced with market evidence.`,
    })
  }

  if (
    positive(input.verifyFirstCount) > 0 ||
    includesProof(input.missingProof, 'fresh timestamp')
  ) {
    queue.push({
      kind: 'refresh_stale_price',
      priority: positive(input.planningOnlyCount) > 0 ? 'high' : 'normal',
      label: 'Refresh stale or weak price',
      reason:
        'Verify-first prices need a fresh timestamp or stronger source before they can be treated as final.',
    })
  }

  if (
    includesProof(input.missingProof, 'local') ||
    includesProof(input.missingProof, 'vendor') ||
    includesProof(input.missingProof, 'store')
  ) {
    queue.push({
      kind: 'collect_local_proof',
      priority: positive(input.planningOnlyCount) > 0 ? 'high' : 'normal',
      label: 'Collect local vendor proof',
      reason:
        'The estimate is missing local buyable proof from a store, vendor, receipt, or invoice.',
    })
  }

  const seen = new Set<PricingRepairKind>()
  return queue.filter((item) => {
    if (seen.has(item.kind)) return false
    seen.add(item.kind)
    return true
  })
}

export function buildPricingEnforcementDecision(
  input: PricingEnforcementInput
): PricingEnforcementDecision {
  const totalIngredientCount = positive(input.totalIngredientCount)

  if (totalIngredientCount === 0) {
    return {
      status: 'not_applicable',
      displayMode: 'manual_quote',
      label: 'Manual quote',
      message: 'No event ingredients were available for pricing enforcement.',
      requiredAction: 'Use normal quote review for manually priced work.',
      canPresentAsFinalQuote: true,
      canSendQuote: true,
      repairQueue: [],
    }
  }

  const repairQueue = buildRepairQueue(input)

  if (input.verdict === 'planning_only' || positive(input.planningOnlyCount) > 0) {
    return {
      status: 'blocked',
      displayMode: 'planning_estimate',
      label: 'Planning estimate only',
      message: `${input.planningOnlyCount} ingredient price contract${input.planningOnlyCount === 1 ? '' : 's'} are planning-only. ChefFlow can show planning math, but this is not final quote proof.`,
      requiredAction:
        'Replace planning-only or modeled prices with observed market, vendor, receipt, or invoice proof before sending the final quote.',
      canPresentAsFinalQuote: false,
      canSendQuote: false,
      repairQueue,
    }
  }

  if (input.verdict === 'verify_first' || positive(input.verifyFirstCount) > 0) {
    return {
      status: 'verify_first',
      displayMode: 'verification_required',
      label: 'Verification required',
      message: `${input.verifyFirstCount} ingredient price contract${input.verifyFirstCount === 1 ? '' : 's'} need verification before this price should be treated as final.`,
      requiredAction: 'Verify flagged ingredient prices before sending or confirming the quote.',
      canPresentAsFinalQuote: false,
      canSendQuote: true,
      repairQueue,
    }
  }

  return {
    status: 'ready',
    displayMode: 'final_quote',
    label: 'Ready to quote',
    message: 'All recognized ingredient prices have quote-safe proof.',
    requiredAction: 'No pricing repair is required before quoting.',
    canPresentAsFinalQuote: true,
    canSendQuote: true,
    repairQueue,
  }
}

export function buildPricingEnforcementDecisionFromSummary(
  summary: NoBlankPriceSummary
): PricingEnforcementDecision {
  return buildPricingEnforcementDecision({
    totalIngredientCount: summary.totalCount,
    verdict: summary.verdict,
    safeToQuoteCount: summary.safeToQuoteCount,
    verifyFirstCount: summary.verifyFirstCount,
    planningOnlyCount: summary.planningOnlyCount,
    unsupportedCount: summary.unsupportedCount,
    modeledCount: summary.modeledCount,
    averageConfidence: summary.averageConfidence,
    missingProof: summary.missingProof,
  })
}
