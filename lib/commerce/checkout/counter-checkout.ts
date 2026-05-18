'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { assertPosRoleAccess } from '../pos-authorization'
import { hasTaxableItems } from '../tax-policy'
import type { SaleChannel } from '../constants'
import type { CounterCheckoutInput, CounterCheckoutResult } from './types'
import {
  assertCounterCheckoutInput,
  buildPaymentIdempotencyKey,
  hasAgeRestrictedItems,
  normalizePromotionCode,
} from './validation'
import { normalizeSplitTenders } from './payment-calculations'
import { findExistingCheckoutResult } from './idempotency'
import { assertOpenRegisterSession, isRegisterSessionOpen } from './register'
import {
  buildCheckoutLineComputations,
  buildCheckoutSaleItemRows,
  normalizeCheckoutItems,
} from './cart'
import { recordAppliedPromotion, resolveCheckoutPromotion } from './promotions'
import {
  applyBlockingCheckoutTax,
  assertRegisterStillOpen,
  preflightCheckoutTaxService,
  resolveZipTaxRate,
} from './tax'
import {
  createPendingCheckoutSale,
  insertCheckoutSaleItems,
  updateCheckoutSaleTotals,
} from './sale'
import { markSaleAsCheckoutFailed } from './alerts'
import { recordCheckoutPayments } from './payment'
import { computeChangeDueCents, computeSplitTenderChangeDueCents } from './payment-calculations'
import {
  appendCheckoutCapturedAudit,
  finalizeCheckoutSaleStatus,
  recordCashDrawerSaleMovement,
  runCheckoutInventoryDeductions,
  syncRegisterTotalsAfterCheckout,
} from './fulfillment'

function buildSplitTenderSummary(
  normalizedSplitTenders: ReturnType<typeof normalizeSplitTenders>
): Array<Record<string, unknown>> | null {
  return normalizedSplitTenders
    ? normalizedSplitTenders.map((line, index) => ({
        index,
        payment_method: line.paymentMethod,
        amount_cents: line.amountCents,
        amount_tendered_cents: line.amountTenderedCents,
        card_entry_mode: line.paymentMethod === 'card' ? line.cardEntryMode : null,
        manual_card_reference: line.paymentMethod === 'card' ? line.manualCardReference : null,
      }))
    : null
}

async function assertTenderCanCoverCheckout(ctx: {
  db: any
  tenantId: string
  userId: string
  saleId: string
  paymentMethod: CounterCheckoutInput['paymentMethod']
  amountTenderedCents: number
  normalizedSplitTenders: ReturnType<typeof normalizeSplitTenders>
  totalDueCents: number
}) {
  if (ctx.normalizedSplitTenders) {
    const splitAllocatedCents = ctx.normalizedSplitTenders.reduce(
      (sum, line) => sum + line.amountCents,
      0
    )
    if (splitAllocatedCents !== ctx.totalDueCents) {
      await markSaleAsCheckoutFailed({
        db: ctx.db,
        tenantId: ctx.tenantId,
        saleId: ctx.saleId,
        userId: ctx.userId,
        reason: 'split_tender_total_mismatch',
      })
      throw new Error('Split tender total must equal total due')
    }
  }

  if (
    !ctx.normalizedSplitTenders &&
    ctx.paymentMethod === 'cash' &&
    ctx.amountTenderedCents < ctx.totalDueCents
  ) {
    await markSaleAsCheckoutFailed({
      db: ctx.db,
      tenantId: ctx.tenantId,
      saleId: ctx.saleId,
      userId: ctx.userId,
      reason: 'insufficient_cash_tendered',
    })
    throw new Error('Amount tendered is less than total due')
  }
}

/**
 * Atomic counter checkout - creates a sale with items and a payment
 * in one server action call. Optimized for POS speed.
 */
