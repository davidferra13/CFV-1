// Developer Alerts - System health notifications for DFPrivateChef@gmail.com
//
// Two channels:
//   1. Immediate alerts - rate-limited per service, fired on circuit breaker trips, cron failures, errors
//   2. Daily digest - aggregated system health summary sent at 7 AM EST
//
// All functions are non-blocking: they log errors but never throw.
// No 'use server' directive - this is a utility module, not a server action file.

import { createElement } from 'react'
import { sendEmail } from './send'
import { DeveloperAlertEmail } from './templates/developer-alert'
import {
  DeveloperDigestEmail,
  type CronHealthEntry,
  type CircuitEntry,
  type RecentError,
} from './templates/developer-digest'
import { getCircuitBreakerHealth } from '@/lib/resilience/circuit-breaker'

const DEV_EMAIL = 'DFPrivateChef@gmail.com'

// ── Rate limiting (in-memory, per serverless instance) ──────────────────────

const lastAlertTime = new Map<string, number>()
const RATE_LIMIT_MS = 15 * 60 * 1000 // 15 minutes per service

function isRateLimited(service: string): boolean {
  const last = lastAlertTime.get(service)
  if (!last) return false
  return Date.now() - last < RATE_LIMIT_MS
}

function recordAlert(service: string): void {
  lastAlertTime.set(service, Date.now())
}

// ── Immediate Alert ─────────────────────────────────────────────────────────

export type AlertParams = {
  severity: 'warning' | 'error' | 'critical'
  system: string
  title: string
  description: string
  context?: Record<string, string>
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
      to: DEV_EMAIL,
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

// ── Daily Digest ────────────────────────────────────────────────────────────

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
    // Use admin client (no cookies needed for cron context)
    const { createAdminClient } = await import('@/lib/db/admin')
    const db = createAdminClient()

    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // ── Cron health ─────────────────────────────────────────────────────
    const { data: cronRuns } = await db
      .from('cron_executions')
      .select('cron_name, executed_at, status, error_text')
      .gte('executed_at', twentyFourHoursAgo)
      .order('executed_at', { ascending: false })

    // Build latest run per cron
    const latestByCron = new Map<string, { executed_at: string; status: string }>()
    for (const row of cronRuns || []) {
      if (!latestByCron.has(row.cron_name)) {
        latestByCron.set(row.cron_name, { executed_at: row.executed_at, status: row.status })
      }
    }

    // Known crons from the monitor
    const KNOWN_CRONS = [
      'lifecycle',
      'sequences',
      'activity-cleanup',
      'loyalty-expiry',
      'waitlist-sweep',
      'push-cleanup',
      'renewal-reminders',
      'cooling-alert',
      'quarterly-checkin',
      'brand-monitor',
      'gmail-sync',
      'integrations-pull',
      'wix-process',
      'social-publish',
      'automations',
      'copilot',
      'email-history-scan',
      'call-reminders',
      'integrations-retry',
      'campaigns',
      'revenue-goals',
      'follow-ups',
      'reviews-sync',
      'wellbeing-signals',
      'morning-briefing',
    ]

    const cronHealth: CronHealthEntry[] = KNOWN_CRONS.map((name) => {
      const latest = latestByCron.get(name)
      if (!latest) {
        return { name, status: 'missing' as const, lastRunAt: null, minutesSince: null }
      }
      const minutesSince = Math.round(
        (now.getTime() - new Date(latest.executed_at).getTime()) / 60000
      )
      const status = latest.status === 'error' ? ('error' as const) : ('ok' as const)
      return { name, status, lastRunAt: latest.executed_at, minutesSince }
    })

    // ── Recent errors ───────────────────────────────────────────────────
    const recentErrors: RecentError[] = (cronRuns || [])
      .filter((r: any) => r.status === 'error' && r.error_text)
      .slice(0, 20)
      .map((r: any) => ({
        cronName: r.cron_name,
        errorText: r.error_text || 'Unknown error',
        time: r.executed_at,
      }))

    // ── Circuit breakers ────────────────────────────────────────────────
    const cbHealth = getCircuitBreakerHealth()
    const circuits: CircuitEntry[] = Object.entries(cbHealth).map(([name, info]) => ({
      name,
      state: info.state,
      failures: info.failures,
    }))

    // ── Ollama health ───────────────────────────────────────────────────
    let ollamaStatus = { online: false, latencyMs: undefined as number | undefined }
    try {
      const start = Date.now()
      const res = await fetch('http://localhost:11434/api/tags', {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        ollamaStatus = { online: true, latencyMs: Date.now() - start }
      }
    } catch {
      // Ollama not responding
    }

    // ── Build summary ───────────────────────────────────────────────────
    const cronUnhealthy = cronHealth.filter((c) => c.status !== 'ok').length
    const cronHealthy = cronHealth.length - cronUnhealthy
    const openCircuits = circuits.filter((c) => c.state !== 'CLOSED').length
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
      to: DEV_EMAIL,
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
