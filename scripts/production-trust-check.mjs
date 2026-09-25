import process from 'node:process'
import { pathToFileURL } from 'node:url'

const DEFAULTS = {
  origin: 'http://127.0.0.1:3100',
  appUrl: 'https://app.cheflowhq.com',
  rootUrl: 'https://cheflowhq.com',
  timeoutMs: 15000,
}

function withoutTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

export function buildChecks(options = {}) {
  const origin = withoutTrailingSlash(options.origin || DEFAULTS.origin)
  const appUrl = withoutTrailingSlash(options.appUrl || DEFAULTS.appUrl)
  const rootUrl = withoutTrailingSlash(options.rootUrl || DEFAULTS.rootUrl)

  return [
    { name: 'origin-health', url: `${origin}/api/health/ping` },
    { name: 'app-health', url: `${appUrl}/api/health/ping` },
    { name: 'apex-home', url: `${rootUrl}/` },
    { name: 'chef-directory', url: `${appUrl}/chefs` },
    { name: 'booking', url: `${appUrl}/book` },
  ]
}

export function classifyFailure(resultMap) {
  const isOk = (name) => Boolean(resultMap[name]?.ok)

  if (!isOk('origin-health')) return 'origin'
  if (!isOk('app-health') && !isOk('apex-home')) return 'edge_or_dns'
  if (!isOk('app-health')) return 'app_routing'
  if (!isOk('apex-home')) return 'apex_routing'
  if (!isOk('chef-directory') || !isOk('booking')) return 'public_route'

  return 'healthy'
}

export function parseArgs(argv) {
  const options = { ...DEFAULTS, json: false }

  for (const arg of argv) {
    if (arg === '--json') options.json = true
    else if (arg.startsWith('--origin=')) options.origin = arg.slice(9)
    else if (arg.startsWith('--app-url=')) options.appUrl = arg.slice(10)
    else if (arg.startsWith('--root-url=')) options.rootUrl = arg.slice(11)
    else if (arg.startsWith('--timeout-ms=')) {
      const value = Number.parseInt(arg.slice(13), 10)
      if (Number.isFinite(value) && value > 0) options.timeoutMs = value
    }
  }

  return options
}

async function probe(check, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const startedAt = Date.now()

  try {
    const response = await fetch(check.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'ChefFlow-Production-Trust-Check/1.0' },
    })
    const ok = response.status >= 200 && response.status < 400
    await response.body?.cancel()

    return {
      ...check,
      ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
      error: ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      ...check,
      ok: false,
      status: null,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function runProductionTrustCheck(options = {}) {
  const resolved = { ...DEFAULTS, ...options }
  const checks = buildChecks(resolved)
  const results = await Promise.all(
    checks.map((check) => probe(check, resolved.timeoutMs))
  )
  const resultMap = Object.fromEntries(results.map((result) => [result.name, result]))
  const classification = classifyFailure(resultMap)

  return {
    checkedAt: new Date().toISOString(),
    classification,
    ok: classification === 'healthy',
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  }
}

function printHuman(summary) {
  console.log(`ChefFlow production trust: ${summary.classification}`)
  for (const result of summary.results) {
    const marker = result.ok ? 'PASS' : 'FAIL'
    const status = result.status ?? 'ERR'
    console.log(
      `${marker} ${result.name} status=${status} latency=${result.latencyMs}ms ${result.url}`
    )
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const summary = await runProductionTrustCheck(options)

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    printHuman(summary)
  }

  if (!summary.ok) process.exitCode = 1
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null
if (invokedPath && import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error('[production-trust-check] failed:', error)
    process.exitCode = 1
  })
}
