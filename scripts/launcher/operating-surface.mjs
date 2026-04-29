import { exec } from 'node:child_process'
import { open, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

const SNAPSHOT_FILE = join('system', 'operating-surface.json')
const WATCH_PORTS = [3100, 3200, 3300, 11434, 41937]
const IMPORTANT_LOGS = [
  'logs/live-ops-guardian-latest.json',
  'logs/live-ops-guardian-alert.txt',
  'logs/live-ops-guardian.log',
  'logs/openclaw-auto-sync.log',
  'logs/health-check.log',
  'logs/persona-daemon.err.log',
  'logs/persona-daemon.out.log',
]

function timeoutSignal(ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return { signal: controller.signal, clear: () => clearTimeout(timer) }
}

async function run(command, options = {}) {
  const { signal, clear } = timeoutSignal(options.timeoutMs ?? 5000)
  try {
    const result = await execAsync(command, {
      cwd: options.cwd,
      windowsHide: true,
      maxBuffer: options.maxBuffer ?? 1024 * 1024,
      signal,
    })
    return {
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    }
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.trim?.() ?? '',
      stderr: error.stderr?.trim?.() ?? '',
      error: error.message,
    }
  } finally {
    clear()
  }
}

async function readJson(projectRoot, relativePath) {
  try {
    const raw = await readFile(join(projectRoot, relativePath), 'utf8')
    return { ok: true, value: JSON.parse(raw) }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

async function tailFile(projectRoot, relativePath, maxBytes = 64 * 1024) {
  const fullPath = join(projectRoot, relativePath)
  let handle
  try {
    handle = await open(fullPath, 'r')
    const stat = await handle.stat()
    const length = Math.min(stat.size, maxBytes)
    const start = Math.max(0, stat.size - length)
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, start)
    const text = buffer.toString('utf8')
    return {
      ok: true,
      size: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      lines: text.split(/\r?\n/).filter(Boolean).slice(-80),
    }
  } catch (error) {
    return { ok: false, error: error.message, lines: [] }
  } finally {
    await handle?.close().catch(() => {})
  }
}

function parseJsonList(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!parsed) return []
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}

function normalizeTcpState(state) {
  const value = String(state ?? '')
  const states = {
    1: 'Closed',
    2: 'Listen',
    3: 'SynSent',
    4: 'SynReceived',
    5: 'Established',
    6: 'FinWait1',
    7: 'FinWait2',
    8: 'CloseWait',
    9: 'Closing',
    10: 'LastAck',
    11: 'TimeWait',
    12: 'DeleteTcb',
  }
  return states[value] ?? value
}

function normalizePortRows(rows) {
  return rows.map((row) => ({
    localAddress: row.LocalAddress ?? null,
    localPort: Number(row.LocalPort),
    state: normalizeTcpState(row.State),
    owningProcess: Number(row.OwningProcess ?? 0),
  }))
}

function classifyProcess(commandLine = '', name = '') {
  const text = `${name} ${commandLine}`.toLowerCase()
  if (text.includes('next') && text.includes('dev')) return 'dev-server'
  if (text.includes('ollama')) return 'ollama'
  if (text.includes('cloudflared')) return 'tunnel'
  if (text.includes('persona')) return 'persona-pipeline'
  if (text.includes('playwright')) return 'playwright'
  if (text.includes('codex')) return 'agent'
  if (text.includes('launcher/server.mjs')) return 'mission-control'
  if (text.includes('auto-sync')) return 'pricing-sync'
  if (text.includes('tsc ')) return 'typecheck'
  return 'process'
}

async function getPorts(projectRoot) {
  const ps = [
    '$ports = @(3100,3200,3300,11434,41937);',
    'Get-NetTCPConnection -LocalPort $ports -ErrorAction SilentlyContinue |',
    'Select-Object LocalAddress,LocalPort,State,OwningProcess | ConvertTo-Json -Depth 3',
  ].join(' ')
  const result = await run(`powershell.exe -NoProfile -Command "${ps}"`, { cwd: projectRoot })
  const rows = normalizePortRows(parseJsonList(result.stdout))
  const ok = result.ok || rows.length > 0
  return {
    ok,
    expected: WATCH_PORTS,
    listeners: rows.filter((row) => row.state === 'Listen'),
    connections: rows,
    error: ok ? null : result.error,
  }
}

