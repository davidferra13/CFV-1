#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { stampServiceWorker } from './stamp-service-worker.mjs'

const require = createRequire(import.meta.url)

const rootDir = resolve(process.cwd())
const rootMarker = normalizePath(rootDir)
const nextCliPath = require.resolve('next/dist/bin/next')
const port = Number(process.env.PORT || '3000')
const host = String(process.env.HOST || '0.0.0.0')
const shouldBuild = process.argv.includes('--build')

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').toLowerCase()
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

function parseJsonArray(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) {
    return []
  }

  const parsed = JSON.parse(trimmed)
  return Array.isArray(parsed) ? parsed : [parsed]
}

function getWindowsListeningProcesses(listenPort) {
  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$pids = @(Get-NetTCPConnection -State Listen -LocalPort ${listenPort} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
if ($pids.Count -eq 0) {
  Write-Output '[]'
  exit 0
}
$processes = @(Get-CimInstance Win32_Process | Where-Object { $pids -contains $_.ProcessId } | Select-Object ProcessId, ParentProcessId, Name, CommandLine)
ConvertTo-Json -InputObject @($processes) -Compress
`

  const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8',
    windowsHide: true,
  })

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'PowerShell port inspection failed.')
  }

  return parseJsonArray(result.stdout).map((processInfo) => ({
    pid: Number(processInfo.ProcessId),
    parentPid: Number(processInfo.ParentProcessId || 0),
    name: String(processInfo.Name || ''),
    commandLine: String(processInfo.CommandLine || ''),
  }))
}

function getPosixListeningProcesses(listenPort) {
  const pidResult = spawnSync(
    'bash',
    ['-lc', `lsof -nP -iTCP:${listenPort} -sTCP:LISTEN -t 2>/dev/null | sort -u`],
    {
      encoding: 'utf8',
    }
  )

  if (pidResult.status !== 0 && pidResult.stdout.trim().length === 0) {
    return []
  }

  const pids = pidResult.stdout
    .split(/\r?\n/)
    .map((line) => Number(line.trim()))
    .filter((value) => Number.isInteger(value) && value > 0)

  return pids.map((pid) => {
    const processResult = spawnSync(
      'ps',
      ['-p', String(pid), '-o', 'ppid=', '-o', 'args='],
      { encoding: 'utf8' }
    )

    if (processResult.status !== 0) {
      return {
        pid,
        parentPid: 0,
        name: '',
        commandLine: '',
      }
    }

    const output = processResult.stdout.trim()
    const match = output.match(/^(\d+)\s+(.*)$/s)
    const commandLine = match?.[2]?.trim() || ''
    const name = commandLine.split(/\s+/)[0] || ''

    return {
      pid,
      parentPid: Number(match?.[1] || 0),
      name,
      commandLine,
    }
  })
}

function getListeningProcesses(listenPort) {
  const inspectors = process.platform === 'win32'
    ? getWindowsListeningProcesses
    : getPosixListeningProcesses

  return inspectors(listenPort)
}

function isRepoOwned(processInfo) {
  return normalizePath(processInfo.commandLine).includes(rootMarker)
}

function describeProcess(processInfo) {
  const ownership = isRepoOwned(processInfo) ? 'ChefFlow' : 'foreign'
  const commandLine = processInfo.commandLine || processInfo.name || '<unknown>'
  return `${ownership} PID ${processInfo.pid}: ${commandLine}`
}

function stopProcessTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return
  }

  if (process.platform === 'win32') {
    const result = spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
      encoding: 'utf8',
      windowsHide: true,
    })

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || `taskkill failed for PID ${pid}`)
    }

    return
  }

  const termResult = spawnSync('kill', ['-TERM', String(pid)], { encoding: 'utf8' })
  if (termResult.status !== 0) {
    throw new Error(termResult.stderr || termResult.stdout || `kill failed for PID ${pid}`)
  }
}

async function releasePort(listenPort) {
  const owners = getListeningProcesses(listenPort)
  if (owners.length === 0) {
    return
  }

  console.log(`[run-next-prod] Releasing port ${listenPort} before start:`)
  for (const owner of owners) {
    console.log(`[run-next-prod]   ${describeProcess(owner)}`)
    stopProcessTree(owner.pid)
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await sleep(500)
    if (getListeningProcesses(listenPort).length === 0) {
      return
    }
  }

  const remainingOwners = getListeningProcesses(listenPort)
  if (remainingOwners.length > 0) {
    throw new Error(
      `Port ${listenPort} is still occupied after cleanup: ${remainingOwners
        .map(describeProcess)
        .join(' | ')}`
    )
  }
}

function stopChildTree(child, signal = 'SIGTERM') {
  if (!child || child.exitCode !== null || child.killed) {
    return
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }

  try {
    process.kill(-child.pid, signal)
  } catch {
    try {
      child.kill(signal)
    } catch {
      // Best effort shutdown for prod child process.
    }
  }
}

async function runCommand(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    detached: process.platform !== 'win32',
    ...options,
  })

  return new Promise((resolvePromise, rejectPromise) => {
    child.on('exit', (code, signal) => {
      if (signal) {
        rejectPromise(new Error(`${command} ${args.join(' ')} terminated by signal ${signal}`))
        return
      }

      resolvePromise(code ?? 1)
    })

    child.on('error', (error) => {
      rejectPromise(error)
    })
  })
}

async function startServer() {
  const child = spawn(
    process.execPath,
    [nextCliPath, 'start', '-p', String(port), '-H', host],
    {
      stdio: 'inherit',
      shell: false,
      detached: process.platform !== 'win32',
      env: process.env,
    }
  )

  const stopChild = (signal = 'SIGTERM') => {
    stopChildTree(child, signal)
  }

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
    process.on(signal, () => {
      stopChild(signal === 'SIGBREAK' ? 'SIGTERM' : signal)
      setTimeout(() => stopChild('SIGKILL'), 5_000).unref()
    })
  }

  process.on('exit', () => {
    stopChild('SIGTERM')
  })

  return new Promise((resolvePromise, rejectPromise) => {
    child.on('exit', (code, signal) => {
      if (signal) {
        rejectPromise(new Error(`next start terminated by signal ${signal}`))
        return
      }

      resolvePromise(code ?? 1)
    })

    child.on('error', (error) => {
      rejectPromise(error)
    })
  })
}

async function main() {
  await releasePort(port)

  if (shouldBuild) {
    const buildExitCode = await runCommand(process.execPath, ['scripts/run-next-build.mjs'], {
      cwd: rootDir,
      env: process.env,
    })

    if (buildExitCode !== 0) {
      process.exit(buildExitCode)
    }
  }

  try {
    const distDirName = String(process.env.NEXT_DIST_DIR || '').trim() || '.next'
    const { buildId, changed } = await stampServiceWorker(rootDir, distDirName)
    console.log(
      `[run-next-prod] ${changed ? 'Stamped' : 'Verified'} public/sw.js with BUILD_ID ${buildId}.`
    )
  } catch (error) {
    console.warn('[run-next-prod] WARNING: Failed to stamp service worker BUILD_ID:', error)
  }

  console.log(`[run-next-prod] Starting ChefFlow production on http://${host}:${port}`)
  process.exitCode = await startServer()
}

await main().catch((error) => {
  console.error('[run-next-prod] Failed to start production server:', error)
  process.exit(1)
})
