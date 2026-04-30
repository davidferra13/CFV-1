import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { generateUnifiedQueue } from '../../scripts/unified-build-queue/generate.mjs'

test('unified queue normalizes sources, dedupes, and groups module batches', () => {
  const root = mkdtempSync(join(tmpdir(), 'cf-unified-queue-'))

  mkdirSync(join(root, 'docs', 'specs'), { recursive: true })
  mkdirSync(join(root, 'system', 'build-queue'), { recursive: true })
  mkdirSync(join(root, 'system', 'ready-tasks'), { recursive: true })
  mkdirSync(join(root, 'system', 'sticky-notes', 'reports'), { recursive: true })
  mkdirSync(join(root, 'system', 'sticky-notes', 'actions', 'spec-candidates'), { recursive: true })
  mkdirSync(join(root, 'system', 'v1-builder', 'receipts'), { recursive: true })
  mkdirSync(join(root, 'system', 'v1-builder'), { recursive: true })

  writeFileSync(
    join(root, 'docs', 'specs', 'pricing-proof.md'),
    [
      '# Spec: Pricing Proof',
      '',
      '> **Status:** ready',
      '> **Priority:** P0',
      '',
      'Build pricing reliability proof for quote safety.',
    ].join('\n'),
  )

  writeFileSync(
    join(root, 'system', 'build-queue', '001-high-pricing-proof.md'),
    ['# Build Task: Pricing Proof', '', 'Pricing reliability proof for quote safety.'].join('\n'),
  )

  writeFileSync(
    join(root, 'system', 'ready-tasks', '001-client-checklist.md'),
    ['# Build Task: Client Checklist', '', 'Improve event checklist and client confirmation.'].join('\n'),
  )

  writeFileSync(
    join(root, 'system', 'sticky-notes', 'actions', 'spec-candidates', '0001-note.md'),
    ['# Sticky pricing idea', '', 'Maybe add pricing confidence review.'].join('\n'),
  )

  writeFileSync(
    join(root, 'system', 'sticky-notes', 'reports', '20260430T000000Z-organize.json'),
    JSON.stringify({
      generatedAt: '2026-04-30T00:00:00.000Z',
      attachments: [
        {
          noteRef: 'simple-sticky-notes:1:test',
          noteId: 1,
          classification: 'chefFlow.feature',
          destination: 'system/sticky-notes/actions/spec-candidates/0001-note.md',
          status: 'deferred',
          requiresReview: true,
          mayMutateProject: false,
        },
      ],
    }),
  )

  writeFileSync(
    join(root, 'system', 'v1-builder', 'approved-queue.jsonl'),
    `${JSON.stringify({
      id: 'queue-pricing',
      sourcePath: 'docs/specs/pricing-proof.md',
      title: 'Spec: Pricing Proof',
      classification: 'approved_v1_blocker',
      status: 'queued',
      rawAskSummary: 'Build pricing reliability proof.',
    })}\n`,
  )

  writeFileSync(
    join(root, 'system', 'v1-builder', 'blocked.jsonl'),
    `${JSON.stringify({
      id: 'blocked-auth',
      sourcePath: 'docs/specs/auth-hardening.md',
      title: 'Auth hardening',
      status: 'blocked',
    })}\n`,
  )

  writeFileSync(
    join(root, 'system', 'v1-builder', 'request-ledger.jsonl'),
    `${JSON.stringify({
      id: 'ask-built',
      source: 'developer-chat',
      sourcePath: null,
      title: 'Wire live background Codex execution',
      status: 'built',
      rawAskSummary: 'Already built.',
    })}\n`,
  )

  writeFileSync(
    join(root, 'system', 'v1-builder', 'receipts', 'receipt.json'),
    JSON.stringify({
      taskId: 'queue-pricing',
      status: 'pushed',
    }),
  )

  const result = generateUnifiedQueue({
    root,
    outDir: join(root, 'system', 'unified-build-queue'),
    write: false,
    now: new Date('2026-04-30T00:00:00.000Z'),
  })

  assert.equal(result.summary.readOnly, true)
  assert.equal(result.summary.currentQueueTruth.buildQueueFiles, 1)
  assert.equal(result.summary.currentQueueTruth.readyTaskFiles, 1)
  assert.equal(result.summary.currentQueueTruth.v1ApprovedQueueRecords, 1)
  assert.equal(result.summary.currentQueueTruth.v1ApprovedWithoutReceipt, 0)
  assert.ok(result.candidates.some((candidate) => candidate.classification === 'built'))
  assert.ok(result.candidates.some((candidate) => candidate.classification === 'duplicate'))
  assert.ok(result.candidates.some((candidate) => candidate.classification === 'research_required'))
  assert.ok(result.moduleBatches.every((batch) => batch.executionEligible === false))
  assert.ok(result.moduleBatches.some((batch) => batch.module.id === 'events-ops'))
})
