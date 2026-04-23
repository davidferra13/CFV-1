// Public NL Booking Parser API
// POST /api/book/parse
// Takes free-text event description, returns structured form fields.
// No auth required. Rate-limited by IP.

import { NextResponse, type NextRequest } from 'next/server'
import { parseBookingFromNL } from '@/lib/ai/booking-nl-parser'
import { guardPublicIntent } from '@/lib/security/public-intent-guard'

export async function POST(request: NextRequest) {
  try {
    const guard = await guardPublicIntent<{ text?: unknown }>({
      action: 'open-booking-parser',
      request,
      body: {
        maxBytes: 8 * 1024,
        invalidJsonMessage: 'Invalid booking parser request body',
        payloadTooLargeMessage: 'Booking parser request body is too large',
      },
      rateLimit: {
        ip: {
          keyPrefix: 'open-booking-parser:ip',
          max: 5,
          windowMs: 60_000,
          message: 'Too many requests',
        },
      },
    })
    if (!guard.ok) {
      return NextResponse.json({ error: guard.error.message }, { status: guard.error.status })
    }

    const body = guard.body
    const text = typeof body?.text === 'string' ? body.text.trim() : ''

    if (!text || text.length < 10 || text.length > 1000) {
      return NextResponse.json(
        { error: 'Please describe your event in 10-1000 characters' },
        { status: 400 }
      )
    }

    const fields = await parseBookingFromNL(text)
    return NextResponse.json(fields)
  } catch {
    return NextResponse.json(
      { error: 'Could not parse your description. Please fill out the form manually.' },
      { status: 500 }
    )
  }
}
