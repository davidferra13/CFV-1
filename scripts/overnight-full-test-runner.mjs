#!/usr/bin/env node

/**
 * Overnight Full Test Runner - ChefFlow Beta (PARALLEL)
 *
 * Maxes out the PC by running tests in parallel:
 *   - Remy quality suites run sequentially (they share the single Ollama GPU lane)
 *   - ALL Playwright suites run in parallel batches (browser/network bound)
 *   - Remy, Playwright, and fast Node test lanes run SIMULTANEOUSLY
 *
 * Default mode excludes legacy duplicate Remy scripts that hard-code localhost.
 * Use --include-legacy-remy-full only if you explicitly want that extra 100-test lane.
 *
 * Usage:
 *   node scripts/overnight-full-test-runner.mjs
 *   node scripts/overnight-full-test-runner.mjs --pw-parallel=4
 *   node scripts/overnight-full-test-runner.mjs --resume           (pick up where you left off)
 *   node scripts/overnight-full-test-runner.mjs --include-legacy-remy-full
 *
 * Prerequisites:
 *   - Beta server running at beta.cheflowhq.com (localhost:3200)
 *   - Ollama running with qwen3:4b + qwen3-coder models loaded
 *   - Agent test account seeded
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ---- CLI Args ----

function parseCliArgs() {
  const args = process.argv.slice(2)
  const opts = { pwParallel: 4, resume: false, includeLegacyRemyFull: false }
  for (const arg of args) {
    if (arg === '--resume') opts.resume = true
    if (arg === '--include-legacy-remy-full') opts.includeLegacyRemyFull = true
    if (arg.startsWith('--pw-parallel=')) opts.pwParallel = parseInt(arg.split('=')[1], 10) || 3
  }
  return opts
}

// ---- Configuration ----

const RUN_DIR = path.join(
  ROOT,
  'reports',
  `overnight-full-${new Date().toISOString().slice(0, 10)}`
)

// TRACK 1: Remy suites (GPU-bound, run sequentially within track)
const REMY_PHASES = [
  {
    id: 'remy-chef',
    name: 'Remy Quality - Chef (100 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/remy-quality-runner.mjs',
    args: ['--suite', 'chef'],
    estimateMin: 150,
  },
  {
    id: 'remy-adversarial',
    name: 'Remy Quality - Adversarial (25 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/remy-quality-runner.mjs',
    args: ['--suite', 'adversarial'],
    estimateMin: 37,
  },
  {
    id: 'remy-hallucination',
    name: 'Remy Quality - Hallucination (25 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/remy-quality-runner.mjs',
    args: ['--suite', 'hallucination'],
    estimateMin: 37,
  },
  {
    id: 'remy-multi-turn',
    name: 'Remy Quality - Multi-turn (20 scenarios)',
    type: 'node',
    command: 'tests/remy-quality/harness/remy-quality-runner.mjs',
    args: ['--suite', 'multi-turn'],
    estimateMin: 45,
  },
  {
    id: 'remy-voice-messy',
    name: 'Remy Quality - Voice/Messy Input (25 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/remy-quality-runner.mjs',
    args: ['--suite', 'voice-messy'],
    estimateMin: 37,
  },
  {
    id: 'remy-data-accuracy',
    name: 'Remy Quality - Data Accuracy (25 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/remy-quality-runner.mjs',
    args: ['--suite', 'data-accuracy'],
    estimateMin: 37,
  },
  {
    id: 'remy-tier-enforcement',
    name: 'Remy Quality - Tier Enforcement (25 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/remy-quality-runner.mjs',
    args: ['--suite', 'tier-enforcement'],
    estimateMin: 37,
  },
  {
    id: 'remy-gap-closure',
    name: 'Remy Quality - Gap Closure (27 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/remy-quality-runner.mjs',
    args: ['--suite', 'gap-closure'],
    estimateMin: 40,
  },
  {
    id: 'remy-client',
    name: 'Remy Client Quality (100 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/client-quality-runner.mjs',
    args: [],
    estimateMin: 150,
  },
  {
    id: 'remy-client-adversarial',
    name: 'Remy Client Adversarial (40 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/client-adversarial-runner.mjs',
    args: [],
    estimateMin: 60,
  },
  {
    id: 'remy-client-multiturn',
    name: 'Remy Client Multi-turn (10 scenarios)',
    type: 'node',
    command: 'tests/remy-quality/harness/client-multiturn-runner.mjs',
    args: [],
    estimateMin: 45,
  },
  {
    id: 'remy-client-edge',
    name: 'Remy Client Edge Cases (25 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/client-edge-runner.mjs',
    args: [],
    estimateMin: 37,
  },
  {
    id: 'remy-client-context',
    name: 'Remy Client Context Accuracy (15 prompts)',
    type: 'node',
    command: 'tests/remy-quality/harness/client-context-runner.mjs',
    args: [],
    estimateMin: 22,
  },
  {
    id: 'remy-boundary',
    name: 'Remy Boundary (Chef)',
    type: 'node',
    command: 'tests/remy-quality/harness/boundary-runner.mjs',
    args: [],
    estimateMin: 30,
  },
  // Client boundary stops/restarts Ollama internally. Keep it near the tail.
  {
    id: 'remy-client-boundary',
    name: 'Remy Client Boundary',
    type: 'node',
    command: 'tests/remy-quality/harness/client-boundary-runner.mjs',
    args: [],
    estimateMin: 30,
  },
  // Client resilience intentionally exhausts rate limits and unloads the model.
  // Run it last in the default GPU lane so it cannot poison later suites.
  {
    id: 'remy-client-resilience',
    name: 'Remy Client Resilience',
    type: 'node',
    command: 'tests/remy-quality/harness/client-resilience-runner.mjs',
    args: [],
    estimateMin: 30,
  },
]

const LEGACY_REMY_PHASES = [
  {
    id: 'remy-full-script',
    name: 'Remy Full Script (100 tests, localhost-only legacy lane)',
    type: 'node',
    command: 'scripts/test-remy-full.mjs',
    args: [],
    estimateMin: 150,
  },
]

// TRACK 2: Playwright suites (browser/network bound, run in parallel batches)
const PLAYWRIGHT_PHASES = [
  // Large suites first (they take longest, start them early)
  {
    id: 'pw-journey',
    name: 'Playwright Journey (335 scenarios)',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=journey-chef', '--reporter=json'],
    estimateMin: 120,
  },
  {
    id: 'pw-interactions-chef',
    name: 'Playwright Interactions - Chef',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=interactions-chef', '--reporter=json'],
    estimateMin: 45,
  },
  {
    id: 'pw-e2e-chef',
    name: 'Playwright E2E - Chef',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=chef', '--reporter=json'],
    estimateMin: 30,
  },
  {
    id: 'pw-coverage-chef',
    name: 'Playwright Coverage - Chef',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=coverage-chef', '--reporter=json'],
    estimateMin: 30,
  },
  {
    id: 'pw-diagnostic',
    name: 'Playwright Diagnostic',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--config=playwright.diagnostic.config.ts', '--reporter=json'],
    estimateMin: 30,
  },
  {
    id: 'pw-mobile',
    name: 'Playwright Mobile Audit',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=mobile-audit', '--reporter=json'],
    estimateMin: 20,
  },
  {
    id: 'pw-coverage-admin',
    name: 'Playwright Coverage - Admin',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=coverage-admin', '--reporter=json'],
    estimateMin: 15,
  },
  {
    id: 'pw-interactions-admin',
    name: 'Playwright Interactions - Admin',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=interactions-admin', '--reporter=json'],
    estimateMin: 15,
  },
  {
    id: 'pw-coverage-public',
    name: 'Playwright Coverage - Public',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=coverage-public', '--reporter=json'],
    estimateMin: 15,
  },
  {
    id: 'pw-e2e-client',
    name: 'Playwright E2E - Client',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=client', '--reporter=json'],
    estimateMin: 15,
  },
  {
    id: 'pw-e2e-cross',
    name: 'Playwright E2E - Cross Portal',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=cross-portal', '--reporter=json'],
    estimateMin: 15,
  },
  {
    id: 'pw-product-chef',
    name: 'Playwright Product - Chef',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=product-chef', '--reporter=json'],
    estimateMin: 15,
  },
  {
    id: 'pw-isolation',
    name: 'Playwright Multi-Tenant Isolation',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=isolation-tests', '--reporter=json'],
    estimateMin: 15,
  },
  {
    id: 'pw-e2e-smoke',
    name: 'Playwright E2E - Smoke',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=smoke', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-coverage-client',
    name: 'Playwright Coverage - Client',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=coverage-client', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-coverage-auth',
    name: 'Playwright Coverage - Auth Boundaries',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=coverage-auth-boundaries', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-coverage-api',
    name: 'Playwright Coverage - API',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=coverage-api', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-interactions-client',
    name: 'Playwright Interactions - Client',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=interactions-client', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-interactions-public',
    name: 'Playwright Interactions - Public',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=interactions-public', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-product-client',
    name: 'Playwright Product - Client',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=product-client', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-product-public',
    name: 'Playwright Product - Public',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=product-public', '--reporter=json'],
    estimateMin: 10,
  },
  // Screenshot crawler - visits 400+ pages and captures full-page screenshots
  {
    id: 'pw-screenshot-crawler',
    name: 'Screenshot Crawler (400+ pages, full-page screenshots)',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=screenshot-crawler', '--reporter=json', '--workers=1'],
    estimateMin: 90,
  },
  // Launch readiness
  {
    id: 'pw-launch-chef',
    name: 'Playwright Launch - Chef',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=launch-chef', '--reporter=json'],
    estimateMin: 20,
  },
  {
    id: 'pw-launch-client',
    name: 'Playwright Launch - Client',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=launch-client', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-launch-public',
    name: 'Playwright Launch - Public',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=launch-public', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-launch-mobile',
    name: 'Playwright Launch - Mobile',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=launch-mobile', '--reporter=json'],
    estimateMin: 10,
  },
  // Product tiers - staff and partner
  {
    id: 'pw-product-staff',
    name: 'Playwright Product - Staff',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=product-staff', '--reporter=json'],
    estimateMin: 10,
  },
  {
    id: 'pw-product-partner',
    name: 'Playwright Product - Partner',
    type: 'npx',
    command: 'playwright',
    args: ['test', '--project=product-partner', '--reporter=json'],
    estimateMin: 10,
  },
]

// TRACK 3: Unit/integration tests (CPU bound, fast, run once)
const UNIT_PHASES = [
  {
    id: 'unit-all',
    name: 'Unit Tests - All (60+ test files)',
    type: 'node',
    command: 'node_modules/.bin/tsx',
    args: [],
    // Special: uses node --test, handled via shell
    shellCommand: 'node --test --import tsx "tests/unit/**/*.test.ts"',
    estimateMin: 10,
  },
  {
    id: 'integration-all',
    name: 'Integration Tests - All',
    type: 'node',
    command: 'node_modules/.bin/tsx',
    args: [],
    shellCommand: 'node --test --import tsx "tests/integration/**/*.integration.test.ts"',
    estimateMin: 5,
  },
]

