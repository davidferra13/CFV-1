import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { decideModule } from '../../devtools/module-decision.mjs'

function tempRootWithCandidates(candidates) {
  const root = mkdtempSync(join(tmpdir(), 'module-decision-'))
  const dir = join(root, 'system', 'unified-build-queue')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'candidates.json'), `${JSON.stringify(candidates, null, 2)}\n`, 'utf8')
  return root
}

test('uses exact queue source path before keyword inference', () => {
  const root = tempRootWithCandidates([
    {
      source: 'docs-specs',
      sourcePath: 'docs/specs/payment-proof.md',
      title: 'Payment proof',
      classification: 'v1_blocker',
      approvalState: 'candidate_review_required',
      module: { id: 'finance-ledger', label: 'Finance and Ledger' },
      submodule: { id: 'stripe-payments', label: 'Stripe Payments' },
      assignment: 'reviewed',
    },
  ])

  const decision = decideModule({
    root,
    sourcePath: 'docs/specs/payment-proof.md',
    prompt: 'pricing grocery quote',
  })

  assert.equal(decision.status, 'module_owner_found')
  assert.equal(decision.module.id, 'finance-ledger')
  assert.equal(decision.confidence, 'queue')
  assert.equal(decision.submodule.id, 'stripe-payments')
  assert.equal(decision.assignment, 'reviewed')
})

test('blocks queue candidates that are still unassigned', () => {
  const root = tempRootWithCandidates([
    {
      source: 'docs-specs',
      sourcePath: 'docs/specs/fuzzy.md',
      title: 'Fuzzy platform idea',
      classification: 'v1_support',
      approvalState: 'candidate_review_required',
      module: { id: 'unassigned', label: 'Unassigned' },
      submodule: { id: 'unassigned', label: 'Unassigned' },
      assignment: 'unassigned',
    },
  ])

  const decision = decideModule({ root, sourcePath: 'docs/specs/fuzzy.md' })

  assert.equal(decision.status, 'module_review_required')
  assert.equal(decision.module.id, 'unassigned')
  assert.equal(decision.submodule.id, 'unassigned')
  assert.equal(decision.assignment, 'unassigned')
})

test('infers module from unified taxonomy keywords', () => {
  const decision = decideModule({
    root: tempRootWithCandidates([]),
    prompt: 'Add quote safety confidence to ingredient pricing and grocery costing',
  })

  assert.equal(decision.status, 'module_owner_found')
  assert.equal(decision.module.id, 'pricing-trust')
  assert.equal(decision.submodule.id, 'quote-safety')
  assert.equal(decision.assignment, 'proposed')
  assert.equal(decision.confidence, 'high')
})

test('requires module review when no evidence matches', () => {
  const decision = decideModule({
    root: tempRootWithCandidates([]),
    prompt: 'Make the vague thing better',
  })

  assert.equal(decision.status, 'module_review_required')
  assert.equal(decision.module.id, 'unassigned')
})
