import {
  buildNoBlankPriceContract,
  summarizePriceContracts,
  type NoBlankPriceContract,
  type NoBlankPriceSourceClass,
  type NoBlankPriceSummary,
  type NoBlankQuoteSafety,
} from '@/lib/pricing/no-blank-price-contract'
import type { ResolutionTier } from '@/lib/pricing/resolve-price'

export type PricingTrustScope = 'ingredient_set' | 'menu' | 'event'

export type PricingTrustInput = {
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

export type PricingTrustOptions = {
  now?: Date
  scope?: PricingTrustScope
}

export type PricingTrustStatus = 'ready' | 'needs_verification' | 'blocked' | 'no_ingredients'

export type PricingTrustSummary = {
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

export type PricingTrustRisk = {
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

export type PricingTrustAssessment = {
  generatedAt: string
  scope: PricingTrustScope
  noBlankGate: {
    passed: boolean
    label: string
    reason: string
  }
  quoteSafetyGate: {
    status: PricingTrustStatus
    verdict: NoBlankPriceSummary['verdict'] | 'no_ingredients'
    label: string
    reason: string
    blockingCount: number
  }
  summary: PricingTrustSummary
  contracts: NoBlankPriceContract[]
  topRisks: PricingTrustRisk[]
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

function buildContract(input: PricingTrustInput, now: Date): ContractWithContext {
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

function riskRow(item: ContractWithContext): PricingTrustRisk {
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

function pickStatus(summary: PricingTrustSummary): PricingTrustAssessment['quoteSafetyGate'] {
  if (summary.recognizedIngredients === 0) {
    return {
      status: 'no_ingredients',
      verdict: 'no_ingredients',
      label: 'No ingredients',
      reason: 'No recognized ingredients were available for pricing trust assessment.',
      blockingCount: 0,
    }
  }

  if (summary.unsupportedCount > 0 || summary.planningOnlyCount > 0) {
    return {
      status: 'blocked',
      verdict: 'planning_only',
      label: 'Planning only',
      reason: `${summary.planningOnlyCount} ingredient price contract${summary.planningOnlyCount === 1 ? '' : 's'} are planning-only and need observed proof before final quoting.`,
      blockingCount: summary.unsupportedCount + summary.planningOnlyCount,
    }
  }

  if (summary.verifyFirstCount > 0) {
    return {
      status: 'needs_verification',
      verdict: 'verify_first',
      label: 'Verify first',
      reason: `${summary.verifyFirstCount} ingredient price contract${summary.verifyFirstCount === 1 ? '' : 's'} need verification before final quoting.`,
      blockingCount: summary.verifyFirstCount,
    }
  }

  return {
    status: 'ready',
    verdict: 'safe_to_quote',
    label: 'Ready to quote',
    reason: 'All recognized ingredient price contracts have fresh local quote-safe proof.',
    blockingCount: 0,
  }
}

export function assessPricingTrust(
  inputs: PricingTrustInput[],
  options: PricingTrustOptions = {}
): PricingTrustAssessment {
  const now = options.now ?? new Date()
  const scope = options.scope ?? 'ingredient_set'
  const items = inputs.map((input) => buildContract(input, now))
  const contracts = items.map((item) => item.contract)
  const pricedContracts = contracts.filter((contract) => contract.kind === 'priced')
  const summaryBase = summarizePriceContracts(contracts)
  const recognizedIngredients = inputs.filter((input) => Boolean(clean(input.name))).length
  const summary: PricingTrustSummary = {
    recognizedIngredients,
    pricedContracts: pricedContracts.length,
    unsupportedCount: summaryBase.unsupportedCount,
    noBlankCoveragePct: pct(pricedContracts.length, recognizedIngredients),
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
    scope,
    noBlankGate: {
      passed: noBlankPassed,
      label: noBlankPassed ? 'No blank prices' : 'Coverage gap',
      reason: noBlankPassed
        ? 'Every recognized ingredient has a system-owned price contract.'
        : 'One or more recognized ingredients did not resolve to a priced contract.',
    },
    quoteSafetyGate: pickStatus(summary),
    summary,
    contracts,
    topRisks,
    missingProof: Array.from(
      new Set(contracts.flatMap((contract) => contract.missingProof))
    ).sort(),
  }
}
