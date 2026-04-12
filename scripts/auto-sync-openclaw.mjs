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
import { writeFileSync, readFileSync, existsSync, appendFileSync, statSync } from 'fs'
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

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
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
    const data = {
      ...current,
      last_sync: new Date().toISOString(),
      status,
      next_sync: isDaemon
        ? new Date(Date.now() + DELTA_INTERVAL_MS).toISOString()
        : null,
      interval_hours: isDaemon ? 2 : null,
      consecutive_failures: consecutiveFailures,
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
    writeFileSync(LAST_FULL_SYNC_FILE, new Date().toISOString())
  } catch {}
}

async function runSync(useDelta) {
  const syncType = useDelta ? 'delta' : 'full'
  const timeoutMs = useDelta ? DELTA_TIMEOUT_MS : FULL_TIMEOUT_MS
  const extraArgs = useDelta ? ' --delta' : ''

  log(`Starting ${syncType} sync (timeout: ${timeoutMs / 60000}min)...`)
  const start = Date.now()

  try {
    execSync(`node "${SYNC_SCRIPT}"${extraArgs}`, {
      cwd: PROJECT_ROOT,
      timeout: timeoutMs,
      encoding: 'utf8',
      stdio: 'inherit',
      env: { ...process.env },
    })

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    log(`Sync complete (${syncType}) in ${elapsed}s`)
    consecutiveFailures = 0
    updateStatus('success', { last_sync_type: syncType, last_elapsed_s: parseFloat(elapsed) })
    if (!useDelta) markFullSyncDone()
    return true
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const reason = err.code === 'ETIMEDOUT' ? `timed out after ${elapsed}s` : err.message
    log(`Sync FAILED (${syncType}) after ${elapsed}s: ${reason}`)
    consecutiveFailures++
    updateStatus('failed', {
      last_error: reason,
      last_sync_type: syncType,
      consecutive_failures: consecutiveFailures,
    })
    return false
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
    const ok = await runSync(!doFull)

    if (ok && doFull) {
      nextFullAt = Date.now() + FULL_SYNC_INTERVAL_MS
    }

    if (!ok) {
      const delay = backoffDelay()
      log(`Retry in ${delay / 1000}s (failure #${consecutiveFailures})`)
      await sleep(delay)
    } else {
      await sleep(DELTA_INTERVAL_MS)
    }
  }
}

async function main() {
  if (isDaemon) {
    await daemonLoop()
  } else {
    const useDelta = !forceFull
    await runSync(useDelta)
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
