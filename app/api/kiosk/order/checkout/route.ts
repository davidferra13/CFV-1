import { NextResponse } from 'next/server'
import { z } from 'zod'
import {
  authenticateOrderKioskRequest,
  assertStaffSession,
  getOpenRegisterSession,
  KioskApiError,
} from '../_helpers'

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
})

type ProductRow = {
  id: string
  name: string
  price_cents: number
  tax_class: string
  cost_cents: number | null
  modifiers: any
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

  for (const picked of selected) {
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
    const { supabase, device } = await authenticateOrderKioskRequest(request)

    const body = await request.json()
    const parsed = CheckoutSchema.parse(body)

    const staffSession = await assertStaffSession({
      supabase,
      deviceId: device.deviceId,
      requireStaffPin: device.requireStaffPin,
      sessionId: parsed.session_id,
    })

    const registerSession = await getOpenRegisterSession({
      supabase,
      tenantId: device.tenantId,
    })

    const productIds = [...new Set(parsed.items.map((item) => item.product_projection_id))]

    const { data: products, error: productsError } = await (supabase
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

    const subtotalCents = itemRows.reduce((sum, row) => sum + row.line_total_cents, 0)
    const taxCents = 0
    const totalCents = subtotalCents + taxCents
    const tipCents = parsed.tip_cents ?? 0
    const totalChargedCents = totalCents + tipCents

    if (parsed.payment_method === 'cash' && parsed.amount_tendered_cents < totalChargedCents) {
      return NextResponse.json({ error: 'Amount tendered is less than total due' }, { status: 400 })
    }

    const { data: sale, error: saleError } = await (supabase
      .from('sales' as any)
      .insert({
        tenant_id: device.tenantId,
        channel: 'counter',
        register_session_id: registerSession.id,
        status: 'draft',
        notes: parsed.notes?.trim() ? `[kiosk] ${parsed.notes.trim()}` : '[kiosk] order checkout',
        metadata: {
          source: 'kiosk',
          device_id: device.deviceId,
          device_session_id: parsed.session_id || null,
          staff_member_id: (staffSession as any)?.staff_member_id ?? null,
        },
        created_by: null,
      } as any)
      .select('id, sale_number')
      .single() as any)

    if (saleError || !sale) {
      return NextResponse.json(
        { error: `Failed to create sale: ${saleError?.message}` },
        { status: 500 }
      )
    }

    const saleItems = itemRows.map((row) => ({ ...row, sale_id: (sale as any).id }))
    const { error: itemInsertError } = await (supabase as any)
      .from('sale_items')
      .insert(saleItems as any)
    if (itemInsertError) {
      return NextResponse.json(
        { error: `Failed to save cart items: ${itemInsertError.message}` },
        { status: 500 }
      )
    }

    await (supabase as any)
      .from('sales')
      .update({
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        tip_cents: tipCents,
      } as any)
      .eq('id', (sale as any).id)
      .eq('tenant_id', device.tenantId)

    const idempotencyKey = `kiosk_checkout_${device.deviceId}_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`

    const { data: payment, error: paymentError } = await (supabase
      .from('commerce_payments')
      .insert({
        tenant_id: device.tenantId,
        sale_id: (sale as any).id,
        amount_cents: totalCents,
        tip_cents: tipCents,
        payment_method: parsed.payment_method,
        status: 'captured',
        processor_type: 'manual_kiosk',
        idempotency_key: idempotencyKey,
        transaction_reference: `commerce_${idempotencyKey}`,
        captured_at: new Date().toISOString(),
        created_by: null,
        notes: parsed.notes?.trim() || null,
      } as any)
      .select('id')
      .single() as any)

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: `Failed to record payment: ${paymentError?.message}` },
        { status: 500 }
      )
    }

    await (supabase as any)
      .from('sales')
      .update({ status: 'captured' } as any)
      .eq('id', (sale as any).id)
      .eq('tenant_id', device.tenantId)

    const { data: registerTotals } = await (supabase
      .from('register_sessions' as any)
      .select('total_sales_count, total_revenue_cents, total_tips_cents')
      .eq('id', registerSession.id)
      .eq('tenant_id', device.tenantId)
      .single() as any)

    if (registerTotals) {
      await (supabase as any)
        .from('register_sessions')
        .update({
          total_sales_count: (registerTotals as any).total_sales_count + 1,
          total_revenue_cents: (registerTotals as any).total_revenue_cents + totalCents,
          total_tips_cents: (registerTotals as any).total_tips_cents + tipCents,
        } as any)
        .eq('id', registerSession.id)
        .eq('tenant_id', device.tenantId)
    }

    try {
      await (supabase as any).from('device_events').insert({
        device_id: device.deviceId,
        tenant_id: device.tenantId,
        staff_member_id: (staffSession as any)?.staff_member_id ?? null,
        type: 'submitted_order',
        payload: {
          sale_id: (sale as any).id,
          sale_number: (sale as any).sale_number,
          payment_method: parsed.payment_method,
          total_cents: totalChargedCents,
          register_session_id: registerSession.id,
        },
      })
    } catch (eventError) {
      console.error('[kiosk/order/checkout] Device event log failed (non-blocking):', eventError)
    }

    const changeDueCents =
      parsed.payment_method === 'cash'
        ? Math.max(0, parsed.amount_tendered_cents - totalChargedCents)
        : 0

    return NextResponse.json({
      success: true,
      sale_id: (sale as any).id,
      sale_number: (sale as any).sale_number,
      payment_id: (payment as any).id,
      register_session_id: registerSession.id,
      total_cents: totalChargedCents,
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
