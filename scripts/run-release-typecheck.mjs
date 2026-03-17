#!/usr/bin/env node

import { spawn } from 'node:child_process'

const args = ['scripts/run-typecheck.mjs', '-p', 'tsconfig.typecheck.json']
const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  shell: false,
  env: process.env,
})

const startedAt = Date.now()
const heartbeat = setInterval(() => {
  const seconds = Math.floor((Date.now() - startedAt) / 1000)
  console.log(`[typecheck] running ${seconds}s`)
}, 30_000)

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(signal, () => {
    if (child.exitCode === null) {
      try {
        child.kill(signal === 'SIGBREAK' ? 'SIGTERM' : signal)
      } catch {
        // Best effort shutdown for the child compiler process.
      }
    }
  })
}

child.on('error', (error) => {
  clearInterval(heartbeat)
  console.error('[run-release-typecheck] Failed to start TypeScript:', error)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  clearInterval(heartbeat)

  if (signal) {
    process.exit(1)
    return
  }

  process.exit(code ?? 1)
})
