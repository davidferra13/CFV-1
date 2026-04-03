import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'

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
    const result = await runMonitoredCronJob('circle-digest', async () => {
      const { processDigests } = await import('@/lib/hub/circle-digest')
      const hourlyResult = await processDigests('hourly')

      const currentHour = new Date().getUTCHours()
      let dailyResult = { sent: 0, skipped: 0 }
      if (currentHour === 9) {
        dailyResult = await processDigests('daily')
      }

      return {
        success: true,
        hourly: hourlyResult,
        daily: dailyResult,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('[circle-digest cron] Internal error:', err)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
