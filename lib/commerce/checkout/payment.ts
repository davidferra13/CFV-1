import type { PaymentMethod } from '@/lib/ledger/append'
import type {
  CounterCheckoutResult,
  NormalizedSplitTenderLine,
  RecordedCheckoutPayment,
} from './types'
import { emitCheckoutAlert, markSaleAsCheckoutFailed } from './alerts'
import { findExistingCheckoutResult } from './idempotency'
import { allocateTipAcrossSplitTenders } from './payment-calculations'

type PaymentPlan = {
  paymentMethod: PaymentMethod
  amountExcludingTipCents: number
  tipCents: number
  amountTenderedCents: number
  cardEntryMode: 'terminal' | 'manual_keyed'
  manualCardReference: string | null
  idempotencyKey: string
}

function buildPaymentPlans(ctx: {
  paymentMethod: PaymentMethod
  amountTenderedCents: number
  cardEntryMode: 'terminal' | 'manual_keyed'
  manualCardReference: string | null
  finalTotalCents: number
  tipCents: number
  totalDueCents: number
  paymentIdempotencyKey: string
  normalizedSplitTenders: NormalizedSplitTenderLine[] | null
}): PaymentPlan[] {
  if (!ctx.normalizedSplitTenders) {
    return [
      {
        paymentMethod: ctx.paymentMethod,
        amountExcludingTipCents: ctx.finalTotalCents,
        tipCents: ctx.tipCents,
        amountTenderedCents: ctx.amountTenderedCents,
        cardEntryMode: ctx.cardEntryMode,
        manualCardReference: ctx.manualCardReference,
        idempotencyKey: ctx.paymentIdempotencyKey,
      },
    ]
  }

  const splitTipAllocations = allocateTipAcrossSplitTenders({
    splitTenders: ctx.normalizedSplitTenders,
    tipCents: ctx.tipCents,
    totalChargedCents: ctx.totalDueCents,
  })

  return ctx.normalizedSplitTenders.map((line, index) => {
    const tipAllocation = splitTipAllocations?.[index] ?? 0
    return {
      paymentMethod: line.paymentMethod,
      amountExcludingTipCents: Math.max(0, line.amountCents - tipAllocation),
      tipCents: tipAllocation,
      amountTenderedCents: line.amountTenderedCents,
      cardEntryMode: line.cardEntryMode,
      manualCardReference: line.manualCardReference,
      idempotencyKey:
        index === ctx.normalizedSplitTenders!.length - 1
          ? ctx.paymentIdempotencyKey
          : `${ctx.paymentIdempotencyKey}__${index}`,
    }
  })
}

