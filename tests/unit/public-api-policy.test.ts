import test from 'node:test'
import assert from 'node:assert/strict'
import { isApiSkipAuthPath } from '../../lib/auth/route-policy'

test('the dietary capability endpoint reaches its own guest gate without an account', () => {
  assert.equal(isApiSkipAuthPath('/api/dietary-confirm/00000000-0000-4000-8000-000000000001'), true)
  assert.equal(isApiSkipAuthPath('/api/dietary-confirmation'), false)
})

test('API exemptions do not authorize similarly prefixed protected endpoints', () => {
  assert.equal(isApiSkipAuthPath('/api/health/readiness'), true)
  assert.equal(isApiSkipAuthPath('/api/health-private'), false)
  assert.equal(isApiSkipAuthPath('/api/tracking/meta-capi'), false)
})
