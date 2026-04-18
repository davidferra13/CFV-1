import { NextResponse } from 'next/server'
import { z } from 'zod'
import { buildCheckoutPaymentIdempotencyKey } from '@/lib/commerce/checkout-idempotency'
import { getSalesTaxRate } from '@/lib/tax/api-ninjas'
import { hasTaxableItems } from '@/lib/commerce/tax-policy'
import { computeLineTaxCents } from '@/lib/commerce/kiosk-policy'
import {
  authenticateOrderKioskRequest,
  assertStaffSession,
  getOpenRegisterSession,
  KioskApiError,
  syncRegisterSessionTotals,
} from '../_helpers'

const CLIENT_CHECKOUT_ID_MAX = 96

const CheckoutItemSchema = z.object({
  product_projection_id: z.string().uuid(),
  quantity: z.number().int().positive().max(99),
  selected_modifiers: z
    .array(
      z.object({
        name: z.string().min(1),
        option: z.string().min(1),
      })
    )
    .optional(),
})

const CheckoutSchema = z.object({
  items: z.array(CheckoutItemSchema).min(1),
  payment_method: z.enum(['cash', 'card']),
  amount_tendered_cents: z.number().int().nonnegative().default(0),
  tip_cents: z.number().int().nonnegative().default(0),
  notes: z.string().max(1000).optional().or(z.literal('')),
  session_id: z.string().uuid().optional(),
  client_checkout_id: z
    .string()
    .trim()
    .min(1)
    .max(CLIENT_CHECKOUT_ID_MAX)
    .regex(/^[a-zA-Z0-9:_-]+$/)
    .optional(),
})

type ProductRow = {
  id: string
  name: string
  price_cents: number
  tax_class: string
  cost_cents: number | null
  modifiers: any
}

type ExistingCheckoutResult = {
  saleId: string
  saleNumber: string
  paymentId: string
  totalCents: number
  changeDueCents: number
  registerSessionId: string | null
}

