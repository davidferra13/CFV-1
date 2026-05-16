import type { BuyablePriceContract } from '@/lib/pricing/buyable-price-contract'

export type AppleTestRegion = 'northeast' | 'south' | 'midwest' | 'west' | 'pacific' | 'national'

export interface AppleTestIngredientCase {
  ingredient: string
  zipCode: string
  region: AppleTestRegion
}

export interface AppleTestLookupInput {
  ingredient: string
  zipCode: string
}

export interface AppleTestLookupResult {
  price_cents: number | null
  unit: string | null
  confidence_score: number
  resolution_tier: BuyablePriceContract['fallbackTier'] | string
  sources: string[]
  last_updated: string | null
  data_points: number
  buyable_price: BuyablePriceContract
}

export type AppleTestLookup = (
  input: AppleTestLookupInput
) => Promise<AppleTestLookupResult> | AppleTestLookupResult

export interface AppleTestSmokeCasePass {
  ok: true
  case: AppleTestIngredientCase
  diagnostics: AppleTestSmokeDiagnostics
}

export interface AppleTestSmokeCaseFail {
  ok: false
  case: AppleTestIngredientCase
  diagnostics: AppleTestSmokeDiagnostics
  failures: string[]
}

export type AppleTestSmokeCaseResult = AppleTestSmokeCasePass | AppleTestSmokeCaseFail

export interface AppleTestSmokeDiagnostics {
  ingredient: string
  zipCode: string
  region: AppleTestRegion
  priceCents: number | null
  unit: string | null
  confidenceScore: number | null
  confidenceLabel: BuyablePriceContract['confidenceLabel'] | null
  fallbackTier: string | null
  sourceHealth: BuyablePriceContract['sourceHealth'] | null
  freshnessLabel: BuyablePriceContract['freshness']['label'] | null
  freshnessDays: number | null
  observedAt: string | null
  sources: string[]
  proofSources: string[]
  priceState: BuyablePriceContract['priceState'] | null
  dataPoints: number | null
  trustLevel: BuyablePriceContract['trustLevel'] | null
  missingProof: string[]
  reasons: string[]
}

export interface AppleTestSmokeReport {
  ok: boolean
  checked: number
  passed: number
  failed: number
  results: AppleTestSmokeCaseResult[]
  diagnostics: AppleTestSmokeDiagnostics[]
}

export const DEFAULT_APPLE_TEST_MATRIX: AppleTestIngredientCase[] = [
  { ingredient: 'apples', zipCode: '10003', region: 'northeast' },
  { ingredient: 'chicken breast', zipCode: '30303', region: 'south' },
  { ingredient: 'yellow onion', zipCode: '60607', region: 'midwest' },
  { ingredient: 'whole milk', zipCode: '80202', region: 'west' },
  { ingredient: 'cilantro', zipCode: '98101', region: 'pacific' },
  { ingredient: 'rice', zipCode: '73301', region: 'national' },
]

export async function runAppleTestSmokeSuite(options: {
  lookup: AppleTestLookup
  matrix?: AppleTestIngredientCase[]
}): Promise<AppleTestSmokeReport> {
  const matrix = options.matrix ?? DEFAULT_APPLE_TEST_MATRIX
  const results: AppleTestSmokeCaseResult[] = []

  for (const smokeCase of matrix) {
    try {
      const lookupResult = await options.lookup({
        ingredient: smokeCase.ingredient,
        zipCode: smokeCase.zipCode,
      })
      const diagnostics = diagnosticsFor(smokeCase, lookupResult)
      const failures = validateSmokeResult(diagnostics)

      results.push(
        failures.length === 0
          ? { ok: true, case: smokeCase, diagnostics }
          : { ok: false, case: smokeCase, diagnostics, failures }
      )
    } catch (error) {
      const diagnostics = emptyDiagnostics(smokeCase, error)
      results.push({
        ok: false,
        case: smokeCase,
        diagnostics,
        failures: [`lookup threw: ${error instanceof Error ? error.message : String(error)}`],
      })
    }
  }

  const failed = results.filter((result) => !result.ok).length
  return {
    ok: failed === 0,
    checked: results.length,
    passed: results.length - failed,
    failed,
    results,
    diagnostics: results.map((result) => result.diagnostics),
  }
}

