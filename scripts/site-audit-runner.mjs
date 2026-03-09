#!/usr/bin/env node

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'
import {
  discoverSiteAuditRoutes,
  ROLE_CONFIGS,
  ROLE_ORDER,
  storageStateHasCookies,
} from './site-audit-manifest.mjs'

const ROOT = process.cwd()
const DEFAULT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const DEFAULT_MODE = 'full'
const QUICK_MAX_ROUTES_PER_ROLE = 35
const SERVER_BOOT_TIMEOUT_MS = 180_000
const NAVIGATION_TIMEOUT_MS = 90_000
const POST_LOAD_WAIT_MS = 600
const QUIET_NETWORK_WAIT_MS = 3_000
const BLANK_PAGE_THRESHOLD = 10
const CONSOLE_ERROR_IGNORE_PATTERNS = [
  /webpack-hmr/i,
  /WebSocket connection to 'ws:\/\/.*_next\/webpack-hmr/i,
  /Warning: Extra attributes from the server/i,
  /Failed to load resource: the server responded with a status of 401/i,
  /Failed to load resource: the server responded with a status of 429/i,
  /violates the following Content Security Policy directive/i,
  /Download the React DevTools/i,
]

function nowIso() {
  return new Date().toISOString()
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function parseArgs(argv) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    mode: DEFAULT_MODE,
    headed: false,
    outDir: '',
    roles: [],
    maxRoutesPerRole: Infinity,
    startServer: true,
  }

  for (const arg of argv) {
    if (arg === '--headed') {
      options.headed = true
      continue
    }
    if (arg === '--no-server') {
      options.startServer = false
      continue
    }
    if (arg.startsWith('--base-url=')) {
      options.baseUrl = arg.slice('--base-url='.length).trim()
      continue
    }
    if (arg.startsWith('--mode=')) {
      options.mode = arg.slice('--mode='.length).trim().toLowerCase()
      continue
    }
    if (arg.startsWith('--out-dir=')) {
      options.outDir = arg.slice('--out-dir='.length).trim()
      continue
    }
    if (arg.startsWith('--role=')) {
      const role = arg.slice('--role='.length).trim()
      if (role) options.roles.push(role)
      continue
    }
    if (arg.startsWith('--max-routes-per-role=')) {
      options.maxRoutesPerRole = Number(arg.slice('--max-routes-per-role='.length))
      continue
    }
  }

  if (!['full', 'quick'].includes(options.mode)) {
    throw new Error(`Unsupported --mode value: ${options.mode}`)
  }

  if (!Number.isFinite(options.maxRoutesPerRole) || options.maxRoutesPerRole < 1) {
    options.maxRoutesPerRole = options.mode === 'quick' ? QUICK_MAX_ROUTES_PER_ROLE : Infinity
  }

  if (options.mode === 'quick' && options.maxRoutesPerRole === Infinity) {
    options.maxRoutesPerRole = QUICK_MAX_ROUTES_PER_ROLE
  }

  if (process.env.AUDIT_HEADED && /^(1|true|yes)$/i.test(process.env.AUDIT_HEADED)) {
    options.headed = true
  }

  return options
}

function slugifyPath(routePath) {
  return (
    routePath
      .replace(/^\/+/, '')
      .replace(/[^a-zA-Z0-9._/-]/g, '-')
      .replace(/\//g, '__')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'root'
  )
}

function shouldIgnoreConsoleError(message) {
  return CONSOLE_ERROR_IGNORE_PATTERNS.some((pattern) => pattern.test(message))
}

function urlPathname(rawUrl) {
  try {
    return new URL(rawUrl).pathname
  } catch {
    return rawUrl
  }
}

function isAuthRedirect(url) {
  return /\/auth\/signin|\/staff-login|\/unauthorized/i.test(url)
}

function relativePath(rootDir, targetPath) {
  return path.relative(rootDir, targetPath).replace(/\\/g, '/')
}

async function stopProcessTree(childProcess) {
  if (!childProcess?.pid) return

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(childProcess.pid), '/T', '/F'], {
        stdio: 'ignore',
      })
      killer.on('close', () => resolve())
      killer.on('error', () => resolve())
    })
    return
  }

  childProcess.kill('SIGTERM')
}

function checkPort(port) {
  return new Promise((resolve) => {
    const request = http.get(`http://127.0.0.1:${port}`, () => resolve(true))
    request.on('error', () => resolve(false))
    request.setTimeout(2_000, () => {
      request.destroy()
      resolve(false)
    })
  })
}

