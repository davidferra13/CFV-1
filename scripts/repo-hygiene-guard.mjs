#!/usr/bin/env node

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

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

async function powershellJson(script) {
  const { stdout } = await run('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    `& { ${script} } | ConvertTo-Json -Depth 5`,
  ])
  const text = stdout.trim()
  if (!text) return []
  const parsed = JSON.parse(text)
  return Array.isArray(parsed) ? parsed : [parsed]
}

async function getGitStatus() {
  const { stdout } = await run('git', ['status', '--short'])
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
}

async function getWriterProcesses() {
  if (process.platform !== 'win32') return []
  const processes = await powershellJson(`
    Get-CimInstance Win32_Process |
      Select-Object ProcessId,ParentProcessId,Name,CommandLine
  `)
  return processes.filter((processInfo) => {
    const commandLine = String(processInfo.CommandLine || '')
    return WRITER_PROCESS_PATTERNS.some((pattern) => pattern.test(commandLine))
  })
}

async function stopWriterProcesses(processes) {
  if (process.platform !== 'win32' || processes.length === 0) return []
  const ids = new Set()
  for (const processInfo of processes) {
    ids.add(Number(processInfo.ProcessId))
    const parentPid = Number(processInfo.ParentProcessId)
    if (parentPid > 0) {
      const parents = await powershellJson(`
        Get-CimInstance Win32_Process -Filter "ProcessId = ${parentPid}" |
          Select-Object ProcessId,ParentProcessId,Name,CommandLine
      `)
      const parent = parents[0]
      if (/pm2[\\/]+lib[\\/]+Daemon\.js/i.test(String(parent?.CommandLine || ''))) {
        ids.add(parentPid)
      }
    }
  }
  const stopped = []
  for (const id of ids) {
    if (id === process.pid) continue
    await run('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Stop-Process -Id ${id} -Force -ErrorAction SilentlyContinue`,
    ]).catch(() => {})
    stopped.push(id)
  }
  return stopped
}

async function getScheduledTasks() {
  if (process.platform !== 'win32') return []
  const taskNames = WRITER_SCHEDULED_TASKS.map((name) => `'${name}'`).join(',')
  return powershellJson(`
    Get-ScheduledTask -TaskName ${taskNames} -ErrorAction SilentlyContinue |
      Select-Object TaskName,@{Name='State';Expression={$_.State.ToString()}}
  `)
}

async function disableScheduledTasks() {
  if (process.platform !== 'win32') return []
  const disabled = []
  for (const taskName of WRITER_SCHEDULED_TASKS) {
    await run('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      `Disable-ScheduledTask -TaskName '${taskName}' -ErrorAction SilentlyContinue | Out-Null`,
    ]).catch(() => {})
    disabled.push(taskName)
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
    const disabled = await disableScheduledTasks()
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
          `repo writer process running: ${processInfo.ProcessId} ${processInfo.Name} ${processInfo.CommandLine}`
      )
    )
  }

  const enabledTasks = tasks.filter((task) => String(task.State).toLowerCase() !== 'disabled')
  if (enabledTasks.length > 0) {
    failures.push(
      ...enabledTasks.map((task) => `repo writer scheduled task enabled: ${task.TaskName} (${task.State})`)
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
    enabledWriterTaskCount: enabledTasks.length,
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

main().catch((error) => {
  console.error(`repo-hygiene: ERROR ${error.message}`)
  process.exit(1)
})
