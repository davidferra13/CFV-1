// Scheduled Campaign Cron
// Fires any marketing campaigns whose scheduled_at is now or in the past.
// Called hourly by Vercel Cron. Protected by CRON_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import { processScheduledCampaigns } from '@/lib/marketing/actions'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processScheduledCampaigns()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[cron/campaigns] Error:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
