#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { posix, resolve, win32 } from 'node:path'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const ROOT = process.cwd()

const WRITER_PROCESS_PATTERNS = [
  /chefflow-watchdog\.ps1/i,
  /openclaw-pull[\\/]+pull\.mjs/i,
  /persona-pairing-dashboard-server\.mjs/i,
  /persona-inbox-server\.mjs/i,
]

const WRITER_SCHEDULED_TASKS = [
  'ChefFlow-Watchdog',
  'OpenClaw-Pull',
  'PersonaInbox-HealthCheck',
  'ChefFlow-HealthCheck',
  'ChefFlow-LiveOpsGuardian',
  'ChefFlow-PlatformObservabilityDigest',
]

const GENERATED_PATHS = [
  'docs/uptime-history.json',
  'docs/persona-pairing-run-log.jsonl',
  'docs/hermes/persona-pairing-brain-rotation.json',
  'docs/persona-pairing-reports/pair-index.csv',
]

export function normalizeWorkspacePath(value) {
  if (typeof value !== 'string' || !value.trim() || /[\r\n\0]/.test(value)) return null
  let path = value.trim()
  if (
    (path.startsWith('"') && path.endsWith('"')) ||
    (path.startsWith("'") && path.endsWith("'"))
  ) {
    path = path.slice(1, -1)
  }
  if (/^[a-z]:[\\/]/i.test(path) || /^[\\/]{2}[^\\/]+[\\/]/.test(path)) {
    const normalized = win32.normalize(path).replaceAll('\\', '/').toLowerCase()
    return normalized.length > 3 ? normalized.replace(/\/+$/, '') : normalized
  }
  if (path.startsWith('/')) {
    const normalized = posix.normalize(path)
    return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
  }
  return null
}

export function isWorkspaceOwnedPath(value, root = ROOT) {
  const path = normalizeWorkspacePath(value)
  const workspace = normalizeWorkspacePath(root)
  return Boolean(
    path &&
    workspace &&
    (path === workspace || path.startsWith(workspace.endsWith('/') ? workspace : workspace + '/'))
  )
}

function commandTokens(value) {
  if (typeof value !== 'string' || /\0/.test(value)) return null
  const tokens = []
  let token = ''
  let quote = null
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (quote) {
      if (char === quote) {
        if (value[i + 1] === quote) {
          token += char
          i++
        } else quote = null
      } else token += char
    } else if (char === '"' || char === "'") quote = char
    else if (/[\s;{}&]/.test(char)) {
      if (token) tokens.push(token)
      token = ''
    } else token += char
  }
  if (quote) return null
  if (token) tokens.push(token)
  return tokens
}

const SCRIPT_PATH = /\.(?:ps1|mjs|cjs|js|ts|py|sh|cmd|bat|vbs|wsf)$/i

function resolveScriptPath(value, directory) {
  if (normalizeWorkspacePath(value)) return value
  const base = normalizeWorkspacePath(directory)
  if (!base || !value || /^[a-z]:/i.test(value) || /[\r\n\0$%*?]/.test(value)) return null
  return /^[a-z]:\//i.test(base) || base.startsWith('//')
    ? win32.resolve(base, value)
    : posix.resolve(base, value)
}

function argumentPaths(value, directory = null, depth = 0) {
  const tokens = commandTokens(value ?? '')
  if (!tokens) return null
  const paths = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const normalized = normalizeWorkspacePath(token)
    if (normalized) paths.push(token)
    else if (SCRIPT_PATH.test(token) && !token.startsWith('-')) {
      const resolved = resolveScriptPath(token, directory)
      if (!resolved) return null
      paths.push(resolved)
    } else if (depth < 3 && /^-(?:command|c)$/i.test(tokens[i - 1] || '')) {
      const nested = argumentPaths(token, directory, depth + 1)
      if (!nested) return null
      paths.push(...nested)
    }
  }
  return paths
}

export function writerProcessWorkspaceScope(processInfo, root = ROOT) {
  if (
    !WRITER_PROCESS_PATTERNS.some((pattern) => pattern.test(String(processInfo?.CommandLine || '')))
  ) {
    return { scope: 'external', blocks: false, canStop: false }
  }
  const paths = argumentPaths(String(processInfo?.CommandLine || ''))
  const writers = paths?.filter((path) =>
    WRITER_PROCESS_PATTERNS.some((pattern) => pattern.test(path))
  )
  if (!writers?.length) return { scope: 'unknown', blocks: true, canStop: false }
  const owned = writers.some((path) => isWorkspaceOwnedPath(path, root))
  const external = writers.some((path) => !isWorkspaceOwnedPath(path, root))
  const scope = owned && external ? 'mixed' : owned ? 'owned' : 'external'
  return { scope, blocks: owned, canStop: scope === 'owned' }
}

