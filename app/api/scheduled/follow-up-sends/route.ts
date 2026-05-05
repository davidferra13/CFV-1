// Scheduled Follow-Up Sends Processor
// GET /api/scheduled/follow-up-sends
// Drains the follow_up_sends table: picks up pending sends whose scheduled_for <= now,
// renders the appropriate email template, and sends via Resend.
// This is the MISSING cron that connects schedulePostEventFollowUp (which inserts rows)
// to processPendingSend (which sends the emails).
// Without this route, post-event thank-yous, rebooking nudges, and seasonal teasers
// are silently never sent.

import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { getNextPendingSends, processPendingSend } from '@/lib/follow-up/sequence-engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('follow-up-sends', async () => {
      const pendingSends = await getNextPendingSends(50)

      if (pendingSends.length === 0) {
        return { processed: 0, sent: 0, failed: 0, message: 'No pending sends' }
      }

      let sent = 0
      let failed = 0

      for (const send of pendingSends) {
        try {
          const success = await processPendingSend(send.id)
          if (success) {
            sent++
          } else {
            failed++
          }
        } catch (err) {
          console.error(`[follow-up-sends] Error processing send ${send.id}:`, err)
          failed++
        }
      }

      return {
        processed: pendingSends.length,
        sent,
        failed,
        message: `Processed ${pendingSends.length} sends: ${sent} sent, ${failed} failed`,
      }
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[follow-up-sends] Cron failed:', err)
    return NextResponse.json({ error: 'Follow-up sends cron failed' }, { status: 500 })
  }
}
