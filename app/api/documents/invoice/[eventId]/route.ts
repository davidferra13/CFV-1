import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { requireAuth } from '@/lib/auth/get-user'
import { getInvoiceData, getInvoiceDataForClient } from '@/lib/events/invoice-actions'
import { generateInvoicePDF } from '@/lib/documents/generate-invoice'

// Both chef and client can download the invoice PDF.
// Delegates to the correct scoped fetcher based on user role.

export async function GET(_request: Request, { params }: { params: { eventId: string } }) {
  try {
    const user = await requireAuth()

    let invoiceData
    if (user.role === 'chef') {
      invoiceData = await getInvoiceData(params.eventId)
    } else {
      invoiceData = await getInvoiceDataForClient(params.eventId)
    }

    if (!invoiceData) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const pdfBuffer = generateInvoicePDF(invoiceData)
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
  } catch (error) {
    const message = error instanceof Error ? error.message : ''

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Log full error server-side but return generic message to client
    // (prevents leaking DB schema, internal paths, or service names)
    console.error('[invoice-route] Error:', error)
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 })
  }
}