function buildCheckoutAttemptKey(raw?: string) {
  const fallback =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`
  const normalized = (raw ?? fallback).trim()
  const safe = normalized.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, CLIENT_CHECKOUT_ID_MAX)
  return safe || fallback.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, CLIENT_CHECKOUT_ID_MAX)
}

function computeChangeDueCents(input: {
  paymentMethod: 'cash' | 'card'
  amountTenderedCents: number
  totalChargedCents: number
}) {
  return input.paymentMethod === 'cash'
    ? Math.max(0, input.amountTenderedCents - input.totalChargedCents)
    : 0
}

async function findExistingCheckoutResult(ctx: {
  db: any
  tenantId: string
  idempotencyKey: string
  amountTenderedCents: number
}): Promise<ExistingCheckoutResult | null> {
  const { data: payment, error: paymentLookupError } = await (ctx.db
    .from('commerce_payments' as any)
    .select('id, sale_id, amount_cents, tip_cents, status, payment_method')
    .eq('tenant_id', ctx.tenantId)
    .eq('idempotency_key', ctx.idempotencyKey)
    .maybeSingle() as any)

  if (paymentLookupError) {
    throw new Error(`Failed to load existing payment: ${paymentLookupError.message}`)
  }
  if (!payment || !payment.sale_id) return null

  if (!['captured', 'settled', 'authorized'].includes(String(payment.status ?? ''))) {
    throw new Error('Existing checkout is not finalized yet. Try again in a moment.')
  }

  const { data: sale, error: saleLookupError } = await (ctx.db
    .from('sales' as any)
    .select('id, sale_number, register_session_id')
    .eq('tenant_id', ctx.tenantId)
    .eq('id', payment.sale_id)
    .maybeSingle() as any)

  if (saleLookupError) {
    throw new Error(`Failed to load existing sale: ${saleLookupError.message}`)
  }
  if (!sale) {
    throw new Error('Checkout payment exists but sale record was not found')
  }

  const totalCents = (payment.amount_cents ?? 0) + (payment.tip_cents ?? 0)
  const paymentMethod = payment.payment_method === 'cash' ? 'cash' : 'card'
  return {
    saleId: sale.id,
    saleNumber: sale.sale_number ?? 'Sale',
    paymentId: payment.id,
    totalCents,
    changeDueCents: computeChangeDueCents({
      paymentMethod,
      amountTenderedCents: ctx.amountTenderedCents,
      totalChargedCents: totalCents,
    }),
    registerSessionId: sale.register_session_id ?? null,
  }
}

async function markSaleAsCheckoutFailed(ctx: {
  db: any
  tenantId: string
  saleId: string
  reason: string
}) {
  try {
    await (ctx.db
      .from('sales' as any)
      .update({
        status: 'voided',
        void_reason: 'checkout_failed',
        voided_at: new Date().toISOString(),
        notes: `[checkout_failed] ${ctx.reason}`,
      } as any)
      .eq('id', ctx.saleId)
      .eq('tenant_id', ctx.tenantId) as any)
  } catch (err) {
    console.error('[kiosk/order/checkout] failed to mark sale as checkout_failed:', err)
  }
}

function canonicalizeModifiers(
  productModifiers: any,
  selected: Array<{ name: string; option: string }>
) {
  if (!Array.isArray(selected) || selected.length === 0) {
    return [] as Array<{ name: string; option: string; price_delta_cents: number }>
  }

  const available = Array.isArray(productModifiers) ? productModifiers : []
  const normalized: Array<{ name: string; option: string; price_delta_cents: number }> = []
  const usedModifierNames = new Set<string>()

  for (const picked of selected) {
    if (usedModifierNames.has(picked.name)) {
      throw new KioskApiError(`Duplicate modifier: ${picked.name}`, 400)
    }
    usedModifierNames.add(picked.name)

    const modifier = available.find((m: any) => m?.name === picked.name)
    if (!modifier) {
      throw new KioskApiError(`Invalid modifier: ${picked.name}`, 400)
    }

    const options = Array.isArray(modifier.options) ? modifier.options : []
    const option = options.find((o: any) => o?.label === picked.option)
    if (!option) {
      throw new KioskApiError(`Invalid modifier option: ${picked.option}`, 400)
    }

    const delta = Number(option.price_delta_cents ?? 0)
    if (!Number.isInteger(delta)) {
      throw new KioskApiError(`Invalid modifier price for ${picked.option}`, 400)
    }

    normalized.push({
      name: picked.name,
      option: picked.option,
      price_delta_cents: delta,
    })
  }

  return normalized
}

export async function POST(request: Request) {
  try {
    const { db, device } = await authenticateOrderKioskRequest(request)

    const body = await request.json()
    const parsed = CheckoutSchema.parse(body)
    const checkoutAttemptKey = buildCheckoutAttemptKey(parsed.client_checkout_id)
    const paymentIdempotencyKey = buildCheckoutPaymentIdempotencyKey(
      device.tenantId,
      `kiosk_${device.deviceId}_${checkoutAttemptKey}`
    )

    const staffSession = await assertStaffSession({
      db,
      deviceId: device.deviceId,
      tenantId: device.tenantId,
      requireStaffPin: device.requireStaffPin,
      sessionId: parsed.session_id,
    })

    const existing = await findExistingCheckoutResult({
      db,
      tenantId: device.tenantId,
      idempotencyKey: paymentIdempotencyKey,
      amountTenderedCents: parsed.amount_tendered_cents,
    })
    if (existing) {
      return NextResponse.json({
        success: true,
        sale_id: existing.saleId,
        sale_number: existing.saleNumber,
        payment_id: existing.paymentId,
        register_session_id: existing.registerSessionId,
        total_cents: existing.totalCents,
        change_due_cents: existing.changeDueCents,
      })
    }

    const registerSession = await getOpenRegisterSession({
      db,
      tenantId: device.tenantId,
    })

    const productIds = [...new Set(parsed.items.map((item) => item.product_projection_id))]

    const { data: products, error: productsError } = await (db
      .from('product_projections' as any)
      .select('id, name, price_cents, tax_class, cost_cents, modifiers, is_active')
      .eq('tenant_id', device.tenantId)
      .in('id', productIds)
      .eq('is_active', true) as any)

    if (productsError) {
      return NextResponse.json({ error: 'Failed to load products for checkout' }, { status: 500 })
    }

    const productMap = new Map<string, ProductRow>(
      (products ?? []).map((p: any) => [p.id, p as ProductRow])
    )
    if (productMap.size !== productIds.length) {
      return NextResponse.json({ error: 'One or more products are unavailable' }, { status: 400 })
    }

    const itemRows = parsed.items.map((item, index) => {
      const product = productMap.get(item.product_projection_id)
      if (!product) {
        throw new KioskApiError('Invalid product in cart', 400)
      }

      const modifiersApplied = canonicalizeModifiers(
        product.modifiers,
        item.selected_modifiers ?? []
      )
      const modifierUnitDelta = modifiersApplied.reduce((sum, m) => sum + m.price_delta_cents, 0)
      const unitPriceCents = product.price_cents + modifierUnitDelta
      const lineTotalCents = unitPriceCents * item.quantity

      return {
        tenant_id: device.tenantId,
        sale_id: '',
        product_projection_id: product.id,
        name: product.name,
        unit_price_cents: product.price_cents,
        quantity: item.quantity,
        discount_cents: 0,
        line_total_cents: lineTotalCents,
        tax_class: product.tax_class,
        tax_cents: 0,
        modifiers_applied: modifiersApplied,
        unit_cost_cents: product.cost_cents,
        sort_order: index,
      }
    })

    const hasTaxableCheckoutItems = hasTaxableItems(
      itemRows.map((item) => ({
        taxClass: (item.tax_class as any) ?? 'standard',
      }))
    )

    let taxZipCode: string | null = null
    let combinedTaxRate = 0

    if (hasTaxableCheckoutItems) {
      const { data: chef, error: chefError } = await (db
        .from('chefs' as any)
        .select('zip')
        .eq('id', device.tenantId)
        .maybeSingle() as any)

      if (chefError) {
        return NextResponse.json({ error: 'Failed to load business tax ZIP' }, { status: 500 })
      }

      taxZipCode = String((chef as any)?.zip ?? '').trim() || null
      if (!taxZipCode) {
        return NextResponse.json(
          { error: 'Business ZIP is required for taxable items before checkout' },
          { status: 409 }
        )
      }

      const taxRates = await getSalesTaxRate(taxZipCode)
      if (!taxRates) {
        return NextResponse.json(
          { error: 'Tax service unavailable. Unable to calculate sales tax right now' },
          { status: 503 }
        )
      }

      combinedTaxRate = taxRates.combined_rate
    }

    const finalizedItemRows = itemRows.map((item) => ({
      ...item,
      tax_cents: computeLineTaxCents({
        lineTotalCents: item.line_total_cents,
        combinedRate: combinedTaxRate,
        taxClass: item.tax_class,
      }),
    }))

    const subtotalCents = finalizedItemRows.reduce((sum, row) => sum + row.line_total_cents, 0)
    const taxCents = finalizedItemRows.reduce((sum, row) => sum + (row.tax_cents ?? 0), 0)
    const totalCents = subtotalCents + taxCents
    const tipCents = parsed.tip_cents ?? 0
    const totalChargedCents = totalCents + tipCents

    if (parsed.payment_method === 'cash' && parsed.amount_tendered_cents < totalChargedCents) {
      return NextResponse.json({ error: 'Amount tendered is less than total due' }, { status: 400 })
    }

    const { data: sale, error: saleError } = await (db
      .from('sales' as any)
      .insert({
        tenant_id: device.tenantId,
        channel: 'counter',
        register_session_id: registerSession.id,
        tax_zip_code: taxZipCode,
        status: 'pending_payment',
        notes: parsed.notes?.trim() ? `[kiosk] ${parsed.notes.trim()}` : '[kiosk] order checkout',
        metadata: {
          source: 'kiosk',
          device_id: device.deviceId,
          device_session_id: parsed.session_id || null,
          checkout_request_key: checkoutAttemptKey,
          staff_member_id: (staffSession as any)?.staff_member_id ?? null,
        },
        created_by: null,
      } as any)
      .select('id, sale_number')
      .single() as any)

    if (saleError || !sale) {
      return NextResponse.json({ error: 'Failed to create sale' }, { status: 500 })
    }

    const saleItems = finalizedItemRows.map((row) => ({ ...row, sale_id: (sale as any).id }))
    const { error: itemInsertError } = await (db as any).from('sale_items').insert(saleItems as any)
    if (itemInsertError) {
      await markSaleAsCheckoutFailed({
        db,
        tenantId: device.tenantId,
        saleId: (sale as any).id,
        reason: `sale_items_insert_failed:${itemInsertError.message}`,
      })
      return NextResponse.json({ error: 'Failed to save cart items' }, { status: 500 })
    }

    const { error: saleTotalsError } = await (db as any)
      .from('sales')
      .update({
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        tip_cents: tipCents,
      } as any)
      .eq('id', (sale as any).id)
      .eq('tenant_id', device.tenantId)
    if (saleTotalsError) {
      await markSaleAsCheckoutFailed({
        db,
        tenantId: device.tenantId,
        saleId: (sale as any).id,
        reason: `sale_totals_update_failed:${saleTotalsError.message}`,
      })
      return NextResponse.json({ error: 'Failed to update sale totals' }, { status: 500 })
    }

    const { data: payment, error: paymentError } = await (db
      .from('commerce_payments')
      .insert({
        tenant_id: device.tenantId,
        sale_id: (sale as any).id,
        amount_cents: totalCents,
        tip_cents: tipCents,
        payment_method: parsed.payment_method,
        status: 'captured',
        processor_type: 'manual_kiosk',
        idempotency_key: paymentIdempotencyKey,
        transaction_reference: `commerce_${paymentIdempotencyKey}`,
        captured_at: new Date().toISOString(),
        created_by: null,
        notes: parsed.notes?.trim() || null,
      } as any)
      .select('id')
      .single() as any)

    if (paymentError || !payment) {
      const idempotentRetry = await findExistingCheckoutResult({
        db,
        tenantId: device.tenantId,
        idempotencyKey: paymentIdempotencyKey,
        amountTenderedCents: parsed.amount_tendered_cents,
      })
      if (idempotentRetry) {
        return NextResponse.json({
          success: true,
          sale_id: idempotentRetry.saleId,
          sale_number: idempotentRetry.saleNumber,
          payment_id: idempotentRetry.paymentId,
          register_session_id: idempotentRetry.registerSessionId,
          total_cents: idempotentRetry.totalCents,
          change_due_cents: idempotentRetry.changeDueCents,
        })
      }

      await markSaleAsCheckoutFailed({
        db,
        tenantId: device.tenantId,
        saleId: (sale as any).id,
        reason: paymentError?.message ?? 'payment_insert_failed',
      })
      return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
    }

    const { error: saleStatusError } = await (db as any)
      .from('sales')
      .update({ status: 'captured' } as any)
      .eq('id', (sale as any).id)
      .eq('tenant_id', device.tenantId)
    if (saleStatusError) {
      console.error(
        '[kiosk/order/checkout] Sale status update failed (non-blocking):',
        saleStatusError
      )
    }

    // Inventory deduction (non-blocking, matches POS counterCheckout pattern)
    try {
      const { executeSaleDeduction } = await import('@/lib/commerce/inventory-bridge')
      await executeSaleDeduction((sale as any).id)
    } catch (err) {
      console.error('[kiosk/order/checkout] Inventory deduction failed (non-blocking):', err)
    }
    try {
      const { deductProductStock } = await import('@/lib/commerce/inventory-bridge')
      await deductProductStock((sale as any).id)
    } catch (err) {
      console.error('[kiosk/order/checkout] Product stock deduction failed (non-blocking):', err)
    }

    try {
      await syncRegisterSessionTotals({
        db,
        tenantId: device.tenantId,
        registerSessionId: registerSession.id,
      })
    } catch (syncError) {
      console.error('[kiosk/order/checkout] Register total sync failed (non-blocking):', syncError)
    }

    try {
      await (db as any).from('device_events').insert({
        device_id: device.deviceId,
        tenant_id: device.tenantId,
        staff_member_id: (staffSession as any)?.staff_member_id ?? null,
        type: 'submitted_order',
        payload: {
          sale_id: (sale as any).id,
          sale_number: (sale as any).sale_number,
          payment_method: parsed.payment_method,
          total_cents: totalChargedCents,
          tax_cents: taxCents,
          register_session_id: registerSession.id,
          checkout_request_key: checkoutAttemptKey,
        },
      })
    } catch (eventError) {
      console.error('[kiosk/order/checkout] Device event log failed (non-blocking):', eventError)
    }

    const changeDueCents = computeChangeDueCents({
      paymentMethod: parsed.payment_method,
      amountTenderedCents: parsed.amount_tendered_cents,
      totalChargedCents,
    })

    return NextResponse.json({
      success: true,
      sale_id: (sale as any).id,
      sale_number: (sale as any).sale_number,
      payment_id: (payment as any).id,
      register_session_id: registerSession.id,
      total_cents: totalChargedCents,
      tax_cents: taxCents,
      change_due_cents: changeDueCents,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: (err as any).errors[0]?.message || 'Validation error' },
        { status: 400 }
      )
    }

    if (err instanceof KioskApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    console.error('[kiosk/order/checkout] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
