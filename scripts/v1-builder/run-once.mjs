#!/usr/bin/env node
import { execSync } from 'node:child_process'

import {
  createBuilderContext,
  ensureBuilderStore,
  loadApprovedQueue,
  loadFreshClaims,
  readActiveLane,
  selectNextTask,
  writeRunnerStatus,
} from './core.mjs'

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

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

function buildStatus(fields) {
  return {
    runner: 'v1-builder',
    mode: fields.mode,
    status: fields.status,
    reason: fields.reason ?? null,
    activeLane: fields.activeLane ?? null,
    branch: fields.branch ?? null,
    task: fields.task ?? null,
    claims: fields.claims ?? [],
    errors: fields.errors ?? [],
    nextAction: fields.nextAction ?? null,
    checkedAt: new Date().toISOString(),
  }
}

const mode = getArg('mode', hasFlag('live') ? 'live' : 'dry-run')
const context = createBuilderContext()
ensureBuilderStore(context)

const branch = gitValue('git branch --show-current')
const activeLane = readActiveLane(context)

if (branch === 'main') {
  const status = buildStatus({
    mode,
    status: 'blocked',
    reason: 'main_branch',
    activeLane,
    branch,
    nextAction: 'Switch to a feature branch before running the builder.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

const freshClaims = loadFreshClaims(context)
if (freshClaims.length > 0) {
  const status = buildStatus({
    mode,
    status: 'blocked',
    reason: 'fresh_claim_exists',
    activeLane,
    branch,
    claims: freshClaims,
    nextAction: 'Wait for the claim to finish or expire.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

const { records, errors } = loadApprovedQueue(context)
if (errors.length > 0) {
  const status = buildStatus({
    mode,
    status: 'blocked',
    reason: 'malformed_queue',
    activeLane,
    branch,
    errors,
    nextAction: 'Fix the malformed queue record before running the builder.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

const task = selectNextTask(records, activeLane)
if (!task) {
  const status = buildStatus({
    mode,
    status: 'idle',
    reason: 'queue_empty',
    activeLane,
    branch,
    nextAction: 'Add approved V1 tasks to system/v1-builder/approved-queue.jsonl.',
  })
  writeRunnerStatus(status, context)
  console.log(JSON.stringify(status, null, 2))
  process.exit(0)
}

const status = buildStatus({
  mode,
  status: mode === 'live' ? 'blocked' : 'ready',
  reason: mode === 'live' ? 'live_execution_not_enabled_in_this_slice' : null,
  activeLane,
  branch,
  task,
  nextAction:
    mode === 'live'
      ? 'Wire isolated Codex exec worktrees before live background code edits.'
      : 'Dry-run runner found the next task. Run claim only after live execution is wired.',
})

writeRunnerStatus(status, context)
console.log(JSON.stringify(status, null, 2))
