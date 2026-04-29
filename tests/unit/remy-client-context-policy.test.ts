import test from 'node:test'
import assert from 'node:assert/strict'

import {
  REMY_CLIENT_CONTEXT_POLICY,
  blockRemyPrivateClientContextCategories,
  getAllowedRemyClientContextCategories,
  isRemyClientContextCategoryAllowed,
  summarizeRemyClientContextSourceLabels,
  type RemyClientContextCategory,
} from '../../lib/ai/remy-client-context-policy.ts'

test('allowed Remy client context categories are client visible', () => {
  const allowed = getAllowedRemyClientContextCategories()
  const allowedCategories = allowed.map((policy) => policy.category)

  assert.deepEqual(allowedCategories, [
    'profile',
    'dietary',
    'event',
    'quote',
    'loyalty',
    'work_graph',
  ])
  assert.equal(
    allowed.every((policy) => policy.visibility === 'client_visible'),
    true
  )
})

test('private chef notes and internal categories are blocked from client context', () => {
  const requested: RemyClientContextCategory[] = [
    'profile',
    'private_chef_notes',
    'admin_audit',
    'internal_system',
    'quote',
  ]

  assert.deepEqual(blockRemyPrivateClientContextCategories(requested), ['profile', 'quote'])
  assert.equal(isRemyClientContextCategoryAllowed('private_chef_notes'), false)
  assert.equal(isRemyClientContextCategoryAllowed('admin_audit'), false)
  assert.equal(isRemyClientContextCategoryAllowed('work_graph'), true)
})

test('source labels summarize only allowed categories for prompt citations', () => {
  const labels = summarizeRemyClientContextSourceLabels([
    'dietary',
    'dietary',
    'private_chef_notes',
    'event',
    'admin_audit',
  ])

  assert.deepEqual(labels, ['Dietary and allergy profile', 'Event details'])
})

test('dietary and allergy context is marked as safety critical PII', () => {
  const dietary = REMY_CLIENT_CONTEXT_POLICY.dietary

  assert.equal(dietary.visibility, 'client_visible')
  assert.equal(dietary.mayContainPii, true)
  assert.equal(dietary.mayContainSafetyCriticalInfo, true)
  assert.match(dietary.allowedPromptUsage, /allergies/)
  assert.match(dietary.allowedPromptUsage, /medical diet/)
})
