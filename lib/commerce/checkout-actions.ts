// Commerce Engine V1 - Checkout Actions
// Atomic counter checkout: creates sale + items + payment in one call.
// Used by the POS register for fast counter transactions.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod } from '@/lib/ledger/append'
import { SALE_CHANNELS, type SaleChannel, type TaxClass } from './constants'
import { computeRegisterSessionTotals } from './register-metrics'
import {
  buildCheckoutPaymentIdempotencyKey,
  CHECKOUT_IDEMPOTENCY_KEY_MAX,
} from './checkout-idempotency'
import { hasTaxableItems } from './tax-policy'
import { appendPosAuditLog } from './pos-audit-log'
import {
  normalizeTaxClass,
  resolveCatalogModifierSelections,
  sanitizeManualModifierSelections,
  type CheckoutModifierSelection,
} from './checkout-item-normalization'
import {
  evaluatePromotionForLines,
  type PromotionDiscountType,
  type PromotionRule,
} from './promotion-engine'
import { assertPosRoleAccess } from './pos-authorization'
import { recordPosAlert } from './observability-actions'
import type { PosAlertSeverity } from './observability-core'

// ─── Types ────────────────────────────────────────────────────────

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

type ExistingCheckoutResult = {
  saleId: string
  saleNumber: string
  paymentId: string
  totalCents: number
  changeDueCents: number
  appliedPromotion: AppliedCheckoutPromotion | null
}

