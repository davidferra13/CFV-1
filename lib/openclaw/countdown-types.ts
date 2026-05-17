/**
 * OpenClaw Capture Countdown Types
 *
 * Shared types for the mission countdown card and schedule board.
 * Config lives in config/openclaw-capture-milestone.json.
 */

// ── Countdown Config (matches JSON shape) ─────────────────────────────────

export type CountdownConfig = {
  label: string
  title: string
  subtitle: string
  countdownStartedAt: string // ISO timestamp with tz offset
  targetAt: string // ISO timestamp with tz offset
  targetTimezone: string
  progressLabel: string
  status: 'projected'
}

// ── Countdown View Model (derived at runtime) ─────────────────────────────

export type OpenClawMissionCountdown = {
  label: string
  title: string
  subtitle: string
  status: 'projected'
  countdownStartedAt: string
  targetAt: string
  targetTimezone: string
  remainingMs: number
  progressPct: number
  progressLabel: string
  targetDisplay: string
}

// ── Schedule Board ────────────────────────────────────────────────────────

export type JobScheduleState = 'running' | 'next' | 'idle' | 'sleeping' | 'attention'

export type MissionScheduleRow = {
  id: string
  name: string
  cronExpr: string
  command: string
  nextRun: string | null
  minutesUntil: number | null
  cadenceLabel: string
  state: JobScheduleState
  source: 'crontab'
}

// ── Countdown Status (returned by server action) ──────────────────────────

export type CountdownStatus = {
  available: true
  countdown: OpenClawMissionCountdown
} | {
  available: false
  error: string
}

// ── Job Schedule Status (returned by server action) ───────────────────────

export type JobScheduleStatus = {
  available: true
  rows: MissionScheduleRow[]
} | {
  available: false
  error: string
}
