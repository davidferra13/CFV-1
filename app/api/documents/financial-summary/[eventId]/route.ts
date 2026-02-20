import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventFinancialSummaryFull } from '@/lib/events/financial-summary-actions'
import { generateFinancialSummaryPDF } from '@/lib/documents/generate-financial-summary'

// Chef-only: financial summary PDF for a specific event.
// Reuses getEventFinancialSummaryFull which already handles tenant scoping.

export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    await requireChef()

    const data = await getEventFinancialSummaryFull(params.eventId)
    if (!data) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const pdfBuffer = generateFinancialSummaryPDF(data)
    const bytes = new Uint8Array(pdfBuffer)
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="financial-summary-${dateSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate financial summary'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('[financial-summary-route] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
