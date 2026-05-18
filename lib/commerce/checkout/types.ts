import type { PaymentMethod } from '@/lib/ledger/append'
import type { SaleChannel, TaxClass } from '../constants'
import type { CheckoutModifierSelection } from '../checkout-item-normalization'
import type { PromotionDiscountType } from '../promotion-engine'

export type CheckoutItem = {
  productProjectionId?: string
  name: string
  unitPriceCents: number
  quantity: number
  taxClass?: TaxClass
  taxCents?: number
  modifiersApplied?: Array<{ name: string; option: string; price_delta_cents: number }>
  unitCostCents?: number
}

export type SplitTenderInput = {
  paymentMethod: PaymentMethod
  amountCents: number
  amountTenderedCents?: number
  cardEntryMode?: 'terminal' | 'manual_keyed'
  manualCardReference?: string
}

export type CounterCheckoutInput = {
  registerSessionId?: string
  clientId?: string
  items: CheckoutItem[]
  paymentMethod: PaymentMethod
  amountTenderedCents: number
  saleChannel?: SaleChannel
  splitTenders?: SplitTenderInput[]
  ageVerified?: boolean
  promotionCode?: string
  tipCents?: number
  idempotencyKey?: string
  taxZipCode?: string
  cardEntryMode?: 'terminal' | 'manual_keyed'
  manualCardReference?: string
  notes?: string
}

export type AppliedCheckoutPromotion = {
  id: string
  code: string
  name: string
  discountType: PromotionDiscountType
  discountCents: number
}

export type CounterCheckoutResult = {
  saleId: string
  saleNumber: string
  paymentId: string
  totalCents: number
  changeDueCents: number
  appliedPromotion: AppliedCheckoutPromotion | null
}

export type ProductProjectionCheckoutRow = {
  id: string
  name: string
  price_cents: number
  tax_class: TaxClass | string | null
  cost_cents: number | null
  is_active: boolean | null
  track_inventory: boolean | null
  available_qty: number | null
  modifiers: unknown
}

export type NormalizedCheckoutItem = {
  productProjectionId?: string
  name: string
  unitPriceCents: number
  quantity: number
  taxClass: TaxClass
  taxCents: number
  modifiersApplied: CheckoutModifierSelection[]
  unitCostCents?: number
}

export type PromotionRow = {
  id: string
  code: string
  name: string
  discount_type: PromotionDiscountType
  discount_percent: number | null
  discount_cents: number | null
  min_subtotal_cents: number | null
  max_discount_cents: number | null
  target_tax_classes: TaxClass[] | null
  is_active: boolean | null
  starts_at: string | null
  ends_at: string | null
}

export type CheckoutLineComputation = {
  key: string
  taxClass: TaxClass
  lineSubtotalCents: number
}

export type NormalizedSplitTenderLine = {
  paymentMethod: PaymentMethod
  amountCents: number
  amountTenderedCents: number
  cardEntryMode: 'terminal' | 'manual_keyed'
  manualCardReference: string | null
}

export type RecordedCheckoutPayment = {
  id: string
  paymentMethod: PaymentMethod
  amountExcludingTipCents: number
  tipCents: number
  processorType: string
  processorReferenceId: string | null
  idempotencyKey: string
}
