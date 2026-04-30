import type { ResolutionTier } from '@/lib/pricing/resolve-price'

export type NoBlankPriceSourceClass =
  | 'observed_local'
  | 'observed_regional'
  | 'national_median'
  | 'category_baseline'
  | 'modeled'

export type NoBlankQuoteSafety = 'safe_to_quote' | 'verify_first' | 'planning_only' | 'unsupported'

export type NoBlankPriceContract =
  | {
      kind: 'priced'
      ingredientId: string | null
      normalizedName: string
      priceCents: number
      unit: string
      lowCents: number
      highCents: number
      sourceClass: NoBlankPriceSourceClass
      confidence: number
      quoteSafety: Exclude<NoBlankQuoteSafety, 'unsupported'>
      observedAt: string | null
      explanation: string
      missingProof: string[]
    }
  | {
      kind: 'unsupported'
      ingredientId: null
      normalizedName: string
      priceCents: null
      unit: null
      lowCents: null
      highCents: null
      sourceClass: null
      confidence: 0
      quoteSafety: 'unsupported'
      observedAt: null
      explanation: string
      missingProof: string[]
    }

export type NoBlankReliabilityVerdict = 'safe_to_quote' | 'verify_first' | 'planning_only'

export type NoBlankPriceSummary = {
  verdict: NoBlankReliabilityVerdict
  totalCount: number
  safeToQuoteCount: number
  verifyFirstCount: number
  planningOnlyCount: number
  unsupportedCount: number
  modeledCount: number
  averageConfidence: number
  missingProof: string[]
}

export type BuildNoBlankPriceContractInput = {
  ingredientId?: string | null
  rawName?: string | null
  normalizedName?: string | null
  recognized: boolean
  priceCents?: number | null
  unit?: string | null
  lowCents?: number | null
  highCents?: number | null
  confidence?: number | null
  freshnessDays?: number | null
  resolutionTier?: ResolutionTier | 'zip_local' | 'national_median' | 'estimated' | null
  observedAt?: string | null
  storeName?: string | null
  productName?: string | null
  dataPoints?: number | null
  category?: string | null
}

const DEFAULT_MODELED_UNIT = 'lb'

const CATEGORY_BASELINES_CENTS: Record<string, { cents: number; unit: string }> = {
  alcohol: { cents: 1800, unit: 'bottle' },
  bakery: { cents: 499, unit: 'each' },
  dairy: { cents: 599, unit: 'lb' },
  dry_goods: { cents: 249, unit: 'lb' },
  fruit: { cents: 399, unit: 'lb' },
  herbs: { cents: 199, unit: 'oz' },
  meat: { cents: 999, unit: 'lb' },
  oils: { cents: 1299, unit: 'each' },
  pantry: { cents: 349, unit: 'lb' },
  produce: { cents: 399, unit: 'lb' },
  seafood: { cents: 1599, unit: 'lb' },
  spices: { cents: 899, unit: 'oz' },
  specialty: { cents: 1499, unit: 'each' },
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function positiveInt(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : 0
}

function clampConfidence(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100))
}

function sourceClassForTier(
  tier: BuildNoBlankPriceContractInput['resolutionTier']
): NoBlankPriceSourceClass {
  switch (tier) {
    case 'chef_receipt':
    case 'wholesale':
    case 'zip_local':
      return 'observed_local'
    case 'regional':
    case 'market_state':
      return 'observed_regional'
    case 'market_national':
    case 'national_median':
      return 'national_median'
    case 'government':
    case 'historical':
    case 'category_baseline':
      return 'category_baseline'
    case 'estimated':
      return 'modeled'
    default:
      return 'modeled'
  }
}

function rangeFor(
  priceCents: number,
  sourceClass: NoBlankPriceSourceClass,
  lowCents?: number | null,
  highCents?: number | null
): { lowCents: number; highCents: number } {
  const explicitLow = positiveInt(lowCents)
  const explicitHigh = positiveInt(highCents)
  if (explicitLow > 0 && explicitHigh >= explicitLow) {
    return { lowCents: explicitLow, highCents: explicitHigh }
  }

  const spread =
    sourceClass === 'observed_local'
      ? 0.05
      : sourceClass === 'observed_regional'
        ? 0.18
        : sourceClass === 'national_median'
          ? 0.28
          : sourceClass === 'category_baseline'
            ? 0.42
            : 0.65

  return {
    lowCents: Math.max(1, Math.round(priceCents * (1 - spread))),
    highCents: Math.max(priceCents, Math.round(priceCents * (1 + spread))),
  }
}

