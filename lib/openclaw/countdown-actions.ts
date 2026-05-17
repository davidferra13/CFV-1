'use server'

/**
 * OpenClaw Capture Countdown Server Actions
 *
 * Auth-gated, admin-only actions for the mission countdown and schedule board.
 * Config is read from config/openclaw-capture-milestone.json (no DB table needed).
 * Schedule data uses placeholder sources that can be wired to Pi later.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'
import type {
  CountdownConfig,
  CountdownStatus,
  OpenClawMissionCountdown,
  JobScheduleStatus,
  MissionScheduleRow,
} from './countdown-types'

// ── Config loader ─────────────────────────────────────────────────────────

let cachedConfig: CountdownConfig | null = null

function loadConfig(): CountdownConfig | null {
  if (cachedConfig) return cachedConfig
  try {
    const configPath = join(process.cwd(), 'config', 'openclaw-capture-milestone.json')
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'))
    if (!raw.countdownStartedAt || !raw.targetAt) return null
    cachedConfig = raw as CountdownConfig
    return cachedConfig
  } catch {
    return null
  }
}

// ── Countdown derivation ──────────────────────────────────────────────────

function deriveCountdown(config: CountdownConfig): OpenClawMissionCountdown {
  const now = Date.now()
  const targetMs = new Date(config.targetAt).getTime()
  const startMs = new Date(config.countdownStartedAt).getTime()

  const totalWindowMs = Math.max(1, targetMs - startMs)
  const elapsedMs = Math.min(Math.max(0, now - startMs), totalWindowMs)
  const remainingMs = Math.max(0, targetMs - now)
  const progressPct = Math.round((elapsedMs / totalWindowMs) * 100)

  // Format target date for display
  const targetDate = new Date(config.targetAt)
  const targetDisplay = targetDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: config.targetTimezone,
  })

  return {
    label: config.label,
    title: config.title,
    subtitle: config.subtitle,
    status: config.status,
    countdownStartedAt: config.countdownStartedAt,
    targetAt: config.targetAt,
    targetTimezone: config.targetTimezone,
    remainingMs,
    progressPct,
    progressLabel: config.progressLabel,
    targetDisplay,
  }
}

// ── Server Actions ────────────────────────────────────────────────────────

/**
 * Get the current countdown status. Auth-gated to any chef.
 * Returns config-backed countdown data (no DB or Pi dependency).
 */
export async function getCountdownStatus(): Promise<CountdownStatus> {
  await requireChef()

  const config = loadConfig()
  if (!config) {
    return { available: false, error: 'Countdown configuration not found' }
  }

  // Validate dates
  const targetMs = new Date(config.targetAt).getTime()
  const startMs = new Date(config.countdownStartedAt).getTime()
  if (isNaN(targetMs) || isNaN(startMs)) {
    return { available: false, error: 'Invalid countdown dates in configuration' }
  }

  return {
    available: true,
    countdown: deriveCountdown(config),
  }
}

/**
 * Get the raw countdown config. Admin-only.
 */
export async function getCountdownConfig(): Promise<CountdownConfig | null> {
  await requireChef()
  const admin = await isAdmin().catch(() => false)
  if (!admin) return null
  return loadConfig()
}

/**
 * Get job schedule status. Admin-only.
 * Uses placeholder data; will be wired to Pi crontab later.
 */
export async function getJobSchedule(): Promise<JobScheduleStatus> {
  await requireChef()
  const admin = await isAdmin().catch(() => false)
  if (!admin) {
    return { available: false, error: 'Admin access required' }
  }

  try {
    const rows = getPlaceholderSchedule()
    return { available: true, rows }
  } catch {
    return { available: false, error: 'Failed to load job schedule' }
  }
}

/**
 * Update the countdown target date. Admin-only.
 * In v1 this is a no-op placeholder; config is file-based.
 * Future: persist to DB or write to config.
 */
export async function updateCountdownTarget(newTargetAt: string): Promise<{ success: boolean; error?: string }> {
  await requireChef()
  const admin = await isAdmin().catch(() => false)
  if (!admin) {
    return { success: false, error: 'Admin access required' }
  }

  // Validate the input
  const parsed = new Date(newTargetAt)
  if (isNaN(parsed.getTime())) {
    return { success: false, error: 'Invalid date format' }
  }

  // v1: config is file-based, cannot write at runtime
  // This action exists for future wiring to a DB-backed config
  return { success: false, error: 'Config updates require a code change in v1. Edit config/openclaw-capture-milestone.json directly.' }
}

// ── Placeholder schedule data ─────────────────────────────────────────────