async function getProcesses(projectRoot) {
  const ps = [
    "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'next|node|ollama|cloudflared|watchdog|persona|playwright|codex|launcher|auto-sync|tsc' } |",
    'Select-Object ProcessId,ParentProcessId,Name,CommandLine | ConvertTo-Json -Depth 3',
  ].join(' ')
  const result = await run(`powershell.exe -NoProfile -Command "${ps}"`, {
    cwd: projectRoot,
    maxBuffer: 4 * 1024 * 1024,
  })
  const rows = parseJsonList(result.stdout).map((row) => ({
    pid: Number(row.ProcessId),
    parentPid: Number(row.ParentProcessId),
    name: row.Name ?? '',
    kind: classifyProcess(row.CommandLine, row.Name),
    commandLine: row.CommandLine ?? '',
  }))
  return {
    ok: result.ok,
    count: rows.length,
    rows: rows.slice(0, 180),
    byKind: rows.reduce((acc, row) => {
      acc[row.kind] = (acc[row.kind] ?? 0) + 1
      return acc
    }, {}),
    error: result.ok ? null : result.error,
  }
}

async function getScheduledTasks(projectRoot) {
  const ps = [
    "Get-ScheduledTask | Where-Object { $_.TaskName -like 'ChefFlow-*' -or $_.TaskName -like 'OpenClaw*' -or $_.TaskName -like '*Codex*' } |",
    'ForEach-Object {',
    '$info = Get-ScheduledTaskInfo $_.TaskName -ErrorAction SilentlyContinue;',
    '[pscustomobject]@{ TaskName=$_.TaskName; State=$_.State.ToString(); LastRunTime=$info.LastRunTime; NextRunTime=$info.NextRunTime; LastTaskResult=$info.LastTaskResult }',
    '} | ConvertTo-Json -Depth 3',
  ].join(' ')
  const result = await run(`powershell.exe -NoProfile -Command "${ps}"`, {
    cwd: projectRoot,
    maxBuffer: 2 * 1024 * 1024,
  })
  const rows = parseJsonList(result.stdout).map((row) => ({
    name: row.TaskName,
    state: row.State,
    lastRunTime: row.LastRunTime || null,
    nextRunTime: row.NextRunTime || null,
    lastTaskResult: row.LastTaskResult,
  }))
  return {
    ok: result.ok,
    running: rows.filter((row) => row.state === 'Running'),
    ready: rows.filter((row) => row.state === 'Ready').length,
    rows,
    error: result.ok ? null : result.error,
  }
}

async function getGit(projectRoot) {
  const [branch, status, recent] = await Promise.all([
    run('git branch --show-current', { cwd: projectRoot }),
    run('git status --porcelain=v1 -b', { cwd: projectRoot, maxBuffer: 2 * 1024 * 1024 }),
    run('git log -5 --oneline --decorate', { cwd: projectRoot }),
  ])
  const lines = status.stdout.split(/\r?\n/).filter(Boolean)
  const dirtyLines = lines.filter((line) => !line.startsWith('##'))
  return {
    ok: branch.ok && status.ok,
    branch: branch.stdout || 'unknown',
    summary: lines[0] ?? '',
    dirtyCount: dirtyLines.length,
    dirtyFiles: dirtyLines.slice(0, 120),
    recentCommits: recent.stdout.split(/\r?\n/).filter(Boolean),
    error: branch.error || status.error || null,
  }
}

async function getHealth(projectRoot) {
  const checks = await Promise.all(
    [
      ['dev-health', 'http://localhost:3100/api/health'],
      ['dev-readiness', 'http://localhost:3100/api/health/readiness?strict=1'],
      ['dev-ping', 'http://localhost:3100/api/health/ping'],
      ['ollama-tags', 'http://localhost:11434/api/tags'],
    ].map(async ([name, url]) => {
      const start = Date.now()
      try {
        const res = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
          cache: 'no-store',
        })
        return {
          name,
          ok: res.ok,
          status: res.status,
          latencyMs: Date.now() - start,
          url,
        }
      } catch (error) {
        return {
          name,
          ok: false,
          status: 0,
          latencyMs: Date.now() - start,
          url,
          error: error.message,
        }
      }
    })
  )

  const liveOps = await readJson(projectRoot, 'logs/live-ops-guardian-latest.json')
  const syncStatus = await readJson(projectRoot, 'docs/sync-status.json')

  return {
    probes: checks,
    liveOps: liveOps.ok ? liveOps.value : { status: 'unknown', error: liveOps.error },
    openclawSync: syncStatus.ok ? syncStatus.value : { status: 'unknown', error: syncStatus.error },
  }
}

