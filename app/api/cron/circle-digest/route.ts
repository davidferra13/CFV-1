import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

// ---------------------------------------------------------------------------
// Circle Digest Cron
// Sends batched email digests to members with digest_mode = 'hourly' or 'daily'.
// Schedule: Every hour via scheduled cron.
// On each run, processes both 'hourly' digests and (at 9 AM UTC) 'daily' digests.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const { processDigests } = await import('@/lib/hub/circle-digest')

    // Always process hourly digests
    const hourlyResult = await processDigests('hourly')

    // Process daily digests at 9 AM UTC (roughly morning for US timezones)
    const currentHour = new Date().getUTCHours()
    let dailyResult = { sent: 0, skipped: 0 }
    if (currentHour === 9) {
      dailyResult = await processDigests('daily')
    }

    return NextResponse.json({
      success: true,
      hourly: hourlyResult,
      daily: dailyResult,
    })
  } catch (err) {
    console.error('[circle-digest cron] Failed:', err)
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