function modeledBaseline(input: BuildNoBlankPriceContractInput): {
  priceCents: number
  unit: string
  sourceClass: NoBlankPriceSourceClass
  confidence: number
} {
  const key = clean(input.category)
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  const baseline = CATEGORY_BASELINES_CENTS[key] ?? CATEGORY_BASELINES_CENTS.specialty
  return {
    priceCents: baseline.cents,
    unit: clean(input.unit) || baseline.unit || DEFAULT_MODELED_UNIT,
    sourceClass: 'modeled',
    confidence: 0.18,
  }
}

function quoteSafetyFor(input: {
  sourceClass: NoBlankPriceSourceClass
  confidence: number
  freshnessDays: number | null | undefined
  storeName: string
  productName: string
  dataPoints: number
}): Exclude<NoBlankQuoteSafety, 'unsupported'> {
  const fresh = input.freshnessDays != null && input.freshnessDays <= 3
  const recent = input.freshnessDays != null && input.freshnessDays <= 14

  if (
    input.sourceClass === 'observed_local' &&
    fresh &&
    input.confidence >= 0.75 &&
    input.storeName &&
    input.productName
  ) {
    return 'safe_to_quote'
  }

  if (
    (input.sourceClass === 'observed_local' || input.sourceClass === 'observed_regional') &&
    recent &&
    input.confidence >= 0.5
  ) {
    return 'verify_first'
  }

  if (input.sourceClass === 'observed_local' && input.confidence >= 0.65 && input.productName) {
    return 'verify_first'
  }

  if (input.sourceClass === 'national_median' && input.confidence >= 0.5 && input.dataPoints >= 5) {
    return 'verify_first'
  }

  if (input.sourceClass === 'category_baseline' && input.confidence >= 0.35) {
    return 'verify_first'
  }

  return 'planning_only'
}

function missingProofFor(input: {
  sourceClass: NoBlankPriceSourceClass
  quoteSafety: Exclude<NoBlankQuoteSafety, 'unsupported'>
  freshnessDays: number | null | undefined
  storeName: string
  productName: string
  dataPoints: number
}): string[] {
  const missing = new Set<string>()

  if (input.sourceClass !== 'observed_local') missing.add('fresh local buyable proof')
  if (input.sourceClass === 'national_median') missing.add('local market proof')
  if (input.sourceClass === 'modeled') {
    missing.add('observed market price')
    missing.add('local market proof')
    missing.add('source freshness')
  }
  if (input.sourceClass === 'category_baseline') missing.add('ingredient-specific market proof')
  if (!input.storeName && input.sourceClass !== 'modeled') missing.add('store or vendor proof')
  if (!input.productName && input.sourceClass !== 'modeled') {
    missing.add('exact product or ingredient proof')
  }
  if (input.freshnessDays == null || input.freshnessDays > 14) missing.add('fresh timestamp')
  if (input.dataPoints < 2 && input.sourceClass !== 'modeled') missing.add('multiple observations')
  if (input.quoteSafety === 'safe_to_quote') return []

  return Array.from(missing)
}

function explanationFor(input: {
  sourceClass: NoBlankPriceSourceClass
  quoteSafety: Exclude<NoBlankQuoteSafety, 'unsupported'>
  normalizedName: string
}): string {
  if (input.sourceClass === 'observed_local' && input.quoteSafety === 'safe_to_quote') {
    return `${input.normalizedName} has fresh local observed price proof and can support quoting.`
  }
  if (input.sourceClass === 'observed_local') {
    return `${input.normalizedName} has local observed price proof, but it needs verification before quoting.`
  }
  if (input.sourceClass === 'observed_regional') {
    return `${input.normalizedName} uses regional observed price evidence and should be verified before quoting.`
  }
  if (input.sourceClass === 'national_median') {
    return `${input.normalizedName} uses a national market fallback, not local buyable proof.`
  }
  if (input.sourceClass === 'category_baseline') {
    return `${input.normalizedName} uses an ingredient or category baseline because stronger market proof is missing.`
  }
  return `${input.normalizedName} uses a modeled fallback because no observed market price was available.`
}

