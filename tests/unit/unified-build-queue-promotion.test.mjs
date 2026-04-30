import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { promoteModuleBatches } from '../../scripts/unified-build-queue/promote-batches.mjs'

test('promotes approved module batches without writing raw candidates to live queue', () => {
  const root = mkdtempSync(join(tmpdir(), 'cf-batch-promotion-'))
  const queueDir = join(root, 'system', 'unified-build-queue')
  mkdirSync(queueDir, { recursive: true })

  const candidates = [
    {
      id: 'candidate-a',
      source: 'docs-specs',
      sourcePath: 'docs/specs/pricing-a.md',
      title: 'Pricing proof A',
      classification: 'v1_blocker',
      module: { id: 'pricing-trust', label: 'Pricing Trust' },
      duplicateOf: null,
    },
    {
      id: 'candidate-b',
      source: 'docs-specs',
      sourcePath: 'docs/specs/pricing-b.md',
      title: 'Pricing proof B',
      classification: 'v1_blocker',
      module: { id: 'pricing-trust', label: 'Pricing Trust' },
      duplicateOf: null,
    },
    {
      id: 'candidate-c',
      source: 'docs-specs',
      sourcePath: 'docs/specs/research.md',
      title: 'Research item',
      classification: 'research_required',
      module: { id: 'pricing-trust', label: 'Pricing Trust' },
      duplicateOf: null,
    },
  ]

  const batches = [
    {
      id: 'batch-pricing',
      module: { id: 'pricing-trust', label: 'Pricing Trust' },
      classification: 'v1_blocker',
      approvalState: 'candidate_review_required',
      executionEligible: false,
      taskCount: 2,
      sourceCounts: { 'docs-specs': 2 },
      candidateIds: ['candidate-a', 'candidate-b'],
      titles: ['Pricing proof A', 'Pricing proof B'],
      reason: 'Candidate V1 blocker batch.',
    },
    {
      id: 'batch-research',
      module: { id: 'pricing-trust', label: 'Pricing Trust' },
      classification: 'research_required',
      approvalState: 'candidate_review_required',
      executionEligible: false,
      taskCount: 1,
      sourceCounts: { 'docs-specs': 1 },
      candidateIds: ['candidate-c'],
      titles: ['Research item'],
      reason: 'Research batch.',
    },
  ]

  writeFileSync(join(queueDir, 'candidates.json'), JSON.stringify(candidates, null, 2))
  writeFileSync(join(queueDir, 'module-batches.json'), JSON.stringify(batches, null, 2))

  const result = promoteModuleBatches({
    root,
    queueDir,
    write: false,
    limit: 10,
    classification: 'v1_blocker',
    modules: ['pricing-trust'],
    approvalSource: 'test approval',
    now: new Date('2026-04-30T00:00:00.000Z'),
  })

  assert.equal(result.summary.readOnlyAgainstLiveQueue, true)
  assert.equal(result.summary.totals.approvedBatches, 1)
  assert.equal(result.summary.totals.queuePreviewRecords, 1)
  assert.equal(result.summary.totals.liveQueueWrites, 0)
  assert.equal(result.approvedBatches[0].approvalState, 'approved')
  assert.equal(result.queuePreview[0].source, 'unified-module-batch')
  assert.deepEqual(result.queuePreview[0].candidateIds, ['candidate-a', 'candidate-b'])
  assert.equal(result.queuePreview[0].classification, 'approved_v1_blocker')
})