// ---- Utilities ----

function nowIso() {
  return new Date().toISOString()
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function formatDuration(ms) {
  const sec = Math.round(ms / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// ---- Run a single phase ----

async function runPhase(phase, logsDir, prefix = '') {
  const logPath = path.join(logsDir, `${phase.id}.log`)
  const jsonPath = path.join(logsDir, `${phase.id}.json`)
  const logStream = fs.createWriteStream(logPath, { flags: 'w' })

  const startedAt = nowIso()
  const t0 = Date.now()

  let cmd, args, useShell = false
  if (phase.shellCommand) {
    // Run via shell for glob expansion (e.g., node --test "tests/unit/**/*.test.ts")
    cmd = phase.shellCommand
    args = []
    useShell = true
  } else if (phase.type === 'node') {
    cmd = process.execPath
    args = [path.join(ROOT, phase.command), ...phase.args]
  } else {
    cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
    args = [phase.command, ...phase.args]
  }

  const env = {
    ...process.env,
    PLAYWRIGHT_JSON_OUTPUT_NAME: jsonPath,
  }

  if (phase.type === 'npx') {
    // Overnight runs assume the target app is already running.
    // Prevent each parallel Playwright process from trying to boot its own dev server.
    env.PLAYWRIGHT_WEB_SERVER_COMMAND = ''
    env.PLAYWRIGHT_REUSE_SERVER = 'true'
    env.PLAYWRIGHT_RUN_ID = phase.id
    env.PLAYWRIGHT_OUTPUT_DIR = `test-results/${phase.id}`
  }

  let exitCode = -1
  let signal = null
  let spawnError = ''

  const tag = prefix ? `[${prefix}] ` : ''

  try {
    await new Promise((resolve, reject) => {
      let child
      try {
        child = spawn(cmd, args, {
          cwd: ROOT,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
          // Windows: use shell for npx.cmd (avoids EINVAL) and shellCommand phases
          shell: useShell || (phase.type === 'npx' && process.platform === 'win32'),
        })
      } catch (err) {
        spawnError = `spawn failed: ${err.message}`
        resolve()
        return
      }

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString()
        logStream.write(text)
        // Tag each line with the phase ID so parallel output is readable
        for (const line of text.split('\n')) {
          if (line.trim()) process.stdout.write(`${tag}${line}\n`)
        }
      })

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString()
        logStream.write(text)
        for (const line of text.split('\n')) {
          if (line.trim()) process.stderr.write(`${tag}${line}\n`)
        }
      })

      child.on('error', (err) => {
        spawnError = String(err?.message || err)
        resolve()
      })

      child.on('close', (code, closeSignal) => {
        exitCode = typeof code === 'number' ? code : -1
        signal = closeSignal ?? null
        resolve()
      })
    })
  } catch (err) {
    spawnError = `runPhase exception: ${err.message}`
  }

  logStream.end()

  const durationMs = Date.now() - t0
  const endedAt = nowIso()

  return {
    id: phase.id,
    name: phase.name,
    startedAt,
    endedAt,
    durationMs,
    durationHuman: formatDuration(durationMs),
    exitCode,
    signal,
    spawnError: spawnError || null,
    logPath,
    jsonPath: fs.existsSync(jsonPath) ? jsonPath : null,
    passed: exitCode === 0 && !spawnError,
  }
}

