// Scheduled Campaign Cron
// Fires any marketing campaigns whose scheduled_at is now or in the past.
// Called hourly by scheduled cron. Protected by CRON_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { processScheduledCampaigns } from '@/lib/marketing/actions'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) {
    return authError
  }

  try {
    const result = await processScheduledCampaigns()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/campaigns] Error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
