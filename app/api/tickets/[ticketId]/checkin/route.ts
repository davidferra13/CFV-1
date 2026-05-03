// Ticket QR Check-In Endpoint
// GET /api/tickets/[ticketId]/checkin?token=...
// When chef scans a guest's QR code, this marks them as checked in
// and redirects to the event tickets tab.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'

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
    .select('id, guest_token, event_id, buyer_name, quantity, payment_status, attended')
    .eq('id', ticketId)
    .eq('guest_token', token)
    .single()

  if (!ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  if (ticket.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Ticket not confirmed' }, { status: 400 })
  }

  // Mark as attended
  if (!ticket.attended) {
    await db.from('event_tickets').update({ attended: true }).eq('id', ticketId)
  }

  // Redirect to event page with success message
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const redirectUrl = `${appUrl}/events/${ticket.event_id}?checkin=${ticket.buyer_name}&qty=${ticket.quantity}`

  return NextResponse.redirect(redirectUrl)
}
