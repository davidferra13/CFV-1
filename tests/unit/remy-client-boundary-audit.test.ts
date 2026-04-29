import assert from 'node:assert/strict'
import test from 'node:test'

import { auditRemyClientBoundary } from '../../lib/ai/remy-client-boundary-audit.ts'

test('clean allowed audit passes with allowed categories and source labels', () => {
  const audit = auditRemyClientBoundary({
    requestedCategories: ['profile', 'quote', 'loyalty'],
  })

  assert.equal(audit.pass, true)
  assert.deepEqual(audit.allowedCategories, ['profile', 'quote', 'loyalty'])
  assert.deepEqual(audit.blockedCategories, [])
  assert.deepEqual(audit.sourceLabels, [
    'Client profile',
    'Quote and proposal',
    'Client loyalty history',
  ])
  assert.equal(audit.violationCount, 0)
  assert.equal(
    audit.suggestedNextStep,
    'Client prompt context categories are clean for formatting.'
  )
})

test('blocked private categories fail before client prompt formatting', () => {
  const audit = auditRemyClientBoundary({
    requestedCategories: ['profile', 'private_chef_notes', 'admin_audit', 'internal_system'],
  })

  assert.equal(audit.pass, false)
  assert.deepEqual(audit.allowedCategories, ['profile'])
  assert.deepEqual(audit.blockedCategories, [
    { category: 'private_chef_notes', reason: 'blocked_private_category' },
    { category: 'admin_audit', reason: 'blocked_private_category' },
    { category: 'internal_system', reason: 'blocked_private_category' },
  ])
  assert.equal(audit.violationCount, 3)
  assert.equal(
    audit.suggestedNextStep,
    'Remove blocked or unknown categories before formatting client prompt context.'
  )
})

test('unknown categories are treated as boundary violations', () => {
  const audit = auditRemyClientBoundary({
    requestedCategories: ['event', 'recipe_ideas'],
  })

  assert.equal(audit.pass, false)
  assert.deepEqual(audit.allowedCategories, ['event'])
  assert.deepEqual(audit.blockedCategories, [
    { category: 'recipe_ideas', reason: 'unknown_category' },
  ])
  assert.equal(audit.violationCount, 1)
})

test('source labels dedupe policy labels, payload labels, and payload keys', () => {
  const audit = auditRemyClientBoundary({
    requestedCategories: ['dietary', 'dietary', 'event'],
    payloadLabels: ['Dietary and allergy profile', 'Guest roster', 'Guest roster', ' '],
    payloadKeys: ['allergies', 'allergies', 'event_date', ''],
  })

  assert.deepEqual(audit.allowedCategories, ['dietary', 'event'])
  assert.deepEqual(audit.sourceLabels, [
    'Dietary and allergy profile',
    'Event details',
    'Guest roster',
    'Payload key: allergies',
    'Payload key: event_date',
  ])
})

test('dietary and event requests mark safety critical context as present', () => {
  assert.equal(
    auditRemyClientBoundary({ requestedCategories: ['profile', 'dietary'] }).safetyCriticalPresent,
    true
  )
  assert.equal(
    auditRemyClientBoundary({ requestedCategories: ['event'] }).safetyCriticalPresent,
    true
  )
  assert.equal(
    auditRemyClientBoundary({ requestedCategories: ['profile', 'quote'] }).safetyCriticalPresent,
    false
  )
})