export async function counterCheckout(input: CounterCheckoutInput): Promise<CounterCheckoutResult> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  await assertPosRoleAccess({
    db,
    user,
    action: 'run POS checkout',
    requiredLevel: 'cashier',
  })

  assertCounterCheckoutInput(input)

  const tipCents = input.tipCents ?? 0
  const paymentIdempotencyKey = buildPaymentIdempotencyKey(user.tenantId!, input.idempotencyKey)
  const saleChannel: SaleChannel = input.saleChannel ?? 'counter'
  const cardEntryMode: 'terminal' | 'manual_keyed' =
    input.cardEntryMode === 'manual_keyed' ? 'manual_keyed' : 'terminal'
  const manualCardReference = String(input.manualCardReference ?? '').trim() || null
  const normalizedSplitTenders = normalizeSplitTenders({
    splitTenders: input.splitTenders,
    defaultCardEntryMode: cardEntryMode,
    defaultManualCardReference: manualCardReference,
  })

  const existing = await findExistingCheckoutResult({
    db,
    tenantId: user.tenantId!,
    idempotencyKey: paymentIdempotencyKey,
    paymentMethod: input.paymentMethod,
    amountTenderedCents: input.amountTenderedCents,
    splitTenders: normalizedSplitTenders,
  })
  if (existing) {
    return existing
  }

  if (input.registerSessionId) {
    await assertOpenRegisterSession({
      db,
      tenantId: user.tenantId!,
      registerSessionId: input.registerSessionId,
    })
  }

  const normalizedItems = await normalizeCheckoutItems({
    db,
    tenantId: user.tenantId!,
    items: input.items,
  })

  if (hasAgeRestrictedItems(normalizedItems) && input.ageVerified !== true) {
    throw new Error('Age verification is required for restricted items')
  }

  const hasTaxableCheckoutItems = hasTaxableItems(
    normalizedItems.map((item) => ({
      taxClass: item.taxClass,
    }))
  )

  await preflightCheckoutTaxService({
    tenantId: user.tenantId!,
    hasTaxableCheckoutItems,
    taxZipCode: input.taxZipCode,
    registerSessionId: input.registerSessionId,
  })

  const sale = await createPendingCheckoutSale({
    db,
    tenantId: user.tenantId!,
    userId: user.id,
    saleChannel,
    clientId: input.clientId,
    registerSessionId: input.registerSessionId,
    taxZipCode: input.taxZipCode,
    notes: input.notes,
    paymentMethod: input.paymentMethod,
    paymentIdempotencyKey,
  })

  const promotionCode = normalizePromotionCode(input.promotionCode)
  const lineComputations = buildCheckoutLineComputations(normalizedItems)
  const preDiscountSubtotalCents = lineComputations.reduce(
    (sum, line) => sum + line.lineSubtotalCents,
    0
  )
  const { lineDiscountsByKey, appliedPromotion } = await resolveCheckoutPromotion({
    db,
    tenantId: user.tenantId!,
    promotionCode,
    lineComputations,
    preDiscountSubtotalCents,
  })

  const zipTaxRate = await resolveZipTaxRate({
    db,
    tenantId: user.tenantId!,
    taxZipCode: input.taxZipCode,
  })
  const itemRows = buildCheckoutSaleItemRows({
    saleId: sale.id,
    tenantId: user.tenantId!,
    normalizedItems,
    lineComputations,
    lineDiscountsByKey,
    zipTaxRate,
  })

  await insertCheckoutSaleItems({
    db,
    tenantId: user.tenantId!,
    saleId: sale.id,
    userId: user.id,
    registerSessionId: input.registerSessionId,
    paymentIdempotencyKey,
    itemRows,
  })

  const discountCents = itemRows.reduce((sum, row) => sum + row.discount_cents, 0)
  const discountedSubtotalCents = itemRows.reduce((sum, row) => sum + row.line_total_cents, 0)
  const taxCents = itemRows.reduce((sum, row) => sum + row.tax_cents, 0)
  const totalCents = discountedSubtotalCents + taxCents

  await updateCheckoutSaleTotals({
    db,
    tenantId: user.tenantId!,
    saleId: sale.id,
    userId: user.id,
    registerSessionId: input.registerSessionId,
    paymentIdempotencyKey,
    preDiscountSubtotalCents,
    taxCents,
    discountCents,
    totalCents,
    tipCents,
    appliedPromotion,
  })

  if (appliedPromotion) {
    await recordAppliedPromotion({
      db,
      tenantId: user.tenantId!,
      saleId: sale.id,
      promotion: appliedPromotion,
    })
  }

  const finalTotalCents = await applyBlockingCheckoutTax({
    db,
    tenantId: user.tenantId!,
    userId: user.id,
    saleId: sale.id,
    discountedSubtotalCents,
    totalCents,
    hasTaxableCheckoutItems,
    inputNotes: input.notes,
    registerSessionId: input.registerSessionId,
    paymentIdempotencyKey,
  })

  await assertRegisterStillOpen({
    db,
    tenantId: user.tenantId!,
    userId: user.id,
    saleId: sale.id,
    registerSessionId: input.registerSessionId,
    paymentIdempotencyKey,
    isOpen: isRegisterSessionOpen,
  })

  const totalDueCents = finalTotalCents + tipCents
  await assertTenderCanCoverCheckout({
    db,
    tenantId: user.tenantId!,
    userId: user.id,
    saleId: sale.id,
    paymentMethod: input.paymentMethod,
    amountTenderedCents: input.amountTenderedCents,
    normalizedSplitTenders,
    totalDueCents,
  })

  const paymentResult = await recordCheckoutPayments({
    db,
    tenantId: user.tenantId!,
    userId: user.id,
    saleId: sale.id,
    clientId: input.clientId,
    registerSessionId: input.registerSessionId,
    paymentIdempotencyKey,
    paymentMethod: input.paymentMethod,
    amountTenderedCents: input.amountTenderedCents,
    cardEntryMode,
    manualCardReference,
    finalTotalCents,
    tipCents,
    totalDueCents,
    normalizedSplitTenders,
  })
  if (paymentResult.idempotentResult) {
    return paymentResult.idempotentResult
  }

  const primaryPayment = paymentResult.recordedPayments[0]
  if (!primaryPayment) {
    await markSaleAsCheckoutFailed({
      db,
      tenantId: user.tenantId!,
      saleId: sale.id,
      userId: user.id,
      reason: 'payment_record_missing',
    })
    throw new Error('Checkout failed because no payment record was created')
  }

  const totalTenderedCents = normalizedSplitTenders
    ? normalizedSplitTenders.reduce((sum, line) => sum + line.amountTenderedCents, 0)
    : input.amountTenderedCents
  const changeDueCents = normalizedSplitTenders
    ? computeSplitTenderChangeDueCents({
        splitTenders: normalizedSplitTenders,
        totalChargedCents: totalDueCents,
      })
    : computeChangeDueCents({
        paymentMethod: input.paymentMethod,
        amountTenderedCents: input.amountTenderedCents,
        totalChargedCents: totalDueCents,
      })
  const splitTenderSummary = buildSplitTenderSummary(normalizedSplitTenders)

  await finalizeCheckoutSaleStatus({
    db,
    tenantId: user.tenantId!,
    saleId: sale.id,
    primaryPaymentId: primaryPayment.id,
    registerSessionId: input.registerSessionId,
    paymentIdempotencyKey,
  })

  await recordCashDrawerSaleMovement({
    db,
    tenantId: user.tenantId!,
    userId: user.id,
    saleId: sale.id,
    primaryPaymentId: primaryPayment.id,
    registerSessionId: input.registerSessionId,
    paymentIdempotencyKey,
    paymentMethod: input.paymentMethod,
    normalizedSplitTenders,
    totalDueCents,
    totalTenderedCents,
    changeDueCents,
  })

  await syncRegisterTotalsAfterCheckout({
    db,
    tenantId: user.tenantId!,
    saleId: sale.id,
    primaryPaymentId: primaryPayment.id,
    registerSessionId: input.registerSessionId,
  })

  await runCheckoutInventoryDeductions(sale.id)

  await appendCheckoutCapturedAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    saleId: sale.id,
    saleNumber: (sale as any).sale_number,
    primaryPayment,
    paymentMethod: input.paymentMethod,
    recordedPayments: paymentResult.recordedPayments,
    normalizedSplitTenders,
    cardEntryMode,
    saleChannel,
    splitTenderSummary,
    totalDueCents,
    totalTenderedCents,
    changeDueCents,
    tipCents,
    registerSessionId: input.registerSessionId,
  })

  revalidatePath('/commerce')

  return {
    saleId: sale.id,
    saleNumber: (sale as any).sale_number,
    paymentId: primaryPayment.id,
    totalCents: totalDueCents,
    changeDueCents,
    appliedPromotion,
  }
}
