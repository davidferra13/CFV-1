#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const isWin = process.platform === 'win32'

function parseArgs(argv) {
  return {
    full: argv.includes('--full'),
    json: argv.includes('--json'),
    noRestart: argv.includes('--no-restart'),
    skipRuntime: argv.includes('--skip-runtime'),
    skipTypecheck: argv.includes('--skip-typecheck'),
    skipWiring: argv.includes('--skip-wiring'),
    skipNav: argv.includes('--skip-nav'),
    skipRouteProbes: argv.includes('--skip-route-probes'),
    routeProbeLimit: numberArg(argv, '--route-probe-limit', 40),
    routeProbeTimeoutMs: numberArg(argv, '--route-probe-timeout-ms', 60_000),
    sentinelTimeoutMs: numberArg(argv, '--sentinel-timeout-ms', 600_000),
    stepTimeoutMs: numberArg(argv, '--step-timeout-ms', 300_000),
  }
}

function numberArg(argv, name, fallback) {
  const index = argv.indexOf(name)
  if (index === -1) return fallback
  const value = Number(argv[index + 1])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function npmCommand() {
  return isWin ? 'npm.cmd' : 'npm'
}

function nodeCommand() {
  return process.execPath
}

async function runStep(name, command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 300_000
  const started = Date.now()
  process.stdout.write(`\n[regression-firewall] ${name}\n`)

  return new Promise((resolveStep) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: {
        ...process.env,
        DEV_RUNTIME_HEALTH_TIMEOUT_MS: process.env.DEV_RUNTIME_HEALTH_TIMEOUT_MS || '45000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWin,
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false

    const timer = setTimeout(() => {
      timedOut = true
      child.kill(isWin ? undefined : 'SIGTERM')
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      process.stdout.write(text)
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      stderr += text
      process.stderr.write(text)
    })

    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolveStep({
        name,
        ok: code === 0 && !timedOut,
        code,
        signal,
        timedOut,
        durationMs: Date.now() - started,
        stdout,
        stderr,
      })
    })

    child.on('error', (error) => {
      clearTimeout(timer)
      resolveStep({
        name,
        ok: false,
        code: null,
        signal: null,
        timedOut,
        durationMs: Date.now() - started,
        stdout,
        stderr: `${stderr}\n${error.message}`.trim(),
      })
    })
  })
}

async function readWiringSummary() {
  const path = join(ROOT, 'scripts', 'wiring-audit-results.json')
  const parsed = JSON.parse(await readFile(path, 'utf8'))
  return parsed.summary ?? {}
}

async function readWiringResults() {
  const path = join(ROOT, 'scripts', 'wiring-audit-results.json')
  return JSON.parse(await readFile(path, 'utf8'))
}

function uniqueRoutes(routes) {
  const seen = new Set()
  const out = []
  for (const route of routes) {
    if (typeof route !== 'string') continue
    const normalized = route.trim()
    if (!normalized.startsWith('/')) continue
    if (seen.has(normalized)) continue
    seen.add(normalized)
    out.push(normalized)
  }
  return out
}

function isProbeableRoute(route) {
  if (route.includes('[') || route.includes(']')) return false
  if (route.startsWith('/api/')) return false
  return true
}

