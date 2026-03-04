import type { TaxClass } from './constants'

export const PROMOTION_DISCOUNT_TYPES = [
  'percent_order',
  'fixed_order',
  'percent_item',
  'fixed_item',
] as const

export type PromotionDiscountType = (typeof PROMOTION_DISCOUNT_TYPES)[number]

export type PromotionRule = {
  id: string
  code: string
  name: string
  discountType: PromotionDiscountType
  discountPercent: number | null
  discountCents: number | null
  minSubtotalCents: number
  maxDiscountCents: number | null
  targetTaxClasses: TaxClass[]
}

export type PromotionLine = {
  id: string
  taxClass: TaxClass
  lineSubtotalCents: number
}

export type PromotionEvaluationResult = {
  totalDiscountCents: number
  eligibleSubtotalCents: number
  lineDiscounts: Record<string, number>
}

function isItemScopedPromotion(discountType: PromotionDiscountType) {
  return discountType === 'percent_item' || discountType === 'fixed_item'
}

function clampDiscount(input: {
  desiredDiscountCents: number
  eligibleSubtotalCents: number
  maxDiscountCents: number | null
}) {
  let discount = Math.max(0, Math.trunc(input.desiredDiscountCents))
  discount = Math.min(discount, Math.max(0, input.eligibleSubtotalCents))
  if (input.maxDiscountCents != null && Number.isInteger(input.maxDiscountCents)) {
    discount = Math.min(discount, Math.max(0, input.maxDiscountCents))
  }
  return discount
}

function allocateDiscountAcrossLines(input: {
  eligibleLines: PromotionLine[]
  eligibleSubtotalCents: number
  totalDiscountCents: number
}) {
  const discounts = new Map<string, number>()
  let allocated = 0

  const sortedLines = [...input.eligibleLines].sort((a, b) => {
    if (b.lineSubtotalCents !== a.lineSubtotalCents) {
      return b.lineSubtotalCents - a.lineSubtotalCents
    }
    return a.id.localeCompare(b.id)
  })

  for (const line of sortedLines) {
    const raw = Math.floor(
      (input.totalDiscountCents * line.lineSubtotalCents) / input.eligibleSubtotalCents
    )
    discounts.set(line.id, raw)
    allocated += raw
  }

  let remainder = input.totalDiscountCents - allocated
  for (const line of sortedLines) {
    if (remainder <= 0) break
    const current = discounts.get(line.id) ?? 0
    if (current >= line.lineSubtotalCents) continue
    discounts.set(line.id, current + 1)
    remainder -= 1
  }

  const lineDiscounts: Record<string, number> = {}
  for (const line of input.eligibleLines) {
    lineDiscounts[line.id] = discounts.get(line.id) ?? 0
  }
  return lineDiscounts
}

export function evaluatePromotionForLines(input: {
  promotion: PromotionRule
  lines: PromotionLine[]
  orderSubtotalCents: number
}): PromotionEvaluationResult | null {
  const lines = input.lines.filter(
    (line) => Number.isInteger(line.lineSubtotalCents) && line.lineSubtotalCents > 0
  )
  if (lines.length === 0) return null

  if (input.orderSubtotalCents < Math.max(0, input.promotion.minSubtotalCents || 0)) {
    return null
  }

  const eligibleLines = isItemScopedPromotion(input.promotion.discountType)
    ? lines.filter((line) => {
        const targets = input.promotion.targetTaxClasses ?? []
        if (targets.length === 0) return true
        return targets.includes(line.taxClass)
      })
    : lines

  if (eligibleLines.length === 0) return null

  const eligibleSubtotalCents = eligibleLines.reduce((sum, line) => sum + line.lineSubtotalCents, 0)
  if (eligibleSubtotalCents <= 0) return null

  let desiredDiscountCents = 0
  if (
    input.promotion.discountType === 'percent_order' ||
    input.promotion.discountType === 'percent_item'
  ) {
    const pct = Math.max(0, Math.min(100, Math.trunc(input.promotion.discountPercent ?? 0)))
    if (pct <= 0) return null
    desiredDiscountCents = Math.floor((eligibleSubtotalCents * pct) / 100)
  } else {
    desiredDiscountCents = Math.trunc(input.promotion.discountCents ?? 0)
  }

  const totalDiscountCents = clampDiscount({
    desiredDiscountCents,
    eligibleSubtotalCents,
    maxDiscountCents: input.promotion.maxDiscountCents,
  })

  if (totalDiscountCents <= 0) return null

  return {
    totalDiscountCents,
    eligibleSubtotalCents,
    lineDiscounts: allocateDiscountAcrossLines({
      eligibleLines,
      eligibleSubtotalCents,
      totalDiscountCents,
    }),
  }
}

