// Cron Health Monitor Endpoint
// GET /api/scheduled/monitor - check that all scheduled jobs have run recently
// POST /api/scheduled/monitor - same (supports manual invocation)
//
// This route now uses the shared cron registry so the monitor, readiness checks,
// and daily digest all evaluate the same scheduler surface. In addition to
// stale/missing heartbeats, it reports 24-hour error rates and duration trends.

import { NextResponse, type NextRequest } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import {
  buildCronHealthReport,
  sendCronHealthAlerts,
  summarizeCronResult,
} from '@/lib/cron/monitor'
import { recordCronError, recordCronHeartbeat } from '@/lib/cron/heartbeat'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handleMonitor(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const strict = request.nextUrl.searchParams.get('strict') === '1'
  const notify = request.nextUrl.searchParams.get('notify') !== '0'
  const startedAt = Date.now()

  try {
    const report = await buildCronHealthReport()

    if (notify) {
      await sendCronHealthAlerts(report)
    }

    await recordCronHeartbeat(
      'monitor',
      summarizeCronResult({
        healthy: report.healthy,
        summary: report.summary,
        staleCrons: report.staleCrons,
        missingCrons: report.missingCrons,
        warningCrons: report.warningCrons,
        criticalCrons: report.criticalCrons,
      }),
      Date.now() - startedAt
    )

    return NextResponse.json(report, {
      status: strict && !report.healthy ? 503 : 200,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CronMonitor] Failed to build monitor report:', error)
    await recordCronError('monitor', message, Date.now() - startedAt)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export { handleMonitor as GET, handleMonitor as POST }
