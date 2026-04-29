import { NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { runCulinaryRadarIngestion } from '@/lib/culinary-radar/ingest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('culinary-radar', runCulinaryRadarIngestion)
    return NextResponse.json({
      ...result,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (err) {
    console.error('[cron/culinary-radar] Internal error:', err)
    return NextResponse.json(
      { error: 'Culinary Radar ingestion failed. Check source health and database tables.' },
      { status: 500 }
    )
  }
}
