import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

const startTime = new Date().toISOString()

export async function GET(request: NextRequest) {
  const secret = process.env.SENTINEL_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Sentinel not configured' }, { status: 503 })
  }

  const provided = request.headers.get('x-sentinel-secret') ?? ''
  if (!provided || provided.length !== secret.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const isValid = timingSafeEqual(Buffer.from(provided), Buffer.from(secret))
  if (!isValid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    upSince: startTime,
    timestamp: new Date().toISOString(),
  })
}