export async function assertAppleTestSmokeSuite(options: {
  lookup: AppleTestLookup
  matrix?: AppleTestIngredientCase[]
}): Promise<AppleTestSmokeReport> {
  const report = await runAppleTestSmokeSuite(options)

  if (!report.ok) {
    const diagnostics = report.results
      .filter((result): result is AppleTestSmokeCaseFail => !result.ok)
      .map((result) => ({
        ingredient: result.case.ingredient,
        zipCode: result.case.zipCode,
        region: result.case.region,
        failures: result.failures,
        diagnostics: result.diagnostics,
      }))

    throw new Error(`Apple Test smoke failed:\n${JSON.stringify(diagnostics, null, 2)}`)
  }

  return report
}

function diagnosticsFor(
  smokeCase: AppleTestIngredientCase,
  result: AppleTestLookupResult
): AppleTestSmokeDiagnostics {
  const contract = result.buyable_price

  return {
    ingredient: smokeCase.ingredient,
    zipCode: smokeCase.zipCode,
    region: smokeCase.region,
    priceCents: result.price_cents,
    unit: result.unit,
    confidenceScore: result.confidence_score,
    confidenceLabel: contract.confidenceLabel,
    fallbackTier: contract.fallbackTier ?? String(result.resolution_tier),
    sourceHealth: contract.sourceHealth,
    freshnessLabel: contract.freshness.label,
    freshnessDays: contract.freshness.days,
    observedAt: contract.freshness.observedAt ?? result.last_updated,
    sources: result.sources,
    proofSources: contract.proof.sourceLabels,
    priceState: contract.priceState,
    dataPoints: result.data_points,
    trustLevel: contract.trustLevel,
    missingProof: contract.missingProof,
    reasons: contract.reasons,
  }
}

function emptyDiagnostics(
  smokeCase: AppleTestIngredientCase,
  error: unknown
): AppleTestSmokeDiagnostics {
  return {
    ingredient: smokeCase.ingredient,
    zipCode: smokeCase.zipCode,
    region: smokeCase.region,
    priceCents: null,
    unit: null,
    confidenceScore: null,
    confidenceLabel: null,
    fallbackTier: null,
    sourceHealth: null,
    freshnessLabel: null,
    freshnessDays: null,
    observedAt: null,
    sources: [],
    proofSources: [],
    priceState: null,
    dataPoints: null,
    trustLevel: null,
    missingProof: [],
    reasons: [error instanceof Error ? error.message : String(error)],
  }
}

function validateSmokeResult(diagnostics: AppleTestSmokeDiagnostics): string[] {
  const failures: string[] = []
  const hasSource = diagnostics.sources.length > 0 || diagnostics.proofSources.length > 0
  const hasFreshnessProof =
    diagnostics.freshnessLabel !== null &&
    diagnostics.freshnessLabel !== 'unknown' &&
    (diagnostics.observedAt !== null || diagnostics.freshnessDays !== null)
  const hasEstimatedState =
    diagnostics.priceState === 'synthetic_or_modeled' &&
    diagnostics.fallbackTier !== null &&
    diagnostics.fallbackTier !== 'none'
  const hasUsableFallback = diagnostics.fallbackTier !== null && diagnostics.fallbackTier !== 'none'

  if (diagnostics.priceCents === null || diagnostics.priceCents <= 0) {
    failures.push('expected positive price_cents')
  }

  if (!diagnostics.unit) {
    failures.push('expected normalized unit')
  }

  if (diagnostics.confidenceScore === null || diagnostics.confidenceScore <= 0) {
    failures.push('expected positive confidence_score')
  }

  if (!diagnostics.confidenceLabel || diagnostics.confidenceLabel === 'none') {
    failures.push('expected nonblank confidence label')
  }

  if (!hasSource) {
    failures.push('expected at least one source or proof source')
  }

  if (!hasUsableFallback) {
    failures.push('expected usable fallback tier')
  }

  if (!diagnostics.sourceHealth || diagnostics.sourceHealth === 'unknown') {
    failures.push('expected source health diagnostic')
  }

  if (!hasFreshnessProof && !hasEstimatedState) {
    failures.push('expected freshness label plus observed date/freshness days or estimated state')
  }

  if (diagnostics.priceState === null || diagnostics.priceState === 'missing') {
    failures.push('expected non-missing price state')
  }

  return failures
}
