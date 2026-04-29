import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assertCanRepostVisibility,
  getRepostBlockedReason,
  isRepostableVisibility,
} from '@/lib/social/repost-policy'

test('public posts are repostable', () => {
  assert.equal(isRepostableVisibility('public'), true)
  assert.equal(getRepostBlockedReason('public'), null)
  assert.doesNotThrow(() => assertCanRepostVisibility('public'))
})

test('non-public posts are blocked from reposting', () => {
  for (const visibility of ['followers', 'connections', 'private'] as const) {
    assert.equal(isRepostableVisibility(visibility), false)
    assert.match(getRepostBlockedReason(visibility) ?? '', /Only public community posts/)
    assert.throws(() => assertCanRepostVisibility(visibility), /Only public community posts/)
  }
})
