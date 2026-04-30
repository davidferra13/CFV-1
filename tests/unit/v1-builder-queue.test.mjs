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
  loadReceipts,
  readActiveLane,
  readJsonl,
  selectNextTask,
  writeRunnerStatus,
  writeReceipt,
} from '../../scripts/v1-builder/core.mjs'
import { normalizeIntake } from '../../scripts/v1-builder/normalize-intake.mjs'

function tempContext() {
  const root = mkdtempSync(join(tmpdir(), 'v1-builder-'))
  mkdirSync(join(root, 'docs'), { recursive: true })
  mkdirSync(join(root, 'docs', 'specs'), { recursive: true })
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

test('does not select tasks with completed receipts', () => {
  const context = tempContext()
  writeReceipt({
    taskId: 'v1-blocker',
    status: 'pushed',
  }, context)

  const tasks = [
    {
      id: 'v1-blocker',
      status: 'queued',
      classification: 'approved_v1_blocker',
      risk: 'low',
      createdAt: '2026-04-30T00:00:00Z',
      canonicalOwner: 'docs/specs/blocker.md',
    },
  ]

  assert.equal(selectNextTask(tasks, 'V1 event spine stabilization', loadReceipts(context)), null)
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

test('normalizes ready P0 V1 specs into the request ledger and approved queue', () => {
  const context = tempContext()
  const specDir = join(context.root, 'docs', 'specs')
  writeFileSync(
    join(specDir, 'event-payment-trust.md'),
    [
      '# Event Payment Trust Repair',
      '',
      '> **Status:** ready',
      '> **Priority:** P0 (blocking)',
      '> **Depends on:** None',
      '',
      'Repair the V1 event payment trust path so paid jobs do not need a spreadsheet.',
    ].join('\n'),
    'utf8',
  )

  const summary = normalizeIntake({
    context,
    write: true,
    now: new Date('2026-04-30T12:00:00Z'),
  })

  assert.equal(summary.status, 'written')
  assert.equal(summary.byStatus.queued, 1)

  const ledger = readJsonl(join(context.builderDir, 'request-ledger.jsonl')).records
  const queue = readJsonl(join(context.builderDir, 'approved-queue.jsonl')).records
  assert.equal(ledger.length, 1)
  assert.equal(ledger[0].status, 'queued')
  assert.equal(queue.length, 1)
  assert.equal(queue[0].classification, 'approved_v1_blocker')
  assert.equal(queue[0].status, 'queued')
  assert.equal(queue[0].canonicalOwner, 'docs/specs/event-payment-trust.md')
})

test('normalizer preserves legacy queue items as research instead of buildable work', () => {
  const context = tempContext()
  const legacyDir = join(context.root, 'system', 'build-queue')
  mkdirSync(legacyDir, { recursive: true })
  writeFileSync(
    join(legacyDir, '001-high-generic-dashboard.md'),
    [
      '---',
      'status: pending',
      'priority: high',
      '---',
      '# Generic Dashboard Expansion',
      '',
      'Add a broad dashboard from an old derived queue.',
    ].join('\n'),
    'utf8',
  )

  const summary = normalizeIntake({
    context,
    write: true,
    now: new Date('2026-04-30T12:00:00Z'),
  })

  assert.equal(summary.byStatus.research_required, 1)
  assert.equal(readJsonl(join(context.builderDir, 'approved-queue.jsonl')).records.length, 0)
  assert.equal(readJsonl(join(context.builderDir, 'research-queue.jsonl')).records.length, 1)
})

test('normalizer is idempotent by source path', () => {
  const context = tempContext()
  const specDir = join(context.root, 'docs', 'specs')
  writeFileSync(
    join(specDir, 'quote-safety.md'),
    [
      '# Quote Safety',
      '',
      '> **Status:** ready',
      '> **Priority:** P0',
      '',
      'Repair quote safety for the V1 event spine.',
    ].join('\n'),
    'utf8',
  )

  normalizeIntake({
    context,
    write: true,
    now: new Date('2026-04-30T12:00:00Z'),
  })
  const second = normalizeIntake({
    context,
    write: true,
    now: new Date('2026-04-30T12:01:00Z'),
  })

  assert.equal(second.newRecords, 0)
  assert.equal(readJsonl(join(context.builderDir, 'request-ledger.jsonl')).records.length, 1)
  assert.equal(readJsonl(join(context.builderDir, 'approved-queue.jsonl')).records.length, 1)
})

test('normalizer rejects recipe generation asks before any queue write', () => {
  const context = tempContext()
  const specDir = join(context.root, 'docs', 'specs')
  writeFileSync(
    join(specDir, 'recipe-generator.md'),
    [
      '# Recipe Generator',
      '',
      '> **Status:** ready',
      '> **Priority:** P0',
      '',
      'Generate recipes for chefs automatically.',
    ].join('\n'),
    'utf8',
  )

  normalizeIntake({
    context,
    write: true,
    now: new Date('2026-04-30T12:00:00Z'),
  })

  const ledger = readJsonl(join(context.builderDir, 'request-ledger.jsonl')).records
  assert.equal(ledger[0].status, 'rejected')
  assert.equal(readJsonl(join(context.builderDir, 'approved-queue.jsonl')).records.length, 0)
})
