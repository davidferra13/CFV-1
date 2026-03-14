// Commerce Engine - Virtual Terminal Actions
// Card-not-present and phone/invoice checkout wrapper around counterCheckout.

'use server'

import type { PaymentMethod } from '@/lib/ledger/append'
import type { SaleChannel, TaxClass } from './constants'
import { TAX_CLASSES } from './constants'
import { counterCheckout } from './checkout-actions'
import { sendReceiptByEmail, sendReceiptBySms } from './receipt-actions'

export type VirtualTerminalInput = {
  description: string
  amountCents: number
  tipCents?: number
  taxClass?: TaxClass
  paymentMethod: PaymentMethod
  saleChannel?: SaleChannel
  taxZipCode?: string
  amountTenderedCents?: number
  cardEntryMode?: 'terminal' | 'manual_keyed'
  manualCardReference?: string
  promotionCode?: string
  notes?: string
  receiptEmail?: string
  receiptPhone?: string
}

export type VirtualTerminalResult = {
  saleId: string
  saleNumber: string
  paymentId: string
  totalCents: number
  changeDueCents: number
  appliedPromotion: {
    id: string
    code: string
    name: string
    discountType: string
    discountCents: number
  } | null
  receiptEmailStatus: 'sent' | 'skipped' | 'failed'
  receiptSmsStatus: 'sent' | 'skipped' | 'failed' | 'not_configured'
}

const SUPPORTED_PAYMENT_METHODS = new Set<PaymentMethod>([
  'card',
  'cash',
  'check',
  'venmo',
  'paypal',
  'zelle',
])

const VIRTUAL_TERMINAL_CHANNELS = new Set<SaleChannel>([
  'phone',
  'invoice',
  'online',
  'order_ahead',
])

const TAX_CLASS_SET = new Set<TaxClass>(TAX_CLASSES)

export async function runVirtualTerminalCharge(
  input: VirtualTerminalInput
): Promise<VirtualTerminalResult> {
  const description = String(input.description ?? '').trim()
  if (!description) {
    throw new Error('Description is required')
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Amount must be a positive integer (cents)')
  }

  const tipCents = input.tipCents ?? 0
  if (!Number.isInteger(tipCents) || tipCents < 0) {
    throw new Error('Tip must be a non-negative integer (cents)')
  }

  if (!SUPPORTED_PAYMENT_METHODS.has(input.paymentMethod)) {
    throw new Error('Unsupported payment method for virtual terminal')
  }

  const saleChannel: SaleChannel =
    input.saleChannel && VIRTUAL_TERMINAL_CHANNELS.has(input.saleChannel)
      ? input.saleChannel
      : 'phone'

  const taxClass: TaxClass =
    input.taxClass && TAX_CLASS_SET.has(input.taxClass) ? input.taxClass : 'standard'

  const amountTenderedCents =
    input.paymentMethod === 'cash'
      ? Math.max(input.amountTenderedCents ?? 0, input.amountCents + tipCents)
      : input.amountCents + tipCents

  const cardEntryMode =
    input.paymentMethod === 'card'
      ? input.cardEntryMode === 'terminal'
        ? 'terminal'
        : 'manual_keyed'
      : undefined

  const result = await counterCheckout({
    items: [
      {
        name: description,
        unitPriceCents: input.amountCents,
        quantity: 1,
        taxClass,
      },
    ],
    paymentMethod: input.paymentMethod,
    amountTenderedCents,
    tipCents,
    saleChannel,
    promotionCode: input.promotionCode,
    taxZipCode: input.taxZipCode,
    cardEntryMode,
    manualCardReference: input.manualCardReference,
    notes: input.notes?.trim() || undefined,
  })

  let receiptEmailStatus: 'sent' | 'skipped' | 'failed' = 'skipped'
  const receiptEmail = String(input.receiptEmail ?? '').trim()
  if (receiptEmail) {
    try {
      await sendReceiptByEmail({ saleId: result.saleId, toEmail: receiptEmail })
      receiptEmailStatus = 'sent'
    } catch {
      receiptEmailStatus = 'failed'
    }
  }

  let receiptSmsStatus: 'sent' | 'skipped' | 'failed' | 'not_configured' = 'skipped'
  const receiptPhone = String(input.receiptPhone ?? '').trim()
  if (receiptPhone) {
    try {
      const smsResult = await sendReceiptBySms({ saleId: result.saleId, toPhone: receiptPhone })
      receiptSmsStatus = smsResult.status
    } catch {
      receiptSmsStatus = 'failed'
    }
  }

  return {
    saleId: result.saleId,
    saleNumber: result.saleNumber,
    paymentId: result.paymentId,
    totalCents: result.totalCents,
    changeDueCents: result.changeDueCents,
    appliedPromotion: result.appliedPromotion
      ? {
          id: result.appliedPromotion.id,
          code: result.appliedPromotion.code,
          name: result.appliedPromotion.name,
          discountType: result.appliedPromotion.discountType,
          discountCents: result.appliedPromotion.discountCents,
        }
      : null,
    receiptEmailStatus,
    receiptSmsStatus,
  }
}
