import {
  SAFE_TO_QUOTE_MAX_FRESHNESS_DAYS,
  SAFE_TO_QUOTE_MIN_CONFIDENCE,
  SAFE_TO_QUOTE_MIN_UNIT_CONFIDENCE,
  VERIFY_FIRST_MAX_FRESHNESS_DAYS,
  isVirtualRegionalStore,
  type GeographicPricingSourceClass,
  type GeographicQuoteSafety,
} from '@/lib/pricing/geography-basket'

export type GeographicProofCandidateKind =
  | 'chef_owned'
  | 'store_observed'
  | 'market_state'
  | 'market_national'
  | 'public_baseline'
  | 'category_baseline'
  | 'modeled_fallback'

export type GeographicProofCandidate = {
  kind: GeographicProofCandidateKind
  priceCents: number | null
  normalizedPriceCents?: number | null
  normalizedUnit?: string | null
  lowCents?: number | null
  highCents?: number | null
  geographyCode?: string | null
  storeId?: string | null
  storeName?: string | null
  storeCity?: string | null
  storeState?: string | null
  storeZip?: string | null
  productId?: string | null
  productName?: string | null
  productBrand?: string | null
  productSize?: string | null
  sourceName?: string | null
  sourceType?: string | null
  observedAt?: string | null
  confidence?: number | null
  matchConfidence?: number | null
  unitConfidence?: number | null
  dataPoints?: number | null
  systemIngredientId?: string | null
  canonicalIngredientId?: string | null
  evidence?: Record<string, unknown>
}

export type GeographicProofClassification = {
  sourceClass: GeographicPricingSourceClass
  quoteSafety: GeographicQuoteSafety
  failureReason: string | null
  priceCents: number | null
  normalizedPriceCents: number | null
  normalizedUnit: string | null
  lowCents: number | null
  highCents: number | null
  freshnessDays: number | null
  confidence: number
  matchConfidence: number
  unitConfidence: number
  dataPoints: number
  missingProof: string[]
  evidence: Record<string, unknown>
}

export type GeographicProofClassificationOptions = {
  geographyCode: string
  now?: Date
  hasLocalStores?: boolean
}

function positiveInt(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

function clampConfidence(value: number | null | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, Math.round(value * 1000) / 1000))
}

export function daysSince(value: string | null | undefined, now: Date = new Date()): number | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 86_400_000))
}

function sourceClassForCandidate(
  candidate: GeographicProofCandidate,
  geographyCode: string
): GeographicPricingSourceClass {
  if (candidate.kind === 'chef_owned') return 'chef_owned'
  if (candidate.kind === 'public_baseline') return 'USDA_or_public_baseline'
  if (candidate.kind === 'category_baseline') return 'category_baseline'
  if (candidate.kind === 'modeled_fallback') return 'modeled_fallback'
  if (candidate.kind === 'market_national') return 'national_observed'
  if (candidate.kind === 'market_state') return 'regional_observed'

  if (
    candidate.kind === 'store_observed' &&
    candidate.storeId &&
    candidate.storeState?.toUpperCase() === geographyCode &&
    !isVirtualRegionalStore(candidate)
  ) {
    return 'local_observed'
  }

  return candidate.kind === 'store_observed' ? 'regional_observed' : 'unresolved'
}

function rangeFor(input: {
  priceCents: number
  sourceClass: GeographicPricingSourceClass
  lowCents?: number | null
  highCents?: number | null
}): { lowCents: number; highCents: number } {
  const low = positiveInt(input.lowCents)
  const high = positiveInt(input.highCents)
  if (low && high && high >= low) return { lowCents: low, highCents: high }

  const spread =
    input.sourceClass === 'local_observed' || input.sourceClass === 'chef_owned'
      ? 0.08
      : input.sourceClass === 'regional_observed'
        ? 0.18
        : input.sourceClass === 'national_observed'
          ? 0.28
          : input.sourceClass === 'USDA_or_public_baseline'
            ? 0.35
            : input.sourceClass === 'category_baseline'
              ? 0.45
              : 0.65

  return {
    lowCents: Math.max(1, Math.round(input.priceCents * (1 - spread))),
    highCents: Math.max(input.priceCents, Math.round(input.priceCents * (1 + spread))),
  }
}