export function processBelongsToWorkspace(processInfo, root = ROOT) {
  const scope = writerProcessWorkspaceScope(processInfo, root).scope
  return scope === 'owned' || scope === 'mixed'
}

function processCanBeStopped(processInfo, root) {
  return writerProcessWorkspaceScope(processInfo, root).canStop
}

export function scheduledTaskWorkspaceScope(task, root = ROOT) {
  if (!WRITER_SCHEDULED_TASKS.includes(task?.TaskName)) {
    return { scope: 'external', blocks: false, canDisable: false }
  }
  const actions = Array.isArray(task.Actions)
    ? task.Actions
    : task.Actions && typeof task.Actions === 'object'
      ? [task.Actions]
      : []
  let owned = false
  let external = false
  let unknown = actions.length === 0
  for (const action of actions) {
    if (!action || typeof action.Execute !== 'string' || !action.Execute.trim()) unknown = true
    const directory = action?.WorkingDirectory
    const paths = argumentPaths(action?.Arguments, directory)
    if (!paths) unknown = true
    let resolvedCommand = Boolean(paths?.some((path) => SCRIPT_PATH.test(path)))
    if (directory != null && directory !== '') {
      if (normalizeWorkspacePath(directory)) (paths || []).push(directory)
      else unknown = true
    }
    // System host executables are infrastructure; a directly executed script is an owner path.
    if (SCRIPT_PATH.test(String(action?.Execute || ''))) {
      const script = resolveScriptPath(action.Execute, directory)
      if (script) {
        ;(paths || []).push(script)
        resolvedCommand = true
      } else unknown = true
    } else if (
      !/^(?:powershell|pwsh|node|cmd|wscript|cscript|python(?:[\d.]+)?)(?:\.exe)?$/i.test(
        win32.basename(String(action?.Execute || ''))
      )
    ) {
      const executable = /[\\/]/.test(String(action?.Execute || ''))
        ? resolveScriptPath(action.Execute, directory)
        : null
      if (executable) {
        ;(paths || []).push(executable)
        resolvedCommand = true
      } else unknown = true
    }
    if (!resolvedCommand) unknown = true
    if (!paths?.length) unknown = true
    for (const path of paths || []) {
      if (isWorkspaceOwnedPath(path, root)) owned = true
      else external = true
    }
  }
  const scope = unknown ? 'unknown' : owned && external ? 'mixed' : owned ? 'owned' : 'external'
  const exactTaskFolder =
    typeof task.TaskPath === 'string' &&
    task.TaskPath.startsWith('\\') &&
    task.TaskPath.endsWith('\\')
  return { scope, blocks: owned || unknown, canDisable: scope === 'owned' && exactTaskFolder }
}

function psLiteral(value) {
  return "'" + String(value).replaceAll("'", "''") + "'"
}

function parseArgs(argv) {
  return {
    fix: argv.includes('--fix') || argv[0] === 'fix',
    json: argv.includes('--json'),
    allowDirty: argv.includes('--allow-dirty'),
  }
}

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    cwd: ROOT,
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  })
}

export async function powershellJson(script, { execute = run } = {}) {
  try {
    const { stdout } = await execute(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `$ErrorActionPreference = 'Stop'; $records = @(& { ${script} }); @{records=$records} | ConvertTo-Json -Depth 7`,
      ],
      { timeout: 30000 }
    )
    const parsed = JSON.parse(stdout.trim())
    if (!parsed || !Array.isArray(parsed.records)) throw new Error('missing records envelope')
    return parsed.records
  } catch (error) {
    throw new Error(`workspace inspection failed: ${error.message}`, { cause: error })
  }
}

async function getGitStatus() {
  const { stdout } = await run('git', ['status', '--short'])
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
}

export async function getWriterProcesses({
  platform = process.platform,
  root = ROOT,
  query = powershellJson,
} = {}) {
  if (platform !== 'win32') return []
  const processes = await query(`
    Get-CimInstance Win32_Process |
      Select-Object ProcessId,ParentProcessId,Name,CommandLine
  `)
  return processes.filter((processInfo) => writerProcessWorkspaceScope(processInfo, root).blocks)
}

export async function stopWriterProcesses(
  processes,
  { platform = process.platform, root = ROOT, query = powershellJson, execute = run } = {}
) {
  if (platform !== 'win32') return []
  const stopped = []
  for (const processInfo of processes.filter((item) => processCanBeStopped(item, root))) {
    const id = Number(processInfo.ProcessId)
    if (!Number.isInteger(id) || id <= 0 || id === process.pid) continue
    const live = await query(
      `Get-CimInstance Win32_Process -Filter "ProcessId = ${id}" | Select-Object ProcessId,Name,CommandLine`
    )
    if (!live.some((item) => Number(item.ProcessId) === id && processCanBeStopped(item, root)))
      continue
    try {
      await execute('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Stop-Process -Id ${id} -Force -ErrorAction Stop`,
      ])
      stopped.push(id)
    } catch {}
  }
  // Shared PM2 parents may also supervise another workspace and are never stopped here.
  return stopped
}

