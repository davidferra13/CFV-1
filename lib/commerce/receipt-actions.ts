// Commerce Engine V1 — Receipt Actions
// Build receipt data from a sale and generate the PDF.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/supabase/server'
import {
  generateCommerceReceiptPdf,
  type CommerceReceiptData,
} from '@/lib/documents/generate-commerce-receipt'
import { SALE_CHANNEL_LABELS } from './constants'
import type { SaleChannel } from './constants'

// ─── Build Receipt Data ───────────────────────────────────────────

/**
 * Assemble all data needed for a receipt from a sale ID.
 */
export async function buildReceiptData(saleId: string): Promise<CommerceReceiptData> {
  const user = await requireChef()
  await requirePro('commerce')
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Fetch sale
  const { data: sale, error: saleErr } = await supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .eq('tenant_id', tenantId)
    .single()

  if (saleErr || !sale) throw new Error('Sale not found')
  const s = sale as any

  // Fetch items
  const { data: items } = await supabase
    .from('sale_items')
    .select('name, quantity, unit_price_cents, line_total_cents')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })

  // Fetch payments
  const { data: payments } = await supabase
    .from('commerce_payments')
    .select('payment_method, amount_cents, status')
    .eq('sale_id', saleId)
    .eq('tenant_id', tenantId)
    .in('status', ['captured', 'settled'])

  // Fetch business info
  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, display_name, email, phone, address_line1, city, state, zip')
    .eq('id', tenantId)
    .single()

  const chefData = chef as any
  const businessName = chefData?.business_name || chefData?.display_name || 'ChefFlow'
  const addressParts = [
    chefData?.address_line1,
    chefData?.city,
    chefData?.state,
    chefData?.zip,
  ].filter(Boolean)
  const businessAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined

  // Client name
  let customerName: string | undefined
  if (s.client_id) {
    const { data: client } = await supabase
      .from('clients')
      .select('full_name')
      .eq('id', s.client_id)
      .single()
    customerName = (client as any)?.full_name ?? undefined
  }

  return {
    saleNumber: s.sale_number,
    saleDate: s.created_at,
    channel: SALE_CHANNEL_LABELS[s.channel as SaleChannel] ?? s.channel,
    businessName,
    businessAddress,
    businessPhone: chefData?.phone ?? undefined,
    businessEmail: chefData?.email ?? undefined,
    items: (items ?? []).map((i: any) => ({
      name: i.name,
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents ?? 0,
      lineTotalCents: i.line_total_cents ?? 0,
    })),
    subtotalCents: s.subtotal_cents ?? 0,
    taxCents: s.tax_cents ?? 0,
    discountCents: s.discount_cents ?? 0,
    tipCents: s.tip_cents ?? 0,
    totalCents: s.total_cents ?? 0,
    payments: (payments ?? []).map((p: any) => ({
      method: p.payment_method,
      amountCents: p.amount_cents ?? 0,
      status: p.status,
    })),
    customerName,
    taxZipCode: s.tax_zip_code ?? undefined,
  }
}

// ─── Generate Receipt PDF ─────────────────────────────────────────

/**
 * Generate a receipt PDF for a sale. Returns base64-encoded PDF data.
 */
export async function generateReceipt(saleId: string): Promise<{ pdf: string; filename: string }> {
  const data = await buildReceiptData(saleId)
  const buffer = await generateCommerceReceiptPdf(data)
  const pdf = buffer.toString('base64')
  const filename = `receipt-${data.saleNumber ?? saleId}.pdf`
  return { pdf, filename }
}
