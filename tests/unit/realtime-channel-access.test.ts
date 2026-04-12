import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRealtimeChannelAccess } from '../../lib/realtime/channel-access'

test('notifications channels are scoped to the authenticated recipient user id', async () => {
  const allowed = await validateRealtimeChannelAccess('notifications:user-1', {
    isAdmin: false,
    tenantId: 'tenant-1',
    userId: 'user-1',
  })
  const denied = await validateRealtimeChannelAccess('notifications:tenant-1', {
    isAdmin: false,
    tenantId: 'tenant-1',
    userId: 'user-1',
  })

  assert.equal(allowed, true)
  assert.equal(denied, false)
})

test('site presence subscription is admin-only', async () => {
  const allowed = await validateRealtimeChannelAccess('presence:site', {
    isAdmin: true,
    tenantId: 'tenant-1',
    userId: 'user-1',
  })
  const denied = await validateRealtimeChannelAccess('presence:site', {
    isAdmin: false,
    tenantId: 'tenant-1',
    userId: 'user-1',
  })

  assert.equal(allowed, true)
  assert.equal(denied, false)
})

test('tenant-scoped aliases still validate against the tenant id', async () => {
  const allowed = await validateRealtimeChannelAccess('activity_events:tenant-1', {
    isAdmin: false,
    tenantId: 'tenant-1',
    userId: 'user-1',
  })
  const denied = await validateRealtimeChannelAccess('conversations:tenant-2', {
    isAdmin: false,
    tenantId: 'tenant-1',
    userId: 'user-1',
  })

  assert.equal(allowed, true)
  assert.equal(denied, false)
})
