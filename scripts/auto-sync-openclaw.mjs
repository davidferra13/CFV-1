#!/usr/bin/env node
/**
 * OpenClaw Auto-Sync Daemon
 *
 * Self-healing daemon that keeps ChefFlow's PostgreSQL in sync with Pi prices.
 *
 * Strategy:
 *   - Delta sync every 2 hours (fast, only fetches changes since last run)
 *   - Full sync once per day (or on first run / after 24h gap)
 *   - Exponential backoff on failure (1m, 2m, 4m, 8m, 16m, 30m max)
 *   - Never stops - survives failures and retries automatically
 *
 * Usage:
 *   node scripts/auto-sync-openclaw.mjs --daemon      # self-healing loop
 *   node scripts/auto-sync-openclaw.mjs               # single run (delta)
 *   node scripts/auto-sync-openclaw.mjs --full        # single full sync
 *
 * Windows Task Scheduler (auto-start on boot):
 *   Run: node C:\Users\david\Documents\CFv1\scripts\auto-sync-openclaw.mjs --daemon
 *   Trigger: At startup, repeat every 1 hour as safety net
 */

import { execSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync, appendFileSync, statSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const SYNC_SCRIPT = join(__dirname, 'openclaw-pull', 'sync-all.mjs')
const STATUS_FILE = join(PROJECT_ROOT, 'docs', 'sync-status.json')
const LAST_FULL_SYNC_FILE = join(__dirname, 'openclaw-pull', '.last-full-sync-time')
const LOG_FILE = join(PROJECT_ROOT, 'logs', 'openclaw-auto-sync.log')
const MAX_LOG_BYTES = 5 * 1024 * 1024 // 5MB, then rotate

const args = process.argv.slice(2)
const isDaemon = args.includes('--daemon')
const forceFull = args.includes('--full')

// Delta sync every 2 hours. Full sync every 24 hours.
const DELTA_INTERVAL_MS = 2 * 60 * 60 * 1000
const FULL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000

// Timeout: delta sync 15 min, full sync 90 min
const DELTA_TIMEOUT_MS = 15 * 60 * 1000
const FULL_TIMEOUT_MS = 90 * 60 * 1000

// Backoff: 1m, 2m, 4m, 8m, 16m, 30m, then stays at 30m
const BACKOFF_STEPS_MS = [60000, 120000, 240000, 480000, 960000, 1800000]

let consecutiveFailures = 0

function nowIso() {
  return new Date().toISOString()
}

function log(msg) {
  const line = `[${nowIso()}] ${msg}\n`
  process.stdout.write(line)
  try {
    let rotate = false
    try { rotate = statSync(LOG_FILE).size > MAX_LOG_BYTES } catch {}
    if (rotate) writeFileSync(LOG_FILE, line)
    else appendFileSync(LOG_FILE, line)
  } catch {}
}

function updateStatus(status, extra = {}) {
  try {
    const current = existsSync(STATUS_FILE)
      ? JSON.parse(readFileSync(STATUS_FILE, 'utf8'))
      : {}
    const completedAt = extra.completed_at || nowIso()
    const data = {
      ...current,
      last_sync: completedAt,
      status,
      next_sync:
        Object.prototype.hasOwnProperty.call(extra, 'next_sync')
          ? extra.next_sync
          : isDaemon
            ? new Date(Date.now() + DELTA_INTERVAL_MS).toISOString()
            : null,
      interval_hours: isDaemon ? 2 : null,
      consecutive_failures: consecutiveFailures,
      last_success_at:
        status === 'success' || status === 'partial'
          ? completedAt
          : current.last_success_at || null,
      last_failure_at: status === 'failed' ? completedAt : current.last_failure_at || null,
      ...extra,
    }
    writeFileSync(STATUS_FILE, JSON.stringify(data, null, 2))
  } catch {}
}

function needsFullSync() {
  if (forceFull) return true
  if (!existsSync(LAST_FULL_SYNC_FILE)) return true
  try {
    const last = new Date(readFileSync(LAST_FULL_SYNC_FILE, 'utf8').trim())
    return Date.now() - last.getTime() > FULL_SYNC_INTERVAL_MS
  } catch {
    return true
  }
}

function markFullSyncDone() {
  try {
    writeFileSync(LAST_FULL_SYNC_FILE, nowIso())
  } catch {}
}

function buildSummaryFilePath(syncType) {
  return join(tmpdir(), `openclaw-sync-${syncType}-${process.pid}-${Date.now()}.json`)
}

function readSyncSummary(summaryFile) {
  if (!existsSync(summaryFile)) {
    return null
  }

  try {
    return JSON.parse(readFileSync(summaryFile, 'utf8'))
  } catch {
    return null
  }
}

function cleanupSummaryFile(summaryFile) {
  try {
    if (existsSync(summaryFile)) {
      unlinkSync(summaryFile)
    }
  } catch {}
}

function classifyError(err, elapsedSeconds) {
  if (err?.code === 'ETIMEDOUT') {
    return {
      errorKind: 'timeout',
      reason: `timed out after ${elapsedSeconds}s`,
    }
  }

  if (typeof err?.status === 'number') {
    return {
      errorKind: 'exit_code',
      reason: err.message || `exited with code ${err.status}`,
    }
  }

  return {
    errorKind: 'runtime',
    reason: err?.message || 'unknown runtime failure',
  }
}

async function runSync(useDelta) {
  const syncType = useDelta ? 'delta' : 'full'
  const timeoutMs = useDelta ? DELTA_TIMEOUT_MS : FULL_TIMEOUT_MS
  const extraArgs = useDelta ? ' --delta' : ''
  const summaryFile = buildSummaryFilePath(syncType)
  const startedAt = nowIso()
  const runId = `openclaw-${syncType}-${Date.now()}`

  log(`Starting ${syncType} sync (timeout: ${timeoutMs / 60000}min)...`)
  const start = Date.now()

  try {
    execSync(`node "${SYNC_SCRIPT}"${extraArgs}`, {
      cwd: PROJECT_ROOT,
      timeout: timeoutMs,
      encoding: 'utf8',
      stdio: 'inherit',
      env: {
        ...process.env,
        OPENCLAW_SYNC_SUMMARY_FILE: summaryFile,
      },
    })

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const summary = readSyncSummary(summaryFile)
    const status =
      summary?.status === 'partial' || (summary?.failedStepNames?.length ?? 0) > 0
        ? 'partial'
        : 'success'

    log(`Sync complete (${syncType}) in ${elapsed}s${status === 'partial' ? ' with partial success' : ''}`)

    if (!useDelta && status === 'success') markFullSyncDone()

    return {
      completedAt: nowIso(),
      elapsedSeconds: parseFloat(elapsed),
      errorKind: null,
      exitCode: null,
      lastError: null,
      ok: true,
      runId,
      startedAt,
      status,
      summary,
      syncType,
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const summary = readSyncSummary(summaryFile)
    const { errorKind, reason } = classifyError(err, elapsed)
    log(`Sync FAILED (${syncType}) after ${elapsed}s: ${reason}`)

    return {
      completedAt: nowIso(),
      elapsedSeconds: parseFloat(elapsed),
      errorKind,
      exitCode: typeof err?.status === 'number' ? err.status : null,
      lastError: reason,
      ok: false,
      runId,
      startedAt,
      status: 'failed',
      summary,
      syncType,
    }
  } finally {
    cleanupSummaryFile(summaryFile)
  }
}

function backoffDelay() {
  const idx = Math.min(consecutiveFailures - 1, BACKOFF_STEPS_MS.length - 1)
  return BACKOFF_STEPS_MS[Math.max(0, idx)]
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function daemonLoop() {
  log(`OpenClaw auto-sync daemon started`)
  log(`  Delta sync: every ${DELTA_INTERVAL_MS / 3600000}h`)
  log(`  Full sync:  every ${FULL_SYNC_INTERVAL_MS / 3600000}h`)
  log(`  Status:     ${STATUS_FILE}`)

  let nextFullAt = needsFullSync() ? 0 : Date.now() + FULL_SYNC_INTERVAL_MS

  while (true) {
    const doFull = Date.now() >= nextFullAt
    const result = await runSync(!doFull)

    if (result.ok) {
      consecutiveFailures = 0
    } else {
      consecutiveFailures += 1
    }

    if (result.ok && result.status === 'success' && doFull) {
      nextFullAt = Date.now() + FULL_SYNC_INTERVAL_MS
    }

    const delay = result.ok ? DELTA_INTERVAL_MS : backoffDelay()
    const nextSyncAt = new Date(Date.now() + delay).toISOString()

    updateStatus(result.status, {
      completed_at: result.completedAt,
      error_kind: result.errorKind,
      exit_code: result.exitCode,
      last_elapsed_s: result.elapsedSeconds,
      last_error: result.lastError,
      last_sync_type: result.syncType,
      next_sync: nextSyncAt,
      run_id: result.runId,
      started_at: result.startedAt,
      summary: result.summary ?? null,
    })

    if (!result.ok) {
      log(`Retry in ${delay / 1000}s (failure #${consecutiveFailures})`)
    }

    await sleep(delay)
  }
}

async function main() {
  if (isDaemon) {
    await daemonLoop()
  } else {
    const useDelta = !forceFull
    const result = await runSync(useDelta)
    consecutiveFailures = result.ok ? 0 : 1
    updateStatus(result.status, {
      completed_at: result.completedAt,
      error_kind: result.errorKind,
      exit_code: result.exitCode,
      last_elapsed_s: result.elapsedSeconds,
      last_error: result.lastError,
      last_sync_type: result.syncType,
      next_sync: null,
      run_id: result.runId,
      started_at: result.startedAt,
      summary: result.summary ?? null,
    })

    if (!result.ok) {
      process.exitCode = 1
    }
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
