import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { requireAuth } from '@/lib/auth/get-user'
import { generateReceipt, generateReceiptForChef } from '@/lib/documents/generate-receipt'

// Both client and chef can download a receipt.
// Client: scoped by client_id (their own event only).
// Chef: scoped by tenant_id (their own events only).

export async function GET(_request: Request, { params }: { params: { eventId: string } }) {
  try {
    const user = await requireAuth()

    const pdfBuffer =
      user.role === 'chef'
        ? await generateReceiptForChef(params.eventId)
        : await generateReceipt(params.eventId)

    const bytes = new Uint8Array(pdfBuffer)
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${dateSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate receipt'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message.includes('not found')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    console.error('[receipt-route] Error:', error)
    return NextResponse.json({ error: 'Failed to generate receipt' }, { status: 500 })
  }
}
