import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  createBuilderContext,
  createClaim,
  ensureBuilderStore,
  isEligibleTask,
  loadFreshClaims,
  readActiveLane,
  readJsonl,
  selectNextTask,
  writeRunnerStatus,
  writeReceipt,
} from '../../scripts/v1-builder/core.mjs'

function tempContext() {
  const root = mkdtempSync(join(tmpdir(), 'v1-builder-'))
  mkdirSync(join(root, 'docs'), { recursive: true })
  writeFileSync(
    join(root, 'docs', 'v1-v2-governor.md'),
    '## Current Active Lane\n\n`V1 event spine stabilization`\n',
    'utf8',
  )
  const context = createBuilderContext(root)
  ensureBuilderStore(context)
  return context
}

test('reads active lane from governor', () => {
  const context = tempContext()
  assert.equal(readActiveLane(context), 'V1 event spine stabilization')
})

test('selects V1 blockers before lower priority support', () => {
  const activeLane = 'V1 event spine stabilization'
  const tasks = [
    {
      id: 'v1-support',
      status: 'queued',
      classification: 'approved_v1_support',
      activeLane,
      risk: 'low',
      createdAt: '2026-04-29T00:00:00Z',
      canonicalOwner: 'docs/specs/support.md',
    },
    {
      id: 'v1-blocker',
      status: 'queued',
      classification: 'approved_v1_blocker',
      risk: 'medium',
      createdAt: '2026-04-30T00:00:00Z',
      canonicalOwner: 'docs/specs/blocker.md',
    },
  ]

  assert.equal(selectNextTask(tasks, activeLane).id, 'v1-blocker')
})

test('rejects support outside the active lane', () => {
  assert.equal(
    isEligibleTask({
      id: 'other-lane',
      status: 'queued',
      classification: 'approved_v1_support',
      activeLane: 'Other lane',
      risk: 'low',
      createdAt: '2026-04-30T00:00:00Z',
      canonicalOwner: 'docs/specs/other.md',
    }, 'V1 event spine stabilization'),
    false,
  )
})

test('claims block later claims until they expire', () => {
  const context = tempContext()
  const now = new Date('2026-04-30T12:00:00Z')
  createClaim({
    id: 'v1-1',
    title: 'Repair event quote truth',
    classification: 'approved_v1_blocker',
    canonicalOwner: 'docs/specs/example.md',
  }, context, now)

  const freshClaims = loadFreshClaims(context, new Date('2026-04-30T13:00:00Z'))
  assert.equal(freshClaims.length, 1)
  assert.equal(freshClaims[0].taskId, 'v1-1')
})

test('reads jsonl records and records parse errors by line', () => {
  const context = tempContext()
  const path = join(context.builderDir, 'approved-queue.jsonl')
  writeFileSync(path, '{"id":"ok"}\n{bad json}\n', 'utf8')

  const result = readJsonl(path)
  assert.equal(result.records.length, 1)
  assert.equal(result.errors.length, 1)
  assert.equal(result.errors[0].line, 2)
})

test('writes receipts with mission control summary', () => {
  const context = tempContext()
  const result = writeReceipt({
    taskId: 'v1-1',
    branch: 'feature/v1-builder-test',
    status: 'validated',
    missionControlSummary: 'Validated queue selection.',
  }, context, new Date('2026-04-30T12:00:00Z'))

  assert.match(result.path, /v1-1\.json$/)
  assert.equal(result.receipt.status, 'validated')
  assert.equal(result.receipt.missionControlSummary, 'Validated queue selection.')
})

test('writes ignored runner status for Mission Control polling', () => {
  const context = tempContext()
  const path = writeRunnerStatus({
    runner: 'v1-builder',
    mode: 'dry-run',
    status: 'idle',
  }, context)

  const result = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(result.runner, 'v1-builder')
  assert.equal(result.status, 'idle')
})
