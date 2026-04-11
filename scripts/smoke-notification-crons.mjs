#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const DEFAULT_BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3100'
const CRON_PATHS = [
  '/api/scheduled/lifecycle',
  '/api/scheduled/revenue-goals',
  '/api/cron/renewal-reminders',
  '/api/cron/cooling-alert',
  '/api/cron/quarterly-checkin',
  '/api/cron/brand-monitor',
  '/api/scheduled/wellbeing-signals',
  '/api/cron/platform-observability-digest',
]

function loadEnvFile(relativePath) {
  const fullPath = path.resolve(ROOT, relativePath)
  if (!fs.existsSync(fullPath)) return

  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eqIndex = line.indexOf('=')
    if (eqIndex <= 0) continue
    const key = line.slice(0, eqIndex).trim()
    const value = line.slice(eqIndex + 1).trim()
    if (!key) continue
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function parseArgs(argv) {
  const out = {
    baseUrl: DEFAULT_BASE_URL,
    envOnly: false,
  }

  for (const arg of argv) {
    if (arg === '--env-only') out.envOnly = true
    if (arg.startsWith('--base-url=')) out.baseUrl = arg.slice('--base-url='.length)
  }

  return out
}

function validateNoSpendToggles() {
  const outbound = process.env.NOTIFICATIONS_OUTBOUND_ENABLED
  const brandMonitor = process.env.BRAND_MONITOR_WEB_SEARCH_ENABLED

  return {
    outboundSafe: outbound === 'false',
    brandMonitorSafe: brandMonitor !== 'true',
    outbound,
    brandMonitor,
  }
}

async function runRequest(baseUrl, path, authHeader) {
  const started = Date.now()
  const url = `${baseUrl}${path}`
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: authHeader ? { authorization: authHeader } : {},
    })
    const durationMs = Date.now() - started
    const bodyText = await response.text()
    return {
      path,
      ok: response.ok,
      status: response.status,
      durationMs,
      bodyPreview: bodyText.slice(0, 260),
    }
  } catch (err) {
    return {
      path,
      ok: false,
      status: 0,
      durationMs: Date.now() - started,
      bodyPreview: String(err),
    }
  }
}

function printEnvReport(report) {
  console.log('[smoke:notifications] no-spend toggles:')
  console.log(`  NOTIFICATIONS_OUTBOUND_ENABLED=${report.outbound ?? '(unset)'}`)
  console.log(`  BRAND_MONITOR_WEB_SEARCH_ENABLED=${report.brandMonitor ?? '(unset)'}`)
  console.log(`  outboundSafe=${report.outboundSafe}`)
  console.log(`  brandMonitorSafe=${report.brandMonitorSafe}`)
}

async function main() {
  loadEnvFile('.env.local')
  loadEnvFile('.env')

  const args = parseArgs(process.argv.slice(2))
  const cronSecret = process.env.CRON_SECRET
  const authHeader = cronSecret ? `Bearer ${cronSecret}` : ''

  const envReport = validateNoSpendToggles()
  printEnvReport(envReport)

  if (!envReport.outboundSafe || !envReport.brandMonitorSafe) {
    console.log(
      '[smoke:notifications] WARNING: no-spend mode is not fully enabled. Set outbound=false and brand-monitor search not true.'
    )
  }

  if (args.envOnly) {
    return
  }

  console.log(`[smoke:notifications] baseUrl=${args.baseUrl}`)
  if (!cronSecret) {
    console.log('[smoke:notifications] WARNING: CRON_SECRET is unset; cron endpoints may return 401.')
  }

  const results = []
  for (const path of CRON_PATHS) {
    const result = await runRequest(args.baseUrl, path, authHeader)
    results.push(result)
    const status = result.ok ? 'PASS' : 'FAIL'
    console.log(`[${status}] ${result.status} ${path} (${result.durationMs}ms)`)
  }

  const failures = results.filter((r) => !r.ok)
  if (failures.length > 0) {
    console.log('[smoke:notifications] failed endpoints:')
    for (const fail of failures) {
      console.log(`  - ${fail.path}: status=${fail.status} body=${fail.bodyPreview}`)
    }
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('[smoke:notifications] unexpected error:', err)
  process.exit(1)
})
