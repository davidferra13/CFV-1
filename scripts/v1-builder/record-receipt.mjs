#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { createBuilderContext, ensureBuilderStore, writeReceipt } from './core.mjs'

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] ?? fallback
}

function gitValue(command) {
  try {
    return execSync(command, { encoding: 'utf8' }).trim()
  } catch {
    return null
  }
}

const context = createBuilderContext()
ensureBuilderStore(context)

const status = getArg('status', 'blocked')
const taskId = getArg('task-id', 'manual')
const branch = getArg('branch', gitValue('git branch --show-current'))
const commit = getArg('commit', gitValue('git rev-parse --short HEAD'))
const pushed = getArg('pushed', 'false') === 'true'
const summary = getArg('summary', '')

const result = writeReceipt({
  taskId,
  branch,
  status,
  commit,
  pushed,
  missionControlSummary: summary,
}, context)

console.log(JSON.stringify({
  status: 'receipt_recorded',
  path: result.path,
  receipt: result.receipt,
}, null, 2))
