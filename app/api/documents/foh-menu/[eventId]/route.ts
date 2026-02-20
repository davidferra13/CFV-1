// API Route: Client-Accessible Front-of-House Menu PDF
// GET /api/documents/foh-menu/[eventId]
// Returns the printable FOH menu PDF for the authenticated client.
// Auth: requires client with ownership of the event.

import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { requireClient } from '@/lib/auth/get-user'
import { generateFrontOfHouseMenuForClient } from '@/lib/documents/generate-front-of-house-menu'

export async function GET(
  _request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    await requireClient()

    const pdfBuffer = await generateFrontOfHouseMenuForClient(params.eventId)
    const bytes = new Uint8Array(pdfBuffer)
    const dateSuffix = format(new Date(), 'yyyy-MM-dd')

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="front-of-house-menu-${dateSuffix}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate menu'

    if (message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (message.includes('missing event or menu data')) {
      return NextResponse.json({ error: 'Menu not available for this event' }, { status: 404 })
    }

    console.error('[foh-menu-route] Error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
