import { evaluatePromotionForLines, type PromotionRule } from '../promotion-engine'
import type { AppliedCheckoutPromotion, CheckoutLineComputation, PromotionRow } from './types'
import { isAutoPromotionEnabled } from './validation'

function toPromotionRule(row: PromotionRow): PromotionRule {
  return {
    id: row.id,
    code: String(row.code ?? '').toUpperCase(),
    name: String(row.name ?? 'Promotion'),
    discountType: row.discount_type,
    discountPercent: row.discount_percent ?? null,
    discountCents: row.discount_cents ?? null,
    minSubtotalCents: row.min_subtotal_cents ?? 0,
    maxDiscountCents: row.max_discount_cents ?? null,
    targetTaxClasses: Array.isArray(row.target_tax_classes) ? row.target_tax_classes : [],
  }
}

async function loadPromotionByCode(ctx: {
  db: any
  tenantId: string
  code: string
}): Promise<PromotionRule> {
  const { data: promotion, error } = await (ctx.db
    .from('commerce_promotions' as any)
    .select(
      'id, code, name, discount_type, discount_percent, discount_cents, min_subtotal_cents, max_discount_cents, target_tax_classes, is_active, starts_at, ends_at'
    )
    .eq('tenant_id', ctx.tenantId)
    .eq('code', ctx.code)
    .eq('is_active', true)
    .maybeSingle() as any)

  if (error) {
    throw new Error(`Failed to validate promotion code: ${error.message}`)
  }
  if (!promotion) {
    throw new Error('Promotion code is invalid or expired')
  }
  const now = Date.now()
  const startsAt = (promotion as PromotionRow).starts_at
    ? Date.parse((promotion as PromotionRow).starts_at as string)
    : null
  const endsAt = (promotion as PromotionRow).ends_at
    ? Date.parse((promotion as PromotionRow).ends_at as string)
    : null
  if ((startsAt != null && startsAt > now) || (endsAt != null && endsAt < now)) {
    throw new Error('Promotion code is invalid or expired')
  }
  return toPromotionRule(promotion as PromotionRow)
}

async function loadAutoApplyPromotions(ctx: {
  db: any
  tenantId: string
}): Promise<PromotionRule[]> {
  const { data: rows, error } = await (ctx.db
    .from('commerce_promotions' as any)
    .select(
      'id, code, name, discount_type, discount_percent, discount_cents, min_subtotal_cents, max_discount_cents, target_tax_classes, is_active, starts_at, ends_at'
    )
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
    .eq('auto_apply', true) as any)

  if (error) {
    throw new Error(`Failed to load auto promotions: ${error.message}`)
  }

  const now = Date.now()
  return (rows ?? [])
    .filter((row: PromotionRow) => {
      const startsAt = row.starts_at ? Date.parse(row.starts_at) : null
      const endsAt = row.ends_at ? Date.parse(row.ends_at) : null
      return (startsAt == null || startsAt <= now) && (endsAt == null || endsAt >= now)
    })
    .map((row: PromotionRow) => toPromotionRule(row))
}

export async function recordAppliedPromotion(ctx: {
  db: any
  tenantId: string
  saleId: string
  promotion: AppliedCheckoutPromotion
}) {
  try {
    await (ctx.db.from('sale_applied_promotions' as any).insert({
      tenant_id: ctx.tenantId,
      sale_id: ctx.saleId,
      promotion_id: ctx.promotion.id,
      code: ctx.promotion.code,
      name: ctx.promotion.name,
      discount_type: ctx.promotion.discountType,
      discount_cents: ctx.promotion.discountCents,
    } as any) as any)
  } catch (error) {
    console.error('[non-blocking] Failed to persist applied promotion snapshot:', error)
  }
}

export async function resolveCheckoutPromotion(ctx: {
  db: any
  tenantId: string
  promotionCode: string | null
  lineComputations: CheckoutLineComputation[]
  preDiscountSubtotalCents: number
}): Promise<{
  lineDiscountsByKey: Record<string, number>
  appliedPromotion: AppliedCheckoutPromotion | null
}> {
  let lineDiscountsByKey: Record<string, number> = {}
  let appliedPromotion: AppliedCheckoutPromotion | null = null

  if (ctx.promotionCode) {
    const promotion = await loadPromotionByCode({
      db: ctx.db,
      tenantId: ctx.tenantId,
      code: ctx.promotionCode,
    })
    const evaluation = evaluatePromotionForLines({
      promotion,
      lines: ctx.lineComputations.map((line) => ({
        id: line.key,
        taxClass: line.taxClass,
        lineSubtotalCents: line.lineSubtotalCents,
      })),
      orderSubtotalCents: ctx.preDiscountSubtotalCents,
    })
    if (!evaluation) {
      throw new Error('Promotion code is valid but does not apply to this cart')
    }
    lineDiscountsByKey = evaluation.lineDiscounts
    appliedPromotion = {
      id: promotion.id,
      code: promotion.code,
      name: promotion.name,
      discountType: promotion.discountType,
      discountCents: evaluation.totalDiscountCents,
    }
  } else if (isAutoPromotionEnabled()) {
    const autoPromotions = await loadAutoApplyPromotions({
      db: ctx.db,
      tenantId: ctx.tenantId,
    })

    let best: {
      promotion: PromotionRule
      totalDiscountCents: number
      lineDiscounts: Record<string, number>
    } | null = null

    for (const promotion of autoPromotions) {
      const evaluation = evaluatePromotionForLines({
        promotion,
        lines: ctx.lineComputations.map((line) => ({
          id: line.key,
          taxClass: line.taxClass,
          lineSubtotalCents: line.lineSubtotalCents,
        })),
        orderSubtotalCents: ctx.preDiscountSubtotalCents,
      })
      if (!evaluation) continue

      if (
        !best ||
        evaluation.totalDiscountCents > best.totalDiscountCents ||
        (evaluation.totalDiscountCents === best.totalDiscountCents &&
          promotion.code.localeCompare(best.promotion.code) < 0)
      ) {
        best = {
          promotion,
          totalDiscountCents: evaluation.totalDiscountCents,
          lineDiscounts: evaluation.lineDiscounts,
        }
      }
    }

    if (best) {
      lineDiscountsByKey = best.lineDiscounts
      appliedPromotion = {
        id: best.promotion.id,
        code: best.promotion.code,
        name: best.promotion.name,
        discountType: best.promotion.discountType,
        discountCents: best.totalDiscountCents,
      }
    }
  }

  return { lineDiscountsByKey, appliedPromotion }
}