export async function getScheduledTasks({
  platform = process.platform,
  query = powershellJson,
} = {}) {
  if (platform !== 'win32') return []
  const taskNames = WRITER_SCHEDULED_TASKS.map((name) => `'${name}'`).join(',')
  return query(`
    Get-ScheduledTask -ErrorAction Stop | Where-Object { $_.TaskName -in @(${taskNames}) } |
      Select-Object TaskName,TaskPath,@{Name='State';Expression={$_.State.ToString()}},
        @{Name='Actions';Expression={@($_.Actions | Select-Object Execute,Arguments,WorkingDirectory)}}
  `)
}

export async function disableScheduledTasks(
  tasks,
  { platform = process.platform, root = ROOT, query = powershellJson, execute = run } = {}
) {
  if (platform !== 'win32') return []
  const disabled = []
  for (const task of tasks.filter((item) => scheduledTaskWorkspaceScope(item, root).canDisable)) {
    const target = `-TaskName ${psLiteral(task.TaskName)} -TaskPath ${psLiteral(task.TaskPath)}`
    const live = await query(
      `Get-ScheduledTask ${target} -ErrorAction Stop | Select-Object TaskName,TaskPath,@{Name='Actions';Expression={@($_.Actions | Select-Object Execute,Arguments,WorkingDirectory)}}`
    )
    if (
      !live.some(
        (item) =>
          item.TaskName === task.TaskName &&
          item.TaskPath === task.TaskPath &&
          scheduledTaskWorkspaceScope(item, root).canDisable
      )
    )
      continue
    try {
      await execute('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Disable-ScheduledTask ${target} -ErrorAction Stop | Out-Null`,
      ])
      disabled.push(task.TaskName)
    } catch {}
  }
  return disabled
}

async function checkIgnoredPaths() {
  const failures = []
  for (const path of GENERATED_PATHS) {
    try {
      await run('git', ['check-ignore', '--quiet', path])
    } catch {
      failures.push(path)
    }
  }
  return failures
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const actions = []
  const failures = []

  if (args.fix) {
    const initialProcesses = await getWriterProcesses()
    const stopped = await stopWriterProcesses(initialProcesses)
    if (stopped.length > 0) actions.push(`stopped writer processes: ${stopped.join(', ')}`)
    const disabled = await disableScheduledTasks(await getScheduledTasks())
    if (disabled.length > 0) actions.push(`disabled scheduled tasks: ${disabled.join(', ')}`)
  }

  const [processes, tasks, ignoredFailures, status] = await Promise.all([
    getWriterProcesses(),
    getScheduledTasks(),
    checkIgnoredPaths(),
    getGitStatus(),
  ])

  if (processes.length > 0) {
    failures.push(
      ...processes.map(
        (processInfo) =>
          `repo writer process running: ${processInfo.ProcessId} ${processInfo.Name} (scope=${writerProcessWorkspaceScope(processInfo).scope})`
      )
    )
  }

  const enabledTasks = tasks.filter(
    (task) =>
      String(task.State).toLowerCase() !== 'disabled' && scheduledTaskWorkspaceScope(task).blocks
  )
  if (enabledTasks.length > 0) {
    failures.push(
      ...enabledTasks.map(
        (task) =>
          `repo writer scheduled task enabled: ${task.TaskName} (${task.State}; scope=${scheduledTaskWorkspaceScope(task).scope})`
      )
    )
  }

  if (ignoredFailures.length > 0) {
    failures.push(...ignoredFailures.map((path) => `generated path is not ignored: ${path}`))
  }

  if (!args.allowDirty && status.length > 0) {
    failures.push('git status is dirty:')
    failures.push(...status.map((line) => `  ${line}`))
  }

  const result = {
    ok: failures.length === 0,
    actions,
    failures,
    dirtyCount: status.length,
    writerProcessCount: processes.length,
    unknownWriterProcessCount: processes.filter(
      (processInfo) => writerProcessWorkspaceScope(processInfo).scope === 'unknown'
    ).length,
    enabledWriterTaskCount: enabledTasks.length,
    unknownWriterTaskCount: enabledTasks.filter(
      (task) => scheduledTaskWorkspaceScope(task).scope === 'unknown'
    ).length,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    for (const action of actions) console.log(`repo-hygiene: ${action}`)
    if (result.ok) {
      console.log('repo-hygiene: PASS')
    } else {
      for (const failure of failures) console.error(`repo-hygiene: FAIL ${failure}`)
    }
  }

  if (!result.ok) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`repo-hygiene: ERROR ${error.message}`)
    process.exit(1)
  })
}
