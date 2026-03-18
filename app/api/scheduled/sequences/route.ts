// Sequence Processing Cron
// Fires pending sequence enrollment steps and checks for new birthday enrollments.
// Called daily by scheduled cron. Protected by CRON_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { processSequences, processBirthdayEnrollments } from '@/lib/marketing/actions'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) {
    return authError
  }

  try {
    // Run birthday enrollment check and step processing in parallel
    const [birthdays, steps] = await Promise.all([
      processBirthdayEnrollments()
        .then(() => 'ok')
        .catch((e: unknown) => String(e)),
      processSequences(),
    ])

    return NextResponse.json({
      ok: true,
      stepsProcessed: steps.processed,
      birthdayCheck: birthdays,
    })
  } catch (err) {
    console.error('[cron/sequences] Error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