// ---- Run a batch of phases in parallel ----

async function runBatch(phases, logsDir, prefix = '') {
  return Promise.all(
    phases.map((phase) => runPhase(phase, logsDir, prefix || phase.id))
  )
}

// ---- Run phases in parallel with concurrency limit ----

async function runWithConcurrency(phases, concurrency, logsDir, completedIds) {
  const remaining = phases.filter((p) => !completedIds.has(p.id))
  const results = []
  let idx = 0

  async function worker() {
    while (idx < remaining.length) {
      const phase = remaining[idx++]
      const phaseNum = idx
      console.log(`\n[PW ${phaseNum}/${remaining.length}] STARTING: ${phase.name}`)
      const result = await runPhase(phase, logsDir, `PW:${phase.id}`)
      const status = result.passed ? 'PASSED' : 'FAILED'
      console.log(`[PW ${phaseNum}/${remaining.length}] ${status}: ${phase.name} (${result.durationHuman})`)
      results.push(result)
    }
  }

  // Spawn N workers that pull from the shared queue
  // Stagger starts by 3s to avoid Windows EINVAL spawn race
  const workers = []
  for (let i = 0; i < Math.min(concurrency, remaining.length); i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 3000))
    workers.push(worker())
  }
  await Promise.all(workers)

  return results
}

