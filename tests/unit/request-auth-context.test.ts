import test from 'node:test'
import assert from 'node:assert/strict'
import {
  readRequestAuthContext,
  setPathnameHeader,
  setRequestAuthContext,
  stripInternalRequestHeaders,
} from '@/lib/auth/request-auth-context'

test('pathname header alone does not create trusted auth context', () => {
  const headers = new Headers()
  setPathnameHeader(headers, '/trust')

  assert.equal(readRequestAuthContext(headers), null)
})

test('middleware auth context still requires the authenticated sentinel', () => {
  const headers = new Headers()
  setPathnameHeader(headers, '/my-events')
  setRequestAuthContext(headers, {
    userId: 'user_123',
    email: 'client@example.com',
    role: 'client',
    entityId: 'client_123',
    tenantId: 'tenant_123',
  })

  assert.deepEqual(readRequestAuthContext(headers), {
    userId: 'user_123',
    email: 'client@example.com',
    role: 'client',
    entityId: 'client_123',
    tenantId: 'tenant_123',
  })

  setRequestAuthContext(headers, null)
  assert.equal(readRequestAuthContext(headers), null)
})

test('stripping internal headers removes both pathname and auth sentinels', () => {
  const headers = new Headers()
  setPathnameHeader(headers, '/dashboard')
  setRequestAuthContext(headers, {
    userId: 'user_456',
    email: 'chef@example.com',
    role: 'chef',
    entityId: 'chef_456',
    tenantId: 'chef_456',
  })

  stripInternalRequestHeaders(headers)

  assert.equal(readRequestAuthContext(headers), null)
})