function buildMissingProof(input: {
  sourceClass: GeographicPricingSourceClass
  freshnessDays: number | null
  normalizedPriceCents: number | null
  normalizedUnit: string | null
  storeId: string | null | undefined
  productId: string | null | undefined
  confidence: number
  matchConfidence: number
  unitConfidence: number
}): string[] {
  const missing = new Set<string>()

  if (input.normalizedPriceCents == null || input.normalizedPriceCents <= 0) {
    missing.add('positive normalized price')
  }
  if (!input.normalizedUnit) missing.add('normalized unit')
  if (input.sourceClass !== 'local_observed' && input.sourceClass !== 'chef_owned') {
    missing.add('fresh local buyable proof')
  }
  if (
    input.sourceClass === 'regional_observed' ||
    input.sourceClass === 'national_observed' ||
    input.sourceClass === 'USDA_or_public_baseline' ||
    input.sourceClass === 'category_baseline' ||
    input.sourceClass === 'modeled_fallback'
  ) {
    missing.add('local store proof')
  }
  if (input.sourceClass === 'modeled_fallback') missing.add('observed market price')
  if (input.sourceClass === 'unresolved') missing.add('price baseline')
  if (!input.storeId && input.sourceClass === 'local_observed') missing.add('store proof')
  if (!input.productId && input.sourceClass === 'local_observed') {
    missing.add('product proof')
  }
  if (input.freshnessDays == null || input.freshnessDays > SAFE_TO_QUOTE_MAX_FRESHNESS_DAYS) {
    missing.add('fresh timestamp')
  }
  if (input.confidence < SAFE_TO_QUOTE_MIN_CONFIDENCE) missing.add('source confidence')
  if (input.matchConfidence < SAFE_TO_QUOTE_MIN_CONFIDENCE) {
    missing.add('confirmed ingredient match')
  }
  if (input.unitConfidence < SAFE_TO_QUOTE_MIN_UNIT_CONFIDENCE) {
    missing.add('unit conversion confidence')
  }

  return Array.from(missing).sort()
}

function quoteSafetyFor(input: {
  sourceClass: GeographicPricingSourceClass
  priceCents: number | null
  normalizedPriceCents: number | null
  normalizedUnit: string | null
  freshnessDays: number | null
  confidence: number
  matchConfidence: number
  unitConfidence: number
  storeId: string | null | undefined
  productId: string | null | undefined
}): GeographicQuoteSafety {
  if (
    input.sourceClass === 'unresolved' ||
    input.priceCents == null ||
    input.priceCents <= 0 ||
    input.normalizedPriceCents == null ||
    input.normalizedPriceCents <= 0
  ) {
    return 'not_usable'
  }

  if (
    (input.sourceClass === 'local_observed' || input.sourceClass === 'chef_owned') &&
    input.freshnessDays != null &&
    input.freshnessDays <= SAFE_TO_QUOTE_MAX_FRESHNESS_DAYS &&
    input.normalizedUnit &&
    input.confidence >= SAFE_TO_QUOTE_MIN_CONFIDENCE &&
    input.matchConfidence >= SAFE_TO_QUOTE_MIN_CONFIDENCE &&
    input.unitConfidence >= SAFE_TO_QUOTE_MIN_UNIT_CONFIDENCE &&
    input.storeId &&
    input.productId
  ) {
    return 'safe_to_quote'
  }

  if (
    (input.sourceClass === 'local_observed' ||
      input.sourceClass === 'regional_observed' ||
      input.sourceClass === 'national_observed') &&
    input.freshnessDays != null &&
    input.freshnessDays <= VERIFY_FIRST_MAX_FRESHNESS_DAYS &&
    input.normalizedUnit &&
    input.confidence >= 0.5
  ) {
    return 'verify_first'
  }

  return 'planning_only'
}

