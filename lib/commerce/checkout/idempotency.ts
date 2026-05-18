import type { PaymentMethod } from '@/lib/ledger/append'
import type {
  AppliedCheckoutPromotion,
  CounterCheckoutResult,
  NormalizedSplitTenderLine,
} from './types'
import { computeChangeDueCents, computeSplitTenderChangeDueCents } from './payment-calculations'
import type { PromotionDiscountType } from '../promotion-engine'

const FINALIZED_PAYMENT_STATUS_SET = new Set(['captured', 'settled', 'authorized'])

export async function findExistingCheckoutResult(ctx: {
  db: any
  tenantId: string
  idempotencyKey: string
  paymentMethod: PaymentMethod
  amountTenderedCents: number
  splitTenders: NormalizedSplitTenderLine[] | null
}): Promise<CounterCheckoutResult | null> {
  const { data: payment } = await (ctx.db
    .from('commerce_payments' as any)
    .select('id, sale_id, amount_cents, tip_cents, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('idempotency_key', ctx.idempotencyKey)
    .maybeSingle() as any)

  if (!payment || !payment.sale_id) return null

  if (!FINALIZED_PAYMENT_STATUS_SET.has(String(payment.status ?? ''))) {
    throw new Error('Existing checkout is not finalized yet. Try again in a moment.')
  }

  const { data: salePayments } = await (ctx.db
    .from('commerce_payments' as any)
    .select('id, amount_cents, tip_cents, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('sale_id', payment.sale_id)
    .order('created_at', { ascending: true }) as any)

  const finalizedPayments =
    salePayments?.filter((row: any) =>
      FINALIZED_PAYMENT_STATUS_SET.has(String(row?.status ?? ''))
    ) ?? []
  const effectivePayments = finalizedPayments.length > 0 ? finalizedPayments : [payment]

  const { data: sale } = await (ctx.db
    .from('sales' as any)
    .select('id, sale_number')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', payment.sale_id)
    .maybeSingle() as any)

  if (!sale) {
    throw new Error('Checkout payment exists but sale record was not found')
  }

  let appliedPromotion: AppliedCheckoutPromotion | null = null
  try {
    const { data: promotionRow } = await (ctx.db
      .from('sale_applied_promotions' as any)
      .select('promotion_id, code, name, discount_type, discount_cents')
      .eq('tenant_id', ctx.tenantId)
      .eq('sale_id', sale.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any)

    if (promotionRow) {
      appliedPromotion = {
        id: String((promotionRow as any).promotion_id ?? ''),
        code: String((promotionRow as any).code ?? ''),
        name: String((promotionRow as any).name ?? ''),
        discountType: (promotionRow as any).discount_type as PromotionDiscountType,
        discountCents: Number((promotionRow as any).discount_cents ?? 0),
      }
    }
  } catch {
    // Do not fail idempotent resume if applied-promotion snapshot query fails.
  }

  const totalCents = effectivePayments.reduce(
    (sum: number, row: any) => sum + Number(row?.amount_cents ?? 0) + Number(row?.tip_cents ?? 0),
    0
  )
  const primaryPaymentId = String((effectivePayments[0] as any)?.id ?? payment.id)
  const changeDueCents = ctx.splitTenders
    ? computeSplitTenderChangeDueCents({
        splitTenders: ctx.splitTenders,
        totalChargedCents: totalCents,
      })
    : computeChangeDueCents({
        paymentMethod: ctx.paymentMethod,
        amountTenderedCents: ctx.amountTenderedCents,
        totalChargedCents: totalCents,
      })

  return {
    saleId: sale.id,
    saleNumber: sale.sale_number ?? 'Sale',
    paymentId: primaryPaymentId,
    totalCents,
    changeDueCents,
    appliedPromotion,
  }
}