async function ensureServer(baseUrl, startServer, runDir) {
  let serverProcess = null
  const port = Number(new URL(baseUrl).port || 80)
  const alreadyRunning = await checkPort(port)

  if (alreadyRunning || !startServer) {
    return { serverProcess, reusedExisting: alreadyRunning }
  }

  const serverLogPath = path.join(runDir, 'server.log')
  const logStream = fs.createWriteStream(serverLogPath, { flags: 'a' })
  const nextBin = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')

  serverProcess = spawn(process.execPath, [nextBin, 'dev', '-p', String(port), '-H', '0.0.0.0'], {
    cwd: ROOT,
    env: {
      ...process.env,
      SUPABASE_E2E_ALLOW_REMOTE: process.env.SUPABASE_E2E_ALLOW_REMOTE || 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  serverProcess.stdout.on('data', (chunk) => {
    logStream.write(chunk)
  })
  serverProcess.stderr.on('data', (chunk) => {
    logStream.write(chunk)
  })

  const startedAt = Date.now()
  while (Date.now() - startedAt < SERVER_BOOT_TIMEOUT_MS) {
    if (await checkPort(port)) {
      return { serverProcess, reusedExisting: false, serverLogPath }
    }
    await sleep(2_000)
  }

  throw new Error(`Timed out waiting for dev server on ${baseUrl}`)
}

function pickRoutesForRun(routes, selectedRoles, maxRoutesPerRole) {
  const allowedRoles = selectedRoles.length > 0 ? new Set(selectedRoles) : null
  const counts = new Map()
  const filtered = []

  for (const route of routes) {
    if (allowedRoles && !allowedRoles.has(route.role)) continue
    const count = counts.get(route.role) || 0
    if (count >= maxRoutesPerRole) continue
    counts.set(route.role, count + 1)
    filtered.push(route)
  }

  return filtered
}

function classifyResult(route, currentUrl, httpStatus, bodyLength, jsErrors) {
  const pathname = urlPathname(currentUrl)

  if (route.expected?.type === 'redirect-ok') {
    if (route.expected.pattern && route.expected.pattern.test(pathname)) {
      return { status: 'ok', failure: false, detail: route.expected.reason }
    }
  }

  if (httpStatus >= 500) {
    return { status: 'failure_http', failure: true, detail: `HTTP ${httpStatus}` }
  }

  if (isAuthRedirect(currentUrl) && route.role !== 'public' && route.role !== 'kiosk') {
    return { status: 'auth_redirect', failure: true, detail: pathname }
  }

  if (jsErrors.length > 0) {
    return {
      status: 'failure_js',
      failure: true,
      detail: jsErrors[0],
    }
  }

  if (bodyLength < BLANK_PAGE_THRESHOLD && route.expected?.type !== 'not-found-ok') {
    return { status: 'failure_blank', failure: true, detail: `body length ${bodyLength}` }
  }

  if (route.expected?.type === 'not-found-ok') {
    return { status: httpStatus === 404 ? 'expected_not_found' : 'ok', failure: false, detail: '' }
  }

  if (httpStatus === 404) {
    return { status: 'not_found', failure: false, detail: '' }
  }

  if (pathname !== route.path) {
    return { status: 'redirect', failure: false, detail: pathname }
  }

  return { status: 'ok', failure: false, detail: '' }
}

async function gotoWithRetry(page, targetUrl) {
  let response = null
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: NAVIGATION_TIMEOUT_MS,
      })
      if ((response?.status() || 0) >= 500 && attempt < 2) {
        await page.waitForTimeout(400)
        continue
      }
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const retryable = /ERR_ABORTED|ERR_CONNECTION|timeout|frame was detached/i.test(message)
      if (!retryable || attempt === 2) throw error
      await page.waitForTimeout(400)
    }
  }
  return response
}

