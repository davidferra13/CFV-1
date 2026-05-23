import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  archiveConstraintFact,
  buildConstraintReviewPacket,
  confirmConstraintFact,
  deleteConstraintFact,
  normalizeQuickConstraintCapture,
  normalizeStructuredConstraintCapture,
  renewConstraintFact,
  shouldBlockClientSafeConstraint,
  type ChefLifeConstraintFact,
} from '../../lib/intelligence/chef-life-constraint-capture-contract'

const nowIso = '2026-05-21T12:00:00.000Z'

function baseFact(overrides: Partial<ChefLifeConstraintFact> = {}): ChefLifeConstraintFact {
  return normalizeStructuredConstraintCapture({
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    domain: 'body',
    kind: 'lifting_limit',
    label: 'Lift limit',
    value: 'Do not schedule solo loadout over 40 lb.',
    confidence: 'confirmed',
    nowIso,
    ...overrides,
  })
}

test('quick capture defaults sensitive facts to private review without forced structure', () => {
  const fact = normalizeQuickConstraintCapture({
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    note: 'Medical recovery means no heavy lifting this month.',
    nowIso,
  })

  assert.equal(fact.domain, 'body')
  assert.equal(fact.kind, 'quick_note')
  assert.equal(fact.state, 'needs_review')
  assert.equal(fact.visibility, 'private_only')
  assert.equal(fact.confidence, 'low')
  assert.ok(fact.overshareWarnings.includes('medical'))
  assert.ok(fact.staleAfter)
})

test('structured capture supports visibility, evidence, confidence, and freshness', () => {
  const fact = normalizeStructuredConstraintCapture({
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    domain: 'compliance',
    kind: 'permit_window',
    label: 'Permit renewal window',
    value: 'Renew permit before July events.',
    visibility: 'chef_internal',
    confidence: 'confirmed',
    evidence: [
      {
        id: null,
        label: 'Permit portal',
        url: 'https://example.com/permit',
        storagePath: null,
        source: 'external_evidence',
        attachedAt: nowIso,
        visibility: 'chef_internal',
      },
    ],
    nowIso,
  })

  assert.equal(fact.state, 'confirmed')
  assert.equal(fact.freshness, 'current')
  assert.equal(fact.visibility, 'chef_internal')
  assert.equal(fact.evidence.length, 1)
  assert.equal(fact.lastConfirmedAt, nowIso)
})

test('client-safe visibility is downgraded when private life terms are present', () => {
  const fact = normalizeStructuredConstraintCapture({
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    domain: 'family',
    label: 'Caregiving window',
    value: 'Child pickup blocks Tuesday evenings.',
    visibility: 'client_safe_summary',
    nowIso,
  })

  assert.equal(fact.visibility, 'private_only')
  assert.equal(
    shouldBlockClientSafeConstraint({ ...fact, visibility: 'client_safe_summary' }),
    true
  )
})

test('review packet identifies review, stale, archived, and deleted semantics', () => {
  const staleFact = {
    ...baseFact({ staleAfter: '2026-05-01T00:00:00.000Z' }),
    id: 'stale-1',
  }
  const needsReview = normalizeQuickConstraintCapture({
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    note: 'Finance runway unknown.',
    nowIso,
  })
  const archived = archiveConstraintFact(baseFact({ id: 'archived-1' }), {
    nowIso,
    reason: 'No longer relevant',
  })
  const deleted = deleteConstraintFact(baseFact({ id: 'deleted-1' }), {
    nowIso,
    confirmation: 'DELETE',
  })

  const packet = buildConstraintReviewPacket({
    tenantId: 'tenant-1',
    facts: [staleFact, needsReview, archived, deleted],
    nowIso,
  })

  assert.deepEqual(
    packet.staleFacts.map((fact) => fact.id),
    ['stale-1']
  )
  assert.equal(packet.needsReview.length, 1)
  assert.equal(packet.archivedCount, 1)
  assert.equal(packet.deletedCount, 1)
  assert.equal(packet.canConfirmCount, 2)
})

test('confirmation, renewal, archive, and deletion are explicit state transitions', () => {
  const reviewFact = normalizeQuickConstraintCapture({
    tenantId: 'tenant-1',
    chefId: 'chef-1',
    note: 'Staffing support required for Saturday loadout.',
    nowIso,
  })

  const confirmed = confirmConstraintFact(reviewFact, nowIso)
  assert.equal(confirmed.state, 'confirmed')
  assert.equal(confirmed.confidence, 'confirmed')

  const renewed = renewConstraintFact(confirmed, {
    value: 'Staffing support still required through June.',
    nowIso: '2026-06-01T12:00:00.000Z',
  })
  assert.equal(renewed.value.includes('through June'), true)
  assert.equal(renewed.freshness, 'current')

  const archived = archiveConstraintFact(renewed, { reason: 'Constraint cleared', nowIso })
  assert.equal(archived.state, 'archived')
  assert.equal(archived.privateNotes?.includes('Archive reason'), true)

  assert.throws(() => deleteConstraintFact(renewed, { confirmation: 'delete', nowIso }))
  const deleted = deleteConstraintFact(renewed, { confirmation: 'DELETE', nowIso })
  assert.equal(deleted.state, 'deleted')
  assert.equal(deleted.deletedAt, nowIso)
})

test('server actions are auth-gated and tenant-scoped', () => {
  const source = readFileSync('lib/intelligence/chef-life-constraint-capture-actions.ts', 'utf8')

  const exportedActions = [
    'quickCaptureChefLifeConstraint',
    'createStructuredChefLifeConstraint',
    'getChefLifeConstraints',
    'confirmChefLifeConstraint',
    'renewChefLifeConstraint',
    'archiveChefLifeConstraint',
    'deleteChefLifeConstraint',
  ]

  assert.equal(source.includes("'use server'"), true)
  assert.equal((source.match(/requireChef\(\)/g) ?? []).length >= exportedActions.length, true)
  assert.equal(source.includes(".eq('tenant_id', tenantId)"), true)
  assert.equal(source.includes('const chefId = user.entityId || tenantId'), true)
})

test('capture form keeps mobile layout single-column with usable touch targets', () => {
  const source = readFileSync('components/forms/chef-life-constraint-capture-form.tsx', 'utf8')

  assert.equal(source.includes('overflow-x-hidden'), true)
  assert.equal(source.includes('grid-cols-1'), true)
  assert.equal(source.includes('sm:grid-cols-2'), true)
  assert.equal(source.includes('min-h-11'), true)
  assert.equal(source.includes('w-full'), true)
  assert.equal(source.includes('break-words'), true)
  assert.equal(source.includes('Loading...'), true)
  assert.equal(source.includes('No active constraints captured.'), true)
})
