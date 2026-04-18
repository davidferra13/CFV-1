import { createAdminClient } from '@/lib/db/admin'
import { recordCronError, recordCronHeartbeat } from './heartbeat'
import {
  CRON_MONITOR_DEFINITION_MAP,
  CRON_MONITOR_DEFINITIONS,
  type CronMonitorDefinition,
} from './definitions'

type CronExecutionRow = {
  cron_name: string
  executed_at: string
  status: 'success' | 'error'
  duration_ms: number | null
  error_text: string | null
  result?: unknown
}

export type CronHealthStatus = 'ok' | 'stale' | 'missing'
export type CronAlertLevel = 'info' | 'warning' | 'critical'

export type CronHealthEntry = {
  cronName: string
  routePath: string
  cadence: CronMonitorDefinition['cadence']
  description: string
  status: CronHealthStatus
  alertLevel: CronAlertLevel
  lastRunAt: string | null
  lastStatus: 'success' | 'error' | null
  lastSuccessAt: string | null
  lastErrorAt: string | null
  minutesSinceLastRun: number | null
  maxExpectedMinutes: number
  runsLast24h: number
  successesLast24h: number
  errorsLast24h: number
  errorRateLast24h: number | null
  issueRunsLast24h: number
  issueRateLast24h: number | null
  latestIssueCount: number
  avgDurationMsLast24h: number | null
  p95DurationMsLast24h: number | null
  latestErrorText: string | null
  message: string
}

export type CronHealthReport = {
  healthy: boolean
  checkedAt: string
  summary: {
    total: number
    ok: number
    stale: number
    missing: number
    warning: number
    critical: number
  }
  staleCrons: string[]
  missingCrons: string[]
  warningCrons: string[]
  criticalCrons: string[]
  crons: CronHealthEntry[]
}

export function summarizeCronResult(value: unknown, depth = 0): Record<string, unknown> {
  const normalized = normalizeCronResultValue(value, depth)
  if (normalized && typeof normalized === 'object' && !Array.isArray(normalized)) {
    return normalized as Record<string, unknown>
  }
  return { value: normalized }
}

