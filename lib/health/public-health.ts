import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCircuitBreakerHealth } from '@/lib/resilience/circuit-breaker'

export type PublicHealthStatus = 'ok' | 'degraded'
export type PublicHealthScope = 'health' | 'readiness'

const CRON_EXPECTED_INTERVALS: Record<string, number> = {
  'gmail-sync': 10,
  'integrations-pull': 10,
  'wix-process': 10,
  'social-publish': 10,
  automations: 30,
  copilot: 30,
  'email-history-scan': 30,
  'call-reminders': 60,
  'integrations-retry': 120,
  campaigns: 120,
  'revenue-goals': 720,
  'follow-ups': 720,
  'reviews-sync': 720,
  'wellbeing-signals': 720,
  lifecycle: 2880,
  sequences: 2880,
  'activity-cleanup': 2880,
  'loyalty-expiry': 2880,
  'waitlist-sweep': 2880,
  'push-cleanup': 2880,
  'renewal-reminders': 2880,
  'cooling-alert': 2880,
  'quarterly-checkin': 2880,
  'brand-monitor': 2880,
}

type BackgroundJobSummary = {
  status: PublicHealthStatus
  summary: {
    observedCrons: number
    missing: number
    stale: number
  }
  reason: string | null
}

type BuildSnapshotOptions = {
  includeBackgroundJobs?: boolean
  requiredEnvVars: readonly string[]
}

export type PublicHealthSnapshot = {
  requestId: string
  status: PublicHealthStatus
  body: {
    status: PublicHealthStatus
    timestamp: string
    requestId: string
    checks: Record<string, string>
    details: Record<string, unknown>
    build: {
      appEnv: string | undefined
      version: string | null
    }
  }
}

async function getBackgroundJobSummary(): Promise<BackgroundJobSummary> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      status: 'degraded',
      summary: {
        observedCrons: 0,
        missing: Object.keys(CRON_EXPECTED_INTERVALS).length,
        stale: 0,
      },
      reason: 'missing_supabase_admin_env',
    }
  }

  try {
    const supabase: any = createAdminClient()
    const { data: recentRunsRaw, error } = await supabase
      .from('cron_executions')
      .select('cron_name, executed_at')
      .order('executed_at', { ascending: false })

    if (error) {
      console.error('[public-health] Failed to query cron_executions:', error)
      return {
        status: 'degraded',
        summary: {
          observedCrons: 0,
          missing: Object.keys(CRON_EXPECTED_INTERVALS).length,
          stale: 0,
        },
        reason: 'cron_query_failed',
      }
    }

    const latestByName = new Map<string, string>()
    for (const row of recentRunsRaw ?? []) {
      if (!latestByName.has(row.cron_name)) {
        latestByName.set(row.cron_name, row.executed_at)
      }
    }

    const now = Date.now()
    let missing = 0
    let stale = 0

    for (const [cronName, maxMinutes] of Object.entries(CRON_EXPECTED_INTERVALS)) {
      const lastRunAt = latestByName.get(cronName)
      if (!lastRunAt) {
        missing += 1
        continue
      }

      const minutesSince = Math.round((now - new Date(lastRunAt).getTime()) / 60_000)
      if (minutesSince > maxMinutes) {
        stale += 1
      }
    }

    return {
      status: missing === 0 && stale === 0 ? 'ok' : 'degraded',
      summary: {
        observedCrons: latestByName.size,
        missing,
        stale,
      },
      reason: null,
    }
  } catch (error) {
    console.error('[public-health] Unexpected background job readiness error:', error)
    return {
      status: 'degraded',
      summary: {
        observedCrons: 0,
        missing: Object.keys(CRON_EXPECTED_INTERVALS).length,
        stale: 0,
      },
      reason: 'unexpected_error',
    }
  }
}

export async function buildPublicHealthSnapshot(
  options: BuildSnapshotOptions
): Promise<PublicHealthSnapshot> {
  const requestId = randomUUID()
  const timestamp = new Date().toISOString()
  const missingEnv = options.requiredEnvVars.filter((name) => !process.env[name])
  const circuitBreakers = getCircuitBreakerHealth()
  const degradedCircuitBreakers = Object.entries(circuitBreakers)
    .filter(([, value]) => value.state !== 'CLOSED')
    .map(([name, value]) => ({
      name,
      state: value.state,
      failures: value.failures,
    }))

  const backgroundJobs = options.includeBackgroundJobs ? await getBackgroundJobSummary() : null
  const envHealthy = missingEnv.length === 0
  const circuitBreakersHealthy = degradedCircuitBreakers.length === 0
  const backgroundJobsHealthy = backgroundJobs ? backgroundJobs.status === 'ok' : true
  const status: PublicHealthStatus =
    envHealthy && circuitBreakersHealthy && backgroundJobsHealthy ? 'ok' : 'degraded'

  return {
    requestId,
    status,
    body: {
      status,
      timestamp,
      requestId,
      checks: {
        env: envHealthy ? 'ok' : 'missing',
        circuitBreakers: circuitBreakersHealthy ? 'ok' : 'degraded',
        ...(backgroundJobs ? { backgroundJobs: backgroundJobs.status } : {}),
      },
      details: {
        missingEnv,
        circuitBreakers: degradedCircuitBreakers,
        ...(backgroundJobs
          ? {
              backgroundJobs: backgroundJobs.summary,
              backgroundJobReason: backgroundJobs.reason,
            }
          : {}),
      },
      build: {
        appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? process.env.NODE_ENV,
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      },
    },
  }
}

export function getPublicHealthResponseStatus(
  strict: boolean,
  healthStatus: PublicHealthStatus
): number {
  return strict && healthStatus !== 'ok' ? 503 : 200
}

export function getPublicHealthResponseHeaders(
  requestId: string,
  healthStatus: PublicHealthStatus,
  scope: PublicHealthScope
): Record<string, string> {
  return {
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Request-ID': requestId,
    'X-Health-Status': healthStatus,
    'X-Health-Scope': scope,
  }
}