async function probeRoute(route, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()
  const url = `http://localhost:3100${route}`
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'manual',
      cache: 'no-store',
      headers: { 'x-regression-firewall': 'route-probe' },
    })
    await response.body?.cancel()
    return {
      route,
      status: response.status,
      ok: response.status < 500,
      durationMs: Date.now() - started,
      reason: response.status >= 500 ? `HTTP ${response.status}` : '',
    }
  } catch (error) {
    return {
      route,
      status: 0,
      ok: false,
      durationMs: Date.now() - started,
      reason: error.name === 'AbortError' ? 'timeout' : error.message,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function runAffectedRouteProbes(options) {
  const started = Date.now()
  process.stdout.write('\n[regression-firewall] affected route probes\n')
  const wiring = await readWiringResults()
  const affected = uniqueRoutes(wiring.post_build_domain_matrix?.affected_routes ?? [])
  const skipped = affected.filter((route) => !isProbeableRoute(route))
  const probeable = affected.filter(isProbeableRoute).slice(0, options.limit)
  const omitted = Math.max(0, affected.filter(isProbeableRoute).length - probeable.length)

  const probes = []
  for (const route of probeable) {
    const result = await probeRoute(route, options.timeoutMs)
    probes.push(result)
    const status = result.ok ? 'PASS' : 'FAIL'
    const detail = result.status ? `HTTP ${result.status}` : result.reason
    console.log(`[regression-firewall] route ${status} ${route} ${detail} ${result.durationMs}ms`)
  }

  if (skipped.length > 0) {
    console.log(
      `[regression-firewall] route probes skipped dynamic/API routes: ${skipped.slice(0, 12).join(', ')}${
        skipped.length > 12 ? `, ... ${skipped.length - 12} more` : ''
      }`
    )
  }
  if (omitted > 0) {
    console.log(`[regression-firewall] route probes omitted ${omitted} routes after limit ${options.limit}`)
  }

  const failures = probes.filter((probe) => !probe.ok)
  return {
    name: 'affected route probes',
    ok: failures.length === 0,
    code: failures.length === 0 ? 0 : 1,
    signal: null,
    timedOut: false,
    durationMs: Date.now() - started,
    stdout: probes
      .map((probe) => `${probe.route} ${probe.status || probe.reason} ${probe.durationMs}ms`)
      .join('\n'),
    stderr: failures.map((probe) => `${probe.route}: ${probe.reason}`).join('\n'),
    routeProbeSummary: {
      probed: probes.length,
      skipped: skipped.length,
      omitted,
      failed: failures.length,
    },
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const results = []

  if (!args.skipNav) {
    results.push(
      await runStep('chef nav audit', npmCommand(), ['run', 'verify:chef-nav'], {
        timeoutMs: args.stepTimeoutMs,
      })
    )
  }

  if (!args.skipWiring) {
    results.push(
      await runStep('wiring audit', nodeCommand(), ['scripts/wiring-audit.mjs'], {
        timeoutMs: args.stepTimeoutMs,
      })
    )
    const wiringResult = results[results.length - 1]
    if (wiringResult.ok) {
      const summary = await readWiringSummary()
      const orphanCount = Number(summary.orphans ?? 0)
      const weakCount = Number(summary.weak ?? 0)
      if (orphanCount > 0 || weakCount > 0) {
        results.push({
          name: 'wiring zero-orphan contract',
          ok: false,
          code: 1,
          durationMs: 0,
          stdout: '',
          stderr: `wiring audit found ${orphanCount} orphan routes and ${weakCount} weak routes`,
        })
        console.error(
          `[regression-firewall] FAIL wiring audit found ${orphanCount} orphan routes and ${weakCount} weak routes`
        )
      } else {
        console.log('[regression-firewall] wiring zero-orphan contract passed')
      }
    }
  }

  if (!args.skipTypecheck) {
    results.push(
      await runStep('app typecheck', npmCommand(), ['run', 'typecheck:app'], {
        timeoutMs: args.stepTimeoutMs,
      })
    )
  }

  if (!args.skipRuntime) {
    let runtime = await runStep('canonical runtime verify', npmCommand(), ['run', 'dev:verify'], {
      timeoutMs: 120_000,
    })
    results.push(runtime)

    if (!runtime.ok && !args.noRestart) {
      results.push(
        await runStep('canonical runtime restart', npmCommand(), ['run', 'dev:restart'], {
          timeoutMs: 180_000,
        })
      )
      runtime = await runStep('canonical runtime verify after restart', npmCommand(), ['run', 'dev:verify'], {
        timeoutMs: 120_000,
      })
      results.push(runtime)
    }

    if (!args.skipRouteProbes && !args.skipWiring) {
      results.push(
        await runAffectedRouteProbes({
          limit: args.routeProbeLimit,
          timeoutMs: args.routeProbeTimeoutMs,
        })
      )
      results.push(
        await runStep('canonical runtime verify after route probes', npmCommand(), ['run', 'dev:verify'], {
          timeoutMs: 120_000,
        })
      )
    }
  }

  if (args.full) {
    results.push(
      await runStep('sentinel regression', npmCommand(), ['run', 'test:sentinel:regression'], {
        timeoutMs: args.sentinelTimeoutMs,
      })
    )
  }

  const failed = results.filter((result) => !result.ok)
  const summary = {
    ok: failed.length === 0,
    failed: failed.map((result) => ({
      name: result.name,
      code: result.code,
      signal: result.signal,
      timedOut: result.timedOut,
      durationMs: result.durationMs,
      stderr: result.stderr.trim().slice(-4000),
    })),
    steps: results.map((result) => ({
      name: result.name,
      ok: result.ok,
      durationMs: result.durationMs,
      timedOut: result.timedOut,
    })),
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else if (summary.ok) {
    console.log('\n[regression-firewall] PASS')
  } else {
    console.error('\n[regression-firewall] FAIL')
    for (const failure of summary.failed) {
      console.error(`- ${failure.name}${failure.timedOut ? ' timed out' : ''}`)
    }
  }

  if (!summary.ok) process.exitCode = 1
}

main().catch((error) => {
  console.error(`[regression-firewall] ERROR ${error.stack || error.message}`)
  process.exitCode = 1
})
