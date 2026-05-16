// API Route: Client Portal Invoice PDF Download
// GET /api/client-portal/invoice-pdf/[eventId]?token=xxx
// Token-based access (no auth session required).
// Validates portal token, verifies event belongs to client, generates PDF.

import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { getClientPortalAccess } from '@/lib/client-portal/actions'
import { getInvoiceDataByTenant } from '@/lib/events/invoice-actions'
import { generateInvoicePdf } from '@/lib/documents/pdf-generator'
import { createServerClient } from '@/lib/db/server'

export async function GET(request: Request, { params }: { params: { eventId: string } }) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  const access = await getClientPortalAccess(token)
  if (!access) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  // Verify event belongs to this client and tenant
  const db: any = createServerClient({ admin: true })
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', params.eventId)
    .eq('tenant_id', access.tenantId)
    .eq('client_id', access.clientId)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  const invoiceData = await getInvoiceDataByTenant(params.eventId, access.tenantId)
  if (!invoiceData) {
    return NextResponse.json({ error: 'Invoice not available' }, { status: 404 })
  }

  try {
    const pdfBuffer = await generateInvoicePdf(invoiceData)
    const bytes = new Uint8Array(pdfBuffer)
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')
    const invoiceRef = invoiceData.invoiceNumber ?? 'invoice'

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${invoiceRef}-${dateSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[client-portal-invoice-pdf] Error:', err)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