async function getLogs(projectRoot) {
  const entries = await Promise.all(
    IMPORTANT_LOGS.map(async (relativePath) => ({
      path: relativePath,
      ...(await tailFile(projectRoot, relativePath, 48 * 1024)),
    }))
  )
  return entries
}

async function getRuntimeEvents(projectRoot) {
  const tail = await tailFile(projectRoot, 'system/runtime-events.ndjson', 128 * 1024)
  const events = tail.lines
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
  return {
    ok: tail.ok,
    modifiedAt: tail.modifiedAt ?? null,
    count: events.length,
    recent: events.slice(-40),
    errors: events.filter((event) => event.type === 'error').slice(-20),
    error: tail.ok ? null : tail.error,
  }
}

function buildRisks(snapshot) {
  const risks = []
  const listeners = new Set(snapshot.ports.listeners.map((row) => row.localPort))
  for (const port of [3100, 11434, 41937]) {
    if (!listeners.has(port)) {
      risks.push({
        severity: 'critical',
        source: 'ports',
        message: `Expected listener missing on port ${port}`,
      })
    }
  }
  if (snapshot.health.liveOps?.status && snapshot.health.liveOps.status !== 'ok') {
    risks.push({
      severity: 'warning',
      source: 'live-ops',
      message: `Live Ops Guardian status is ${snapshot.health.liveOps.status}`,
    })
  }
  if (snapshot.health.openclawSync?.status && snapshot.health.openclawSync.status !== 'success') {
    risks.push({
      severity: 'warning',
      source: 'pricing-sync',
      message: `Pricing sync status is ${snapshot.health.openclawSync.status}`,
    })
  }
  if (snapshot.git.dirtyCount > 0) {
    risks.push({
      severity: 'info',
      source: 'git',
      message: `${snapshot.git.dirtyCount} dirty files visible in working tree`,
    })
  }
  if ((snapshot.processes.byKind.playwright ?? 0) > 20) {
    risks.push({
      severity: 'warning',
      source: 'processes',
      message: `${snapshot.processes.byKind.playwright} Playwright-related processes visible`,
    })
  }
  return risks
}

export async function buildOperatingSurface(projectRoot) {
  const generatedAt = new Date().toISOString()
  const [ports, processes, scheduledTasks, git, health, logs, runtimeEvents] = await Promise.all([
    getPorts(projectRoot),
    getProcesses(projectRoot),
    getScheduledTasks(projectRoot),
    getGit(projectRoot),
    getHealth(projectRoot),
    getLogs(projectRoot),
    getRuntimeEvents(projectRoot),
  ])

  const snapshot = {
    generatedAt,
    ui: {
      devUrl: 'http://localhost:3100',
      missionControlUrl: 'http://localhost:41937',
      requiredVisibleTabs: ['active dev route', 'console', 'network', 'application', 'mission-control'],
    },
    ports,
    processes,
    scheduledTasks,
    git,
    health,
    logs,
    runtimeEvents,
  }
  snapshot.risks = buildRisks(snapshot)

  if (process.env.MC_WRITE_OPERATING_SURFACE === '1') {
    try {
      await writeFile(join(projectRoot, SNAPSHOT_FILE), JSON.stringify(snapshot, null, 2) + '\n')
      snapshot.persistedTo = SNAPSHOT_FILE
    } catch (error) {
      snapshot.persistedTo = null
      snapshot.persistError = error.message
    }
  } else {
    snapshot.persistedTo = null
    snapshot.persistReason = 'MC_WRITE_OPERATING_SURFACE is not enabled'
  }

  return snapshot
}
