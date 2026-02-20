// API Route: Quote/Proposal PDF
// GET /api/documents/quote/[quoteId]
// Returns PDF with inline disposition for browser viewing or downloading.
// Auth: requires chef with ownership of the quote (tenant-scoped in generateQuote).

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { generateQuote } from '@/lib/documents/generate-quote'
import { format } from 'date-fns'

export async function GET(
  _request: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    await requireChef()

    const { quoteId } = params
    const pdfBuffer = await generateQuote(quoteId)

    const dateSuffix = format(new Date(), 'yyyy-MM-dd')
    const filename = `quote-${dateSuffix}.pdf`

    const bytes = new Uint8Array(pdfBuffer)
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate quote'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('[quote/route] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