async function auditRoute(browser, route, runDir, baseUrl) {
  const roleConfig = ROLE_CONFIGS[route.role]
  const contextOptions = {
    viewport: roleConfig.viewport,
  }

  if (roleConfig.storageState) {
    contextOptions.storageState = path.resolve(ROOT, roleConfig.storageState)
  }

  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()

  if (route.role === 'kiosk') {
    await page.addInitScript(() => {
      localStorage.removeItem('chefflow_kiosk_token')
      document.cookie =
        'chefflow_kiosk_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax'
    })
  }

  const consoleErrors = []
  const pageErrors = []
  const consoleWarnings = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (msg.type() === 'error' && !shouldIgnoreConsoleError(text)) {
      consoleErrors.push(text)
      return
    }
    if (msg.type() === 'warning') {
      consoleWarnings.push(text)
    }
  })

  page.on('pageerror', (error) => {
    pageErrors.push(error.message)
  })

  const screenshotDir = path.join(runDir, 'screenshots', route.role)
  ensureDir(screenshotDir)
  const screenshotPath = path.join(screenshotDir, `${slugifyPath(route.path)}.png`)

  const targetUrl = `${baseUrl}${route.path}`
  const startedAt = nowIso()
  const startedMs = Date.now()
  let httpStatus = 0
  let title = ''
  let bodyLength = 0
  let currentUrl = targetUrl
  let navigationError = ''

  try {
    const response = await gotoWithRetry(page, targetUrl)
    httpStatus = response?.status() || 0
    await page.waitForTimeout(POST_LOAD_WAIT_MS)
    await page.waitForLoadState('networkidle', { timeout: QUIET_NETWORK_WAIT_MS }).catch(() => {})
    title = await page.title().catch(() => '')
    bodyLength = await page.locator('body').innerText().then((text) => text.trim().length).catch(() => 0)
    currentUrl = page.url()
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error)
    currentUrl = page.url() || targetUrl
  }

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {})
  await context.close()

  const jsErrors = [...consoleErrors, ...pageErrors]
  const durationMs = Date.now() - startedMs
  const classification = navigationError
    ? {
        status: /timeout/i.test(navigationError) ? 'timeout' : 'failure_navigation',
        failure: true,
        detail: navigationError,
      }
    : classifyResult(route, currentUrl, httpStatus, bodyLength, jsErrors)

  return {
    role: route.role,
    template: route.template,
    path: route.path,
    expected: route.expected,
    resolution: route.resolution,
    sourceFile: route.sourceFile,
    startedAt,
    finishedAt: nowIso(),
    durationMs,
    httpStatus,
    currentUrl,
    title,
    bodyLength,
    consoleErrors,
    pageErrors,
    consoleWarnings,
    navigationError,
    screenshotPath: relativePath(ROOT, screenshotPath),
    status: classification.status,
    failure: classification.failure,
    detail: classification.detail,
  }
}

function summarizeResults(results, skipped, selectedRoutes) {
  const totals = {
    routesDiscovered: selectedRoutes.length,
    routesExecuted: results.length,
    skipped: skipped.length,
    failures: results.filter((result) => result.failure).length,
    redirects: results.filter((result) => result.status === 'redirect').length,
    notFound: results.filter(
      (result) => result.status === 'not_found' || result.status === 'expected_not_found'
    ).length,
  }

  const byRole = {}
  for (const role of ROLE_ORDER) {
    const roleResults = results.filter((result) => result.role === role)
    if (roleResults.length === 0) continue
    byRole[role] = {
      total: roleResults.length,
      failures: roleResults.filter((result) => result.failure).length,
      redirects: roleResults.filter((result) => result.status === 'redirect').length,
      notFound: roleResults.filter(
        (result) => result.status === 'not_found' || result.status === 'expected_not_found'
      ).length,
      averageLoadMs:
        roleResults.reduce((sum, result) => sum + result.durationMs, 0) / roleResults.length,
    }
  }

  return { totals, byRole }
}

