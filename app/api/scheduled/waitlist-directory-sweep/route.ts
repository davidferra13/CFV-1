// Scheduled: Directory Waitlist Sweep
// Checks un-notified waitlist entries against discoverable chefs.
// When a chef's city/state matches a waitlist location, sends notification email.
// Runs daily. Entries are marked notified_at to prevent re-sends.

import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { sweepDirectoryWaitlist } from '@/lib/directory/waitlist-actions'

export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('waitlist-directory-sweep', async () => {
      return sweepDirectoryWaitlist()
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[waitlist-directory-sweep] Cron failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
