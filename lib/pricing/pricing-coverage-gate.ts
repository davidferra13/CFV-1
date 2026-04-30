import {
  buildNoBlankPriceContract,
  summarizePriceContracts,
  type NoBlankPriceContract,
  type NoBlankPriceSourceClass,
  type NoBlankQuoteSafety,
} from '@/lib/pricing/no-blank-price-contract'
import type { ResolutionTier } from '@/lib/pricing/resolve-price'

export type PricingCoverageGateInput = {
  id: string | null
  name: string | null
  category: string | null
  priceCents: number | null
  unit: string | null
  lastPriceDate: string | null
  lastPriceConfidence: number | null
  lastPriceSource: string | null
  lastPriceStore: string | null
  preferredVendor: string | null
  dataPoints: number | null
}

export type PricingCoverageGateOptions = {
  now?: Date
}

export type ChefReliabilityStatus = 'ready' | 'needs_verification' | 'blocked' | 'no_ingredients'

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

export type PricingCoverageRiskRow = {
  ingredientId: string | null
  name: string
  category: string
  priceCents: number | null
  unit: string | null
  sourceClass: NoBlankPriceSourceClass | null
  quoteSafety: NoBlankQuoteSafety
  confidence: number
  missingProof: string[]
  explanation: string
}

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

type ContractWithContext = {
  contract: NoBlankPriceContract
  category: string
  displayName: string
  freshnessDays: number | null
}

const RISK_RANK: Record<NoBlankQuoteSafety, number> = {
  unsupported: 4,
  planning_only: 3,
  verify_first: 2,
  safe_to_quote: 1,
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function positiveInt(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

function daysBetween(now: Date, value: string | null): number | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 86_400_000))
}

export function pricingResolutionTierFromSource(
  source: string | null
): ResolutionTier | 'estimated' {
  const normalized = clean(source).toLowerCase()

  if (
    normalized.includes('vendor_invoice') ||
    normalized.includes('chef_receipt') ||
    normalized.includes('chef_cost') ||
    normalized.includes('chef_owned') ||
    normalized.includes('manual') ||
    normalized.includes('zip_local') ||
    normalized.includes('store') ||
    normalized.includes('local')
  ) {
    return 'zip_local'
  }

  if (normalized.includes('regional') || normalized.includes('market_state')) return 'regional'
  if (normalized.includes('national') || normalized.includes('median')) return 'market_national'
  if (normalized.includes('usda') || normalized.includes('government')) return 'government'
  if (normalized.includes('historical') || normalized.includes('average')) return 'historical'

  return 'estimated'
}

function pickStatus(
  summary: PricingCoverageGateSummary
): PricingCoverageGate['chefReliabilityGate'] {
  if (summary.recognizedIngredients === 0) {
    return {
      status: 'no_ingredients',
      label: 'No ingredients',
      reason: 'No recognized ingredients were available for coverage gating.',
      blockingCount: 0,
    }
  }

  if (summary.unsupportedCount > 0 || summary.planningOnlyCount > 0) {
    return {
      status: 'blocked',
      label: 'Planning only',
      reason: `${summary.planningOnlyCount} ingredient price contract${summary.planningOnlyCount === 1 ? '' : 's'} are planning-only and need observed proof before final quoting.`,
      blockingCount: summary.unsupportedCount + summary.planningOnlyCount,
    }
  }

  if (summary.verifyFirstCount > 0) {
    return {
      status: 'needs_verification',
      label: 'Verify first',
      reason: `${summary.verifyFirstCount} ingredient price contract${summary.verifyFirstCount === 1 ? '' : 's'} need verification before final quoting.`,
      blockingCount: summary.verifyFirstCount,
    }
  }

  return {
    status: 'ready',
    label: 'Ready to quote',
    reason: 'All recognized ingredient price contracts have fresh local quote-safe proof.',
    blockingCount: 0,
  }
}

function buildContract(input: PricingCoverageGateInput, now: Date): ContractWithContext {
  const name = clean(input.name)
  const category = clean(input.category) || 'uncategorized'
  const freshnessDays = daysBetween(now, input.lastPriceDate)
  const vendor = clean(input.lastPriceStore) || clean(input.preferredVendor)

  const contract = buildNoBlankPriceContract({
    ingredientId: input.id,
    rawName: name,
    normalizedName: name.toLowerCase(),
    recognized: Boolean(name),
    priceCents: positiveInt(input.priceCents) || null,
    unit: clean(input.unit) || null,
    confidence: input.lastPriceConfidence,
    freshnessDays,
    resolutionTier: pricingResolutionTierFromSource(input.lastPriceSource),
    observedAt: input.lastPriceDate,
    storeName: vendor,
    productName: name,
    dataPoints: input.dataPoints,
    category,
  })

  return { contract, category, displayName: name, freshnessDays }
}

