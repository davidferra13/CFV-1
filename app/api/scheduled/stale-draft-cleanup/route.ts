// Stale Draft Cleanup - Scheduled Cron Endpoint
// GET /api/scheduled/stale-draft-cleanup
// POST /api/scheduled/stale-draft-cleanup
//
// Deletes outbound draft messages older than 3 days so the proactive-draft
// engine regenerates fresh, contextually relevant drafts on its next run.
//
// Designed to run daily.

import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'
import { cleanupStaleDrafts } from '@/lib/inquiries/stale-draft-cleanup'

async function handleCleanup(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const startedAt = Date.now()

  try {
    const result = await cleanupStaleDrafts()

    await recordCronHeartbeat('stale-draft-cleanup', result, Date.now() - startedAt)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[stale-draft-cleanup] Cron failed:', message)
    await recordCronError('stale-draft-cleanup', message, Date.now() - startedAt)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

export { handleCleanup as GET, handleCleanup as POST }
