#!/usr/bin/env node
/**
 * Coverage overnight runner
 *
 * Runs coverage projects one-by-one, retries failures once by default,
 * and writes machine-readable + human-readable reports under reports/.
 *
 * Usage:
 *   node scripts/coverage-overnight-runner.mjs
 *   node scripts/coverage-overnight-runner.mjs --max-retries=2 --workers=1
 *   node scripts/coverage-overnight-runner.mjs --resume --run-dir=reports/coverage-overnight-20260303-230000
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import process from 'process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const PROJECTS = [
  'coverage-public',
  'coverage-chef',
  'coverage-client',
  'coverage-admin',
  'coverage-staff',
  'coverage-partner',
  'coverage-auth-boundaries',
  'coverage-api',
]

const DEFAULT_MAX_RETRIES = 1
const DEFAULT_WORKERS = 1
const RETRY_DELAY_MS = 20_000
const REPORT_PREFIX = 'coverage-overnight-'

function nowIso() {
  return new Date().toISOString()
}

function timestampSlug(date = new Date()) {
  const y = String(date.getFullYear())
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${y}${mo}${d}-${h}${mi}${s}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function parseArgs(argv) {
  const options = {
    resume: false,
    runDir: '',
    maxRetries: DEFAULT_MAX_RETRIES,
    workers: DEFAULT_WORKERS,
    requireAdmin: true,
  }

  for (const arg of argv) {
    if (arg === '--resume') {
      options.resume = true
      continue
    }
    if (arg.startsWith('--run-dir=')) {
      options.runDir = arg.slice('--run-dir='.length).trim()
      continue
    }
    if (arg.startsWith('--max-retries=')) {
      options.maxRetries = Number(arg.slice('--max-retries='.length))
      continue
    }
    if (arg.startsWith('--workers=')) {
      options.workers = Number(arg.slice('--workers='.length))
      continue
    }
    if (arg.startsWith('--require-admin=')) {
      const raw = arg.slice('--require-admin='.length).trim().toLowerCase()
      if (raw === 'true' || raw === '1' || raw === 'yes') options.requireAdmin = true
      else if (raw === 'false' || raw === '0' || raw === 'no') options.requireAdmin = false
      else throw new Error(`--require-admin must be true/false (got: ${raw})`)
      continue
    }
  }

  if (!Number.isInteger(options.maxRetries) || options.maxRetries < 0) {
    throw new Error(`--max-retries must be an integer >= 0 (got: ${options.maxRetries})`)
  }
  if (!Number.isInteger(options.workers) || options.workers < 1) {
    throw new Error(`--workers must be an integer >= 1 (got: ${options.workers})`)
  }

  return options
}

function findLatestRunDir() {
  const reportsDir = path.join(ROOT, 'reports')
  if (!fs.existsSync(reportsDir)) return ''
  const entries = fs
    .readdirSync(reportsDir, { withFileTypes: true })
    .filter((ent) => ent.isDirectory() && ent.name.startsWith(REPORT_PREFIX))
    .map((ent) => {
      const fullPath = path.join(reportsDir, ent.name)
      const stat = fs.statSync(fullPath)
      return { fullPath, mtimeMs: stat.mtimeMs }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)
  return entries.length > 0 ? entries[0].fullPath : ''
}

function resolveRunDir(options) {
  if (!options.resume) {
    const runDir = path.join(ROOT, 'reports', `${REPORT_PREFIX}${timestampSlug()}`)
    mkdirp(runDir)
    return runDir
  }

  if (options.runDir) {
    return path.isAbsolute(options.runDir)
      ? options.runDir
      : path.resolve(ROOT, options.runDir)
  }

  const latest = findLatestRunDir()
  if (!latest) {
    throw new Error('No previous coverage overnight run directory found for --resume')
  }
  return latest
}

function loadState(statePath) {
  if (!fs.existsSync(statePath)) return null
  const raw = fs.readFileSync(statePath, 'utf8')
  return JSON.parse(raw)
}

function saveState(statePath, state) {
  state.updatedAt = nowIso()
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8')
}

function createInitialState(options) {
  return {
    startedAt: nowIso(),
    updatedAt: nowIso(),
    settings: {
      maxRetries: options.maxRetries,
      workers: options.workers,
      requireAdmin: options.requireAdmin,
      projects: PROJECTS,
    },
    projects: {},
  }
}

function getProjectEntry(state, project) {
  if (!state.projects[project]) {
    state.projects[project] = {
      status: 'pending',
      attempts: [],
    }
  }
  return state.projects[project]
}

function shouldRunProject(projectEntry, maxRetries) {
  if (!projectEntry) return true
  if (projectEntry.status === 'passed') return false
  const maxAttempts = 1 + maxRetries
  return (projectEntry.attempts?.length ?? 0) < maxAttempts
}

function parsePlaywrightResults(jsonPath) {
  if (!fs.existsSync(jsonPath)) {
    return {
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      unknown: 0,
      failures: [{ title: 'Reporter JSON missing', file: '', error: `No file at ${jsonPath}` }],
    }
  }

  const raw = fs.readFileSync(jsonPath, 'utf8')
  const payload = JSON.parse(raw)
  const counts = {
    passed: 0,
    failed: 0,
    skipped: 0,
    timedOut: 0,
    interrupted: 0,
    unknown: 0,
  }
  const failures = []

  function countStatus(status) {
    if (status === 'passed' || status === 'expected' || status === 'flaky') counts.passed += 1
    else if (status === 'failed' || status === 'unexpected') counts.failed += 1
    else if (status === 'timedOut') counts.timedOut += 1
    else if (status === 'interrupted') counts.interrupted += 1
    else if (status === 'skipped') counts.skipped += 1
    else counts.unknown += 1
  }

  function walkSuites(suites, titlePrefix = [], fileHint = '') {
    for (const suite of suites ?? []) {
      const suiteTitles = suite.title ? [...titlePrefix, suite.title] : [...titlePrefix]
      const suiteFile = suite.file || fileHint

      for (const spec of suite.specs ?? []) {
        const titles = spec.title ? [...suiteTitles, spec.title] : [...suiteTitles]
        for (const test of spec.tests ?? []) {
          const results = test.results ?? []
          const final = results.length > 0 ? results[results.length - 1] : null
          const status = final?.status ?? test.outcome ?? 'unknown'
          countStatus(status)

          if (status === 'failed' || status === 'timedOut' || status === 'interrupted') {
            const errorText =
              (final?.errors ?? [])
                .map((err) => (err?.message ? String(err.message) : ''))
                .filter(Boolean)
                .join(' | ') || status
            failures.push({
              title: titles.join(' > ') || '(untitled)',
              file: spec.file || suiteFile || '',
              error: errorText.slice(0, 800),
            })
          }
        }
      }

      walkSuites(suite.suites, suiteTitles, suiteFile)
    }
  }

  walkSuites(payload.suites ?? [])

  return { ...counts, failures }
}

async function runAttempt({ project, attempt, workers, runDir, requireAdmin }) {
  const logsDir = path.join(runDir, 'logs')
  const jsonDir = path.join(runDir, 'json')
  mkdirp(logsDir)
  mkdirp(jsonDir)

  const logPath = path.join(logsDir, `${project}.attempt-${attempt}.log`)
  const jsonPath = path.join(jsonDir, `${project}.attempt-${attempt}.json`)

  const startedAt = nowIso()
  const t0 = Date.now()
  const logStream = fs.createWriteStream(logPath, { flags: 'w' })

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const args = [
    'playwright',
    'test',
    `--project=${project}`,
    `--workers=${workers}`,
    '--reporter=json',
  ]

  const env = {
    ...process.env,
    PLAYWRIGHT_JSON_OUTPUT_NAME: jsonPath,
  }
  if (project === 'coverage-admin' && requireAdmin) {
    env.COVERAGE_REQUIRE_ADMIN = 'true'
  }

  let exitCode = -1
  let signal = null
  let spawnError = ''

  await new Promise((resolve) => {
    const child = spawn(npxCommand, args, {
      cwd: ROOT,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      logStream.write(text)
      process.stdout.write(`[${project}#${attempt}] ${text}`)
    })

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString()
      logStream.write(text)
      process.stderr.write(`[${project}#${attempt}] ${text}`)
    })

    child.on('error', (err) => {
      spawnError = String(err?.message || err)
    })

    child.on('close', (code, closeSignal) => {
      exitCode = typeof code === 'number' ? code : -1
      signal = closeSignal ?? null
      resolve()
    })
  })

  logStream.end()

  const parsed = parsePlaywrightResults(jsonPath)
  const endedAt = nowIso()
  const durationSec = Number(((Date.now() - t0) / 1000).toFixed(1))

  const failedTotal = parsed.failed + parsed.timedOut + parsed.interrupted + parsed.unknown
  const status = exitCode === 0 && failedTotal === 0 && !spawnError ? 'passed' : 'failed'

  return {
    attempt,
    startedAt,
    endedAt,
    durationSec,
    command: `${npxCommand} ${args.join(' ')}`,
    exitCode,
    signal,
    spawnError,
    logPath,
    jsonPath,
    summary: {
      passed: parsed.passed,
      failed: parsed.failed,
      skipped: parsed.skipped,
      timedOut: parsed.timedOut,
      interrupted: parsed.interrupted,
      unknown: parsed.unknown,
    },
    failures: parsed.failures.slice(0, 50),
    status,
  }
}

function buildFinalReport(state, runDir) {
  const summaryPath = path.join(runDir, 'summary.md')
  const summaryJsonPath = path.join(runDir, 'summary.json')
  const lines = []

  lines.push('# Coverage Overnight Summary')
  lines.push('')
  lines.push(`- Started: ${state.startedAt}`)
  lines.push(`- Finished: ${nowIso()}`)
  lines.push(`- Max retries per project: ${state.settings.maxRetries}`)
  lines.push(`- Workers: ${state.settings.workers}`)
  lines.push('')
  lines.push('| Project | Status | Attempts | Passed | Failed | Skipped | Duration (s) |')
  lines.push('|---|---|---:|---:|---:|---:|---:|')

  let overallFailedProjects = 0
  const projectSummaries = []

  for (const project of state.settings.projects) {
    const entry = state.projects[project] ?? { status: 'pending', attempts: [] }
    const last = entry.attempts.length > 0 ? entry.attempts[entry.attempts.length - 1] : null
    const passed = last?.summary?.passed ?? 0
    const failed =
      (last?.summary?.failed ?? 0) +
      (last?.summary?.timedOut ?? 0) +
      (last?.summary?.interrupted ?? 0) +
      (last?.summary?.unknown ?? 0)
    const skipped = last?.summary?.skipped ?? 0
    const duration = last?.durationSec ?? 0

    lines.push(`| ${project} | ${entry.status} | ${entry.attempts.length} | ${passed} | ${failed} | ${skipped} | ${duration} |`)

    if (entry.status !== 'passed') overallFailedProjects += 1
    projectSummaries.push({
      project,
      status: entry.status,
      attempts: entry.attempts.length,
      passed,
      failed,
      skipped,
      durationSec: duration,
      lastLogPath: last?.logPath ?? '',
      failures: last?.failures ?? [],
    })
  }

  lines.push('')
  lines.push(`- Final result: ${overallFailedProjects === 0 ? 'PASS' : 'FAIL'}`)
  lines.push(`- Projects failed: ${overallFailedProjects}`)
  lines.push('')

  const failedProjects = projectSummaries.filter((proj) => proj.status !== 'passed')
  if (failedProjects.length > 0) {
    lines.push('## Failures')
    lines.push('')
    for (const proj of failedProjects) {
      lines.push(`### ${proj.project}`)
      lines.push(`- Log: ${proj.lastLogPath}`)
      const top = proj.failures.slice(0, 5)
      if (top.length === 0) {
        lines.push('- No parsed test failure details (check log).')
      } else {
        for (const fail of top) {
          lines.push(`- ${fail.file} :: ${fail.title}`)
          lines.push(`  ${fail.error}`)
        }
      }
      lines.push('')
    }
  }

  fs.writeFileSync(summaryPath, lines.join('\n'), 'utf8')
  fs.writeFileSync(
    summaryJsonPath,
    JSON.stringify(
      {
        startedAt: state.startedAt,
        finishedAt: nowIso(),
        settings: state.settings,
        projectSummaries,
        failedProjects: overallFailedProjects,
        passed: overallFailedProjects === 0,
      },
      null,
      2
    ),
    'utf8'
  )

  return { summaryPath, summaryJsonPath, failedProjects: overallFailedProjects }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const runDir = resolveRunDir(options)
  const statePath = path.join(runDir, 'state.json')

  mkdirp(runDir)
  mkdirp(path.join(runDir, 'logs'))
  mkdirp(path.join(runDir, 'json'))

  let state = loadState(statePath)
  if (!state) {
    state = createInitialState(options)
    saveState(statePath, state)
  } else {
    state.settings.maxRetries = options.maxRetries
    state.settings.workers = options.workers
    state.settings.requireAdmin = options.requireAdmin
    state.settings.projects = PROJECTS
    saveState(statePath, state)
  }

  console.log(`[coverage-runner] Run directory: ${runDir}`)
  console.log(`[coverage-runner] Resume mode: ${options.resume ? 'on' : 'off'}`)
  console.log(`[coverage-runner] Max retries: ${options.maxRetries}`)
  console.log(`[coverage-runner] Workers: ${options.workers}`)
  console.log(`[coverage-runner] Require admin auth: ${options.requireAdmin ? 'on' : 'off'}`)

  for (const project of PROJECTS) {
    const entry = getProjectEntry(state, project)

    if (!shouldRunProject(entry, options.maxRetries)) {
      console.log(`[coverage-runner] Skipping ${project} (status=${entry.status}, attempts=${entry.attempts.length})`)
      continue
    }

    const maxAttempts = 1 + options.maxRetries
    while (entry.attempts.length < maxAttempts) {
      const attemptNumber = entry.attempts.length + 1
      console.log(`[coverage-runner] Running ${project} attempt ${attemptNumber}/${maxAttempts}`)

      const attemptResult = await runAttempt({
        project,
        attempt: attemptNumber,
        workers: options.workers,
        runDir,
        requireAdmin: options.requireAdmin,
      })

      entry.attempts.push(attemptResult)

      if (attemptResult.status === 'passed') {
        entry.status = 'passed'
        saveState(statePath, state)
        console.log(`[coverage-runner] ${project} passed on attempt ${attemptNumber}`)
        break
      }

      entry.status = entry.attempts.length >= maxAttempts ? 'failed' : 'retrying'
      saveState(statePath, state)
      console.log(`[coverage-runner] ${project} failed on attempt ${attemptNumber} (exit=${attemptResult.exitCode})`)

      if (entry.status === 'retrying') {
        console.log(`[coverage-runner] Waiting ${Math.round(RETRY_DELAY_MS / 1000)}s before retry`)
        await sleep(RETRY_DELAY_MS)
      }
    }
  }

  const summary = buildFinalReport(state, runDir)
  console.log(`[coverage-runner] Summary: ${summary.summaryPath}`)
  console.log(`[coverage-runner] Summary JSON: ${summary.summaryJsonPath}`)

  if (summary.failedProjects > 0) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('[coverage-runner] Fatal error:', err)
  process.exitCode = 1
})
