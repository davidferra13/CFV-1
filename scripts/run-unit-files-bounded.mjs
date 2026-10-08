#!/usr/bin/env node
import { globSync, mkdirSync, readFileSync, writeFileSync, createWriteStream } from 'node:fs'
import { spawn, execFile } from 'node:child_process'
import { dirname, resolve, relative, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export function discoverTests(root, patterns) {
  const selected = new Set()
  for (const pattern of patterns) {
    if (!pattern.startsWith('tests/unit/') || pattern.includes('..') || pattern.includes('\\')) {
      throw new Error('Expected repository-relative tests/unit/ patterns')
    }
    const matches = globSync(pattern, { cwd: root }).filter(file => /\.test\.(?:ts|mjs|cjs)$/.test(file))
    if (!matches.length) throw new Error('No test files match ' + pattern)
    for (const file of matches) selected.add(file.replaceAll('\\', '/'))
  }
  return [...selected].sort()
}

// Only a statement that starts a line counts. A test that merely mentions
// vitest inside a string (this runner's own test does) stays on node:test.
const VITEST_STATEMENT = /^[ \t]*(?:import\s[^'"\n]*?from\s*['"]vitest['"]|import\s*['"]vitest['"]|(?:const|let|var)\s[^=\n]*=\s*(?:await\s+import|require)\s*\(\s*['"]vitest['"])/m

export function engineFor(source) {
  return VITEST_STATEMENT.test(source) ? 'vitest' : 'node'
}

export async function stopOwnedTree(child) {
  if (process.platform !== 'win32') {
    try { process.kill(-child.pid, 'SIGKILL') } catch (error) {
      if (error.code !== 'ESRCH') throw error
    }
    return true
  }
  return new Promise(resolveStop => {
    execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      timeout: 5000, windowsHide: true,
    }, error => {
      if (!error) return resolveStop(true)
      // Fail closed if the tree could not be confirmed stopped. Do not launch the next file.
      try { child.kill('SIGKILL') } catch {}
      resolveStop(false)
    })
  })
}

export async function runFile(root, file, { timeoutMs, logDirectory, nodeArguments = [], stopTree = stopOwnedTree }) {
  const engine = engineFor(readFileSync(join(root, file), 'utf8'))
  const runnerArguments = engine === 'vitest'
    ? [join(root, 'node_modules/vitest/vitest.mjs'), 'run', file,
       '--maxWorkers=1', '--no-file-parallelism',
       '--testTimeout=' + timeoutMs, '--hookTimeout=' + timeoutMs]
    : ['--test', '--test-concurrency=1', '--test-timeout=' + timeoutMs,
       ...(file.endsWith('.ts') ? ['--import', 'tsx'] : []), file]
  const logPath = join(logDirectory, file.replaceAll('/', '_') + '.log')
  const log = createWriteStream(logPath)
  const started = Date.now()
  const environment = { ...process.env }
  delete environment.NODE_TEST_CONTEXT
  const child = spawn(process.execPath, [...nodeArguments, ...runnerArguments], {
    cwd: root, env: environment, windowsHide: true, detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.pipe(log, { end: false })
  child.stderr.pipe(log, { end: false })
  let timedOut = false
  let cleanup = Promise.resolve(true)
  let spawnError
  let settleDeadline
  const deadline = new Promise(resolveDeadline => { settleDeadline = resolveDeadline })
  const timer = setTimeout(() => {
    timedOut = true
    cleanup = Promise.resolve().then(() => stopTree(child)).catch(() => false)
    cleanup.then(confirmed => {
      if (!confirmed) {
        try { child.kill('SIGKILL') } catch {}
        child.stdout.destroy()
        child.stderr.destroy()
        child.unref()
      }
      settleDeadline({ exitCode: child.exitCode, signal: child.signalCode })
    })
  }, timeoutMs)
  child.on('error', error => { spawnError = error.message })
  const closedNormally = new Promise(resolveClose => {
    child.on('close', (exitCode, signal) => resolveClose({ exitCode, signal }))
  })
  const closed = await Promise.race([closedNormally, deadline])
  clearTimeout(timer)
  const cleanupConfirmed = await cleanup
  await new Promise(resolveLog => log.end(resolveLog))
  return {
    file, engine, ownedPid: child.pid, ...closed, durationMs: Date.now() - started, logPath,
    status: timedOut ? 'timeout' : spawnError ? 'error' : closed.exitCode === 0 ? 'passed' : 'failed',
    cleanupConfirmed, ...(spawnError ? { error: spawnError } : {}),
  }
}

export async function main(argv) {
  const args = [...argv]
  let timeoutMs = 60000
  let reportPath
  const patterns = []
  while (args.length) {
    const argument = args.shift()
    if (argument === '--timeout-ms') timeoutMs = Number(args.shift())
    else if (argument === '--report') reportPath = resolve(args.shift() || '')
    else patterns.push(argument)
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 600000) {
    throw new Error('--timeout-ms must be between 100 and 600000')
  }
  if (!patterns.length) throw new Error('Provide tests/unit/ file patterns')
  const files = discoverTests(repository, patterns)
  const logDirectory = join(tmpdir(), 'chefflow-unit-' + Date.now() + '-' + process.pid)
  mkdirSync(logDirectory, { recursive: true })
  reportPath ||= join(logDirectory, 'result.json')
  const report = { startedAt: new Date().toISOString(), files: [], selected: files.length, complete: false }
  const save = () => writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
  save()
  for (const file of files) {
    console.log('[bounded-unit] ' + (report.files.length + 1) + '/' + files.length + ' ' + file)
    const result = await runFile(repository, file, { timeoutMs, logDirectory })
    report.files.push(result)
    save()
    console.log('[bounded-unit] ' + result.status + ' ' + result.durationMs + 'ms; ' + result.logPath)
    if (!result.cleanupConfirmed) break
  }
  report.complete = report.files.length === files.length
  report.finishedAt = new Date().toISOString()
  save()
  console.log('[bounded-unit] report ' + reportPath)
  return report.complete && report.files.every(file => file.status === 'passed') ? 0 : 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(status => { process.exitCode = status }).catch(error => {
    console.error(error.message)
    process.exitCode = 2
  })
}
