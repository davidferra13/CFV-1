// Sequence Processing Cron
// Fires pending sequence enrollment steps and checks for new birthday enrollments.
// Called daily by Vercel Cron. Protected by CRON_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import { processSequences, processBirthdayEnrollments } from '@/lib/marketing/actions'
import { processHolidayCampaignDrafts } from '@/lib/marketing/holiday-campaign-actions'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Run birthday enrollment, step processing, and holiday draft creation in parallel
    const [birthdays, steps, holidayDrafts] = await Promise.all([
      processBirthdayEnrollments()
        .then(() => 'ok')
        .catch((e: unknown) => String(e)),
      processSequences(),
      processHolidayCampaignDrafts().catch((e: unknown) => ({
        drafted: 0,
        skipped: 0,
        error: String(e),
      })),
    ])

    return NextResponse.json({
      ok: true,
      stepsProcessed: steps.processed,
      birthdayCheck: birthdays,
      holidayDraftsDrafted: (holidayDrafts as any).drafted ?? 0,
      holidayDraftsSkipped: (holidayDrafts as any).skipped ?? 0,
    })
  } catch (err) {
    console.error('[cron/sequences] Error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