export async function recordCheckoutPayments(ctx: {
  db: any
  tenantId: string
  userId: string
  saleId: string
  clientId?: string
  registerSessionId?: string
  paymentIdempotencyKey: string
  paymentMethod: PaymentMethod
  amountTenderedCents: number
  cardEntryMode: 'terminal' | 'manual_keyed'
  manualCardReference: string | null
  finalTotalCents: number
  tipCents: number
  totalDueCents: number
  normalizedSplitTenders: NormalizedSplitTenderLine[] | null
}): Promise<{
  recordedPayments: RecordedCheckoutPayment[]
  idempotentResult: CounterCheckoutResult | null
}> {
  const paymentPlans = buildPaymentPlans(ctx)
  const recordedPayments: RecordedCheckoutPayment[] = []

  let terminalAdapter: any = null
  let terminalHealthChecked = false

  for (const plan of paymentPlans) {
    let processorType: string = 'manual'
    let processorReferenceId: string | null = null
    let paymentNotes: string | null = null

    if (plan.paymentMethod === 'card') {
      if (plan.cardEntryMode === 'manual_keyed') {
        if (!plan.manualCardReference) {
          await markSaleAsCheckoutFailed({
            db: ctx.db,
            tenantId: ctx.tenantId,
            saleId: ctx.saleId,
            userId: ctx.userId,
            reason: 'manual_keyed_reference_missing',
          })
          throw new Error('Manual keyed card reference is required')
        }

        processorType = 'manual_keyed'
        processorReferenceId = plan.manualCardReference
        paymentNotes = '[card_entry_mode:manual_keyed]'
      } else {
        const { getPaymentTerminalAdapter } = await import('../terminal')
        if (!terminalAdapter) {
          terminalAdapter = getPaymentTerminalAdapter()
        }

        if (!terminalHealthChecked) {
          const terminalHealth = await terminalAdapter.healthCheck()
          if (!terminalHealth.healthy) {
            await markSaleAsCheckoutFailed({
              db: ctx.db,
              tenantId: ctx.tenantId,
              saleId: ctx.saleId,
              userId: ctx.userId,
              reason: `terminal_unhealthy:${terminalHealth.message}`,
            })
            await emitCheckoutAlert({
              tenantId: ctx.tenantId,
              eventType: 'terminal_unhealthy',
              severity: 'error',
              message: terminalHealth.message || 'Card terminal health check failed',
              dedupeKey: 'checkout_terminal_unhealthy',
              context: {
                sale_id: ctx.saleId,
                register_session_id: ctx.registerSessionId ?? null,
                idempotency_key: ctx.paymentIdempotencyKey,
              },
            })
            throw new Error(terminalHealth.message || 'Card terminal is unavailable')
          }
          terminalHealthChecked = true
        }

        const terminalResult = await terminalAdapter.beginCardPayment({
          saleId: ctx.saleId,
          amountCents: plan.amountExcludingTipCents,
          tipCents: plan.tipCents,
          currency: 'usd',
          idempotencyKey: plan.idempotencyKey,
          metadata: {
            register_session_id: ctx.registerSessionId ?? null,
          },
        })

        if (terminalResult.status !== 'captured') {
          await markSaleAsCheckoutFailed({
            db: ctx.db,
            tenantId: ctx.tenantId,
            saleId: ctx.saleId,
            userId: ctx.userId,
            reason:
              terminalResult.errorCode ??
              terminalResult.errorMessage ??
              `terminal_status_${terminalResult.status}`,
          })
          await emitCheckoutAlert({
            tenantId: ctx.tenantId,
            eventType: 'terminal_payment_failed',
            severity: terminalResult.status === 'cancelled' ? 'warning' : 'error',
            message:
              terminalResult.errorMessage ??
              `Terminal payment failed with status: ${terminalResult.status}`,
            dedupeKey:
              terminalResult.status === 'cancelled'
                ? `checkout_terminal_cancelled_${ctx.saleId}`
                : 'checkout_terminal_payment_failed',
            context: {
              sale_id: ctx.saleId,
              register_session_id: ctx.registerSessionId ?? null,
              idempotency_key: plan.idempotencyKey,
              terminal_status: terminalResult.status,
              terminal_error_code: terminalResult.errorCode ?? null,
            },
          })
          throw new Error(terminalResult.errorMessage ?? 'Card terminal payment failed')
        }

        processorType = terminalAdapter.provider
        processorReferenceId = terminalResult.providerReferenceId ?? null
        paymentNotes = `[terminal:${terminalAdapter.provider}]`
      }
    }

    const txnRef = `commerce_${plan.idempotencyKey}`

    const { data: payment, error: payErr } = await (ctx.db
      .from('commerce_payments')
      .insert({
        tenant_id: ctx.tenantId,
        sale_id: ctx.saleId,
        client_id: ctx.clientId ?? null,
        amount_cents: plan.amountExcludingTipCents,
        tip_cents: plan.tipCents,
        payment_method: plan.paymentMethod,
        status: 'captured',
        processor_type: processorType,
        processor_reference_id: processorReferenceId,
        idempotency_key: plan.idempotencyKey,
        transaction_reference: txnRef,
        captured_at: new Date().toISOString(),
        notes: paymentNotes,
        created_by: ctx.userId,
      } as any)
      .select('id')
      .single() as any)

    if (payErr || !payment) {
      const idempotentRetry = await findExistingCheckoutResult({
        db: ctx.db,
        tenantId: ctx.tenantId,
        idempotencyKey: ctx.paymentIdempotencyKey,
        paymentMethod: ctx.paymentMethod,
        amountTenderedCents: ctx.amountTenderedCents,
        splitTenders: ctx.normalizedSplitTenders,
      })
      if (idempotentRetry) {
        return { recordedPayments, idempotentResult: idempotentRetry }
      }

      await markSaleAsCheckoutFailed({
        db: ctx.db,
        tenantId: ctx.tenantId,
        saleId: ctx.saleId,
        userId: ctx.userId,
        reason: payErr?.message ?? 'payment_insert_failed',
      })
      await emitCheckoutAlert({
        tenantId: ctx.tenantId,
        eventType: 'payment_record_failed',
        severity: 'critical',
        message: `Checkout failed while recording payment: ${payErr?.message ?? 'unknown error'}`,
        dedupeKey: 'checkout_payment_record_failed',
        context: {
          sale_id: ctx.saleId,
          register_session_id: ctx.registerSessionId ?? null,
          idempotency_key: plan.idempotencyKey,
          payment_method: plan.paymentMethod,
        },
      })
      throw new Error(`Failed to record payment: ${payErr?.message ?? 'unknown error'}`)
    }

    recordedPayments.push({
      id: payment.id,
      paymentMethod: plan.paymentMethod,
      amountExcludingTipCents: plan.amountExcludingTipCents,
      tipCents: plan.tipCents,
      processorType,
      processorReferenceId,
      idempotencyKey: plan.idempotencyKey,
    })
  }

  return { recordedPayments, idempotentResult: null }
}
