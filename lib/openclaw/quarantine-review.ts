export const OPENCLAW_QUARANTINE_REVIEW_CONTEXT_VERSION = 1 as const

export type OpenClawQuarantineReviewAction = 'approved' | 'rejected' | 'corrected'

export type OpenClawQuarantineReviewContext = {
  version: typeof OPENCLAW_QUARANTINE_REVIEW_CONTEXT_VERSION
  ingredientId: string
  tenantId: string | null
  ingredientName: string
  priceCents: number
  normalizedPricePerUnitCents: number
  normalizedUnit: string
  originalUnit: string
  purchaseDate: string
  confirmedAt: string | null
  storeName: string
  storeState: string | null
  tier: string
  granularSource: string
}

export type OpenClawQuarantineReviewAudit = {
  action: OpenClawQuarantineReviewAction
  correctedPriceCents: number | null
  originalPriceCents: number | null
  reviewedAt: string
  reviewedBy: string
  writebackApplied: boolean
}

export type OpenClawQuarantineRawData = Record<string, unknown> & {
  review?: OpenClawQuarantineReviewAudit
  reviewContext?: OpenClawQuarantineReviewContext
}

type BuildOpenClawQuarantineRawDataInput = {
  rawPrice: Record<string, unknown>
  reviewContext: Omit<OpenClawQuarantineReviewContext, 'version'>
}

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function buildOpenClawQuarantineRawData(
  input: BuildOpenClawQuarantineRawDataInput
): OpenClawQuarantineRawData {
  return {
    ...input.rawPrice,
    reviewContext: {
      ...input.reviewContext,
      version: OPENCLAW_QUARANTINE_REVIEW_CONTEXT_VERSION,
    },
  }
}

export function readOpenClawQuarantineReviewContext(
  rawData: unknown
): OpenClawQuarantineReviewContext | null {
  const payload = readObject(rawData)
  const reviewContext = readObject(payload?.reviewContext)

  if (!reviewContext) {
    return null
  }

  const ingredientId = readString(reviewContext.ingredientId)
  const ingredientName = readString(reviewContext.ingredientName)
  const priceCents = readNumber(reviewContext.priceCents)
  const normalizedPricePerUnitCents = readNumber(reviewContext.normalizedPricePerUnitCents)
  const normalizedUnit = readString(reviewContext.normalizedUnit)
  const originalUnit = readString(reviewContext.originalUnit)
  const purchaseDate = readString(reviewContext.purchaseDate)
  const storeName = readString(reviewContext.storeName)
  const tier = readString(reviewContext.tier)
  const granularSource = readString(reviewContext.granularSource)

  if (
    !ingredientId ||
    !ingredientName ||
    priceCents === null ||
    normalizedPricePerUnitCents === null ||
    !normalizedUnit ||
    !originalUnit ||
    !purchaseDate ||
    !storeName ||
    !tier ||
    !granularSource
  ) {
    return null
  }

  return {
    version:
      reviewContext.version === OPENCLAW_QUARANTINE_REVIEW_CONTEXT_VERSION
        ? OPENCLAW_QUARANTINE_REVIEW_CONTEXT_VERSION
        : OPENCLAW_QUARANTINE_REVIEW_CONTEXT_VERSION,
    ingredientId,
    tenantId: readString(reviewContext.tenantId),
    ingredientName,
    priceCents,
    normalizedPricePerUnitCents,
    normalizedUnit,
    originalUnit,
    purchaseDate,
    confirmedAt: readString(reviewContext.confirmedAt),
    storeName,
    storeState: readString(reviewContext.storeState),
    tier,
    granularSource,
  }
}

export function hasOpenClawQuarantineWritebackContext(rawData: unknown): boolean {
  const context = readOpenClawQuarantineReviewContext(rawData)
  return Boolean(context?.ingredientId && context.tenantId && context.granularSource)
}

export function scaleNormalizedPricePerUnitCents(input: {
  originalPriceCents: number | null
  originalNormalizedPricePerUnitCents: number | null
  reviewedPriceCents: number
}): number {
  if (!Number.isFinite(input.reviewedPriceCents) || input.reviewedPriceCents <= 0) {
    return 0
  }

  const originalPriceCents =
    typeof input.originalPriceCents === 'number' && Number.isFinite(input.originalPriceCents)
      ? input.originalPriceCents
      : null
  const originalNormalizedPricePerUnitCents =
    typeof input.originalNormalizedPricePerUnitCents === 'number' &&
    Number.isFinite(input.originalNormalizedPricePerUnitCents)
      ? input.originalNormalizedPricePerUnitCents
      : null

  if (
    originalPriceCents === null ||
    originalPriceCents <= 0 ||
    originalNormalizedPricePerUnitCents === null ||
    originalNormalizedPricePerUnitCents <= 0
  ) {
    return Math.max(1, Math.round(input.reviewedPriceCents))
  }

  return Math.max(
    1,
    Math.round(
      (input.reviewedPriceCents / Math.max(originalPriceCents, 1)) *
        originalNormalizedPricePerUnitCents
    )
  )
}
