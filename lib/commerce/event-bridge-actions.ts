// Commerce Engine V1 - Event Bridge Actions
// Create commerce sales from events and sync event payments to the commerce layer.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────

export type EventBridgeResult = {
  saleId: string
  saleNumber: string | null
  itemCount: number
  totalCents: number
  paymentsLinked: number
}

// ─── Create Sale from Event ───────────────────────────────────────

/**
 * Create a commerce sale linked to an existing event.
 * Pulls menu items from the event's active menu as sale line items.
 * Optionally links existing event payments to the sale.
 */
export async function createSaleFromEvent(eventId: string): Promise<EventBridgeResult> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch event
  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('id, client_id, occasion, event_date, quoted_price_cents, guest_count, status')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (evErr || !event) throw new Error('Event not found')

  // Check if a sale already exists for this event
  const { data: existingSale } = await supabase
    .from('sales')
    .select('id, sale_number')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .limit(1)

  if (existingSale && existingSale.length > 0) {
    throw new Error(
      `A sale already exists for this event: ${(existingSale[0] as any).sale_number ?? existingSale[0].id}`
    )
  }

  // Create the sale
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .insert({
      tenant_id: tenantId,
      event_id: eventId,
      client_id: (event as any).client_id ?? null,
      channel: 'invoice',
      status: 'draft',
      notes: `Created from event: ${(event as any).occasion ?? 'Untitled'} on ${(event as any).event_date ?? 'TBD'}`,
      created_by: user.id,
    } as any)
    .select('id, sale_number')
    .single()

  if (saleErr || !sale) throw new Error(`Failed to create sale: ${saleErr?.message}`)

  const saleId = sale.id

  // Pull menu items from event's active menu as sale line items
  let itemCount = 0
  let subtotalCents = 0

  // Get event's active menu → dish appearances
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .limit(1)

  if (menus && menus.length > 0) {
    const menuId = menus[0].id
    const { data: appearances } = await supabase
      .from('dish_appearances')
      .select('id, dish_index_id, display_name, price_cents, course')
      .eq('menu_id', menuId)

    for (const da of (appearances ?? []) as any[]) {
      const guestCount = (event as any).guest_count ?? 1
      const lineTotalCents = (da.price_cents ?? 0) * guestCount

      await supabase.from('sale_items').insert({
        sale_id: saleId,
        tenant_id: tenantId,
        name: da.display_name ?? 'Menu Item',
        category: da.course ?? null,
        unit_price_cents: da.price_cents ?? 0,
        quantity: guestCount,
        line_total_cents: lineTotalCents,
        tax_class: 'prepared_food',
        sort_order: itemCount,
      } as any)

      subtotalCents += lineTotalCents
      itemCount++
    }
  }

  // If no menu items, create a single line item from the quoted price
  if (itemCount === 0 && (event as any).quoted_price_cents) {
    await supabase.from('sale_items').insert({
      sale_id: saleId,
      tenant_id: tenantId,
      name: (event as any).occasion ?? 'Event Service',
      unit_price_cents: (event as any).quoted_price_cents,
      quantity: 1,
      line_total_cents: (event as any).quoted_price_cents,
      tax_class: 'prepared_food',
      sort_order: 0,
    } as any)

    subtotalCents = (event as any).quoted_price_cents
    itemCount = 1
  }

  // Update sale totals
  await supabase
    .from('sales')
    .update({
      subtotal_cents: subtotalCents,
      total_cents: subtotalCents,
    } as any)
    .eq('id', saleId)
    .eq('tenant_id', tenantId)

  // Link existing event payments to the sale (read-only - don't modify ledger)
  let paymentsLinked = 0
  const { data: ledgerPayments } = await supabase
    .from('ledger_entries')
    .select('id, amount_cents, payment_method, entry_type, created_at, transaction_reference')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .in('entry_type', ['payment', 'deposit'])
    .eq('is_refund', false)

  for (const lp of (ledgerPayments ?? []) as any[]) {
    const idempKey = `bridge_${eventId}_${lp.id}`

    const { error: pErr } = await supabase.from('commerce_payments').insert({
      tenant_id: tenantId,
      sale_id: saleId,
      event_id: eventId,
      client_id: (event as any).client_id ?? null,
      amount_cents: lp.amount_cents,
      payment_method: lp.payment_method ?? 'other',
      status: 'settled',
      processor_type: 'event_bridge',
      idempotency_key: idempKey,
      transaction_reference: lp.transaction_reference ?? `bridge_${lp.id}`,
      ledger_entry_id: lp.id,
      captured_at: lp.created_at,
      settled_at: lp.created_at,
      notes: `Linked from event ledger entry ${lp.id}`,
      created_by: user.id,
    } as any)

    if (!pErr) paymentsLinked++
    // Idempotency: skip duplicates silently
  }

  // Update sale status if fully paid
  if (paymentsLinked > 0) {
    const totalPaid = (ledgerPayments ?? []).reduce(
      (sum: number, lp: any) => sum + (lp.amount_cents ?? 0),
      0
    )

    if (totalPaid >= subtotalCents) {
      await supabase
        .from('sales')
        .update({ status: 'settled' } as any)
        .eq('id', saleId)
        .eq('tenant_id', tenantId)
    } else if (totalPaid > 0) {
      await supabase
        .from('sales')
        .update({ status: 'captured' } as any)
        .eq('id', saleId)
        .eq('tenant_id', tenantId)
    }
  }

  revalidatePath('/commerce')
  revalidatePath(`/events/${eventId}`)

  return {
    saleId,
    saleNumber: (sale as any).sale_number,
    itemCount,
    totalCents: subtotalCents,
    paymentsLinked,
  }
}

// ─── Get Event's Commerce Sale ────────────────────────────────────

/**
 * Get the commerce sale linked to an event (if any).
 */
export async function getEventSale(eventId: string) {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('sales')
    .select('id, sale_number, status, channel, total_cents, created_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch event sale: ${error.message}`)
  return data
}
