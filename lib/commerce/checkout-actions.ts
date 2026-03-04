// Commerce Engine V1 — Checkout Actions
// Atomic counter checkout: creates sale + items + payment in one call.
// Used by the POS register for fast counter transactions.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PaymentMethod } from '@/lib/ledger/append'
import type { TaxClass } from './constants'
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

export type CounterCheckoutInput = {
  registerSessionId?: string
  clientId?: string
  items: CheckoutItem[]
  paymentMethod: PaymentMethod
  amountTenderedCents: number
  ageVerified?: boolean
  promotionCode?: string
  tipCents?: number
  idempotencyKey?: string
  taxZipCode?: string
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
const AUTO_PROMOTION_FLAG_SET = new Set(['1', 'true', 'yes', 'on'])

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
  supabase: any
  tenantId: string
  code: string
}): Promise<PromotionRule> {
  const { data: promotion, error } = await (ctx.supabase
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
  supabase: any
  tenantId: string
}): Promise<PromotionRule[]> {
  const { data: rows, error } = await (ctx.supabase
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
  supabase: any
  tenantId: string
  saleId: string
  promotion: AppliedCheckoutPromotion
}) {
  try {
    await (ctx.supabase.from('sale_applied_promotions' as any).insert({
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

async function loadCheckoutProductsById(ctx: {
  supabase: any
  tenantId: string
  items: CheckoutItem[]
}) {
  const productIds = Array.from(
    new Set(
      ctx.items
        .map((item) => String(item.productProjectionId ?? '').trim())
        .filter((id) => id.length > 0)
    )
  )

  const map = new Map<string, ProductProjectionCheckoutRow>()
  if (productIds.length === 0) return map

  const { data: rows } = await (ctx.supabase
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
  supabase: any
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
  supabase: any
  tenantId: string
  idempotencyKey: string
  paymentMethod: PaymentMethod
  amountTenderedCents: number
}): Promise<ExistingCheckoutResult | null> {
  const { data: payment } = await (ctx.supabase
    .from('commerce_payments' as any)
    .select('id, sale_id, amount_cents, tip_cents, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('idempotency_key', ctx.idempotencyKey)
    .maybeSingle() as any)

  if (!payment || !payment.sale_id) return null

  if (!['captured', 'settled', 'authorized'].includes(String(payment.status ?? ''))) {
    throw new Error('Existing checkout is not finalized yet. Try again in a moment.')
  }

  const { data: sale } = await (ctx.supabase
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
    const { data: promotionRow } = await (ctx.supabase
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

  const totalCents = (payment.amount_cents ?? 0) + (payment.tip_cents ?? 0)
  return {
    saleId: sale.id,
    saleNumber: sale.sale_number ?? 'Sale',
    paymentId: payment.id,
    totalCents,
    changeDueCents: computeChangeDueCents({
      paymentMethod: ctx.paymentMethod,
      amountTenderedCents: ctx.amountTenderedCents,
      totalChargedCents: totalCents,
    }),
    appliedPromotion,
  }
}

async function markSaleAsCheckoutFailed(ctx: {
  supabase: any
  tenantId: string
  saleId: string
  userId: string
  reason: string
}) {
  try {
    await (ctx.supabase
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
  supabase: any
  tenantId: string
  registerSessionId: string
}) {
  const { data: session, error } = await (ctx.supabase
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
  supabase: any
  tenantId: string
  registerSessionId: string
}): Promise<boolean> {
  const { data: session, error } = await (ctx.supabase
    .from('register_sessions' as any)
    .select('status')
    .eq('id', ctx.registerSessionId)
    .eq('tenant_id', ctx.tenantId)
    .maybeSingle() as any)

  if (error || !session) return false
  return String((session as any).status ?? '') === 'open'
}

async function syncRegisterSessionTotals(ctx: {
  supabase: any
  tenantId: string
  registerSessionId: string
}) {
  const { data: sales } = await (ctx.supabase
    .from('sales' as any)
    .select('id, status')
    .eq('tenant_id', ctx.tenantId)
    .eq('register_session_id', ctx.registerSessionId) as any)

  const saleIds = (sales ?? []).map((sale: any) => sale.id).filter(Boolean)

  let payments: any[] = []
  if (saleIds.length > 0) {
    const { data } = await (ctx.supabase
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

  await (ctx.supabase
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
 * Atomic counter checkout — creates a sale with items and a payment
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
  const supabase: any = createServerClient()

  await assertPosRoleAccess({
    supabase,
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

  const existing = await findExistingCheckoutResult({
    supabase,
    tenantId: user.tenantId!,
    idempotencyKey: paymentIdempotencyKey,
    paymentMethod: input.paymentMethod,
    amountTenderedCents: input.amountTenderedCents,
  })
  if (existing) {
    return existing
  }

  if (input.registerSessionId) {
    await assertOpenRegisterSession({
      supabase,
      tenantId: user.tenantId!,
      registerSessionId: input.registerSessionId,
    })
  }

  const normalizedItems = await normalizeCheckoutItems({
    supabase,
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
  const { data: sale, error: saleErr } = await (supabase
    .from('sales')
    .insert({
      tenant_id: user.tenantId!,
      channel: 'counter',
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
      supabase,
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
      supabase,
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

  const { error: itemsErr } = await (supabase.from('sale_items').insert(itemRows as any) as any)

  if (itemsErr) {
    await markSaleAsCheckoutFailed({
      supabase,
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

  const { error: totalsErr } = await (supabase
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
      supabase,
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
      supabase,
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
      await (supabase
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
      supabase,
      tenantId: user.tenantId!,
      registerSessionId: input.registerSessionId,
    })
    if (!registerStillOpen) {
      await markSaleAsCheckoutFailed({
        supabase,
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

  if (input.paymentMethod === 'cash' && input.amountTenderedCents < finalTotalCents + tipCents) {
    await markSaleAsCheckoutFailed({
      supabase,
      tenantId: user.tenantId!,
      saleId: sale.id,
      userId: user.id,
      reason: 'insufficient_cash_tendered',
    })
    throw new Error('Amount tendered is less than total due')
  }

  // 5. Record payment (captured immediately)
  let processorType: string = 'manual'
  let processorReferenceId: string | null = null
  let paymentNotes: string | null = null

  if (input.paymentMethod === 'card') {
    const { getPaymentTerminalAdapter } = await import('./terminal')
    const terminalAdapter = getPaymentTerminalAdapter()
    const terminalHealth = await terminalAdapter.healthCheck()
    if (!terminalHealth.healthy) {
      await markSaleAsCheckoutFailed({
        supabase,
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

    const terminalResult = await terminalAdapter.beginCardPayment({
      saleId: sale.id,
      amountCents: finalTotalCents,
      tipCents,
      currency: 'usd',
      idempotencyKey: paymentIdempotencyKey,
      metadata: {
        register_session_id: input.registerSessionId ?? null,
      },
    })

    if (terminalResult.status !== 'captured') {
      await markSaleAsCheckoutFailed({
        supabase,
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
          idempotency_key: paymentIdempotencyKey,
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

  const txnRef = `commerce_${paymentIdempotencyKey}`

  const { data: payment, error: payErr } = await (supabase
    .from('commerce_payments')
    .insert({
      tenant_id: user.tenantId!,
      sale_id: sale.id,
      client_id: input.clientId ?? null,
      amount_cents: finalTotalCents,
      tip_cents: tipCents,
      payment_method: input.paymentMethod,
      status: 'captured',
      processor_type: processorType,
      processor_reference_id: processorReferenceId,
      idempotency_key: paymentIdempotencyKey,
      transaction_reference: txnRef,
      captured_at: new Date().toISOString(),
      notes: paymentNotes,
      created_by: user.id,
    } as any)
    .select('id')
    .single() as any)

  if (payErr || !payment) {
    const idempotentRetry = await findExistingCheckoutResult({
      supabase,
      tenantId: user.tenantId!,
      idempotencyKey: paymentIdempotencyKey,
      paymentMethod: input.paymentMethod,
      amountTenderedCents: input.amountTenderedCents,
    })
    if (idempotentRetry) {
      return idempotentRetry
    }

    await markSaleAsCheckoutFailed({
      supabase,
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
        idempotency_key: paymentIdempotencyKey,
        payment_method: input.paymentMethod,
      },
    })
    throw new Error(`Failed to record payment: ${payErr?.message ?? 'unknown error'}`)
  }

  // 6. Update sale status to captured
  const { error: saleStatusErr } = await (supabase
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
        payment_id: payment.id,
        register_session_id: input.registerSessionId ?? null,
        idempotency_key: paymentIdempotencyKey,
      },
    })
    throw new Error(`Failed to finalize sale status: ${saleStatusErr.message}`)
  }

  // 7. Keep register counters synchronized if linked
  if (input.registerSessionId) {
    try {
      await syncRegisterSessionTotals({
        supabase,
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
          payment_id: payment.id,
        },
      })
    }
  }

  // 8. Inventory deduction (non-blocking — if it fails, the sale still succeeds)
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

  // Compute change due for cash payments
  const changeDueCents = computeChangeDueCents({
    paymentMethod: input.paymentMethod,
    amountTenderedCents: input.amountTenderedCents,
    totalChargedCents: finalTotalCents + tipCents,
  })

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
        payment_id: payment.id,
        payment_method: input.paymentMethod,
        processor_type: processorType,
        processor_reference_id: processorReferenceId,
        total_cents: finalTotalCents + tipCents,
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
    paymentId: payment.id,
    totalCents: finalTotalCents + tipCents,
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
  const supabase: any = createServerClient()

  // Fetch product
  const { data: product, error: prodErr } = await (supabase
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
