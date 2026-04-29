import assert from 'node:assert/strict'
import test from 'node:test'

import { resolvePrivateRuntimePolicy } from '@/lib/ai/private-runtime-policy'

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