function countSource(
  contracts: NoBlankPriceContract[],
  sourceClass: NoBlankPriceSourceClass
): number {
  return contracts.filter(
    (contract) => contract.kind === 'priced' && contract.sourceClass === sourceClass
  ).length
}

function isStaleObserved(item: ContractWithContext): boolean {
  return (
    item.contract.kind === 'priced' &&
    (item.contract.sourceClass === 'observed_local' ||
      item.contract.sourceClass === 'observed_regional') &&
    (item.freshnessDays == null || item.freshnessDays > 14)
  )
}

function riskRow(item: ContractWithContext): PricingCoverageRiskRow {
  const contract = item.contract
  return {
    ingredientId: contract.ingredientId,
    name: item.displayName || contract.normalizedName || 'Unrecognized ingredient',
    category: item.category,
    priceCents: contract.priceCents,
    unit: contract.unit,
    sourceClass: contract.sourceClass,
    quoteSafety: contract.quoteSafety,
    confidence: contract.confidence,
    missingProof: contract.missingProof,
    explanation: contract.explanation,
  }
}

function buildCategoryRows(items: ContractWithContext[]): PricingCoverageCategoryRow[] {
  const groups = new Map<string, ContractWithContext[]>()
  for (const item of items) {
    const existing = groups.get(item.category) ?? []
    existing.push(item)
    groups.set(item.category, existing)
  }

  return Array.from(groups.entries())
    .map(([category, categoryItems]) => {
      const contracts = categoryItems.map((item) => item.contract)
      const summary = summarizePriceContracts(contracts)
      const pricedContracts = contracts.filter((contract) => contract.kind === 'priced').length

      return {
        category,
        total: categoryItems.length,
        safeToQuoteCount: summary.safeToQuoteCount,
        verifyFirstCount: summary.verifyFirstCount,
        planningOnlyCount: summary.planningOnlyCount,
        modeledFallbackCount: summary.modeledCount,
        noBlankCoveragePct: pct(pricedContracts, categoryItems.length),
        quoteSafePct: pct(summary.safeToQuoteCount, categoryItems.length),
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

export function buildPricingCoverageGate(
  inputs: PricingCoverageGateInput[],
  options: PricingCoverageGateOptions = {}
): PricingCoverageGate {
  const now = options.now ?? new Date()
  const items = inputs.map((input) => buildContract(input, now))
  const contracts = items.map((item) => item.contract)
  const pricedContracts = contracts.filter((contract) => contract.kind === 'priced')
  const summaryBase = summarizePriceContracts(contracts)
  const recognizedIngredients = inputs.filter((input) => Boolean(clean(input.name))).length
  const noBlankCoveragePct = pct(pricedContracts.length, recognizedIngredients)
  const summary: PricingCoverageGateSummary = {
    recognizedIngredients,
    pricedContracts: pricedContracts.length,
    unsupportedCount: summaryBase.unsupportedCount,
    noBlankCoveragePct,
    safeToQuoteCount: summaryBase.safeToQuoteCount,
    verifyFirstCount: summaryBase.verifyFirstCount,
    planningOnlyCount: summaryBase.planningOnlyCount,
    observedLocalCount: countSource(contracts, 'observed_local'),
    observedRegionalCount: countSource(contracts, 'observed_regional'),
    nationalMedianCount: countSource(contracts, 'national_median'),
    categoryBaselineCount: countSource(contracts, 'category_baseline'),
    modeledFallbackCount: summaryBase.modeledCount,
    staleObservedCount: items.filter(isStaleObserved).length,
    quoteSafePct: pct(summaryBase.safeToQuoteCount, recognizedIngredients),
    averageConfidence: summaryBase.averageConfidence,
  }

  const noBlankPassed =
    recognizedIngredients > 0 &&
    summary.unsupportedCount === 0 &&
    summary.pricedContracts === recognizedIngredients

  const topRisks = items
    .filter((item) => item.contract.quoteSafety !== 'safe_to_quote')
    .map(riskRow)
    .sort((a, b) => {
      const riskDiff = RISK_RANK[b.quoteSafety] - RISK_RANK[a.quoteSafety]
      if (riskDiff !== 0) return riskDiff
      if (a.confidence !== b.confidence) return a.confidence - b.confidence
      return a.name.localeCompare(b.name)
    })
    .slice(0, 20)

  return {
    generatedAt: now.toISOString(),
    noBlankGate: {
      passed: noBlankPassed,
      label: noBlankPassed ? 'No blank prices' : 'Coverage gap',
      reason: noBlankPassed
        ? 'Every recognized ingredient has a system-owned price contract.'
        : 'One or more recognized ingredients did not resolve to a priced contract.',
    },
    chefReliabilityGate: pickStatus(summary),
    summary,
    byCategory: buildCategoryRows(items),
    topRisks,
    missingProof: Array.from(
      new Set(contracts.flatMap((contract) => contract.missingProof))
    ).sort(),
  }
}