// ---- Run Remy track sequentially ----

async function runRemyTrack(phases, logsDir, completedIds) {
  const results = []
  const remaining = phases.filter((p) => !completedIds.has(p.id))

  for (let i = 0; i < remaining.length; i++) {
    const phase = remaining[i]
    console.log(`\n[REMY ${i + 1}/${remaining.length}] STARTING: ${phase.name}`)
    const result = await runPhase(phase, logsDir, `REMY:${phase.id}`)
    const status = result.passed ? 'PASSED' : 'FAILED'
    console.log(`[REMY ${i + 1}/${remaining.length}] ${status}: ${phase.name} (${result.durationHuman})`)
    results.push(result)
  }

  return results
}

// ---- Build master summary report ----

function buildMasterReport(results, totalStartMs) {
  const totalDuration = formatDuration(Date.now() - totalStartMs)
  const passedPhases = results.filter((r) => r.passed).length
  const failedPhases = results.filter((r) => !r.passed).length

  const remyResults = results.filter((r) => r.id.startsWith('remy'))
  const pwResults = results.filter((r) => r.id.startsWith('pw'))
  const nodeResults = results.filter((r) => r.id.startsWith('unit') || r.id.startsWith('integration'))

  const lines = []
  lines.push('# ChefFlow Beta - Full Overnight Test Report (Parallel)')
  lines.push(`**Date:** ${new Date().toISOString().slice(0, 10)}`)
  lines.push(`**Total Duration:** ${totalDuration}`)
  lines.push(`**Phases Run:** ${results.length}`)
  lines.push(`**Phases Passed:** ${passedPhases}`)
  lines.push(`**Phases Failed:** ${failedPhases}`)
  lines.push('')
  lines.push(`**Execution mode:** Remy (${remyResults.length} suites, sequential on GPU) + Playwright (${pwResults.length} suites, parallel browsers) running SIMULTANEOUSLY`)
  lines.push('')

  // Remy summary
  lines.push('## Track 1: Remy AI Quality')
  lines.push('')
  lines.push('| # | Suite | Duration | Exit Code | Status |')
  lines.push('|---|-------|----------|-----------|--------|')
  remyResults.forEach((r, i) => {
    const status = r.passed ? 'PASS' : 'FAIL'
    const exitInfo = r.spawnError ? `error: ${r.spawnError}` : String(r.exitCode)
    lines.push(`| ${i + 1} | ${r.name} | ${r.durationHuman} | ${exitInfo} | ${status} |`)
  })
  lines.push('')

  // Playwright summary
  lines.push('## Track 2: Playwright Browser Tests')
  lines.push('')

  if (nodeResults.length > 0) {
    lines.push('## Track 3: Fast Node Tests')
    lines.push('')
    lines.push('| # | Suite | Duration | Exit Code | Status |')
    lines.push('|---|-------|----------|-----------|--------|')
    nodeResults.forEach((r, i) => {
      const status = r.passed ? 'PASS' : 'FAIL'
      const exitInfo = r.spawnError ? `error: ${r.spawnError}` : String(r.exitCode)
      lines.push(`| ${i + 1} | ${r.name} | ${r.durationHuman} | ${exitInfo} | ${status} |`)
    })
    lines.push('')
  }
  lines.push('| # | Suite | Duration | Exit Code | Status |')
  lines.push('|---|-------|----------|-----------|--------|')
  pwResults.forEach((r, i) => {
    const status = r.passed ? 'PASS' : 'FAIL'
    const exitInfo = r.spawnError ? `error: ${r.spawnError}` : String(r.exitCode)
    lines.push(`| ${i + 1} | ${r.name} | ${r.durationHuman} | ${exitInfo} | ${status} |`)
  })
  lines.push('')

  // Failed phases detail
  const failed = results.filter((r) => !r.passed)
  if (failed.length > 0) {
    lines.push('## Failed Phases (All)')
    lines.push('')
    for (const r of failed) {
      lines.push(`### ${r.name}`)
      lines.push(`- **Exit code:** ${r.exitCode}`)
      if (r.spawnError) lines.push(`- **Spawn error:** ${r.spawnError}`)
      lines.push(`- **Duration:** ${r.durationHuman}`)
      lines.push(`- **Log:** \`${path.relative(ROOT, r.logPath)}\``)
      if (r.jsonPath) lines.push(`- **JSON:** \`${path.relative(ROOT, r.jsonPath)}\``)
      lines.push('')
    }
  }

  // Where to find detailed results
  lines.push('## Detailed Results Location')
  lines.push('')
  lines.push('### Remy Quality Reports')
  lines.push('Each Remy suite generates its own benchmark JSON and Markdown report:')
  lines.push('- `tests/remy-quality/benchmarks/` (JSON, machine-readable)')
  lines.push('- `tests/remy-quality/reports/` (Markdown, human-readable, full response text)')
  lines.push('')
  lines.push('### Playwright Reports')
  lines.push('Playwright JSON output is saved per-phase in the logs directory:')
  for (const r of pwResults) {
    if (r.jsonPath) {
      lines.push(`- \`${path.relative(ROOT, r.jsonPath)}\``)
    }
  }
  lines.push('')
  lines.push('### Full Logs')
  lines.push('Complete stdout/stderr for every phase:')
  for (const r of results) {
    lines.push(`- \`${path.relative(ROOT, r.logPath)}\``)
  }
  lines.push('')

  lines.push('---')
  lines.push(`Generated: ${nowIso()}`)

  return lines.join('\n')
}