type ProductProjectionCheckoutRow = {
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

type NormalizedCheckoutItem = {
  productProjectionId?: string
  name: string
  unitPriceCents: number
  quantity: number
  taxClass: TaxClass
  taxCents: number
  modifiersApplied: CheckoutModifierSelection[]
  unitCostCents?: number
}

const AGE_RESTRICTED_TAX_CLASSES = new Set<TaxClass>(['alcohol', 'cannabis'])
const PROMOTION_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/
const MANUAL_CARD_REFERENCE_PATTERN = /^[A-Z0-9._-]{3,120}$/i
const AUTO_PROMOTION_FLAG_SET = new Set(['1', 'true', 'yes', 'on'])
const SALE_CHANNEL_SET = new Set<SaleChannel>(SALE_CHANNELS)
const MAX_SPLIT_TENDER_LINES = 6
const FINALIZED_PAYMENT_STATUS_SET = new Set(['captured', 'settled', 'authorized'])

type PromotionRow = {
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

type CheckoutLineComputation = {
  key: string
  taxClass: TaxClass
  lineSubtotalCents: number
}

type NormalizedSplitTenderLine = {
  paymentMethod: PaymentMethod
  amountCents: number
  amountTenderedCents: number
  cardEntryMode: 'terminal' | 'manual_keyed'
  manualCardReference: string | null
}

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

function assertCounterCheckoutInput(input: CounterCheckoutInput) {
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

  // Defensive cap for abuse protection and DB payload size.
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

function computeChangeDueCents(input: {
  paymentMethod: PaymentMethod
  amountTenderedCents: number
  totalChargedCents: number
}) {
  return input.paymentMethod === 'cash'
    ? Math.max(0, input.amountTenderedCents - input.totalChargedCents)
    : 0
}

function computeSplitTenderChangeDueCents(input: {
  splitTenders: NormalizedSplitTenderLine[]
  totalChargedCents: number
}) {
  const totalTenderedCents = input.splitTenders.reduce(
    (sum, line) => sum + line.amountTenderedCents,
    0
  )
  return Math.max(0, totalTenderedCents - input.totalChargedCents)
}

function computeCashDrawerSaleMovementCents(input: {
  paymentMethod: PaymentMethod
  splitTenders: NormalizedSplitTenderLine[] | null
  totalChargedCents: number
}) {
  if (input.splitTenders) {
    return input.splitTenders.reduce(
      (sum, line) => sum + (line.paymentMethod === 'cash' ? line.amountCents : 0),
      0
    )
  }

  if (input.paymentMethod === 'cash') {
    return input.totalChargedCents
  }

  return 0
}

function normalizeSplitTenders(input: {
  splitTenders?: SplitTenderInput[]
  defaultCardEntryMode: 'terminal' | 'manual_keyed'
  defaultManualCardReference: string | null
}): NormalizedSplitTenderLine[] | null {
  if (!input.splitTenders || input.splitTenders.length === 0) return null

  return input.splitTenders.map((line) => {
    const paymentMethod = line.paymentMethod
    const amountCents = line.amountCents
    const amountTenderedCents =
      paymentMethod === 'cash'
        ? Math.max(line.amountTenderedCents ?? amountCents, amountCents)
        : amountCents

    let cardEntryMode: 'terminal' | 'manual_keyed' = 'terminal'
    let manualCardReference: string | null = null

    if (paymentMethod === 'card') {
      cardEntryMode = line.cardEntryMode ?? input.defaultCardEntryMode
      manualCardReference =
        String(line.manualCardReference ?? '').trim() ||
        (cardEntryMode === 'manual_keyed' ? input.defaultManualCardReference : null)
    }

    return {
      paymentMethod,
      amountCents,
      amountTenderedCents,
      cardEntryMode,
      manualCardReference,
    }
  })
}

function allocateTipAcrossSplitTenders(input: {
  splitTenders: NormalizedSplitTenderLine[]
  tipCents: number
  totalChargedCents: number
}): number[] {
  const { splitTenders, tipCents, totalChargedCents } = input
  if (tipCents <= 0 || totalChargedCents <= 0) {
    return splitTenders.map(() => 0)
  }

  const allocations = splitTenders.map((line) =>
    Math.min(line.amountCents, Math.floor((line.amountCents * tipCents) / totalChargedCents))
  )

  let remaining = tipCents - allocations.reduce((sum, value) => sum + value, 0)
  for (let i = 0; i < splitTenders.length && remaining > 0; i += 1) {
    if (allocations[i] >= splitTenders[i].amountCents) continue
    allocations[i] += 1
    remaining -= 1
    if (i === splitTenders.length - 1 && remaining > 0) {
      i = -1
    }
  }

  return allocations
}

function hasAgeRestrictedItems(items: NormalizedCheckoutItem[]) {
  return items.some((item) => AGE_RESTRICTED_TAX_CLASSES.has(item.taxClass))
}

function normalizePromotionCode(raw: string | undefined) {
  const code = String(raw ?? '')
    .trim()
    .toUpperCase()
  if (!code) return null
  if (!PROMOTION_CODE_PATTERN.test(code)) {
    throw new Error('Promotion code format is invalid')
  }
  return code
}

function isAutoPromotionEnabled() {
  const normalized = String(process.env.POS_ENABLE_AUTO_PROMOTIONS ?? '')
    .trim()
    .toLowerCase()
  return AUTO_PROMOTION_FLAG_SET.has(normalized)
}

async function emitCheckoutAlert(alert: {
  tenantId: string
  eventType: string
  severity: PosAlertSeverity
  message: string
  dedupeKey?: string
  context?: Record<string, unknown>
}) {
  try {
    await recordPosAlert({
      tenantId: alert.tenantId,
      source: 'checkout',
      eventType: alert.eventType,
      severity: alert.severity,
      message: alert.message,
      dedupeKey: alert.dedupeKey,
      context: alert.context ?? {},
    })
  } catch (error) {
    console.error('[non-blocking] Failed to emit checkout alert:', error)
  }
}

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

async function recordAppliedPromotion(ctx: {
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

async function loadCheckoutProductsById(ctx: { db: any; tenantId: string; items: CheckoutItem[] }) {
  const productIds = Array.from(
    new Set(
      ctx.items
        .map((item) => String(item.productProjectionId ?? '').trim())
        .filter((id) => id.length > 0)
    )
  )

  const map = new Map<string, ProductProjectionCheckoutRow>()
  if (productIds.length === 0) return map

  const { data: rows } = await (ctx.db
    .from('product_projections')
    .select(
      'id, name, price_cents, tax_class, cost_cents, is_active, track_inventory, available_qty, modifiers'
    )
    .eq('tenant_id', ctx.tenantId)
    .in('id', productIds) as any)

  for (const row of rows ?? []) {
    map.set(String((row as any).id), row as ProductProjectionCheckoutRow)
  }

  for (const productId of productIds) {
    if (!map.has(productId)) {
      throw new Error('One or more products are no longer available for checkout')
    }
  }

  return map
}

async function normalizeCheckoutItems(ctx: {
  db: any
  tenantId: string
  items: CheckoutItem[]
}): Promise<NormalizedCheckoutItem[]> {
  const productsById = await loadCheckoutProductsById(ctx)
  const normalized: NormalizedCheckoutItem[] = []

  for (const rawItem of ctx.items) {
    const productId = String(rawItem.productProjectionId ?? '').trim() || null
    const quantity = Number(rawItem.quantity)
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new Error(`Invalid quantity for "${rawItem.name}"`)
    }

    if (productId) {
      const product = productsById.get(productId)
      if (!product || !product.is_active) {
        throw new Error(`Product is inactive or unavailable for checkout`)
      }

      if (
        product.track_inventory &&
        product.available_qty != null &&
        quantity > product.available_qty
      ) {
        throw new Error(`Insufficient stock for "${product.name}"`)
      }

      normalized.push({
        productProjectionId: product.id,
        name: product.name,
        unitPriceCents: product.price_cents,
        quantity,
        taxClass: normalizeTaxClass(product.tax_class),
        taxCents: 0,
        modifiersApplied: resolveCatalogModifierSelections({
          productName: product.name,
          catalogModifiers: product.modifiers,
          selections: rawItem.modifiersApplied,
        }),
        unitCostCents: product.cost_cents ?? undefined,
      })
      continue
    }

    const name = String(rawItem.name ?? '').trim()
    if (!name) {
      throw new Error('Checkout item name is required')
    }
    const unitPriceCents = Number(rawItem.unitPriceCents)
    if (!Number.isInteger(unitPriceCents) || unitPriceCents < 0) {
      throw new Error(`Invalid price for "${name}"`)
    }

    const taxCentsRaw = rawItem.taxCents ?? 0
    if (!Number.isInteger(taxCentsRaw) || taxCentsRaw < 0) {
      throw new Error(`Invalid tax amount for "${name}"`)
    }

    let unitCostCents: number | undefined = undefined
    if (rawItem.unitCostCents != null) {
      const parsedUnitCost = Number(rawItem.unitCostCents)
      if (!Number.isInteger(parsedUnitCost) || parsedUnitCost < 0) {
        throw new Error(`Invalid cost for "${name}"`)
      }
      unitCostCents = parsedUnitCost
    }

    normalized.push({
      name,
      unitPriceCents,
      quantity,
      taxClass: normalizeTaxClass(rawItem.taxClass ?? 'standard'),
      taxCents: taxCentsRaw,
      modifiersApplied: sanitizeManualModifierSelections(rawItem.modifiersApplied),
      unitCostCents,
    })
  }

  return normalized
}

async function findExistingCheckoutResult(ctx: {
  db: any
  tenantId: string
  idempotencyKey: string
  paymentMethod: PaymentMethod
  amountTenderedCents: number
  splitTenders: NormalizedSplitTenderLine[] | null
}): Promise<ExistingCheckoutResult | null> {
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

async function markSaleAsCheckoutFailed(ctx: {
  db: any
  tenantId: string
  saleId: string
  userId: string
  reason: string
}) {
  try {
    await (ctx.db
      .from('sales' as any)
      .update({
        status: 'voided',
        void_reason: 'checkout_failed',
        voided_at: new Date().toISOString(),
        voided_by: ctx.userId,
        notes: `[checkout_failed] ${ctx.reason}`,
      } as any)
      .eq('id', ctx.saleId)
      .eq('tenant_id', ctx.tenantId) as any)
  } catch (err) {
    console.error('[checkout] failed to mark sale as checkout_failed:', err)
  }
}

async function assertOpenRegisterSession(ctx: {
  db: any
  tenantId: string
  registerSessionId: string
}) {
  const { data: session, error } = await (ctx.db
    .from('register_sessions' as any)
    .select('id, status')
    .eq('id', ctx.registerSessionId)
    .eq('tenant_id', ctx.tenantId)
    .single() as any)

  if (error || !session) {
    throw new Error('Register session not found')
  }

  if ((session as any).status !== 'open') {
    throw new Error('Register session is not open')
  }
}

async function isRegisterSessionOpen(ctx: {
  db: any
  tenantId: string
  registerSessionId: string
}): Promise<boolean> {
  const { data: session, error } = await (ctx.db
    .from('register_sessions' as any)
    .select('status')
    .eq('id', ctx.registerSessionId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle() as any)

  if (error || !session) return false
  return String((session as any).status ?? '') === 'open'
}

async function syncRegisterSessionTotals(ctx: {
  db: any
  tenantId: string
  registerSessionId: string
}) {
  const { data: sales } = await (ctx.db
    .from('sales' as any)
    .select('id, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('register_session_id', ctx.registerSessionId) as any)

  const saleIds = (sales ?? []).map((sale: any) => sale.id).filter(Boolean)

  let payments: any[] = []
  if (saleIds.length > 0) {
    const { data } = await (ctx.db
      .from('commerce_payments' as any)
      .select('sale_id, amount_cents, tip_cents, status')
      .eq('tenant_id', ctx.tenantId)
      .in('sale_id', saleIds) as any)
    payments = data ?? []
  }

  const totals = computeRegisterSessionTotals({
    sales: sales ?? [],
    payments,
  })

  await (ctx.db
    .from('register_sessions' as any)
    .update({
      total_sales_count: totals.totalSalesCount,
      total_revenue_cents: totals.totalRevenueCents,
      total_tips_cents: totals.totalTipsCents,
    } as any)
    .eq('id', ctx.registerSessionId)
    .eq('tenant_id', ctx.tenantId) as any)
}

// ─── Counter Checkout ────────────────────────────────────────────

/**
 * Atomic counter checkout - creates a sale with items and a payment
 * in one server action call. Optimized for POS speed.
 *
 * Steps:
 * 1. Create sale (pending_payment)
 * 2. Insert all items
 * 3. Compute totals
 * 4. Apply tax (when configured)
 * 5. Record payment (status: captured)
 * 6. Update sale status to captured
 * 7. Sync register counters (if linked)
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
  const paymentIdempotencyKey = buildCheckoutPaymentIdempotencyKey(
    user.tenantId!,
    input.idempotencyKey
  )
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

  if (hasTaxableCheckoutItems) {
    if (!input.taxZipCode?.trim()) {
      throw new Error('Tax ZIP code is required for taxable items before checkout')
    }

    try {
      const { calculateSalesTax } = await import('@/lib/tax/api-ninjas')
      const probe = await calculateSalesTax(100, input.taxZipCode)
      if (!probe) {
        throw new Error('tax_service_unavailable')
      }
    } catch {
      await emitCheckoutAlert({
        tenantId: user.tenantId!,
        eventType: 'tax_service_preflight_failed',
        severity: 'error',
        message: 'Tax service unavailable during checkout preflight',
        dedupeKey: 'checkout_tax_service_preflight_failed',
        context: {
          register_session_id: input.registerSessionId ?? null,
          tax_zip_code: input.taxZipCode,
        },
      })
      throw new Error('Tax service unavailable. Unable to calculate sales tax right now')
    }
  }

  // 1. Create sale
  const { data: sale, error: saleErr } = await (db
    .from('sales')
    .insert({
      tenant_id: user.tenantId!,
      channel: saleChannel,
      client_id: input.clientId ?? null,
      register_session_id: input.registerSessionId ?? null,
      tax_zip_code: input.taxZipCode ?? null,
      notes: input.notes ?? null,
      status: 'pending_payment',
      created_by: user.id,
    } as any)
    .select('id, sale_number')
    .single() as any)

  if (saleErr || !sale) {
    await emitCheckoutAlert({
      tenantId: user.tenantId!,
      eventType: 'sale_create_failed',
      severity: 'critical',
      message: `Checkout failed while creating sale: ${saleErr?.message ?? 'unknown error'}`,
      dedupeKey: 'checkout_sale_create_failed',
      context: {
        register_session_id: input.registerSessionId ?? null,
        payment_method: input.paymentMethod,
        idempotency_key: paymentIdempotencyKey,
      },
    })
    throw new Error(`Failed to create sale: ${saleErr?.message}`)
  }

  // 2. Apply optional promotion and build sale item rows.
  const promotionCode = normalizePromotionCode(input.promotionCode)
  const lineComputations: CheckoutLineComputation[] = normalizedItems.map((item, i) => {
    const modifierTotal = (item.modifiersApplied ?? []).reduce(
      (sum, modifier) => sum + modifier.price_delta_cents * item.quantity,
      0
    )
    return {
      key: `line_${i}`,
      taxClass: item.taxClass,
      lineSubtotalCents: item.unitPriceCents * item.quantity + modifierTotal,
    }
  })

  const preDiscountSubtotalCents = lineComputations.reduce(
    (sum, line) => sum + line.lineSubtotalCents,
    0
  )

  let lineDiscountsByKey: Record<string, number> = {}
  let appliedPromotion: AppliedCheckoutPromotion | null = null

  if (promotionCode) {
    const promotion = await loadPromotionByCode({
      db,
      tenantId: user.tenantId!,
      code: promotionCode,
    })
    const evaluation = evaluatePromotionForLines({
      promotion,
      lines: lineComputations.map((line) => ({
        id: line.key,
        taxClass: line.taxClass,
        lineSubtotalCents: line.lineSubtotalCents,
      })),
      orderSubtotalCents: preDiscountSubtotalCents,
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
      db,
      tenantId: user.tenantId!,
    })

    let best: {
      promotion: PromotionRule
      totalDiscountCents: number
      lineDiscounts: Record<string, number>
    } | null = null

    for (const promotion of autoPromotions) {
      const evaluation = evaluatePromotionForLines({
        promotion,
        lines: lineComputations.map((line) => ({
          id: line.key,
          taxClass: line.taxClass,
          lineSubtotalCents: line.lineSubtotalCents,
        })),
        orderSubtotalCents: preDiscountSubtotalCents,
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

  const itemRows = normalizedItems.map((item, i) => {
    const line = lineComputations[i]
    const discountCents = Math.max(
      0,
      Math.min(line.lineSubtotalCents, lineDiscountsByKey[line.key] ?? 0)
    )
    const lineTotalCents = line.lineSubtotalCents - discountCents

    return {
      sale_id: sale.id,
      tenant_id: user.tenantId!,
      product_projection_id: item.productProjectionId ?? null,
      name: item.name,
      unit_price_cents: item.unitPriceCents,
      quantity: item.quantity,
      discount_cents: discountCents,
      line_total_cents: lineTotalCents,
      tax_class: item.taxClass ?? 'standard',
      tax_cents: item.taxCents ?? 0,
      modifiers_applied: item.modifiersApplied ?? [],
      unit_cost_cents: item.unitCostCents ?? null,
      sort_order: i,
    }
  })

  const { error: itemsErr } = await (db.from('sale_items').insert(itemRows as any) as any)

  if (itemsErr) {
    await markSaleAsCheckoutFailed({
      db,
      tenantId: user.tenantId!,
      saleId: sale.id,
      userId: user.id,
      reason: `sale_items_insert_failed:${itemsErr.message}`,
    })
    await emitCheckoutAlert({
      tenantId: user.tenantId!,
      eventType: 'sale_items_insert_failed',
      severity: 'critical',
      message: `Checkout failed while inserting sale items: ${itemsErr.message}`,
      dedupeKey: 'checkout_sale_items_insert_failed',
      context: {
        sale_id: sale.id,
        register_session_id: input.registerSessionId ?? null,
        idempotency_key: paymentIdempotencyKey,
      },
    })
    throw new Error(`Failed to add items: ${itemsErr.message}`)
  }

  // 3. Compute totals
  const discountCents = itemRows.reduce((sum, row) => sum + row.discount_cents, 0)
  const discountedSubtotalCents = itemRows.reduce((sum, row) => sum + row.line_total_cents, 0)
  const taxCents = itemRows.reduce((sum, r) => sum + r.tax_cents, 0)
  const totalCents = discountedSubtotalCents + taxCents

  const { error: totalsErr } = await (db
    .from('sales')
    .update({
      subtotal_cents: preDiscountSubtotalCents,
      tax_cents: taxCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      tip_cents: tipCents,
      metadata: appliedPromotion
        ? {
            checkout_promotion: {
              code: appliedPromotion.code,
              name: appliedPromotion.name,
              discount_cents: appliedPromotion.discountCents,
              discount_type: appliedPromotion.discountType,
            },
          }
        : {},
    } as any)
    .eq('id', sale.id)
    .eq('tenant_id', user.tenantId!) as any)

  if (totalsErr) {
    await markSaleAsCheckoutFailed({
      db,
      tenantId: user.tenantId!,
      saleId: sale.id,
      userId: user.id,
      reason: `sale_totals_update_failed:${totalsErr.message}`,
    })
    await emitCheckoutAlert({
      tenantId: user.tenantId!,
      eventType: 'sale_totals_update_failed',
      severity: 'critical',
      message: `Checkout failed while updating sale totals: ${totalsErr.message}`,
      dedupeKey: 'checkout_sale_totals_update_failed',
      context: {
        sale_id: sale.id,
        register_session_id: input.registerSessionId ?? null,
        idempotency_key: paymentIdempotencyKey,
      },
    })
    throw new Error(`Failed to update sale totals: ${totalsErr.message}`)
  }

  if (appliedPromotion) {
    await recordAppliedPromotion({
      db,
      tenantId: user.tenantId!,
      saleId: sale.id,
      promotion: appliedPromotion,
    })
  }

  // 4. Tax computation (blocking for taxable items)
  let finalTotalCents = totalCents
  if (hasTaxableCheckoutItems) {
    try {
      const { applySaleTax } = await import('./tax-actions')
      const taxResult = await applySaleTax(sale.id)
      if (!taxResult) {
        throw new Error('tax_service_unavailable')
      }
      finalTotalCents = discountedSubtotalCents + taxResult.totalTaxCents
    } catch {
      // Prevent accidental charge when tax is required but unavailable.
      await (db
        .from('sales')
        .update({
          status: 'voided',
          notes:
            (input.notes ? `${input.notes}\n` : '') +
            'auto-voided: tax calculation failed during checkout',
        } as any)
        .eq('id', sale.id)
        .eq('tenant_id', user.tenantId!) as any)

      await appendPosAuditLog({
        tenantId: user.tenantId!,
        action: 'sale_auto_voided_tax_failure',
        tableName: 'sales',
        recordId: sale.id,
        changedBy: user.id,
        summary: 'Sale auto-voided because tax calculation failed',
        afterValues: {
          status: 'voided',
          reason: 'tax_calculation_failed',
        },
      })

      await emitCheckoutAlert({
        tenantId: user.tenantId!,
        eventType: 'tax_calculation_failed',
        severity: 'critical',
        message: 'Sale was auto-voided because tax calculation failed during checkout',
        dedupeKey: 'checkout_tax_calculation_failed',
        context: {
          sale_id: sale.id,
          register_session_id: input.registerSessionId ?? null,
          idempotency_key: paymentIdempotencyKey,
        },
      })

      throw new Error('Tax service unavailable. Unable to calculate sales tax right now')
    }
  }

  if (input.registerSessionId) {
    const registerStillOpen = await isRegisterSessionOpen({
      db,
      tenantId: user.tenantId!,
      registerSessionId: input.registerSessionId,
    })
    if (!registerStillOpen) {
      await markSaleAsCheckoutFailed({
        db,
        tenantId: user.tenantId!,
        saleId: sale.id,
        userId: user.id,
        reason: 'register_closed_mid_checkout',
      })
      await emitCheckoutAlert({
        tenantId: user.tenantId!,
        eventType: 'register_closed_mid_checkout',
        severity: 'error',
        message: 'Register was closed while checkout was still in progress',
        dedupeKey: `checkout_register_closed_mid_checkout_${input.registerSessionId}`,
        context: {
          sale_id: sale.id,
          register_session_id: input.registerSessionId,
          idempotency_key: paymentIdempotencyKey,
        },
      })
      throw new Error('Register session is no longer open. Refresh and reopen the register.')
    }
  }

  const totalDueCents = finalTotalCents + tipCents

  if (normalizedSplitTenders) {
    const splitAllocatedCents = normalizedSplitTenders.reduce(
      (sum, line) => sum + line.amountCents,
      0
    )
    if (splitAllocatedCents !== totalDueCents) {
      await markSaleAsCheckoutFailed({
        db,
        tenantId: user.tenantId!,
        saleId: sale.id,
        userId: user.id,
        reason: 'split_tender_total_mismatch',
      })
      throw new Error('Split tender total must equal total due')
    }
  }

  if (
    !normalizedSplitTenders &&
    input.paymentMethod === 'cash' &&
    input.amountTenderedCents < totalDueCents
  ) {
    await markSaleAsCheckoutFailed({
      db,
      tenantId: user.tenantId!,
      saleId: sale.id,
      userId: user.id,
      reason: 'insufficient_cash_tendered',
    })
    throw new Error('Amount tendered is less than total due')
  }

  // 5. Record payment(s) (captured immediately)
  const splitTipAllocations = normalizedSplitTenders
    ? allocateTipAcrossSplitTenders({
        splitTenders: normalizedSplitTenders,
        tipCents,
        totalChargedCents: totalDueCents,
      })
    : null

  const paymentPlans = normalizedSplitTenders
    ? normalizedSplitTenders.map((line, index) => {
        const tipAllocation = splitTipAllocations?.[index] ?? 0
        return {
          paymentMethod: line.paymentMethod,
          amountExcludingTipCents: Math.max(0, line.amountCents - tipAllocation),
          tipCents: tipAllocation,
          amountTenderedCents: line.amountTenderedCents,
          cardEntryMode: line.cardEntryMode,
          manualCardReference: line.manualCardReference,
          idempotencyKey:
            index === normalizedSplitTenders.length - 1
              ? paymentIdempotencyKey
              : `${paymentIdempotencyKey}__${index}`,
        }
      })
    : [
        {
          paymentMethod: input.paymentMethod,
          amountExcludingTipCents: finalTotalCents,
          tipCents,
          amountTenderedCents: input.amountTenderedCents,
          cardEntryMode,
          manualCardReference: manualCardReference,
          idempotencyKey: paymentIdempotencyKey,
        },
      ]

  const recordedPayments: Array<{
    id: string
    paymentMethod: PaymentMethod
    amountExcludingTipCents: number
    tipCents: number
    processorType: string
    processorReferenceId: string | null
    idempotencyKey: string
  }> = []

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
            db,
            tenantId: user.tenantId!,
            saleId: sale.id,
            userId: user.id,
            reason: 'manual_keyed_reference_missing',
          })
          throw new Error('Manual keyed card reference is required')
        }

        processorType = 'manual_keyed'
        processorReferenceId = plan.manualCardReference
        paymentNotes = '[card_entry_mode:manual_keyed]'
      } else {
        const { getPaymentTerminalAdapter } = await import('./terminal')
        if (!terminalAdapter) {
          terminalAdapter = getPaymentTerminalAdapter()
        }

        if (!terminalHealthChecked) {
          const terminalHealth = await terminalAdapter.healthCheck()
          if (!terminalHealth.healthy) {
            await markSaleAsCheckoutFailed({
              db,
              tenantId: user.tenantId!,
              saleId: sale.id,
              userId: user.id,
              reason: `terminal_unhealthy:${terminalHealth.message}`,
            })
            await emitCheckoutAlert({
              tenantId: user.tenantId!,
              eventType: 'terminal_unhealthy',
              severity: 'error',
              message: terminalHealth.message || 'Card terminal health check failed',
              dedupeKey: 'checkout_terminal_unhealthy',
              context: {
                sale_id: sale.id,
                register_session_id: input.registerSessionId ?? null,
                idempotency_key: paymentIdempotencyKey,
              },
            })
            throw new Error(terminalHealth.message || 'Card terminal is unavailable')
          }
          terminalHealthChecked = true
        }

        const terminalResult = await terminalAdapter.beginCardPayment({
          saleId: sale.id,
          amountCents: plan.amountExcludingTipCents,
          tipCents: plan.tipCents,
          currency: 'usd',
          idempotencyKey: plan.idempotencyKey,
          metadata: {
            register_session_id: input.registerSessionId ?? null,
          },
        })

        if (terminalResult.status !== 'captured') {
          await markSaleAsCheckoutFailed({
            db,
            tenantId: user.tenantId!,
            saleId: sale.id,
            userId: user.id,
            reason:
              terminalResult.errorCode ??
              terminalResult.errorMessage ??
              `terminal_status_${terminalResult.status}`,
          })
          await emitCheckoutAlert({
            tenantId: user.tenantId!,
            eventType: 'terminal_payment_failed',
            severity: terminalResult.status === 'cancelled' ? 'warning' : 'error',
            message:
              terminalResult.errorMessage ??
              `Terminal payment failed with status: ${terminalResult.status}`,
            dedupeKey:
              terminalResult.status === 'cancelled'
                ? `checkout_terminal_cancelled_${sale.id}`
                : 'checkout_terminal_payment_failed',
            context: {
              sale_id: sale.id,
              register_session_id: input.registerSessionId ?? null,
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

    const { data: payment, error: payErr } = await (db
      .from('commerce_payments')
      .insert({
        tenant_id: user.tenantId!,
        sale_id: sale.id,
        client_id: input.clientId ?? null,
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
        created_by: user.id,
      } as any)
      .select('id')
      .single() as any)

    if (payErr || !payment) {
      const idempotentRetry = await findExistingCheckoutResult({
        db,
        tenantId: user.tenantId!,
        idempotencyKey: paymentIdempotencyKey,
        paymentMethod: input.paymentMethod,
        amountTenderedCents: input.amountTenderedCents,
        splitTenders: normalizedSplitTenders,
      })
      if (idempotentRetry) {
        return idempotentRetry
      }

      await markSaleAsCheckoutFailed({
        db,
        tenantId: user.tenantId!,
        saleId: sale.id,
        userId: user.id,
        reason: payErr?.message ?? 'payment_insert_failed',
      })
      await emitCheckoutAlert({
        tenantId: user.tenantId!,
        eventType: 'payment_record_failed',
        severity: 'critical',
        message: `Checkout failed while recording payment: ${payErr?.message ?? 'unknown error'}`,
        dedupeKey: 'checkout_payment_record_failed',
        context: {
          sale_id: sale.id,
          register_session_id: input.registerSessionId ?? null,
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

  const primaryPayment = recordedPayments[0]
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
  const processorTypes = Array.from(new Set(recordedPayments.map((line) => line.processorType)))
  const splitTenderSummary = normalizedSplitTenders
    ? normalizedSplitTenders.map((line, index) => ({
        index,
        payment_method: line.paymentMethod,
        amount_cents: line.amountCents,
        amount_tendered_cents: line.amountTenderedCents,
        card_entry_mode: line.paymentMethod === 'card' ? line.cardEntryMode : null,
        manual_card_reference: line.paymentMethod === 'card' ? line.manualCardReference : null,
      }))
    : null

  // 6. Update sale status to captured
  const { error: saleStatusErr } = await (db
    .from('sales')
    .update({ status: 'captured' } as any)
    .eq('id', sale.id)
    .eq('tenant_id', user.tenantId!) as any)
  if (saleStatusErr) {
    await emitCheckoutAlert({
      tenantId: user.tenantId!,
      eventType: 'sale_status_finalize_failed',
      severity: 'critical',
      message: `Payment captured but failed to finalize sale status: ${saleStatusErr.message}`,
      dedupeKey: 'checkout_sale_status_finalize_failed',
      context: {
        sale_id: sale.id,
        payment_id: primaryPayment.id,
        register_session_id: input.registerSessionId ?? null,
        idempotency_key: paymentIdempotencyKey,
      },
    })
    throw new Error(`Failed to finalize sale status: ${saleStatusErr.message}`)
  }

  const cashDrawerSaleMovementCents = computeCashDrawerSaleMovementCents({
    paymentMethod: input.paymentMethod,
    splitTenders: normalizedSplitTenders,
    totalChargedCents: totalDueCents,
  })

  if (input.registerSessionId && cashDrawerSaleMovementCents > 0) {
    try {
      await (db.from('cash_drawer_movements').insert({
        tenant_id: user.tenantId!,
        register_session_id: input.registerSessionId,
        movement_type: 'sale_payment',
        amount_cents: cashDrawerSaleMovementCents,
        notes: changeDueCents > 0 ? 'cash_change_given' : null,
        metadata: {
          source: 'checkout',
          sale_id: sale.id,
          payment_id: primaryPayment.id,
          payment_idempotency_key: paymentIdempotencyKey,
          total_tendered_cents: totalTenderedCents,
          change_due_cents: changeDueCents,
          payment_method: normalizedSplitTenders ? 'split_tender' : input.paymentMethod,
        },
        created_by: user.id,
      } as any) as any)
    } catch (err) {
      console.error('[non-blocking] Failed to record cash drawer sale movement:', err)
      await emitCheckoutAlert({
        tenantId: user.tenantId!,
        eventType: 'cash_drawer_sale_movement_failed',
        severity: 'warning',
        message: 'Checkout succeeded but cash drawer movement logging failed',
        dedupeKey: `checkout_cash_drawer_movement_failed_${input.registerSessionId}`,
        context: {
          sale_id: sale.id,
          payment_id: primaryPayment.id,
          register_session_id: input.registerSessionId,
          movement_amount_cents: cashDrawerSaleMovementCents,
        },
      })
    }
  }

  // 7. Keep register counters synchronized if linked
  if (input.registerSessionId) {
    try {
      await syncRegisterSessionTotals({
        db,
        tenantId: user.tenantId!,
        registerSessionId: input.registerSessionId,
      })
    } catch (err) {
      console.error('[non-blocking] Failed to sync register session totals:', err)
      await emitCheckoutAlert({
        tenantId: user.tenantId!,
        eventType: 'register_totals_sync_failed',
        severity: 'warning',
        message: 'Checkout succeeded but register totals sync failed',
        dedupeKey: `checkout_register_totals_sync_failed_${input.registerSessionId}`,
        context: {
          sale_id: sale.id,
          register_session_id: input.registerSessionId,
          payment_id: primaryPayment.id,
        },
      })
    }
  }

  // 8. Inventory deduction (non-blocking - if it fails, the sale still succeeds)
  try {
    const { executeSaleDeduction } = await import('./inventory-bridge')
    await executeSaleDeduction(sale.id)
  } catch (err) {
    console.error('[non-blocking] Inventory deduction failed:', err)
  }

  try {
    const { deductProductStock } = await import('./inventory-bridge')
    await deductProductStock(sale.id)
  } catch (err) {
    console.error('[non-blocking] Product stock deduction failed:', err)
  }

  try {
    await appendPosAuditLog({
      tenantId: user.tenantId!,
      action: 'sale_checkout_captured',
      tableName: 'sales',
      recordId: sale.id,
      changedBy: user.id,
      summary: 'POS sale captured via counter checkout',
      afterValues: {
        sale_number: (sale as any).sale_number,
        payment_id: primaryPayment.id,
        payment_method: normalizedSplitTenders ? 'split_tender' : input.paymentMethod,
        payment_methods: recordedPayments.map((line) => line.paymentMethod),
        card_entry_mode:
          !normalizedSplitTenders && input.paymentMethod === 'card' ? cardEntryMode : null,
        sale_channel: saleChannel,
        processor_type: processorTypes.length === 1 ? processorTypes[0] : 'mixed',
        processor_reference_id: primaryPayment.processorReferenceId,
        split_tenders: splitTenderSummary,
        total_cents: totalDueCents,
        total_tendered_cents: totalTenderedCents,
        change_due_cents: changeDueCents,
        tip_cents: tipCents,
        register_session_id: input.registerSessionId ?? null,
      },
    })
  } catch (err) {
    console.error('[non-blocking] Failed to append POS audit log:', err)
  }

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

// ─── Quick Sale (single item) ────────────────────────────────────

/**
 * One-tap sale for a single product. Even faster than counterCheckout
 * for high-volume simple items.
 */
export async function quickSale(input: {
  productProjectionId: string
  paymentMethod: PaymentMethod
  registerSessionId?: string
}) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  // Fetch product
  const { data: product, error: prodErr } = await (db
    .from('product_projections')
    .select('id, name, price_cents, tax_class, cost_cents, modifiers')
    .eq('id', input.productProjectionId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .single() as any)

  if (prodErr || !product) throw new Error('Product not found or inactive')

  return counterCheckout({
    registerSessionId: input.registerSessionId,
    items: [
      {
        productProjectionId: product.id,
        name: (product as any).name,
        unitPriceCents: (product as any).price_cents,
        quantity: 1,
        taxClass: (product as any).tax_class,
        unitCostCents: (product as any).cost_cents,
      },
    ],
    paymentMethod: input.paymentMethod,
    amountTenderedCents: (product as any).price_cents,
  })
}
