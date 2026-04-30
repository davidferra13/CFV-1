import {
  assessPricingTrust,
  pricingResolutionTierFromSource,
  type PricingTrustInput,
  type PricingTrustRisk,
  type PricingTrustStatus,
} from '@/lib/pricing/pricing-trust'

export type PricingCoverageGateInput = PricingTrustInput

export type PricingCoverageGateOptions = {
  now?: Date
}

export type ChefReliabilityStatus = PricingTrustStatus

export type PricingCoverageGateSummary = {
  recognizedIngredients: number
  pricedContracts: number
  unsupportedCount: number
  noBlankCoveragePct: number
  safeToQuoteCount: number
  verifyFirstCount: number
  planningOnlyCount: number
  observedLocalCount: number
  observedRegionalCount: number
  nationalMedianCount: number
  categoryBaselineCount: number
  modeledFallbackCount: number
  staleObservedCount: number
  quoteSafePct: number
  averageConfidence: number
}

export type PricingCoverageCategoryRow = {
  category: string
  total: number
  safeToQuoteCount: number
  verifyFirstCount: number
  planningOnlyCount: number
  modeledFallbackCount: number
  noBlankCoveragePct: number
  quoteSafePct: number
  averageConfidence: number
}

export type PricingCoverageRiskRow = PricingTrustRisk

export type PricingCoverageGate = {
  generatedAt: string
  noBlankGate: {
    passed: boolean
    label: string
    reason: string
  }
  chefReliabilityGate: {
    status: ChefReliabilityStatus
    label: string
    reason: string
    blockingCount: number
  }
  summary: PricingCoverageGateSummary
  byCategory: PricingCoverageCategoryRow[]
  topRisks: PricingCoverageRiskRow[]
  missingProof: string[]
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

function buildCategoryRows(
  inputs: PricingCoverageGateInput[],
  now: Date
): PricingCoverageCategoryRow[] {
  const groups = new Map<string, PricingCoverageGateInput[]>()
  for (const input of inputs) {
    const category = clean(input.category) || 'uncategorized'
    const existing = groups.get(category) ?? []
    existing.push(input)
    groups.set(category, existing)
  }

  return Array.from(groups.entries())
    .map(([category, categoryInputs]) => {
      const assessment = assessPricingTrust(categoryInputs, {
        now,
        scope: 'ingredient_set',
      })
      const summary = assessment.summary

      return {
        category,
        total: categoryInputs.length,
        safeToQuoteCount: summary.safeToQuoteCount,
        verifyFirstCount: summary.verifyFirstCount,
        planningOnlyCount: summary.planningOnlyCount,
        modeledFallbackCount: summary.modeledFallbackCount,
        noBlankCoveragePct: summary.noBlankCoveragePct,
        quoteSafePct: pct(summary.safeToQuoteCount, categoryInputs.length),
        averageConfidence: summary.averageConfidence,
      }
    })
    .sort((a, b) => {
      if (b.planningOnlyCount !== a.planningOnlyCount) {
        return b.planningOnlyCount - a.planningOnlyCount
      }
      if (a.quoteSafePct !== b.quoteSafePct) return a.quoteSafePct - b.quoteSafePct
      return a.category.localeCompare(b.category)
    })
}

export { pricingResolutionTierFromSource }

export function buildPricingCoverageGate(
  inputs: PricingCoverageGateInput[],
  options: PricingCoverageGateOptions = {}
): PricingCoverageGate {
  const now = options.now ?? new Date()
  const assessment = assessPricingTrust(inputs, {
    now,
    scope: 'ingredient_set',
  })

  return {
    generatedAt: assessment.generatedAt,
    noBlankGate: assessment.noBlankGate,
    chefReliabilityGate: {
      status: assessment.quoteSafetyGate.status,
      label: assessment.quoteSafetyGate.label,
      reason: assessment.quoteSafetyGate.reason,
      blockingCount: assessment.quoteSafetyGate.blockingCount,
    },
    summary: assessment.summary,
    byCategory: buildCategoryRows(inputs, now),
    topRisks: assessment.topRisks,
    missingProof: assessment.missingProof,
  }
}