// ---- Save state (for resume support) ----

function saveState(statePath, results) {
  fs.writeFileSync(
    statePath,
    JSON.stringify({ updatedAt: nowIso(), results }, null, 2),
    'utf8'
  )
}

// ---- Main ----

async function main() {
  const opts = parseCliArgs()
  const remyPhases = opts.includeLegacyRemyFull
    ? [...REMY_PHASES, ...LEGACY_REMY_PHASES]
    : [...REMY_PHASES]
  const allPhases = [...remyPhases, ...PLAYWRIGHT_PHASES, ...UNIT_PHASES]

  mkdirp(RUN_DIR)
  const logsDir = path.join(RUN_DIR, 'logs')
  mkdirp(logsDir)

  const statePath = path.join(RUN_DIR, 'state.json')

  // Load existing state if resuming
  let completedIds = new Set()
  let previousResults = []
  if (opts.resume && fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
    previousResults = state.results || []
    completedIds = new Set(previousResults.map((r) => r.id))
    console.log(`\nResuming: ${completedIds.size} phases already complete.\n`)
  }

  const remyRemaining = remyPhases.filter((p) => !completedIds.has(p.id))
  const pwRemaining = PLAYWRIGHT_PHASES.filter((p) => !completedIds.has(p.id))
  const remyEstimate = remyPhases.reduce((s, p) => s + p.estimateMin, 0)
  const pwEstimate = Math.ceil(PLAYWRIGHT_PHASES.reduce((s, p) => s + p.estimateMin, 0) / opts.pwParallel)
  const nodeEstimate = UNIT_PHASES.reduce((s, p) => s + p.estimateMin, 0)
  const wallClockEstimate = Math.max(remyEstimate, pwEstimate, nodeEstimate)

  console.log('')
  console.log('================================================================')
  console.log('  CHEFFLOW OVERNIGHT FULL TEST RUNNER (PARALLEL)')
  console.log('================================================================')
  console.log(`  Track 1 (REMY):       ${remyPhases.length} suites, ${remyRemaining.length} remaining (sequential on GPU)`)
  console.log(`  Track 2 (PLAYWRIGHT): ${PLAYWRIGHT_PHASES.length} suites, ${pwRemaining.length} remaining (${opts.pwParallel} parallel)`)
  console.log(`  Track 3 (NODE):       ${UNIT_PHASES.length} suites`)
  console.log(`  Total phases:         ${allPhases.length}`)
  console.log(`  Wall-clock estimate:  ~${Math.round(wallClockEstimate / 60)} hours`)
  console.log(`  Report dir:           ${path.relative(ROOT, RUN_DIR)}`)
  console.log(`  Target:               beta.cheflowhq.com`)
  console.log(`  Legacy remy-full:     ${opts.includeLegacyRemyFull ? 'included' : 'skipped by default'}`)
  console.log('================================================================')
  console.log('')
  console.log('  TRACK 1 (Remy, GPU) and TRACK 2 (Playwright, browsers) start NOW.')
  console.log('  Both tracks run simultaneously to maximize PC utilization.')
  console.log('')

  const totalStartMs = Date.now()

  // Launch ALL tracks simultaneously - max out the PC
  const [remyResults, pwResults, unitResults] = await Promise.all([
    // Track 1: Remy suites sequentially (GPU bottleneck)
    runRemyTrack(remyPhases, logsDir, completedIds),
    // Track 2: Playwright suites with N concurrent browsers
    runWithConcurrency(PLAYWRIGHT_PHASES, opts.pwParallel, logsDir, completedIds),
    // Track 3: Unit/integration tests (fast, CPU only)
    runRemyTrack(UNIT_PHASES, logsDir, completedIds),
  ])

  // Merge all results
  const allResults = [...previousResults, ...remyResults, ...pwResults, ...unitResults]

  // Save final state
  saveState(statePath, allResults)

  // Generate master report
  const report = buildMasterReport(allResults, totalStartMs)
  const reportPath = path.join(RUN_DIR, 'master-report.md')
  fs.writeFileSync(reportPath, report, 'utf8')

  const docsReportPath = path.join(ROOT, 'docs', `beta-test-marathon-${new Date().toISOString().slice(0, 10)}.md`)
  fs.writeFileSync(docsReportPath, report, 'utf8')

  const passedCount = allResults.filter((r) => r.passed).length
  const failedCount = allResults.filter((r) => !r.passed).length

  console.log('')
  console.log('================================================================')
  console.log('  OVERNIGHT TEST RUN COMPLETE')
  console.log('================================================================')
  console.log(`  Total duration: ${formatDuration(Date.now() - totalStartMs)}`)
  console.log(`  Phases passed:  ${passedCount}/${allResults.length}`)
  console.log(`  Phases failed:  ${failedCount}/${allResults.length}`)
  console.log(`  Master report:  ${path.relative(ROOT, reportPath)}`)
  console.log(`  Docs copy:      ${path.relative(ROOT, docsReportPath)}`)
  console.log('================================================================')

  process.exit(failedCount > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