function failureReasonFor(input: {
  quoteSafety: GeographicQuoteSafety
  sourceClass: GeographicPricingSourceClass
  hasLocalStores?: boolean
  missingProof: string[]
}): string | null {
  if (input.quoteSafety === 'safe_to_quote') return null
  if (input.sourceClass === 'unresolved') {
    return input.hasLocalStores
      ? 'stores exist, no observed prices'
      : 'no local stores, no territory baseline'
  }
  if (input.sourceClass === 'modeled_fallback') return 'modeled-only pricing'
  if (input.missingProof.includes('unit conversion confidence')) return 'weak unit conversion'
  if (input.missingProof.includes('fresh timestamp')) return 'stale prices'
  if (input.missingProof.includes('local store proof')) return 'no local stores'
  if (input.missingProof.includes('confirmed ingredient match')) return 'weak ingredient matching'
  return input.missingProof[0] ?? 'missing pricing proof'
}

export function classifyGeographicProofCandidate(
  candidate: GeographicProofCandidate | null,
  options: GeographicProofClassificationOptions
): GeographicProofClassification {
  if (!candidate) {
    const missingProof = ['price baseline']
    return {
      sourceClass: 'unresolved',
      quoteSafety: 'not_usable',
      failureReason: failureReasonFor({
        quoteSafety: 'not_usable',
        sourceClass: 'unresolved',
        hasLocalStores: options.hasLocalStores,
        missingProof,
      }),
      priceCents: null,
      normalizedPriceCents: null,
      normalizedUnit: null,
      lowCents: null,
      highCents: null,
      freshnessDays: null,
      confidence: 0,
      matchConfidence: 0,
      unitConfidence: 0,
      dataPoints: 0,
      missingProof,
      evidence: {},
    }
  }

  const geographyCode = options.geographyCode.trim().toUpperCase()
  const sourceClass = sourceClassForCandidate(candidate, geographyCode)
  const priceCents = positiveInt(candidate.priceCents)
  const normalizedPriceCents = positiveInt(candidate.normalizedPriceCents ?? candidate.priceCents)
  const normalizedUnit = candidate.normalizedUnit?.trim() || null
  const confidence = clampConfidence(candidate.confidence)
  const matchConfidence = clampConfidence(candidate.matchConfidence)
  const unitConfidence = clampConfidence(candidate.unitConfidence)
  const freshnessDays = daysSince(candidate.observedAt, options.now)
  const dataPoints = positiveInt(candidate.dataPoints) ?? 0
  const missingProof = buildMissingProof({
    sourceClass,
    freshnessDays,
    normalizedPriceCents,
    normalizedUnit,
    storeId: candidate.storeId,
    productId: candidate.productId,
    confidence,
    matchConfidence,
    unitConfidence,
  })
  const quoteSafety = quoteSafetyFor({
    sourceClass,
    priceCents,
    normalizedPriceCents,
    normalizedUnit,
    freshnessDays,
    confidence,
    matchConfidence,
    unitConfidence,
    storeId: candidate.storeId,
    productId: candidate.productId,
  })
  const range =
    normalizedPriceCents == null
      ? { lowCents: null, highCents: null }
      : rangeFor({
          priceCents: normalizedPriceCents,
          sourceClass,
          lowCents: candidate.lowCents,
          highCents: candidate.highCents,
        })

  return {
    sourceClass,
    quoteSafety,
    failureReason: failureReasonFor({
      quoteSafety,
      sourceClass,
      hasLocalStores: options.hasLocalStores,
      missingProof,
    }),
    priceCents,
    normalizedPriceCents,
    normalizedUnit,
    lowCents: range.lowCents,
    highCents: range.highCents,
    freshnessDays,
    confidence,
    matchConfidence,
    unitConfidence,
    dataPoints,
    missingProof: quoteSafety === 'safe_to_quote' ? [] : missingProof,
    evidence: candidate.evidence ?? {},
  }
}