function writeReports(runDir, options, results, skipped, manifestMeta) {
  const summary = summarizeResults(results, skipped, manifestMeta.selectedRoutes)
  const output = {
    generatedAt: nowIso(),
    baseUrl: options.baseUrl,
    mode: options.mode,
    headed: options.headed,
    runDir: relativePath(ROOT, runDir),
    manifest: {
      discoveredRoutes: manifestMeta.discoveredRoutes,
      selectedRoutes: manifestMeta.selectedRoutes.length,
      skippedDynamicRoutes: skipped.length,
      selectedRoles: options.roles.length > 0 ? options.roles : ROLE_ORDER,
    },
    summary,
    failures: results.filter((result) => result.failure),
    redirects: results.filter((result) => result.status === 'redirect'),
    skipped,
    results,
  }

  const summaryJsonPath = path.join(runDir, 'summary.json')
  fs.writeFileSync(summaryJsonPath, JSON.stringify(output, null, 2), 'utf8')

  const lines = []
  lines.push('# Site Audit Report')
  lines.push('')
  lines.push(`- Generated: ${output.generatedAt}`)
  lines.push(`- Base URL: ${output.baseUrl}`)
  lines.push(`- Mode: ${output.mode}`)
  lines.push(`- Headed: ${output.headed}`)
  lines.push(`- Output: ${output.runDir}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(
    `- Routes executed: ${summary.totals.routesExecuted}/${summary.totals.routesDiscovered}`
  )
  lines.push(`- Failures: ${summary.totals.failures}`)
  lines.push(`- Redirects: ${summary.totals.redirects}`)
  lines.push(`- Not found: ${summary.totals.notFound}`)
  lines.push(`- Skipped unresolved dynamic routes: ${summary.totals.skipped}`)
  lines.push('')
  lines.push('| Role | Routes | Failures | Redirects | Not Found | Avg Load (ms) |')
  lines.push('|---|---:|---:|---:|---:|---:|')
  for (const role of ROLE_ORDER) {
    const roleSummary = summary.byRole[role]
    if (!roleSummary) continue
    lines.push(
      `| ${role} | ${roleSummary.total} | ${roleSummary.failures} | ${roleSummary.redirects} | ${roleSummary.notFound} | ${Math.round(roleSummary.averageLoadMs)} |`
    )
  }
  lines.push('')

  const failures = output.failures
  lines.push('## Failures')
  lines.push('')
  if (failures.length === 0) {
    lines.push('No hard failures detected.')
  } else {
    for (const failure of failures) {
      lines.push(`### ${failure.role} ${failure.path}`)
      lines.push(`- Status: ${failure.status}`)
      lines.push(`- HTTP: ${failure.httpStatus || '-'}`)
      lines.push(`- Detail: ${failure.detail || '-'}`)
      lines.push(`- Final URL: ${failure.currentUrl}`)
      lines.push(`- Screenshot: ${failure.screenshotPath}`)
      if (failure.consoleErrors.length > 0) {
        lines.push(`- Console: ${failure.consoleErrors[0]}`)
      }
      if (failure.pageErrors.length > 0) {
        lines.push(`- Page Error: ${failure.pageErrors[0]}`)
      }
      lines.push('')
    }
  }

  lines.push('## Skipped Dynamic Routes')
  lines.push('')
  if (skipped.length === 0) {
    lines.push('No unresolved dynamic routes were skipped.')
  } else {
    for (const item of skipped.slice(0, 200)) {
      lines.push(`- ${item.role || 'public'} ${item.template} :: ${item.reason}`)
    }
    if (skipped.length > 200) {
      lines.push(`- ... and ${skipped.length - 200} more`)
    }
  }
  lines.push('')

  const reportPath = path.join(runDir, 'report.md')
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')

  return {
    summaryJsonPath,
    reportPath,
    failures: failures.length,
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const runDir = options.outDir
    ? path.resolve(ROOT, options.outDir)
    : path.join(ROOT, 'reports', `site-audit-${timestampSlug()}`)
  ensureDir(runDir)

  const serverState = await ensureServer(options.baseUrl, options.startServer, runDir)
  const manifest = discoverSiteAuditRoutes(ROOT)
  const selectedRoutes = pickRoutesForRun(
    manifest.routes,
    options.roles,
    options.maxRoutesPerRole
  )

  const preflight = {
    generatedAt: nowIso(),
    mode: options.mode,
    headed: options.headed,
    baseUrl: options.baseUrl,
    serverPid: serverState.serverProcess?.pid || null,
    discoveredRoutes: manifest.routes.length,
    selectedRoutes: selectedRoutes.length,
    skippedRoutes: manifest.skipped.length,
    reusedExistingServer: !!serverState.reusedExisting,
    roles: {},
  }

  for (const role of ROLE_ORDER) {
    const config = ROLE_CONFIGS[role]
    if (!config) continue
    preflight.roles[role] = {
      requiresAuth: config.requiresAuth,
      storageState: config.storageState || '',
      authReady: config.storageState ? storageStateHasCookies(ROOT, config.storageState) : true,
    }
  }

  fs.writeFileSync(path.join(runDir, 'preflight.json'), JSON.stringify(preflight, null, 2), 'utf8')

  const browser = await chromium.launch({ headless: !options.headed })
  const results = []
  const skipped = [...manifest.skipped]

  try {
    for (const route of selectedRoutes) {
      const config = ROLE_CONFIGS[route.role]
      if (config?.requiresAuth && config.storageState && !storageStateHasCookies(ROOT, config.storageState)) {
        skipped.push({
          role: route.role,
          template: route.template,
          sourceFile: route.sourceFile,
          reason: `${config.storageState} missing or contains no cookies`,
        })
        continue
      }

      const result = await auditRoute(browser, route, runDir, options.baseUrl)
      results.push(result)
    }
  } finally {
    await browser.close()
    if (serverState.serverProcess) {
      await stopProcessTree(serverState.serverProcess)
    }
  }

  const report = writeReports(runDir, options, results, skipped, {
    discoveredRoutes: manifest.routes.length,
    selectedRoutes,
  })

  console.log(`[site-audit] report: ${report.reportPath}`)
  console.log(`[site-audit] summary: ${report.summaryJsonPath}`)
  console.log(
    `[site-audit] executed ${results.length} routes with ${report.failures} hard failures and ${skipped.length} skipped dynamic routes`
  )

  if (report.failures > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('[site-audit] fatal error:', error)
  process.exitCode = 1
})
