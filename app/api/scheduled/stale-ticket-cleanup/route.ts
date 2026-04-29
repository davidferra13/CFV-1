// Stale Ticket Cleanup - Scheduled Cron Endpoint
// GET /api/scheduled/stale-ticket-cleanup
// POST /api/scheduled/stale-ticket-cleanup

import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'
import { cleanupStalePendingTickets } from '@/lib/tickets/stale-pending-cleanup'

const CRON_NAME = 'stale-ticket-cleanup'

async function handleCleanup(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startedAt = Date.now()

  try {
    const result = await cleanupStalePendingTickets()

    await recordCronHeartbeat(CRON_NAME, result, Date.now() - startedAt)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stale-ticket-cleanup] Cron failed:', message)
    await recordCronError(CRON_NAME, message, Date.now() - startedAt)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

export { handleCleanup as GET, handleCleanup as POST }
