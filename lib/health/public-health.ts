import { randomUUID } from 'crypto'
import { getRequestId } from '@/lib/observability/request-id'
import { CRON_MONITOR_DEFINITIONS } from '@/lib/cron/definitions'
import { buildCronHealthReport } from '@/lib/cron/monitor'
import { getCircuitBreakerHealth } from '@/lib/resilience/circuit-breaker'

export type PublicHealthStatus = 'ok' | 'degraded'
export type PublicHealthScope = 'health' | 'readiness'

type BackgroundJobSummary = {
  status: PublicHealthStatus
  summary: {
    required: number
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
  const requiredDefinitions = getRequiredCronDefinitionsForPublicHealth()

  if (requiredDefinitions.length === 0) {
    return {
      status: 'ok',
      summary: {
        required: 0,
        observedCrons: 0,
        missing: 0,
        stale: 0,
      },
      reason: 'no_required_crons_configured',
    }
  }

  if (!process.env.DATABASE_URL) {
    return {
      status: 'degraded',
      summary: {
        required: requiredDefinitions.length,
        observedCrons: 0,
        missing: requiredDefinitions.length,
        stale: 0,
      },
      reason: 'missing_database_url',
    }
  }

  try {
    const report = await buildCronHealthReport(requiredDefinitions)

    return {
      status: report.healthy ? 'ok' : 'degraded',
      summary: {
        required: requiredDefinitions.length,
        observedCrons: report.crons.filter((entry) => entry.lastRunAt).length,
        missing: report.missingCrons.length,
        stale: report.staleCrons.length,
      },
      reason: null,
    }
  } catch (error) {
    console.error('[public-health] Unexpected background job readiness error:', error)
    return {
      status: 'degraded',
      summary: {
        required: requiredDefinitions.length,
        observedCrons: 0,
        missing: requiredDefinitions.length,
        stale: 0,
      },
      reason: 'unexpected_error',
    }
  }
}

function getRequiredCronDefinitionsForPublicHealth() {
  const raw =
    process.env.PUBLIC_HEALTH_REQUIRED_CRONS?.trim() || process.env.READINESS_REQUIRED_CRONS?.trim()

  if (!raw) return []
  if (raw.toLowerCase() === 'all') return CRON_MONITOR_DEFINITIONS

  const requested = new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  )

  return CRON_MONITOR_DEFINITIONS.filter((definition) => requested.has(definition.cronName))
}

export async function buildPublicHealthSnapshot(
  options: BuildSnapshotOptions
): Promise<PublicHealthSnapshot> {
  const requestId = getRequestId() ?? randomUUID()
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

  let dbStatus = missingEnv.includes('DATABASE_URL') ? 'missing_env' : 'ok'
  let dbHealthy = dbStatus === 'ok'
  let dbDetails: Record<string, unknown> = {}

  if (dbHealthy && process.env.PUBLIC_HEALTH_SKIP_DB_BOOT_CONTRACT !== '1') {
    const { inspectLiveDbBootContract } = await import('@/lib/db/boot-contract')
    const contract = await inspectLiveDbBootContract()

    dbStatus = contract.status
    dbHealthy = contract.status === 'ok'
    dbDetails = {
      dbContractCheckedAt: contract.checkedAt,
      dbContractVersion: contract.contractVersion,
      dbMissingObjects: contract.missingObjects.map((check) => check.id),
      dbMissingReadinessObjects: contract.missingReadinessObjects.map((check) => check.id),
      ...(contract.errorMessage ? { dbContractError: contract.errorMessage } : {}),
    }
  } else if (process.env.PUBLIC_HEALTH_SKIP_DB_BOOT_CONTRACT === '1') {
    dbDetails = {
      dbContractSkipped: true,
      dbContractSkipReason: 'PUBLIC_HEALTH_SKIP_DB_BOOT_CONTRACT',
    }
  } else {
    dbDetails = {
      dbContractSkipped: true,
      dbContractSkipReason: 'missing_database_url',
    }
  }

  const envHealthy = missingEnv.length === 0
  const circuitBreakersHealthy = degradedCircuitBreakers.length === 0
  const backgroundJobsHealthy = backgroundJobs ? backgroundJobs.status === 'ok' : true
  const status: PublicHealthStatus =
    envHealthy && circuitBreakersHealthy && backgroundJobsHealthy && dbHealthy ? 'ok' : 'degraded'

  return {
    requestId,
    status,
    body: {
      status,
      timestamp,
      requestId,
      checks: {
        env: envHealthy ? 'ok' : 'missing',
        db: dbStatus,
        circuitBreakers: circuitBreakersHealthy ? 'ok' : 'degraded',
        ...(backgroundJobs ? { backgroundJobs: backgroundJobs.status } : {}),
      },
      details: {
        missingEnvCount: missingEnv.length,
        ...dbDetails,
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
