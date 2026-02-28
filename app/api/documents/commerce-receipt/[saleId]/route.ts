import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  generateCommerceReceiptPdf,
  type CommerceReceiptData,
} from '@/lib/documents/generate-commerce-receipt'

// Generates a thermal-format (80mm) receipt PDF for a commerce sale.
// Returns the PDF inline for printing or download.

export async function GET(_request: Request, { params }: { params: { saleId: string } }) {
  try {
    const user = await requireChef()
    const supabase: any = createServerClient()

    // Load sale with items and payments
    const { data: sale, error: saleError } = await supabase
      .from('commerce_sales')
      .select(
        `
        *,
        commerce_sale_items (*),
        commerce_payments (*)
      `
      )
      .eq('id', params.saleId)
      .eq('tenant_id', user.tenantId!)
      .single()

    if (saleError || !sale) {
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 })
    }

    // Load chef/business info
    const { data: chef } = await supabase
      .from('chefs')
      .select('business_name, phone, email, address')
      .eq('id', user.tenantId!)
      .single()

    const receiptData: CommerceReceiptData = {
      saleNumber: sale.sale_number ?? sale.id.slice(0, 8),
      saleDate: sale.created_at,
      channel: sale.channel ?? 'in-person',
      businessName: chef?.business_name ?? 'ChefFlow',
      businessAddress: chef?.address ?? undefined,
      businessPhone: chef?.phone ?? undefined,
      businessEmail: chef?.email ?? undefined,
      items: (sale.commerce_sale_items ?? []).map((item: any) => ({
        name: item.name ?? item.product_name ?? 'Item',
        quantity: item.quantity ?? 1,
        unitPriceCents: item.unit_price_cents ?? 0,
        lineTotalCents:
          item.line_total_cents ?? (item.unit_price_cents ?? 0) * (item.quantity ?? 1),
      })),
      subtotalCents: sale.subtotal_cents ?? 0,
      taxCents: sale.tax_cents ?? 0,
      discountCents: sale.discount_cents ?? 0,
      tipCents: sale.tip_cents ?? 0,
      totalCents: sale.total_cents ?? 0,
      payments: (sale.commerce_payments ?? []).map((p: any) => ({
        method: p.method ?? 'unknown',
        amountCents: p.amount_cents ?? 0,
        status: p.status ?? 'completed',
      })),
      customerName: sale.customer_name ?? undefined,
      notes: sale.notes ?? undefined,
      taxRate: sale.tax_rate ?? undefined,
    }

    const pdfBuffer = await generateCommerceReceiptPdf(receiptData)
    const bytes = new Uint8Array(pdfBuffer)
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${sale.sale_number ?? params.saleId.slice(0, 8)}-${dateSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate receipt'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('[commerce-receipt-route] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
