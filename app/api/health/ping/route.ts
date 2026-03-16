/**
 * GET /api/health/ping
 *
 * Ultra-fast health check - no database, no Redis, no external calls.
 * Returns in <50ms for uptime monitors with tight timeouts.
 * Use /api/health for the full deep check with DB + Redis.
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}

export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
