// GET /api/cron/developer-digest
// Sends daily system health digest to the developer.
// Schedule: daily at 7 AM EST (12:00 UTC)
// Gated behind CRON_SECRET.

import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { sendDeveloperDigest } from '@/lib/email/developer-alerts'
import { recordCronHeartbeat, recordCronError } from '@/lib/cron/heartbeat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const start = Date.now()

  try {
    const result = await sendDeveloperDigest()
    const durationMs = Date.now() - start

    await recordCronHeartbeat(
      'developer-digest',
      result as unknown as Record<string, unknown>,
      durationMs
    )

    return NextResponse.json({
      message: result.sent ? 'Digest sent' : 'Digest failed to send',
      ...result,
      durationMs,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const durationMs = Date.now() - start

    console.error('[cron/developer-digest] Error:', err)
    await recordCronError('developer-digest', msg, durationMs)

    return NextResponse.json({ error: 'Digest generation failed' }, { status: 500 })
  }
}
