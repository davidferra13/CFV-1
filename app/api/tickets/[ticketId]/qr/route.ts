// Ticket QR Code Generator
// GET /api/tickets/[ticketId]/qr
// Returns a PNG QR code encoding the check-in URL for this ticket.
// Accessible via guest_token (no auth required for guest access).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import QRCode from 'qrcode'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await params
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  const db: any = createAdminClient()

  // Verify ticket exists and token matches
  const { data: ticket } = await db
    .from('event_tickets')
    .select('id, guest_token, event_id, buyer_name, quantity, payment_status')
    .eq('id', ticketId)
    .eq('guest_token', token)
    .single()

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  if (ticket.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Ticket not confirmed' }, { status: 400 })
  }

  // The QR code encodes a check-in URL that the chef can scan
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const checkInUrl = `${appUrl}/api/tickets/${ticketId}/checkin?token=${token}`

  const qrBuffer = await QRCode.toBuffer(checkInUrl, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#1c1917',
      light: '#fafaf9',
    },
    errorCorrectionLevel: 'M',
  })

  return new NextResponse(new Uint8Array(qrBuffer), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
