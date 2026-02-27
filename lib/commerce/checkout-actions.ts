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
  tipCents?: number
  taxZipCode?: string
  notes?: string
}

export type CounterCheckoutResult = {
  saleId: string
  saleNumber: string
  paymentId: string
  totalCents: number
  changeDueCents: number
}

// ─── Counter Checkout ────────────────────────────────────────────

/**
 * Atomic counter checkout — creates a sale with items and a payment
 * in one server action call. Optimized for POS speed.
 *
 * Steps:
 * 1. Create sale (draft)
 * 2. Insert all items
 * 3. Compute totals
 * 4. Record payment (status: captured)
 * 5. Update sale status to captured
 * 6. Link to register session if provided
 */
export async function counterCheckout(input: CounterCheckoutInput): Promise<CounterCheckoutResult> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase = createServerClient()

  if (input.items.length === 0) {
    throw new Error('At least one item is required')
  }

  // Validate all items
  for (const item of input.items) {
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      throw new Error(`Invalid price for "${item.name}"`)
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error(`Invalid quantity for "${item.name}"`)
    }
  }

  // 1. Create sale
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      tenant_id: user.tenantId!,
      channel: 'counter',
      client_id: input.clientId ?? null,
      register_session_id: input.registerSessionId ?? null,
      tax_zip_code: input.taxZipCode ?? null,
      notes: input.notes ?? null,
      status: 'draft',
      created_by: user.id,
    } as any)
    .select('id, sale_number')
    .single()

  if (saleErr || !sale) throw new Error(`Failed to create sale: ${saleErr?.message}`)

  // 2. Insert all items
  const itemRows = input.items.map((item, i) => {
    const modifierTotal = (item.modifiersApplied ?? []).reduce(
      (sum, m) => sum + m.price_delta_cents * item.quantity,
      0
    )
    const lineTotalCents = item.unitPriceCents * item.quantity + modifierTotal

    return {
      sale_id: sale.id,
      tenant_id: user.tenantId!,
      product_projection_id: item.productProjectionId ?? null,
      name: item.name,
      unit_price_cents: item.unitPriceCents,
      quantity: item.quantity,
      discount_cents: 0,
      line_total_cents: lineTotalCents,
      tax_class: item.taxClass ?? 'standard',
      tax_cents: item.taxCents ?? 0,
      modifiers_applied: item.modifiersApplied ?? [],
      unit_cost_cents: item.unitCostCents ?? null,
      sort_order: i,
    }
  })

  const { error: itemsErr } = await supabase.from('sale_items').insert(itemRows as any)

  if (itemsErr) throw new Error(`Failed to add items: ${itemsErr.message}`)

  // 3. Compute totals
  const subtotalCents = itemRows.reduce((sum, r) => sum + r.line_total_cents, 0)
  const taxCents = itemRows.reduce((sum, r) => sum + r.tax_cents, 0)
  const totalCents = subtotalCents + taxCents
  const tipCents = input.tipCents ?? 0

  await supabase
    .from('sales')
    .update({
      subtotal_cents: subtotalCents,
      tax_cents: taxCents,
      discount_cents: 0,
      total_cents: totalCents,
      tip_cents: tipCents,
    } as any)
    .eq('id', sale.id)
    .eq('tenant_id', user.tenantId!)

  // 4. Record payment (captured immediately)
  const idempotencyKey = `checkout_${sale.id}_${Date.now()}`
  const txnRef = `commerce_${idempotencyKey}`

  const { data: payment, error: payErr } = await supabase
    .from('commerce_payments')
    .insert({
      tenant_id: user.tenantId!,
      sale_id: sale.id,
      client_id: input.clientId ?? null,
      amount_cents: totalCents,
      tip_cents: tipCents,
      payment_method: input.paymentMethod,
      status: 'captured',
      processor_type: 'manual',
      idempotency_key: idempotencyKey,
      transaction_reference: txnRef,
      captured_at: new Date().toISOString(),
      created_by: user.id,
    } as any)
    .select('id')
    .single()

  if (payErr) throw new Error(`Failed to record payment: ${payErr.message}`)

  // 5. Update sale status to captured
  await supabase
    .from('sales')
    .update({ status: 'captured' } as any)
    .eq('id', sale.id)
    .eq('tenant_id', user.tenantId!)

  // 6. Increment register session counters if linked
  if (input.registerSessionId) {
    const { data: session } = await supabase
      .from('register_sessions')
      .select('total_sales_count, total_revenue_cents, total_tips_cents')
      .eq('id', input.registerSessionId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (session) {
      await supabase
        .from('register_sessions')
        .update({
          total_sales_count: (session as any).total_sales_count + 1,
          total_revenue_cents: (session as any).total_revenue_cents + totalCents,
          total_tips_cents: (session as any).total_tips_cents + tipCents,
        } as any)
        .eq('id', input.registerSessionId)
        .eq('tenant_id', user.tenantId!)
    }
  }

  // 7. Tax computation (non-blocking — if it fails, sale succeeds with $0 tax)
  let finalTotalCents = totalCents
  if (input.taxZipCode) {
    try {
      const { applySaleTax } = await import('./tax-actions')
      const taxResult = await applySaleTax(sale.id)
      if (taxResult) {
        finalTotalCents = subtotalCents + taxResult.totalTaxCents

        // Update payment amount to reflect tax
        await supabase
          .from('commerce_payments')
          .update({ amount_cents: finalTotalCents } as any)
          .eq('id', payment.id)
          .eq('tenant_id', user.tenantId!)
      }
    } catch (err) {
      console.error('[non-blocking] Tax computation failed:', err)
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
  const changeDueCents =
    input.paymentMethod === 'cash'
      ? Math.max(0, input.amountTenderedCents - (finalTotalCents + tipCents))
      : 0

  revalidatePath('/commerce')

  return {
    saleId: sale.id,
    saleNumber: (sale as any).sale_number,
    paymentId: payment.id,
    totalCents: finalTotalCents + tipCents,
    changeDueCents,
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
  const supabase = createServerClient()

  // Fetch product
  const { data: product, error: prodErr } = await supabase
    .from('product_projections')
    .select('id, name, price_cents, tax_class, cost_cents, modifiers')
    .eq('id', input.productProjectionId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .single()

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
