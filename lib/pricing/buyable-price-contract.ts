export type BuyablePriceTrustLevel =
  | 'confirmed_local_buyable'
  | 'recent_local_observed'
  | 'regional_market_estimate'
  | 'national_median'
  | 'modeled_estimate'
  | 'no_trusted_price'

export type BuyablePriceSourceHealth = 'fresh' | 'stale' | 'degraded' | 'unknown'

export interface BuyablePriceProof {
  storeName: string | null
  productName: string | null
  zipRequested: string | null
  distanceMiles: number | null
  observedAt: string | null
  dataPoints: number
  unit: string | null
  packageSize: string | null
  sourceLabels: string[]
}

export interface BuyablePriceContract {
  trustLevel: BuyablePriceTrustLevel
  safeForShopping: boolean
  displayLabel: string
  confidenceLabel: 'high' | 'medium' | 'low' | 'none'
  sourceHealth: BuyablePriceSourceHealth
  reasons: string[]
  requiredProof: string[]
  proof: BuyablePriceProof
}

export interface BuildBuyablePriceContractInput {
  priceCents: number | null
  confidenceScore: number
  resolutionTier:
    | 'zip_local'
    | 'regional'
    | 'national_median'
    | 'estimated'
    | 'none'
    | 'chef_receipt'
    | 'wholesale'
    | 'market_state'
    | 'market_national'
    | 'government'
    | 'historical'
    | 'category_baseline'
  freshnessDays: number | null
  dataPoints: number
  storeName?: string | null
  productName?: string | null
  zipRequested?: string | null
  distanceMiles?: number | null
  observedAt?: string | null
  unit?: string | null
  packageSize?: string | null
  sourceLabels?: string[]
  sourceAvailable?: boolean
}

const PROOF_REQUIREMENTS = [
  'current store or vendor observation',
  'exact product or ingredient match',
  'unit and package size normalization',
  'fresh timestamp',
  'local store or chef-owned purchase proof',
]

function isFreshEnoughForShopping(freshnessDays: number | null): boolean {
  return freshnessDays !== null && freshnessDays <= 3
}

function isRecentLocal(freshnessDays: number | null): boolean {
  return freshnessDays !== null && freshnessDays <= 14
}

function confidenceLabel(score: number): BuyablePriceContract['confidenceLabel'] {
  if (score >= 0.85) return 'high'
  if (score >= 0.55) return 'medium'
  if (score > 0) return 'low'
  return 'none'
}

function healthFor(input: BuildBuyablePriceContractInput): BuyablePriceSourceHealth {
  if (input.sourceAvailable === false) return 'degraded'
  if (input.freshnessDays === null) return input.priceCents === null ? 'unknown' : 'stale'
  if (input.freshnessDays <= 7) return 'fresh'
  if (input.freshnessDays <= 30) return 'stale'
  return 'degraded'
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null
  const parsed = new Date(iso).getTime()
  if (Number.isNaN(parsed)) return null
  return Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000))
}

export function freshnessDaysFromIso(iso: string | null | undefined): number | null {
  return daysSince(iso)
}

