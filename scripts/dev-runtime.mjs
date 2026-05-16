#!/usr/bin/env node

import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = resolve(__dirname, '..')
const TMP_DIR = join(PROJECT_ROOT, '.agents', 'tmp')
const SNAPSHOT_FILE = join(TMP_DIR, 'dev-runtime-snapshot.json')
const CANONICAL_PORT = 3100
const CANONICAL_URL = `http://localhost:${CANONICAL_PORT}`
const HEALTH_URL = `${CANONICAL_URL}/api/health`
const START_TIMEOUT_MS = 60_000
const HEALTH_TIMEOUT_MS = Number(process.env.DEV_RUNTIME_HEALTH_TIMEOUT_MS || 30_000)

function normalize(value) {
  return String(value || '').replace(/\\/g, '/').toLowerCase()
}

function parseArgs(argv) {
  const args = { _: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (!token.startsWith('--')) {
      args._.push(token)
      continue
    }
    const key = token.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
      continue
    }
    args[key] = next
    i += 1
  }
  return args
}

async function powershellJson(script) {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `& { ${script} } | ConvertTo-Json -Depth 5`],
    { cwd: PROJECT_ROOT, maxBuffer: 20 * 1024 * 1024 }
  )
  const trimmed = stdout.trim()
  if (!trimmed) return []
  const parsed = JSON.parse(trimmed)
  return Array.isArray(parsed) ? parsed : [parsed]
}

async function getProcesses() {
  if (process.platform !== 'win32') return []
  return powershellJson(`
    Get-CimInstance Win32_Process |
      Select-Object ProcessId,ParentProcessId,Name,CommandLine
  `)
}

async function getListeners() {
  if (process.platform !== 'win32') return []
  return powershellJson(`
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
      Select-Object LocalAddress,LocalPort,OwningProcess
  `)
}