export function buildNoBlankPriceContract(
  input: BuildNoBlankPriceContractInput
): NoBlankPriceContract {
  const normalizedName = clean(input.normalizedName) || clean(input.rawName).toLowerCase()
  if (!input.recognized || !normalizedName) {
    return {
      kind: 'unsupported',
      ingredientId: null,
      normalizedName,
      priceCents: null,
      unit: null,
      lowCents: null,
      highCents: null,
      sourceClass: null,
      confidence: 0,
      quoteSafety: 'unsupported',
      observedAt: null,
      explanation: 'ChefFlow could not recognize this as a priceable ingredient.',
      missingProof: ['recognized ingredient'],
    }
  }

  const directPriceCents = positiveInt(input.priceCents)
  const fallback = directPriceCents > 0 ? null : modeledBaseline(input)
  const priceCents = directPriceCents || fallback!.priceCents
  const sourceClass = directPriceCents > 0 ? sourceClassForTier(input.resolutionTier) : 'modeled'
  const confidence =
    directPriceCents > 0 ? clampConfidence(input.confidence ?? 0.45) : fallback!.confidence
  const unit = clean(input.unit) || fallback?.unit || DEFAULT_MODELED_UNIT
  const storeName = clean(input.storeName)
  const productName = clean(input.productName)
  const dataPoints = positiveInt(input.dataPoints)
  const quoteSafety = quoteSafetyFor({
    sourceClass,
    confidence,
    freshnessDays: input.freshnessDays,
    storeName,
    productName,
    dataPoints,
  })
  const range = rangeFor(priceCents, sourceClass, input.lowCents, input.highCents)

  return {
    kind: 'priced',
    ingredientId: input.ingredientId ?? null,
    normalizedName,
    priceCents,
    unit,
    lowCents: range.lowCents,
    highCents: range.highCents,
    sourceClass,
    confidence,
    quoteSafety,
    observedAt: input.observedAt ?? null,
    explanation: explanationFor({ sourceClass, quoteSafety, normalizedName }),
    missingProof: missingProofFor({
      sourceClass,
      quoteSafety,
      freshnessDays: input.freshnessDays,
      storeName,
      productName,
      dataPoints,
    }),
  }
}

export function summarizePriceContracts(contracts: NoBlankPriceContract[]): NoBlankPriceSummary {
  const priced = contracts.filter((contract) => contract.kind === 'priced')
  const safeToQuoteCount = priced.filter(
    (contract) => contract.quoteSafety === 'safe_to_quote'
  ).length
  const verifyFirstCount = priced.filter(
    (contract) => contract.quoteSafety === 'verify_first'
  ).length
  const planningOnlyCount = priced.filter(
    (contract) => contract.quoteSafety === 'planning_only'
  ).length
  const unsupportedCount = contracts.length - priced.length
  const modeledCount = priced.filter((contract) => contract.sourceClass === 'modeled').length
  const averageConfidence =
    priced.length > 0
      ? Math.round(
          (priced.reduce((sum, contract) => sum + contract.confidence, 0) / priced.length) * 100
        ) / 100
      : 0

  const verdict: NoBlankReliabilityVerdict =
    planningOnlyCount > 0 || unsupportedCount > 0
      ? 'planning_only'
      : verifyFirstCount > 0
        ? 'verify_first'
        : 'safe_to_quote'

  return {
    verdict,
    totalCount: contracts.length,
    safeToQuoteCount,
    verifyFirstCount,
    planningOnlyCount,
    unsupportedCount,
    modeledCount,
    averageConfidence,
    missingProof: Array.from(
      new Set(contracts.flatMap((contract) => contract.missingProof))
    ).sort(),
  }
}