export function buildBuyablePriceContract(
  input: BuildBuyablePriceContractInput
): BuyablePriceContract {
  const reasons: string[] = []
  const missingProof = new Set(PROOF_REQUIREMENTS)
  const localTier =
    input.resolutionTier === 'zip_local' ||
    input.resolutionTier === 'chef_receipt' ||
    input.resolutionTier === 'wholesale'
  const regionalTier =
    input.resolutionTier === 'regional' || input.resolutionTier === 'market_state'
  const hasStoreProof = Boolean(input.storeName)
  const hasProductProof = Boolean(input.productName)
  const hasPrice = input.priceCents !== null && input.priceCents > 0

  if (hasStoreProof) missingProof.delete('current store or vendor observation')
  if (hasProductProof) missingProof.delete('exact product or ingredient match')
  if (input.unit) missingProof.delete('unit and package size normalization')
  if (isRecentLocal(input.freshnessDays)) missingProof.delete('fresh timestamp')
  if (localTier && hasStoreProof) missingProof.delete('local store or chef-owned purchase proof')

  if (!hasPrice) reasons.push('No usable price was returned.')
  if (!localTier && hasPrice) reasons.push('The result is not backed by local buyable proof.')
  if (input.freshnessDays === null && hasPrice) reasons.push('Freshness could not be verified.')
  if (input.freshnessDays !== null && input.freshnessDays > 3) {
    reasons.push(`Observed ${input.freshnessDays} days ago, outside the shopping-safe window.`)
  }
  if (input.dataPoints < 2 && !localTier) reasons.push('Too few data points for a broad estimate.')
  if (input.sourceAvailable === false) reasons.push('The pricing source is currently degraded.')

  let trustLevel: BuyablePriceTrustLevel = 'no_trusted_price'
  if (!hasPrice) {
    trustLevel = 'no_trusted_price'
  } else if (
    localTier &&
    hasStoreProof &&
    hasProductProof &&
    isFreshEnoughForShopping(input.freshnessDays) &&
    input.confidenceScore >= 0.7
  ) {
    trustLevel = 'confirmed_local_buyable'
  } else if (localTier && hasStoreProof && hasProductProof && isRecentLocal(input.freshnessDays)) {
    trustLevel = 'recent_local_observed'
  } else if (regionalTier) {
    trustLevel = 'regional_market_estimate'
  } else if (
    input.resolutionTier === 'national_median' ||
    input.resolutionTier === 'market_national'
  ) {
    trustLevel = 'national_median'
  } else if (
    input.resolutionTier === 'estimated' ||
    input.resolutionTier === 'government' ||
    input.resolutionTier === 'historical' ||
    input.resolutionTier === 'category_baseline'
  ) {
    trustLevel = 'modeled_estimate'
  }

  const safeForShopping = trustLevel === 'confirmed_local_buyable'
  const displayLabel = labelForTrustLevel(trustLevel)

  if (safeForShopping && reasons.length === 0) {
    reasons.push('Local store, product, unit, timestamp, and confidence proof are present.')
  }

  return {
    trustLevel,
    safeForShopping,
    displayLabel,
    confidenceLabel: confidenceLabel(input.confidenceScore),
    sourceHealth: healthFor(input),
    reasons,
    requiredProof: Array.from(missingProof),
    proof: {
      storeName: input.storeName ?? null,
      productName: input.productName ?? null,
      zipRequested: input.zipRequested ?? null,
      distanceMiles: input.distanceMiles ?? null,
      observedAt: input.observedAt ?? null,
      dataPoints: input.dataPoints,
      unit: input.unit ?? null,
      packageSize: input.packageSize ?? null,
      sourceLabels: input.sourceLabels ?? [],
    },
  }
}

export function labelForTrustLevel(level: BuyablePriceTrustLevel): string {
  switch (level) {
    case 'confirmed_local_buyable':
      return 'Confirmed local buyable'
    case 'recent_local_observed':
      return 'Recent local observation'
    case 'regional_market_estimate':
      return 'Regional estimate'
    case 'national_median':
      return 'National median'
    case 'modeled_estimate':
      return 'Modeled estimate'
    case 'no_trusted_price':
      return 'No trusted price'
  }
}

export function shoppingActionForContract(contract: BuyablePriceContract): string {
  switch (contract.trustLevel) {
    case 'confirmed_local_buyable':
      return 'Buy this exact item locally.'
    case 'recent_local_observed':
      return 'Verify shelf price before shopping.'
    case 'regional_market_estimate':
      return 'Use for costing, not a shopping promise.'
    case 'national_median':
      return 'Use only as a rough national benchmark.'
    case 'modeled_estimate':
      return 'Confirm manually before quoting or shopping.'
    case 'no_trusted_price':
      return 'Resolve by vendor, receipt, or manual price.'
  }
}