function isChefFlowCommand(commandLine) {
  const command = normalize(commandLine)
  return /\/users\/david\/documents\/cfv1(?:[\/\s"']|-)/.test(command)
}

function isThisCheckoutCommand(commandLine) {
  return normalize(commandLine).includes(normalize(PROJECT_ROOT))
}

function isOtherChefFlowWorktreeCommand(commandLine) {
  return /\/users\/david\/documents\/cfv1-[^/\s"']+/.test(normalize(commandLine))
}

function isNextDevCommand(commandLine) {
  const command = normalize(commandLine)
  return command.includes('next') && /\bdev\b/.test(command)
}

function isNextStartServer(commandLine) {
  return normalize(commandLine).includes('/next/dist/server/lib/start-server.js')
}

function portForPid(listeners, pid) {
  const listener = listeners.find((item) => Number(item.OwningProcess) === Number(pid))
  return listener ? Number(listener.LocalPort) : null
}

function buildProcessIndex(processes) {
  return new Map(processes.map((item) => [Number(item.ProcessId), item]))
}

function buildChildrenIndex(processes) {
  const children = new Map()
  for (const processInfo of processes) {
    const parentPid = Number(processInfo.ParentProcessId)
    children.set(parentPid, [...(children.get(parentPid) || []), processInfo])
  }
  return children
}

function getAncestorChain(processesByPid, pid) {
  const chain = []
  const seen = new Set()
  let current = processesByPid.get(Number(pid))
  while (current && !seen.has(Number(current.ProcessId))) {
    seen.add(Number(current.ProcessId))
    chain.push(current)
    current = processesByPid.get(Number(current.ParentProcessId))
  }
  return chain
}

function getDescendantChain(childrenByPid, pid) {
  const descendants = []
  const stack = [...(childrenByPid.get(Number(pid)) || [])]
  const seen = new Set()
  while (stack.length > 0) {
    const current = stack.pop()
    if (!current || seen.has(Number(current.ProcessId))) continue
    seen.add(Number(current.ProcessId))
    descendants.push(current)
    stack.push(...(childrenByPid.get(Number(current.ProcessId)) || []))
  }
  return descendants
}

function classifyRuntime(processes, listeners) {
  const byPid = buildProcessIndex(processes)
  const childrenByPid = buildChildrenIndex(processes)
  const runtimes = []

  for (const processInfo of processes) {
    const commandLine = processInfo.CommandLine || ''
    if (!isChefFlowCommand(commandLine)) continue
    if (!isNextDevCommand(commandLine) && !isNextStartServer(commandLine)) continue

    const pid = Number(processInfo.ProcessId)
    const chain = getAncestorChain(byPid, pid)
    const descendants = getDescendantChain(childrenByPid, pid)
    const related = [...chain, ...descendants]
    const relatedCommand = related.map((item) => item.CommandLine || '').join('\n')
    const port = portForPid(listeners, pid)
    const checkout = isOtherChefFlowWorktreeCommand(relatedCommand)
      ? 'worktree'
      : isThisCheckoutCommand(relatedCommand)
        ? 'current'
        : 'worktree'
    const mode = isNextDevCommand(relatedCommand) ? 'dev' : 'next-server'
    const descendantPorts = descendants.map((item) => portForPid(listeners, Number(item.ProcessId))).filter(Boolean)
    const canonical = checkout === 'current' && (port === CANONICAL_PORT || descendantPorts.includes(CANONICAL_PORT))
    const duplicate =
      isNextDevCommand(relatedCommand) &&
      (!canonical || chain.some((item) => !isThisCheckoutCommand(item.CommandLine || '')))
    const owner =
      chain.find((item) => normalize(item.CommandLine).includes('scripts/run-playwright-dev-server.mjs')) ||
      chain.find((item) => isNextDevCommand(item.CommandLine || '')) ||
      processInfo

    runtimes.push({
      pid,
      ownerPid: Number(owner.ProcessId),
      parentPid: Number(processInfo.ParentProcessId),
      name: processInfo.Name,
      port,
      checkout,
      mode,
      canonical,
      duplicate,
      commandLine,
    })
  }

  const byKey = new Map()
  for (const runtime of runtimes) {
    const key = `${runtime.pid}:${runtime.port || 'no-port'}`
    byKey.set(key, runtime)
  }
  return [...byKey.values()].sort((a, b) => (a.port || 0) - (b.port || 0) || a.pid - b.pid)
}

async function healthCheck(url = HEALTH_URL, timeoutMs = HEALTH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' })
    return {
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - started,
      url,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - started,
      url,
      error: error.name === 'AbortError' ? 'timeout' : error.message,
    }
  } finally {
    clearTimeout(timer)
  }
}

function healthTimeoutFromArgs(args = {}) {
  return Number(args['health-timeout-ms'] || args['health-timeout'] || HEALTH_TIMEOUT_MS)
}

async function snapshot(args = {}) {
  const [processes, listeners] = await Promise.all([getProcesses(), getListeners()])
  const runtimes = classifyRuntime(processes, listeners)
  const canonical = runtimes.find((runtime) => runtime.canonical)
  const duplicates = runtimes.filter((runtime) => runtime.duplicate && !runtime.canonical)
  const canonicalHealth = await healthCheck(HEALTH_URL, healthTimeoutFromArgs(args))
  return {
    timestamp: new Date().toISOString(),
    projectRoot: PROJECT_ROOT,
    canonicalUrl: CANONICAL_URL,
    canonicalPort: CANONICAL_PORT,
    canonicalPid: canonical?.pid || null,
    canonicalRunning: Boolean(canonical),
    canonicalHealthy: canonicalHealth.ok,
    canonicalHealth,
    duplicates,
    runtimes,
  }
}

function formatRuntime(runtime) {
  const port = runtime.port ? `:${runtime.port}` : ':no-port'
  return `${runtime.pid}\t${port}\t${runtime.checkout}\t${runtime.mode}\t${runtime.canonical ? 'canonical' : runtime.duplicate ? 'duplicate' : 'observed'}`
}

function printSnapshot(data, json = false) {
  if (json) {
    console.log(JSON.stringify(data, null, 2))
    return
  }
  console.log(`canonical: ${data.canonicalUrl}`)
  console.log(`healthy: ${data.canonicalHealthy ? 'yes' : 'no'} (${data.canonicalHealth.status || data.canonicalHealth.error || 'unknown'})`)
  console.log(`duplicates: ${data.duplicates.length}`)
  for (const runtime of data.runtimes) console.log(formatRuntime(runtime))
}

async function writeSnapshot(data) {
  await mkdir(TMP_DIR, { recursive: true })
  await writeFile(SNAPSHOT_FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

async function killPid(pid) {
  if (process.platform === 'win32') {
    await execFileAsync('taskkill.exe', ['/PID', String(pid), '/T', '/F'], { cwd: PROJECT_ROOT }).catch(() => {})
    return
  }
  try {
    process.kill(pid, 'SIGTERM')
  } catch {
    // Best effort.
  }
}

async function stopDuplicates() {
  const before = await snapshot()
  const ownerPids = [...new Set(before.duplicates.map((runtime) => runtime.ownerPid || runtime.pid))]
  for (const runtime of before.duplicates) {
    if (!ownerPids.includes(runtime.pid)) continue
    await killPid(runtime.pid)
  }
  for (const pid of ownerPids) {
    if (!before.duplicates.some((runtime) => runtime.pid === pid)) {
      await killPid(pid)
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 1500))
  const after = await snapshot()
  await writeSnapshot(after)
  return { before, after, killed: ownerPids }
}

async function startCanonical() {
  let data = await snapshot()
  if (data.canonicalRunning && data.canonicalHealthy) {
    await writeSnapshot(data)
    return { ok: true, alreadyRunning: true, snapshot: data }
  }

  if (data.canonicalPid && !data.canonicalHealthy) {
    await killPid(data.canonicalPid)
    await new Promise((resolve) => setTimeout(resolve, 1500))
  }

  data = await snapshot()
  if (!data.canonicalRunning) {
    await mkdir(TMP_DIR, { recursive: true })
    if (process.platform === 'win32') {
      const escapedRoot = PROJECT_ROOT.replace(/'/g, "''")
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','dev') -WorkingDirectory '${escapedRoot}' -WindowStyle Hidden`,
      ])
    } else {
      const child = spawn('npm', ['run', 'dev'], {
        cwd: PROJECT_ROOT,
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
    }
  }

  const deadline = Date.now() + START_TIMEOUT_MS
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    data = await snapshot()
    if (data.canonicalRunning && data.canonicalHealthy) {
      await writeSnapshot(data)
      return { ok: true, started: true, snapshot: data }
    }
  }

  await writeSnapshot(data)
  return { ok: false, error: 'canonical server did not become healthy before timeout', snapshot: data }
}

async function restartCanonical() {
  const data = await snapshot()
  if (data.canonicalPid) await killPid(data.canonicalPid)
  await new Promise((resolve) => setTimeout(resolve, 1500))
  return startCanonical()
}

async function assertRuntime(args) {
  const data = await snapshot(args)
  await writeSnapshot(data)
  const allowIsolated = Boolean(args['allow-isolated'])
  const failures = []
  if (!data.canonicalRunning) failures.push('canonical server is not running on port 3100')
  if (!data.canonicalHealthy) failures.push(`canonical health failed: ${data.canonicalHealth.error || data.canonicalHealth.status}`)
  if (data.duplicates.length > 0 && !allowIsolated) {
    failures.push(`duplicate ChefFlow dev runtimes detected: ${data.duplicates.map((runtime) => `${runtime.pid}:${runtime.port || 'no-port'}`).join(', ')}`)
  }
  return { ok: failures.length === 0, failures, snapshot: data }
}

async function main() {
  const [command = 'status', ...rest] = process.argv.slice(2)
  const args = parseArgs(rest)
  if (command === 'status' || command === 'snapshot') {
    const data = await snapshot(args)
    await writeSnapshot(data)
    printSnapshot(data, Boolean(args.json))
    return
  }
  if (command === 'verify' || command === 'assert') {
    const result = await assertRuntime(args)
    if (args.json) console.log(JSON.stringify(result, null, 2))
    else if (result.ok) console.log('runtime: PASS')
    else for (const failure of result.failures) console.error(`runtime: FAIL ${failure}`)
    if (!result.ok) process.exitCode = 1
    return
  }
  if (command === 'start') {
    const result = await startCanonical()
    console.log(args.json ? JSON.stringify(result, null, 2) : result.ok ? 'runtime: started' : `runtime: FAIL ${result.error}`)
    if (!result.ok) process.exitCode = 1
    return
  }
  if (command === 'restart') {
    const result = await restartCanonical()
    console.log(args.json ? JSON.stringify(result, null, 2) : result.ok ? 'runtime: restarted' : `runtime: FAIL ${result.error}`)
    if (!result.ok) process.exitCode = 1
    return
  }
  if (command === 'stop-duplicates') {
    const result = await stopDuplicates()
    console.log(args.json ? JSON.stringify(result, null, 2) : `runtime: killed ${result.killed.length} duplicate runtime(s)`)
    return
  }
  if (command === 'stop') {
    const data = await snapshot()
    if (data.canonicalPid) await killPid(data.canonicalPid)
    console.log(data.canonicalPid ? `runtime: stopped ${data.canonicalPid}` : 'runtime: canonical server not running')
    return
  }
  if (command === 'last-snapshot') {
    if (!existsSync(SNAPSHOT_FILE)) throw new Error(`No runtime snapshot exists at ${SNAPSHOT_FILE}`)
    console.log(await readFile(SNAPSHOT_FILE, 'utf8'))
    return
  }
  if (command === 'help' || command === '--help') {
    console.log('Commands: status, snapshot, verify, assert, start, restart, stop, stop-duplicates, last-snapshot')
    console.log('Options: --health-timeout-ms N for status/snapshot/verify/assert')
    return
  }
  throw new Error(`Unknown command: ${command}`)
}

main().catch((error) => {
  console.error(`[dev-runtime] ${error.message}`)
  process.exit(1)
})
