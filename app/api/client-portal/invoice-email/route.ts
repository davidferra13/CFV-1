// API Route: Client Portal Invoice Email Request
// POST /api/client-portal/invoice-email
// Body: { token, eventId, ccEmail? }
// Token-based access (no auth session required).

import { NextResponse } from 'next/server'
import { requestInvoiceEmailFromPortal } from '@/lib/invoices/delivery-actions'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, eventId, ccEmail } = body

    if (!token || !eventId) {
      return NextResponse.json(
        { status: 'error', message: 'Missing token or eventId' },
        { status: 400 }
      )
    }

    const result = await requestInvoiceEmailFromPortal(token, eventId, ccEmail || undefined)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[client-portal-invoice-email] Error:', err)
    return NextResponse.json({ status: 'error', message: 'Internal error' }, { status: 500 })
  }
}
