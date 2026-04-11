// Developer Alerts - System health notifications for DFPrivateChef@gmail.com
//
// Two channels:
//   1. Immediate alerts - rate-limited per service, fired on circuit breaker trips, cron failures, errors
//   2. Daily digest - aggregated system health summary sent at 7 AM EST
//
// All functions are non-blocking: they log errors but never throw.
// No 'use server' directive - this is a utility module, not a server action file.

import { createElement } from 'react'
import {
  buildCronHealthReport,
  type CronAlertLevel,
  type CronHealthEntry as MonitoredCronHealthEntry,
} from '@/lib/cron/monitor'
import { getCircuitBreakerHealth } from '@/lib/resilience/circuit-breaker'
import { getDeveloperNotificationRecipients } from '@/lib/platform/owner-account'
import { sendEmail } from './send'
import { DeveloperAlertEmail } from './templates/developer-alert'
import {
  DeveloperDigestEmail,
  type CircuitEntry,
  type CronHealthEntry,
  type RecentError,
} from './templates/developer-digest'

const DEV_EMAIL_RECIPIENTS = getDeveloperNotificationRecipients()

// Rate limiting (in-memory, per serverless instance)
const lastAlertTime = new Map<string, number>()
const RATE_LIMIT_MS = 15 * 60 * 1000 // 15 minutes per service

type DigestCronHealthStatus = CronHealthEntry['status']

function isRateLimited(service: string): boolean {
  const last = lastAlertTime.get(service)
  if (!last) return false
  return Date.now() - last < RATE_LIMIT_MS
}

function recordAlert(service: string): void {
  lastAlertTime.set(service, Date.now())
}

export type AlertParams = {
  severity: 'warning' | 'error' | 'critical'
  system: string
  title: string
  description: string
  context?: Record<string, string>
}

export function toDigestCronHealthEntry(entry: MonitoredCronHealthEntry): CronHealthEntry {
  return {
    name: entry.cronName,
    status: resolveDigestCronStatus(entry.status, entry.alertLevel, entry.lastStatus),
    lastRunAt: entry.lastRunAt,
    minutesSince: entry.minutesSinceLastRun,
    message: entry.message,
  }
}

function resolveDigestCronStatus(
  status: MonitoredCronHealthEntry['status'],
  alertLevel: CronAlertLevel,
  lastStatus: MonitoredCronHealthEntry['lastStatus']
): DigestCronHealthStatus {
  if (status === 'missing') return 'missing'
  if (status === 'stale') return 'stale'
  if (lastStatus === 'error') return 'error'
  if (alertLevel === 'warning') return 'warning'
  return 'ok'
}

/**
 * Send an immediate developer alert email. Rate-limited per system.
 * Non-blocking: wraps in try/catch, never throws.
 */
export async function sendDeveloperAlert(params: AlertParams): Promise<void> {
  try {
    if (isRateLimited(params.system)) {
      console.log(`[dev-alert] Rate-limited: ${params.system} (skipping "${params.title}")`)
      return
    }

    recordAlert(params.system)

    const react = createElement(DeveloperAlertEmail, {
      ...params,
      timestamp: new Date().toISOString(),
    })

    const sent = await sendEmail({
      to: DEV_EMAIL_RECIPIENTS,
      subject: `[${params.severity.toUpperCase()}] ${params.title}`,
      react,
    })

    if (sent) {
      console.log(`[dev-alert] Sent: [${params.severity}] ${params.title}`)
    } else {
      console.warn(`[dev-alert] Failed to send: ${params.title}`)
    }
  } catch (err) {
    console.error('[dev-alert] Error sending alert:', err)
  }
}

/**
 * Gather system health data and send the daily digest email.
 * Called by /api/cron/developer-digest.
 * Returns a summary object for the cron heartbeat.
 */
export async function sendDeveloperDigest(): Promise<{
  sent: boolean
  summary: string
  cronHealthy: number
  cronUnhealthy: number
  openCircuits: number
  recentErrorCount: number
  ollamaOnline: boolean
}> {
  try {
    const { createAdminClient } = await import('@/lib/db/admin')
    const db = createAdminClient()
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    const cronReport = await buildCronHealthReport()
    const cronHealth: CronHealthEntry[] = cronReport.crons.map(toDigestCronHealthEntry)

    const { data: recentErrorRows } = await db
      .from('cron_executions')
      .select('cron_name, executed_at, error_text')
      .eq('status', 'error')
      .gte('executed_at', twentyFourHoursAgo)
      .order('executed_at', { ascending: false })
      .limit(20)

    const recentErrors: RecentError[] = (recentErrorRows ?? []).map((row: any) => ({
      cronName: row.cron_name,
      errorText: row.error_text || 'Unknown error',
      time: row.executed_at,
    }))

    const cbHealth = getCircuitBreakerHealth()
    const circuits: CircuitEntry[] = Object.entries(cbHealth).map(([name, info]) => ({
      name,
      state: info.state,
      failures: info.failures,
    }))

    const { getOllamaConfig } = await import('@/lib/ai/providers')
    const aiConfig = getOllamaConfig()
    let ollamaStatus = { online: false, latencyMs: undefined as number | undefined }
    try {
      const start = Date.now()
      const res = await fetch(`${aiConfig.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        ollamaStatus = { online: true, latencyMs: Date.now() - start }
      }
    } catch {
      // AI runtime not responding
    }

    const cronUnhealthy = cronHealth.filter((entry) => entry.status !== 'ok').length
    const cronHealthy = cronHealth.length - cronUnhealthy
    const openCircuits = circuits.filter((entry) => entry.state !== 'CLOSED').length
    const overallHealthy =
      cronUnhealthy === 0 && openCircuits === 0 && recentErrors.length === 0 && ollamaStatus.online

    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York',
    })

    const react = createElement(DeveloperDigestEmail, {
      date: dateStr,
      cronHealth,
      circuits,
      recentErrors,
      ollamaStatus,
      overallHealthy,
    })

    const subject = overallHealthy
      ? `Daily Digest ${dateStr} - All Healthy`
      : `Daily Digest ${dateStr} - ${cronUnhealthy + openCircuits + recentErrors.length} issue(s)`

    const sent = await sendEmail({
      to: DEV_EMAIL_RECIPIENTS,
      subject,
      react,
    })

    const summary = overallHealthy
      ? 'All systems healthy'
      : `${cronUnhealthy} unhealthy cron(s), ${openCircuits} open circuit(s), ${recentErrors.length} error(s)`

    console.log(`[dev-digest] ${sent ? 'Sent' : 'Failed'}: ${summary}`)

    return {
      sent,
      summary,
      cronHealthy,
      cronUnhealthy,
      openCircuits,
      recentErrorCount: recentErrors.length,
      ollamaOnline: ollamaStatus.online,
    }
  } catch (err) {
    console.error('[dev-digest] Error building digest:', err)
    return {
      sent: false,
      summary: `Digest failed: ${err instanceof Error ? err.message : String(err)}`,
      cronHealthy: 0,
      cronUnhealthy: 0,
      openCircuits: 0,
      recentErrorCount: 0,
      ollamaOnline: false,
    }
  }
}
