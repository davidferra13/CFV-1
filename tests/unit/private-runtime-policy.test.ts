import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canDraftAiDocuments,
  isAiDocumentDraftTaskType,
  resolvePrivateRuntimePolicy,
  shouldEmitAiSuggestions,
  shouldUseAiMemory,
} from '@/lib/ai/private-runtime-policy'

const basePrefs = {
  localAiEnabled: false,
  localAiUrl: 'http://localhost:11434',
  localAiModel: 'gemma4',
  localAiVerifiedAt: null,
}

test('resolvePrivateRuntimePolicy uses platform when local AI is disabled', () => {
  const policy = resolvePrivateRuntimePolicy('remy.chat', basePrefs)

  assert.equal(policy.activeBackend, 'platform')
  assert.equal(policy.localRequired, false)
  assert.equal(policy.localAvailable, false)
  assert.equal(policy.canUsePlatformFallback, true)
  assert.equal(policy.blockReason, null)
})

test('resolvePrivateRuntimePolicy blocks unverified local AI', () => {
  const policy = resolvePrivateRuntimePolicy('remy.chat', {
    ...basePrefs,
    localAiEnabled: true,
  })

  assert.equal(policy.activeBackend, 'platform')
  assert.equal(policy.localRequired, true)
  assert.equal(policy.localAvailable, false)
  assert.equal(policy.canUsePlatformFallback, false)
  assert.match(policy.blockReason ?? '', /has not been verified/)
})

test('resolvePrivateRuntimePolicy selects local when local AI is verified', () => {
  const policy = resolvePrivateRuntimePolicy('remy.chat', {
    ...basePrefs,
    localAiEnabled: true,
    localAiVerifiedAt: '2026-04-29T00:00:00.000Z',
  })

  assert.equal(policy.activeBackend, 'local')
  assert.equal(policy.localRequired, true)
  assert.equal(policy.localAvailable, true)
  assert.equal(policy.canUsePlatformFallback, false)
  assert.equal(policy.blockReason, null)
})

test('AI access helpers mirror explicit privacy controls', () => {
  assert.equal(shouldUseAiMemory({ allowMemory: false }), false)
  assert.equal(shouldUseAiMemory({ allowMemory: true }), true)
  assert.equal(shouldEmitAiSuggestions({ allowSuggestions: false }), false)
  assert.equal(shouldEmitAiSuggestions({ allowSuggestions: true }), true)
  assert.equal(canDraftAiDocuments({ allowDocumentDrafts: false }), false)
  assert.equal(canDraftAiDocuments({ allowDocumentDrafts: true }), true)
})

test('document draft task classifier covers draft-producing Remy actions', () => {
  assert.equal(isAiDocumentDraftTaskType('email.generic'), true)
  assert.equal(isAiDocumentDraftTaskType('draft.menu_proposal'), true)
  assert.equal(isAiDocumentDraftTaskType('agent.draft_email'), true)
  assert.equal(isAiDocumentDraftTaskType('client.search'), false)
  assert.equal(isAiDocumentDraftTaskType('recipe.search'), false)
})
