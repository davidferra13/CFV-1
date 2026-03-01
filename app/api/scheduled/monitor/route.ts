// Cron Health Monitor Endpoint
// GET /api/scheduled/monitor — check that all crons have run recently
// POST /api/scheduled/monitor — same (supports manual invocation)
//
// For each registered cron, checks whether a heartbeat exists in
// cron_executions within 2x the expected schedule interval.
//
// Returns a JSON summary of all crons with status: 'ok' | 'stale' | 'missing'
// plus an overall health flag.
//
// This route itself can be added to vercel.json to run hourly:
//   { "path": "/api/scheduled/monitor", "schedule": "30 * * * *" }
// (offset to 30 min past the hour so it doesn't collide with other hourly crons)

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'

// Expected max interval (minutes) for each cron, derived from vercel.json schedules.
// We alert if the last heartbeat is older than 2x this value.
const CRON_EXPECTED_INTERVALS: Record<string, number> = {
  // 5-minute crons — alert if stale > 10 min
  'gmail-sync': 10,
  'integrations-pull': 10,
  'wix-process': 10,
  'social-publish': 10,
  // 15-minute crons — alert if stale > 30 min
  automations: 30,
  copilot: 30,
  'email-history-scan': 30,
  // 30-minute crons — alert if stale > 60 min
  'call-reminders': 60,
  // Hourly crons — alert if stale > 2 hours
  'integrations-retry': 120,
  campaigns: 120,
  // 6-hour crons — alert if stale > 12 hours
  'revenue-goals': 720,
  'follow-ups': 720,
  'reviews-sync': 720,
  // Daily crons — alert if stale > 48 hours (some may be skipped on weekends or holidays)
  lifecycle: 2880,
  sequences: 2880,
  'activity-cleanup': 2880,
  'loyalty-expiry': 2880,
  'waitlist-sweep': 2880,
  'push-cleanup': 2880,
}

type CronStatus = {
  cronName: string
  status: 'ok' | 'stale' | 'missing'
  lastRunAt: string | null
  lastStatus: string | null
  minutesSinceLastRun: number | null
  maxExpectedMinutes: number
  message: string
}

async function handleMonitor(request: NextRequest): Promise<NextResponse> {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  const supabase = createServerClient({ admin: true })
  const now = new Date()

  // Fetch the most recent execution for each cron name
  const db = supabase as any
  const { data: recentRunsRaw, error } = await db
    .from('cron_executions')
    .select('cron_name, executed_at, status')
    .order('executed_at', { ascending: false })
  const parsedRuns: any[] = recentRunsRaw ?? []

  if (error) {
    console.error('[CronMonitor] Failed to query cron_executions:', error)
    return NextResponse.json({ error: 'Failed to query cron execution log' }, { status: 500 })
  }

  // Build a map of cron_name → most recent execution
  const latestByName = new Map<string, { executed_at: string; status: string }>()
  for (const row of parsedRuns) {
    if (!latestByName.has(row.cron_name)) {
      latestByName.set(row.cron_name, {
        executed_at: row.executed_at,
        status: row.status,
      })
    }
  }

  const cronStatuses: CronStatus[] = []
  let hasStale = false
  let hasMissing = false

  for (const [cronName, maxMinutes] of Object.entries(CRON_EXPECTED_INTERVALS)) {
    const latest = latestByName.get(cronName)

    if (!latest) {
      // Never recorded — either newly deployed or heartbeat not added yet
      cronStatuses.push({
        cronName,
        status: 'missing',
        lastRunAt: null,
        lastStatus: null,
        minutesSinceLastRun: null,
        maxExpectedMinutes: maxMinutes,
        message: `No heartbeat found. Add recordCronHeartbeat('${cronName}') to this cron handler.`,
      })
      hasMissing = true
      continue
    }

    const lastRunAt = new Date(latest.executed_at)
    const minutesSince = Math.round((now.getTime() - lastRunAt.getTime()) / (1000 * 60))

    if (minutesSince > maxMinutes) {
      cronStatuses.push({
        cronName,
        status: 'stale',
        lastRunAt: latest.executed_at,
        lastStatus: latest.status,
        minutesSinceLastRun: minutesSince,
        maxExpectedMinutes: maxMinutes,
        message: `Last run was ${minutesSince} minutes ago. Expected within ${maxMinutes} minutes.`,
      })
      hasStale = true
    } else {
      cronStatuses.push({
        cronName,
        status: 'ok',
        lastRunAt: latest.executed_at,
        lastStatus: latest.status,
        minutesSinceLastRun: minutesSince,
        maxExpectedMinutes: maxMinutes,
        message: `OK — last run ${minutesSince} minutes ago.`,
      })
    }
  }

  const overallHealthy = !hasStale && !hasMissing
  const staleCrons = cronStatuses.filter((c) => c.status === 'stale').map((c) => c.cronName)
  const missingCrons = cronStatuses.filter((c) => c.status === 'missing').map((c) => c.cronName)

  const result = {
    healthy: overallHealthy,
    checkedAt: now.toISOString(),
    summary: {
      total: cronStatuses.length,
      ok: cronStatuses.filter((c) => c.status === 'ok').length,
      stale: staleCrons.length,
      missing: missingCrons.length,
    },
    staleCrons,
    missingCrons,
    crons: cronStatuses,
  }

  if (!overallHealthy) {
    console.error('[CronMonitor] Unhealthy crons detected:', {
      stale: staleCrons,
      missing: missingCrons,
    })
  } else {
    console.log('[CronMonitor] All crons healthy.', result.summary)
  }

  // Return 200 even if unhealthy — the caller interprets result.healthy
  // Returning non-200 would cause Vercel to retry the monitor itself
  return NextResponse.json(result)
}

export { handleMonitor as GET, handleMonitor as POST }
