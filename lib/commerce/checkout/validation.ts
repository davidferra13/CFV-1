import type { PaymentMethod } from '@/lib/ledger/append'
import { SALE_CHANNELS, type SaleChannel, type TaxClass } from '../constants'
import {
  buildCheckoutPaymentIdempotencyKey,
  CHECKOUT_IDEMPOTENCY_KEY_MAX,
} from '../checkout-idempotency'
import type { CounterCheckoutInput, NormalizedCheckoutItem } from './types'

const AGE_RESTRICTED_TAX_CLASSES = new Set<TaxClass>(['alcohol', 'cannabis'])
const MANUAL_CARD_REFERENCE_PATTERN = /^[A-Z0-9._-]{3,120}$/i
const AUTO_PROMOTION_FLAG_SET = new Set(['1', 'true', 'yes', 'on'])
const SALE_CHANNEL_SET = new Set<SaleChannel>(SALE_CHANNELS)
const MAX_SPLIT_TENDER_LINES = 6

function assertCardEntryModeInput(input: {
  paymentMethod: PaymentMethod
  cardEntryMode?: 'terminal' | 'manual_keyed'
  manualCardReference?: string
}) {
  if (input.cardEntryMode && !['terminal', 'manual_keyed'].includes(input.cardEntryMode)) {
    throw new Error('Invalid card entry mode')
  }

  if (input.cardEntryMode === 'manual_keyed') {
    if (input.paymentMethod !== 'card') {
      throw new Error('Manual keyed card mode can only be used for card payments')
    }
    const manualRef = String(input.manualCardReference ?? '').trim()
    if (!manualRef) {
      throw new Error('Manual keyed card reference is required')
    }
    if (!MANUAL_CARD_REFERENCE_PATTERN.test(manualRef)) {
      throw new Error('Manual keyed card reference format is invalid')
    }
  }
}

export function assertCounterCheckoutInput(input: CounterCheckoutInput) {
  if (input.items.length === 0) {
    throw new Error('At least one item is required')
  }

  if (!Number.isInteger(input.amountTenderedCents) || input.amountTenderedCents < 0) {
    throw new Error('Amount tendered must be a non-negative integer (cents)')
  }

  if (input.tipCents != null && (!Number.isInteger(input.tipCents) || input.tipCents < 0)) {
    throw new Error('Tip must be a non-negative integer (cents)')
  }

  if (input.idempotencyKey && input.idempotencyKey.trim().length > CHECKOUT_IDEMPOTENCY_KEY_MAX) {
    throw new Error(`Idempotency key must be <= ${CHECKOUT_IDEMPOTENCY_KEY_MAX} characters`)
  }

  if (input.items.length > 200) {
    throw new Error('Checkout has too many items (max 200)')
  }

  if (input.saleChannel && !SALE_CHANNEL_SET.has(input.saleChannel)) {
    throw new Error('Invalid sale channel')
  }

  assertCardEntryModeInput({
    paymentMethod: input.paymentMethod,
    cardEntryMode: input.cardEntryMode,
    manualCardReference: input.manualCardReference,
  })

  if (input.splitTenders && input.splitTenders.length > 0) {
    if (input.splitTenders.length < 2) {
      throw new Error('Split tender requires at least 2 payment lines')
    }
    if (input.splitTenders.length > MAX_SPLIT_TENDER_LINES) {
      throw new Error(`Split tender supports at most ${MAX_SPLIT_TENDER_LINES} lines`)
    }

    for (const line of input.splitTenders) {
      if (!Number.isInteger(line.amountCents) || line.amountCents <= 0) {
        throw new Error('Each split tender line must be a positive integer (cents)')
      }

      if (line.amountTenderedCents != null) {
        if (!Number.isInteger(line.amountTenderedCents) || line.amountTenderedCents < 0) {
          throw new Error('Split tender amount tendered must be a non-negative integer (cents)')
        }
      }

      assertCardEntryModeInput({
        paymentMethod: line.paymentMethod,
        cardEntryMode: line.cardEntryMode,
        manualCardReference: line.manualCardReference,
      })
    }
  }
}

export function hasAgeRestrictedItems(items: NormalizedCheckoutItem[]) {
  return items.some((item) => AGE_RESTRICTED_TAX_CLASSES.has(item.taxClass))
}

export function normalizePromotionCode(raw: string | undefined) {
  const code = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (!code) return null
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    throw new Error('Promotion code format is invalid')
  }
  return code
}

export function isAutoPromotionEnabled() {
  const normalized = String(process.env.POS_ENABLE_AUTO_PROMOTIONS ?? '')
    .trim()
    .toLowerCase()
  return AUTO_PROMOTION_FLAG_SET.has(normalized)
}

export function buildPaymentIdempotencyKey(tenantId: string, idempotencyKey?: string) {
  return buildCheckoutPaymentIdempotencyKey(tenantId, idempotencyKey)
}
