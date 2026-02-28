// Loyalty invoice adjustment policy (v1)
// Applies delivered, event-linked discount redemptions deterministically.

export type LoyaltyInvoiceDiscountType = 'discount_fixed' | 'discount_percent'

export type LoyaltyInvoiceRedemption = {
  id: string
  rewardId: string
  rewardName: string
  rewardType: string
  pointsSpent: number
  createdAt: string
  rewardValueCents: number | null
  rewardPercent: number | null
  valuationSource: 'snapshot' | 'catalog_fallback' | 'unknown'
}

export type LoyaltyInvoiceAdjustmentLine = {
  redemptionId: string
  rewardId: string
  rewardName: string
  rewardType: LoyaltyInvoiceDiscountType
  pointsSpent: number
  discountCents: number
  valuationSource: 'snapshot' | 'catalog_fallback' | 'unknown'
}

export type LoyaltyInvoiceAdjustmentSummary = {
  policyVersion: 'loyalty-redemption-v1'
  baseServiceCents: number
  totalDiscountCents: number
  adjustedServiceCents: number
  appliedRedemptions: LoyaltyInvoiceAdjustmentLine[]
}

function isDiscountRewardType(type: string): type is LoyaltyInvoiceDiscountType {
  return type === 'discount_fixed' || type === 'discount_percent'
}

function safeDate(value: string): number {
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

export function computeLoyaltyInvoiceAdjustments(
  baseServiceCents: number,
  redemptions: LoyaltyInvoiceRedemption[]
): LoyaltyInvoiceAdjustmentSummary {
  const normalizedBase = Math.max(0, Math.round(baseServiceCents))
  let remainingServiceCents = normalizedBase

  const ordered = [...redemptions]
    .filter((row) => isDiscountRewardType(row.rewardType))
    .sort((a, b) => {
      const tsDiff = safeDate(a.createdAt) - safeDate(b.createdAt)
      if (tsDiff !== 0) return tsDiff
      return a.id.localeCompare(b.id)
    })

  const appliedRedemptions: LoyaltyInvoiceAdjustmentLine[] = []

  for (const redemption of ordered) {
    if (remainingServiceCents <= 0) break

    let requestedDiscountCents = 0

    if (redemption.rewardType === 'discount_fixed') {
      requestedDiscountCents = Math.max(0, redemption.rewardValueCents ?? 0)
    } else {
      const rawPercent = redemption.rewardPercent ?? 0
      const boundedPercent = Math.min(100, Math.max(0, rawPercent))
      requestedDiscountCents = Math.round((remainingServiceCents * boundedPercent) / 100)
    }

    const appliedDiscountCents = Math.min(remainingServiceCents, requestedDiscountCents)
    if (appliedDiscountCents <= 0) continue

    remainingServiceCents -= appliedDiscountCents

    appliedRedemptions.push({
      redemptionId: redemption.id,
      rewardId: redemption.rewardId,
      rewardName: redemption.rewardName,
      rewardType: redemption.rewardType,
      pointsSpent: redemption.pointsSpent,
      discountCents: appliedDiscountCents,
      valuationSource: redemption.valuationSource,
    })
  }

  const totalDiscountCents = normalizedBase - remainingServiceCents

  return {
    policyVersion: 'loyalty-redemption-v1',
    baseServiceCents: normalizedBase,
    totalDiscountCents,
    adjustedServiceCents: remainingServiceCents,
    appliedRedemptions,
  }
}
