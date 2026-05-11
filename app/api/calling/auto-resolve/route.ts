/**
 * Auto-Resolve Cron Endpoint
 *
 * GET /api/calling/auto-resolve
 *
 * Scans all upcoming events (next 48 hours) across all tenants,
 * runs ingredient resolution, and queues calls for unresolved items.
 * Protected by CRON_SECRET bearer token.
 *
 * Usage:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        http://localhost:3100/api/calling/auto-resolve
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { autoResolveAll } from '@/lib/calling/auto-resolve'

async function handleAutoResolve(req: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('calling-auto-resolve', async () => {
      return autoResolveAll()
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/auto-resolve] Error:', err)
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

export { handleAutoResolve as GET, handleAutoResolve as POST }
