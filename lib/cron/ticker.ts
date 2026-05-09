// Self-hosted cron ticker
// Runs inside the Next.js server process (started from instrumentation.ts).
// Fires each scheduled endpoint at its defined cadence via localhost fetch.
// Each job runs independently; failures are logged but never block other jobs.
// Uses CRON_SECRET for auth (same as external callers).

import { CRON_MONITOR_DEFINITIONS, type CronMonitorDefinition } from './definitions'

const CADENCE_MS: Record<CronMonitorDefinition['cadence'], number> = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  hourly: 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
}

// Track last-run timestamps to prevent double-fires on restart
const lastRun = new Map<string, number>()

async function fireJob(def: CronMonitorDefinition, baseUrl: string, secret: string) {
  const now = Date.now()
  const last = lastRun.get(def.cronName) ?? 0
  const interval = CADENCE_MS[def.cadence]

  // Skip if we ran too recently (jitter protection)
  if (now - last < interval * 0.9) return

  lastRun.set(def.cronName, now)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), def.maxExpectedMinutes * 60 * 1000)

    const res = await fetch(`${baseUrl}${def.routePath}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${secret}` },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!res.ok) {
      console.warn(`[cron-ticker] ${def.cronName} returned ${res.status}`)
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.error(`[cron-ticker] ${def.cronName} timed out after ${def.maxExpectedMinutes}m`)
    } else {
      console.error(`[cron-ticker] ${def.cronName} failed:`, err?.message ?? err)
    }
  }
}

let tickerInterval: ReturnType<typeof setInterval> | null = null

/**
 * Start the cron ticker. Call once from instrumentation.ts.
 * Ticks every 60 seconds. Each tick checks which jobs are due and fires them.
 * Jobs are scheduled from process start so a restart cannot stampede the web server.
 */
export function startCronTicker() {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.warn('[cron-ticker] CRON_SECRET not set, cron ticker disabled')
    return
  }

  // Match the port convention used in instrumentation.ts warmup:
  // Production sets PORT explicitly. Dev uses -p 3100 (no env var).
  const port = process.env.PORT || '3100'
  const baseUrl = `http://127.0.0.1:${port}`

  console.log(
    `[cron-ticker] Starting self-hosted cron ticker (${CRON_MONITOR_DEFINITIONS.length} jobs, base: ${baseUrl})`
  )

  // Group jobs by cadence for efficient scheduling
  const jobsByCadence = new Map<string, CronMonitorDefinition[]>()
  for (const def of CRON_MONITOR_DEFINITIONS) {
    const group = jobsByCadence.get(def.cadence) ?? []
    group.push(def)
    jobsByCadence.set(def.cadence, group)
  }

  // Log cadence summary
  for (const [cadence, jobs] of jobsByCadence) {
    console.log(`[cron-ticker]   ${cadence}: ${jobs.map((j) => j.cronName).join(', ')}`)
  }

  const startedAt = Date.now()
  for (const def of CRON_MONITOR_DEFINITIONS) {
    lastRun.set(def.cronName, startedAt)
  }

  // Tick every 60 seconds. Each tick fires jobs whose cadence interval has elapsed.
  tickerInterval = setInterval(async () => {
    for (const def of CRON_MONITOR_DEFINITIONS) {
      const now = Date.now()
      const last = lastRun.get(def.cronName) ?? 0
      const interval = CADENCE_MS[def.cadence]

      if (now - last >= interval) {
        // Fire and don't await globally (each job is independent)
        fireJob(def, baseUrl, secret).catch(() => {
          // Already logged inside fireJob
        })
      }
    }
  }, 60_000) // Check every minute

  if (process.env.CRON_TICKER_RUN_MISSED_ON_STARTUP === 'true') {
    // Optional catch-up mode for dedicated worker hosts. Keep it opt-in so
    // the web server does not launch dozens of expensive jobs after restart.
    const catchupJobs = CRON_MONITOR_DEFINITIONS.filter(
      (d) => d.cadence === 'daily' || d.cadence === '6h'
    )
    let delay = 30_000
    for (const def of catchupJobs) {
      setTimeout(() => {
        fireJob(def, baseUrl, secret).catch(() => {})
      }, delay)
      delay += 10_000
    }
  }
}

export function stopCronTicker() {
  if (tickerInterval) {
    clearInterval(tickerInterval)
    tickerInterval = null
    console.log('[cron-ticker] Stopped')
  }
}