function normalizeCronResultValue(value: unknown, depth: number): unknown {
  if (value == null) return null
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 497)}...` : value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    if (depth >= 1) return { count: value.length }
    return value.slice(0, 10).map((item) => normalizeCronResultValue(item, depth + 1))
  }
  if (typeof value === 'object') {
    if (depth >= 2) {
      return { keys: Object.keys(value as Record<string, unknown>).length }
    }
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, 25)
        .map(([key, entryValue]) => [key, normalizeCronResultValue(entryValue, depth + 1)])
    )
  }
  return String(value)
}

export async function runMonitoredCronJob<T>(cronName: string, job: () => Promise<T>): Promise<T> {
  const startedAt = Date.now()
  try {
    const result = await job()
    await recordCronHeartbeat(cronName, summarizeCronResult(result), Date.now() - startedAt)
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await recordCronError(cronName, message, Date.now() - startedAt)
    throw error
  }
}

export async function buildCronHealthReport(
  definitions: readonly CronMonitorDefinition[] = CRON_MONITOR_DEFINITIONS
): Promise<CronHealthReport> {
  const db: any = createAdminClient()
  const now = new Date()
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('cron_executions')
    .select('cron_name, executed_at, status, duration_ms, error_text, result')
    .gte('executed_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('executed_at', { ascending: false })
    .limit(5000)

  if (error) {
    throw new Error(`Failed to query cron execution log: ${error.message}`)
  }

  const rows = (data ?? []) as CronExecutionRow[]
  const rowsByName = new Map<string, CronExecutionRow[]>()

  for (const row of rows) {
    const bucket = rowsByName.get(row.cron_name) ?? []
    bucket.push(row)
    rowsByName.set(row.cron_name, bucket)
  }

  const crons = definitions.map((definition) =>
    buildCronHealthEntry(definition, rowsByName.get(definition.cronName) ?? [], now, since24h)
  )

  const staleCrons = crons
    .filter((entry) => entry.status === 'stale')
    .map((entry) => entry.cronName)
  const missingCrons = crons
    .filter((entry) => entry.status === 'missing')
    .map((entry) => entry.cronName)
  const warningCrons = crons
    .filter((entry) => entry.alertLevel === 'warning')
    .map((entry) => entry.cronName)
  const criticalCrons = crons
    .filter((entry) => entry.alertLevel === 'critical')
    .map((entry) => entry.cronName)

  return {
    healthy: criticalCrons.length === 0,
    checkedAt: now.toISOString(),
    summary: {
      total: crons.length,
      ok: crons.filter((entry) => entry.status === 'ok').length,
      stale: staleCrons.length,
      missing: missingCrons.length,
      warning: warningCrons.length,
      critical: criticalCrons.length,
    },
    staleCrons,
    missingCrons,
    warningCrons,
    criticalCrons,
    crons,
  }
}

function buildCronHealthEntry(
  definition: CronMonitorDefinition,
  rows: CronExecutionRow[],
  now: Date,
  since24hIso: string
): CronHealthEntry {
  const latest = rows[0] ?? null
  const lastSuccess = rows.find((row) => row.status === 'success') ?? null
  const lastError = rows.find((row) => row.status === 'error') ?? null
  const recent = rows.filter((row) => row.executed_at >= since24hIso)
  const recentDurations = recent
    .map((row) => row.duration_ms)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    .sort((left, right) => left - right)
  const issueRunsLast24h = recent.filter((row) => getCronIssueCount(row.result) > 0).length

  const minutesSinceLastRun = latest
    ? Math.round((now.getTime() - new Date(latest.executed_at).getTime()) / 60_000)
    : null
  const errorsLast24h = recent.filter((row) => row.status === 'error').length
  const successesLast24h = recent.filter((row) => row.status === 'success').length
  const errorRateLast24h =
    recent.length > 0 ? Number(((errorsLast24h / recent.length) * 100).toFixed(1)) : null
  const issueRateLast24h =
    recent.length > 0 ? Number(((issueRunsLast24h / recent.length) * 100).toFixed(1)) : null
  const avgDurationMsLast24h =
    recentDurations.length > 0
      ? Math.round(
          recentDurations.reduce((sum, duration) => sum + duration, 0) / recentDurations.length
        )
      : null
  const p95DurationMsLast24h =
    recentDurations.length > 0
      ? recentDurations[
          Math.min(recentDurations.length - 1, Math.floor(recentDurations.length * 0.95))
        ]
      : null
  const latestIssueCount = latest ? getCronIssueCount(latest.result) : 0

  if (!latest) {
    return {
      cronName: definition.cronName,
      routePath: definition.routePath,
      cadence: definition.cadence,
      description: definition.description,
      status: 'missing',
      alertLevel: 'critical',
      lastRunAt: null,
      lastStatus: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      minutesSinceLastRun: null,
      maxExpectedMinutes: definition.maxExpectedMinutes,
      runsLast24h: 0,
      successesLast24h: 0,
      errorsLast24h: 0,
      errorRateLast24h: null,
      issueRunsLast24h: 0,
      issueRateLast24h: null,
      latestIssueCount: 0,
      avgDurationMsLast24h: null,
      p95DurationMsLast24h: null,
      latestErrorText: null,
      message: `No heartbeat found for ${definition.routePath}. Add monitoring or schedule the job.`,
    }
  }

  const isStale = (minutesSinceLastRun ?? 0) > definition.maxExpectedMinutes
  const isLatestError = latest.status === 'error'
  const highErrorRate = (errorRateLast24h ?? 0) >= 25
  const hasLatestIssues = latestIssueCount > 0
  const highIssueRate = (issueRateLast24h ?? 0) >= 25
  const slowCron = definition.maxExpectedMinutes <= 30 && (avgDurationMsLast24h ?? 0) >= 15_000

  const alertLevel: CronAlertLevel = isStale
    ? 'critical'
    : isLatestError || highErrorRate || hasLatestIssues || highIssueRate
      ? 'warning'
      : slowCron
        ? 'warning'
        : 'info'

  const messageParts = [
    isStale
      ? `Last run ${minutesSinceLastRun} minutes ago; expected within ${definition.maxExpectedMinutes} minutes.`
      : `Last run ${minutesSinceLastRun} minutes ago.`,
  ]

  if (isLatestError && lastError?.error_text) {
    messageParts.push(`Latest error: ${truncate(lastError.error_text, 180)}`)
  }
  if (highErrorRate && errorRateLast24h !== null) {
    messageParts.push(`24h error rate ${errorRateLast24h}% across ${recent.length} runs.`)
  }
  if (hasLatestIssues) {
    messageParts.push(`Latest run reported ${latestIssueCount} issue(s).`)
  }
  if (highIssueRate && issueRateLast24h !== null) {
    messageParts.push(`24h issue rate ${issueRateLast24h}% across ${recent.length} runs.`)
  }
  if (slowCron && avgDurationMsLast24h !== null) {
    messageParts.push(`Average duration ${avgDurationMsLast24h}ms in the last 24h.`)
  }

  return {
    cronName: definition.cronName,
    routePath: definition.routePath,
    cadence: definition.cadence,
    description: definition.description,
    status: isStale ? 'stale' : 'ok',
    alertLevel,
    lastRunAt: latest.executed_at,
    lastStatus: latest.status,
    lastSuccessAt: lastSuccess?.executed_at ?? null,
    lastErrorAt: lastError?.executed_at ?? null,
    minutesSinceLastRun,
    maxExpectedMinutes: definition.maxExpectedMinutes,
    runsLast24h: recent.length,
    successesLast24h,
    errorsLast24h,
    errorRateLast24h,
    issueRunsLast24h,
    issueRateLast24h,
    latestIssueCount,
    avgDurationMsLast24h,
    p95DurationMsLast24h,
    latestErrorText: lastError?.error_text ?? null,
    message: messageParts.join(' '),
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value
}

export async function sendCronHealthAlerts(report: CronHealthReport): Promise<void> {
  if (report.criticalCrons.length === 0 && report.warningCrons.length === 0) return

  const topEntries = report.crons
    .filter((entry) => entry.alertLevel !== 'info')
    .slice(0, 6)
    .map((entry) => `${entry.cronName}: ${entry.message}`)

  const severity = report.criticalCrons.length > 0 ? 'critical' : 'warning'

  const { sendDeveloperAlert } = await import('@/lib/email/developer-alerts')
  await sendDeveloperAlert({
    severity,
    system: 'cron-monitor',
    title:
      report.criticalCrons.length > 0
        ? `Cron monitor unhealthy: ${report.criticalCrons.length} critical`
        : `Cron monitor warning: ${report.warningCrons.length} issue(s)`,
    description: topEntries.join('\n'),
    context: {
      stale: String(report.staleCrons.length),
      missing: String(report.missingCrons.length),
      warning: String(report.warningCrons.length),
      critical: String(report.criticalCrons.length),
    },
  })
}

export function getCronMonitorDefinition(cronName: string) {
  return CRON_MONITOR_DEFINITION_MAP.get(cronName) ?? null
}

function getCronIssueCount(result: unknown): number {
  if (!result || typeof result !== 'object' || Array.isArray(result)) return 0

  const payload = result as Record<string, unknown>
  let count = 0

  if (payload.success === false || payload.ok === false) {
    count += 1
  }

  count += getNumericIssueCount(payload.failed)
  count += getNumericIssueCount(payload.failures)
  count += getNumericIssueCount(payload.errorCount)
  count += getNumericIssueCount(payload.errors)
  count += getArrayIssueCount(payload.errors)

  return count
}

function getNumericIssueCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function getArrayIssueCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}
