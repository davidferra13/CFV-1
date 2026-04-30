#!/usr/bin/env node
import {
  createBuilderContext,
  ensureBuilderStore,
  loadApprovedQueue,
  loadFreshClaims,
  loadReceipts,
  readActiveLane,
  selectNextTask,
} from './core.mjs'

const context = createBuilderContext()
ensureBuilderStore(context)

const freshClaims = loadFreshClaims(context)
if (freshClaims.length > 0) {
  console.log(JSON.stringify({
    status: 'blocked',
    reason: 'fresh_claim_exists',
    claims: freshClaims,
  }, null, 2))
  process.exit(0)
}

const activeLane = readActiveLane(context)
const { records, errors } = loadApprovedQueue(context)
if (errors.length > 0) {
  console.log(JSON.stringify({
    status: 'blocked',
    reason: 'malformed_queue',
    errors,
  }, null, 2))
  process.exit(0)
}

const task = selectNextTask(records, activeLane, loadReceipts(context))
if (!task) {
  console.log(JSON.stringify({
    status: 'idle',
    reason: 'queue_empty',
    activeLane,
  }, null, 2))
  process.exit(0)
}

console.log(JSON.stringify({
  status: 'ready',
  activeLane,
  task,
}, null, 2))
