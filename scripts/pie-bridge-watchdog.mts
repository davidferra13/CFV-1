/**
 * PIE Bridge Watchdog - Auto-restart + Hermes alerting
 *
 * 1. Hits Pi Bridge /health endpoint
 * 2. If down: SSH restart systemd service, wait, re-check
 * 3. Logs result to docs/hermes/pie-bridge-watchdog.log
 * 4. Exits 1 on unrecoverable failure (for cron alerting)
 *
 * Designed to run every 5 minutes via cron:
 *   npx tsx scripts/pie-bridge-watchdog.mts
 */

import { execSync } from 'child_process'
import { appendFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

const PI_BRIDGE_URL = process.env.PI_BRIDGE_URL || 'http://10.0.0.177:7700'
const PI_SSH = 'davidferra@10.0.0.177'
const SERVICE_NAME = 'pie-bridge'
const LOG_DIR = resolve(import.meta.dirname || '.', '../docs/hermes')
const LOG_FILE = resolve(LOG_DIR, 'pie-bridge-watchdog.log')
const MAX_RETRIES = 2
const RETRY_WAIT_MS = 10_000

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })

function log(level: string, msg: string) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`
  console.log(line)
  appendFileSync(LOG_FILE, line + '\n')
}

async function checkHealth(): Promise<{ ok: boolean; details?: string }> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${PI_BRIDGE_URL}/health`, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) return { ok: false, details: `HTTP ${res.status}` }

    const data = (await res.json()) as { status: string; total_prices: number; db_size_mb: number }
    if (data.status !== 'ok') return { ok: false, details: `status=${data.status}` }
    if (data.total_prices < 100_000) return { ok: false, details: `total_prices=${data.total_prices} (suspiciously low)` }

    return { ok: true, details: `prices=${data.total_prices}, db=${data.db_size_mb}MB` }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, details: msg }
  }
}

function restartService(): boolean {
  try {
    log('WARN', `Restarting ${SERVICE_NAME} via SSH...`)
    execSync(
      `ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no ${PI_SSH} "sudo systemctl restart ${SERVICE_NAME}"`,
      { timeout: 15_000, stdio: 'pipe' }
    )
    log('INFO', 'Restart command sent successfully')
    return true
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    log('ERROR', `SSH restart failed: ${msg}`)
    return false
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  // Initial health check
  const initial = await checkHealth()

  if (initial.ok) {
    log('OK', `Pi Bridge healthy: ${initial.details}`)
    process.exit(0)
  }

  log('WARN', `Pi Bridge DOWN: ${initial.details}`)

  // Attempt restart cycle
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    log('INFO', `Recovery attempt ${attempt}/${MAX_RETRIES}`)

    const restarted = restartService()
    if (!restarted) continue

    // Wait for service to come up
    await sleep(RETRY_WAIT_MS)

    const recheck = await checkHealth()
    if (recheck.ok) {
      log('OK', `Pi Bridge RECOVERED after restart (attempt ${attempt}): ${recheck.details}`)
      process.exit(0)
    }

    log('WARN', `Still down after restart attempt ${attempt}: ${recheck.details}`)
  }

  // All retries exhausted
  log('CRITICAL', `Pi Bridge UNRECOVERABLE after ${MAX_RETRIES} restart attempts. Manual intervention needed.`)
  log('CRITICAL', 'Check: power, ethernet cable, Pi SD card, disk space (du -sh /home/davidferra/prices.db)')
  process.exit(1)
}

main()
