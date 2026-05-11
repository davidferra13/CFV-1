import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { fireReminders } from '@/lib/todos/actions'

export const dynamic = 'force-dynamic'

/**
 * Dedicated cron endpoint for todo reminder delivery.
 * Fires pending reminders (reminder_at <= now, not yet sent).
 * Decoupled from the AI background queue for reliability.
 */
export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('reminders', async () => {
      const { fired } = await fireReminders()
      return { processed: fired }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[cron/reminders] Failed:', msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
