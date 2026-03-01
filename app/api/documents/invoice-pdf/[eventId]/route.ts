// API Route: PDFKit Invoice PDF Generation
// GET /api/documents/invoice-pdf/[eventId]
// Returns a professional invoice PDF generated via PDFKit.
// Auth: both chef and client roles can download (delegates to scoped fetchers).
// PDFKit produces higher-quality vector PDF output than the jsPDF-based route.

import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { requireAuth } from '@/lib/auth/get-user'
import { getInvoiceData, getInvoiceDataForClient } from '@/lib/events/invoice-actions'
import { generateInvoicePdf } from '@/lib/documents/pdf-generator'

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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate invoice PDF'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('[invoice-pdf-route] Error:', error)
    return NextResponse.json({ error: 'Failed to generate invoice PDF' }, { status: 500 })
  }
}
