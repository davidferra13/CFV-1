import type { PaymentMethod } from '@/lib/ledger/append'
import { appendPosAuditLog } from '../pos-audit-log'
import { emitCheckoutAlert } from './alerts'
import { syncRegisterSessionTotals } from './register'
import type { NormalizedSplitTenderLine, RecordedCheckoutPayment } from './types'
import { computeCashDrawerSaleMovementCents } from './payment-calculations'

export async function finalizeCheckoutSaleStatus(ctx: {
  db: any
  tenantId: string
  saleId: string
  primaryPaymentId: string
  registerSessionId?: string
  paymentIdempotencyKey: string
}) {
  const { error: saleStatusErr } = await (ctx.db
    .from('sales')
    .update({ status: 'captured' } as any)
    .eq('id', ctx.saleId)
    .eq('tenant_id', ctx.tenantId) as any)
  if (saleStatusErr) {
    await emitCheckoutAlert({
      tenantId: ctx.tenantId,
      eventType: 'sale_status_finalize_failed',
      severity: 'critical',
      message: `Payment captured but failed to finalize sale status: ${saleStatusErr.message}`,
      dedupeKey: 'checkout_sale_status_finalize_failed',
      context: {
        sale_id: ctx.saleId,
        payment_id: ctx.primaryPaymentId,
        register_session_id: ctx.registerSessionId ?? null,
        idempotency_key: ctx.paymentIdempotencyKey,
      },
    })
    throw new Error(`Failed to finalize sale status: ${saleStatusErr.message}`)
  }
}

export async function recordCashDrawerSaleMovement(ctx: {
  db: any
  tenantId: string
  userId: string
  saleId: string
  primaryPaymentId: string
  registerSessionId?: string
  paymentIdempotencyKey: string
  paymentMethod: PaymentMethod
  normalizedSplitTenders: NormalizedSplitTenderLine[] | null
  totalDueCents: number
  totalTenderedCents: number
  changeDueCents: number
}) {
  const cashDrawerSaleMovementCents = computeCashDrawerSaleMovementCents({
    paymentMethod: ctx.paymentMethod,
    splitTenders: ctx.normalizedSplitTenders,
    totalChargedCents: ctx.totalDueCents,
  })

  if (ctx.registerSessionId && cashDrawerSaleMovementCents > 0) {
    try {
      await (ctx.db.from('cash_drawer_movements').insert({
        tenant_id: ctx.tenantId,
        register_session_id: ctx.registerSessionId,
        movement_type: 'sale_payment',
        amount_cents: cashDrawerSaleMovementCents,
        notes: ctx.changeDueCents > 0 ? 'cash_change_given' : null,
        metadata: {
          source: 'checkout',
          sale_id: ctx.saleId,
          payment_id: ctx.primaryPaymentId,
          payment_idempotency_key: ctx.paymentIdempotencyKey,
          total_tendered_cents: ctx.totalTenderedCents,
          change_due_cents: ctx.changeDueCents,
          payment_method: ctx.normalizedSplitTenders ? 'split_tender' : ctx.paymentMethod,
        },
        created_by: ctx.userId,
      } as any) as any)
    } catch (err) {
      console.error('[non-blocking] Failed to record cash drawer sale movement:', err)
      await emitCheckoutAlert({
        tenantId: ctx.tenantId,
        eventType: 'cash_drawer_sale_movement_failed',
        severity: 'warning',
        message: 'Checkout succeeded but cash drawer movement logging failed',
        dedupeKey: `checkout_cash_drawer_movement_failed_${ctx.registerSessionId}`,
        context: {
          sale_id: ctx.saleId,
          payment_id: ctx.primaryPaymentId,
          register_session_id: ctx.registerSessionId,
          movement_amount_cents: cashDrawerSaleMovementCents,
        },
      })
    }
  }
}

export async function syncRegisterTotalsAfterCheckout(ctx: {
  db: any
  tenantId: string
  saleId: string
  primaryPaymentId: string
  registerSessionId?: string
}) {
  if (!ctx.registerSessionId) return

  try {
    await syncRegisterSessionTotals({
      db: ctx.db,
      tenantId: ctx.tenantId,
      registerSessionId: ctx.registerSessionId,
    })
  } catch (err) {
    console.error('[non-blocking] Failed to sync register session totals:', err)
    await emitCheckoutAlert({
      tenantId: ctx.tenantId,
      eventType: 'register_totals_sync_failed',
      severity: 'warning',
      message: 'Checkout succeeded but register totals sync failed',
      dedupeKey: `checkout_register_totals_sync_failed_${ctx.registerSessionId}`,
      context: {
        sale_id: ctx.saleId,
        register_session_id: ctx.registerSessionId,
        payment_id: ctx.primaryPaymentId,
      },
    })
  }
}

export async function runCheckoutInventoryDeductions(saleId: string) {
  try {
    const { executeSaleDeduction } = await import('../inventory-bridge')
    await executeSaleDeduction(saleId)
  } catch (err) {
    console.error('[non-blocking] Inventory deduction failed:', err)
  }

  try {
    const { deductProductStock } = await import('../inventory-bridge')
    await deductProductStock(saleId)
  } catch (err) {
    console.error('[non-blocking] Product stock deduction failed:', err)
  }
}

export async function appendCheckoutCapturedAudit(ctx: {
  tenantId: string
  userId: string
  saleId: string
  saleNumber: string | null
  primaryPayment: RecordedCheckoutPayment
  paymentMethod: PaymentMethod
  recordedPayments: RecordedCheckoutPayment[]
  normalizedSplitTenders: NormalizedSplitTenderLine[] | null
  cardEntryMode: 'terminal' | 'manual_keyed'
  saleChannel: string
  splitTenderSummary: Array<Record<string, unknown>> | null
  totalDueCents: number
  totalTenderedCents: number
  changeDueCents: number
  tipCents: number
  registerSessionId?: string
}) {
  try {
    const processorTypes = Array.from(
      new Set(ctx.recordedPayments.map((line) => line.processorType))
    )
    await appendPosAuditLog({
      tenantId: ctx.tenantId,
      action: 'sale_checkout_captured',
      tableName: 'sales',
      recordId: ctx.saleId,
      changedBy: ctx.userId,
      summary: 'POS sale captured via counter checkout',
      afterValues: {
        sale_number: ctx.saleNumber,
        payment_id: ctx.primaryPayment.id,
        payment_method: ctx.normalizedSplitTenders ? 'split_tender' : ctx.paymentMethod,
        payment_methods: ctx.recordedPayments.map((line) => line.paymentMethod),
        card_entry_mode:
          !ctx.normalizedSplitTenders && ctx.paymentMethod === 'card' ? ctx.cardEntryMode : null,
        sale_channel: ctx.saleChannel,
        processor_type: processorTypes.length === 1 ? processorTypes[0] : 'mixed',
        processor_reference_id: ctx.primaryPayment.processorReferenceId,
        split_tenders: ctx.splitTenderSummary,
        total_cents: ctx.totalDueCents,
        total_tendered_cents: ctx.totalTenderedCents,
        change_due_cents: ctx.changeDueCents,
        tip_cents: ctx.tipCents,
        register_session_id: ctx.registerSessionId ?? null,
      },
    })
  } catch (err) {
    console.error('[non-blocking] Failed to append POS audit log:', err)
  }
}
