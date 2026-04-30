#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { createBuilderContext, ensureBuilderStore, writeRunnerStatus } from './core.mjs'

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function acquireLock(context) {
  mkdirSync(context.runtimeDir, { recursive: true })
  const lockPath = join(context.runtimeDir, 'runner.lock.json')

  if (existsSync(lockPath)) {
    try {
      const current = JSON.parse(readFileSync(lockPath, 'utf8'))
      if (current.pid && pidAlive(current.pid)) {
        return { ok: false, lockPath, current }
      }
    } catch {
      return { ok: false, lockPath, current: { unreadable: true } }
    }
  }

  const lock = {
    pid: process.pid,
    startedAt: new Date().toISOString(),
    mode,
    intervalSeconds,
  }
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')

  const release = () => {
    try {
      if (existsSync(lockPath)) unlinkSync(lockPath)
    } catch {
      // Best-effort cleanup only.
    }
  }

  process.on('exit', release)
  process.on('SIGINT', () => {
    release()
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    release()
    process.exit(0)
  })

  return { ok: true, lockPath, lock }
}

function runOnce() {
  const args = ['scripts/v1-builder/run-once.mjs', '--mode', mode]
  const child = spawn(process.execPath, args, {
    cwd: context.root,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString()
  })
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })
  child.on('close', (code) => {
    lastRun = {
      code,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      finishedAt: new Date().toISOString(),
    }
  })
}

const mode = getArg('mode', hasFlag('live') ? 'live' : 'dry-run')
const intervalSeconds = Number.parseInt(getArg('interval', '300'), 10)
const context = createBuilderContext()
ensureBuilderStore(context)

const lockResult = acquireLock(context)
if (!lockResult.ok) {
  const status = {
    runner: 'v1-builder',
    mode,
    status: 'blocked',
    reason: 'runner_already_active',
    lock: lockResult.current,
    checkedAt: new Date().toISOString(),
  }
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

let lastRun = null
writeRunnerStatus({
  runner: 'v1-builder',
  mode,
  status: 'watching',
  pid: process.pid,
  intervalSeconds,
  lockPath: lockResult.lockPath,
  startedAt: new Date().toISOString(),
}, context)

runOnce()
setInterval(runOnce, Math.max(intervalSeconds, 30) * 1000)
