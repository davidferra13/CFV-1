import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/**
 * Validate CRON_SECRET bearer token on scheduled/cron route handlers.
 *
 * Returns null if the request is authenticated.
 * Returns a NextResponse (401/500) if the request should be rejected.
 *
 * Uses timing-safe comparison to prevent timing attacks on the secret.
 */
export function verifyCronAuth(authHeader: string | null): NextResponse | null {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const expected = `Bearer ${secret}`
  const actual = authHeader ?? ''

  // Timing-safe comparison - prevent timing attacks
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null // authenticated
}
