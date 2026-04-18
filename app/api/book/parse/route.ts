// Public NL Booking Parser API
// POST /api/book/parse
// Takes free-text event description, returns structured form fields.
// No auth required. Rate-limited by IP.

import { NextResponse, type NextRequest } from 'next/server'
import { parseBookingFromNL } from '@/lib/ai/booking-nl-parser'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return false
  }
  entry.count++
  return entry.count > 5 // 5 requests per minute
}

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const text = typeof body.text === 'string' ? body.text.trim() : ''

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