/**
 * Placeholder schedule rows representing typical OpenClaw cron jobs.
 * Will be replaced with live Pi SSH crontab parsing when wired.
 */
function getPlaceholderSchedule(): MissionScheduleRow[] {
  const now = Date.now()

  const jobs: Array<{
    name: string
    cronExpr: string
    command: string
    cadenceLabel: string
  }> = [
    { name: 'price-sync', cronExpr: '*/15 * * * *', command: 'node price-sync.mjs', cadenceLabel: 'every 15m' },
    { name: 'store-catalog-pull', cronExpr: '0 */2 * * *', command: 'node store-catalog-pull.mjs', cadenceLabel: 'every 2h' },
    { name: 'ingredient-enrichment', cronExpr: '30 */4 * * *', command: 'node ingredient-enrichment.mjs', cadenceLabel: 'every 4h' },
    { name: 'seasonal-analyzer', cronExpr: '0 6 * * *', command: 'node seasonal-analyzer.mjs', cadenceLabel: 'daily 6:00 AM' },
    { name: 'yield-factor-sync', cronExpr: '0 7 * * *', command: 'node yield-factor-sync.mjs', cadenceLabel: 'daily 7:00 AM' },
    { name: 'anomaly-detector', cronExpr: '0 8 * * *', command: 'node anomaly-detector.mjs', cadenceLabel: 'daily 8:00 AM' },
    { name: 'usda-baseline-update', cronExpr: '0 3 * * 0', command: 'node usda-baseline.mjs', cadenceLabel: 'weekly Sun 3:00 AM' },
    { name: 'store-coverage-audit', cronExpr: '0 4 * * 3', command: 'node store-coverage-audit.mjs', cadenceLabel: 'weekly Wed 4:00 AM' },
    { name: 'flyer-archiver', cronExpr: '0 23 * * *', command: 'node flyer-archiver.mjs', cadenceLabel: 'daily 11:00 PM' },
    { name: 'log-rotation', cronExpr: '0 0 * * *', command: 'find /logs -mtime +7 -delete', cadenceLabel: 'daily midnight' },
  ]

  return jobs.map((job): MissionScheduleRow => {
    // Compute a simple next-run estimate
    const nextRunMs = computeSimpleNextRun(job.cronExpr, now)
    const minutesUntil = nextRunMs ? Math.round((nextRunMs - now) / 60000) : null

    // Determine state based on time
    let state: MissionScheduleRow['state'] = 'sleeping'
    if (minutesUntil !== null) {
      if (minutesUntil <= 15) state = 'next'
      else if (minutesUntil <= 1440) state = 'idle'
    }

    return {
      id: `${job.name}-${job.cronExpr.replace(/\s+/g, '-')}`,
      name: job.name,
      cronExpr: job.cronExpr,
      command: job.command,
      nextRun: nextRunMs ? new Date(nextRunMs).toISOString() : null,
      minutesUntil,
      cadenceLabel: job.cadenceLabel,
      state,
      source: 'crontab',
    }
  })
}

/**
 * Simple next-run computation from a cron expression.
 * Checks up to 8 days ahead to catch weekly jobs.
 */
function computeSimpleNextRun(cronExpr: string, nowMs: number): number | null {
  const parts = cronExpr.split(/\s+/)
  if (parts.length < 5) return null

  const [minuteField, hourField, , , dowField] = parts
  const minutes = expandField(minuteField, 0, 59)
  const hours = expandField(hourField, 0, 23)
  const dows = expandField(dowField, 0, 6)

  const now = new Date(nowMs)

  // Check next 8 days to catch weekly jobs
  for (let dayOffset = 0; dayOffset <= 8; dayOffset++) {
    for (const h of hours) {
      for (const m of minutes) {
        const candidate = new Date(now)
        candidate.setDate(candidate.getDate() + dayOffset)
        candidate.setHours(h, m, 0, 0)
        if (candidate.getTime() <= nowMs) continue
        if (!dows.includes(candidate.getDay())) continue
        return candidate.getTime()
      }
    }
  }

  return null
}

function expandField(field: string, min: number, max: number): number[] {
  if (field === '*') {
    const arr: number[] = []
    for (let i = min; i <= max; i++) arr.push(i)
    return arr
  }
  const results: number[] = []
  for (const part of field.split(',')) {
    if (part.includes('/')) {
      const [range, step] = part.split('/')
      const s = parseInt(step, 10)
      const start = range === '*' ? min : parseInt(range, 10)
      for (let i = start; i <= max; i += s) results.push(i)
    } else {
      results.push(parseInt(part, 10))
    }
  }
  return results.sort((a, b) => a - b)
}
