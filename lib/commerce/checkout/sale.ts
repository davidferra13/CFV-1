import type { AppliedCheckoutPromotion } from './types'
import { emitCheckoutAlert, markSaleAsCheckoutFailed } from './alerts'

export async function createPendingCheckoutSale(ctx: {
  db: any
  tenantId: string
  userId: string
  clientId?: string
  registerSessionId?: string
  taxZipCode?: string
  notes?: string
  saleChannel: string
  paymentMethod: string
  paymentIdempotencyKey: string
}) {
  const { data: sale, error: saleErr } = await (ctx.db
    .from('sales')
    .insert({
      tenant_id: ctx.tenantId,
      channel: ctx.saleChannel,
      client_id: ctx.clientId ?? null,
      register_session_id: ctx.registerSessionId ?? null,
      tax_zip_code: ctx.taxZipCode ?? null,
      notes: ctx.notes ?? null,
      status: 'pending_payment',
      created_by: ctx.userId,
    } as any)
    .select('id, sale_number')
    .single() as any)

  if (saleErr || !sale) {
    await emitCheckoutAlert({
      tenantId: ctx.tenantId,
      eventType: 'sale_create_failed',
      severity: 'critical',
      message: `Checkout failed while creating sale: ${saleErr?.message ?? 'unknown error'}`,
      dedupeKey: 'checkout_sale_create_failed',
      context: {
        register_session_id: ctx.registerSessionId ?? null,
        payment_method: ctx.paymentMethod,
        idempotency_key: ctx.paymentIdempotencyKey,
      },
    })
    throw new Error(`Failed to create sale: ${saleErr?.message}`)
  }

  return sale as { id: string; sale_number: string | null }
}

export async function insertCheckoutSaleItems(ctx: {
  db: any
  tenantId: string
  saleId: string
  userId: string
  registerSessionId?: string
  paymentIdempotencyKey: string
  itemRows: any[]
}) {
  const { error: itemsErr } = await (ctx.db.from('sale_items').insert(ctx.itemRows as any) as any)

  if (itemsErr) {
    await markSaleAsCheckoutFailed({
      db: ctx.db,
      tenantId: ctx.tenantId,
      saleId: ctx.saleId,
      userId: ctx.userId,
      reason: `sale_items_insert_failed:${itemsErr.message}`,
    })
    await emitCheckoutAlert({
      tenantId: ctx.tenantId,
      eventType: 'sale_items_insert_failed',
      severity: 'critical',
      message: `Checkout failed while inserting sale items: ${itemsErr.message}`,
      dedupeKey: 'checkout_sale_items_insert_failed',
      context: {
        sale_id: ctx.saleId,
        register_session_id: ctx.registerSessionId ?? null,
        idempotency_key: ctx.paymentIdempotencyKey,
      },
    })
    throw new Error(`Failed to add items: ${itemsErr.message}`)
  }
}

export async function updateCheckoutSaleTotals(ctx: {
  db: any
  tenantId: string
  saleId: string
  userId: string
  registerSessionId?: string
  paymentIdempotencyKey: string
  preDiscountSubtotalCents: number
  taxCents: number
  discountCents: number
  totalCents: number
  tipCents: number
  appliedPromotion: AppliedCheckoutPromotion | null
}) {
  const { error: totalsErr } = await (ctx.db
    .from('sales')
    .update({
      subtotal_cents: ctx.preDiscountSubtotalCents,
      tax_cents: ctx.taxCents,
      discount_cents: ctx.discountCents,
      total_cents: ctx.totalCents,
      tip_cents: ctx.tipCents,
      metadata: ctx.appliedPromotion
        ? {
            checkout_promotion: {
              code: ctx.appliedPromotion.code,
              name: ctx.appliedPromotion.name,
              discount_cents: ctx.appliedPromotion.discountCents,
              discount_type: ctx.appliedPromotion.discountType,
            },
          }
        : {},
    } as any)
    .eq('id', ctx.saleId)
    .eq('tenant_id', ctx.tenantId) as any)

  if (totalsErr) {
    await markSaleAsCheckoutFailed({
      db: ctx.db,
      tenantId: ctx.tenantId,
      saleId: ctx.saleId,
      userId: ctx.userId,
      reason: `sale_totals_update_failed:${totalsErr.message}`,
    })
    await emitCheckoutAlert({
      tenantId: ctx.tenantId,
      eventType: 'sale_totals_update_failed',
      severity: 'critical',
      message: `Checkout failed while updating sale totals: ${totalsErr.message}`,
      dedupeKey: 'checkout_sale_totals_update_failed',
      context: {
        sale_id: ctx.saleId,
        register_session_id: ctx.registerSessionId ?? null,
        idempotency_key: ctx.paymentIdempotencyKey,
      },
    })
    throw new Error(`Failed to update sale totals: ${totalsErr.message}`)
  }
}
