import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { NextRequest } from 'next/server'

const require = createRequire(import.meta.url)

test('presence payload normalization preserves sanitized client identity fields', async () => {
  const authPath = require.resolve('@/lib/auth')
  const adminAccessPath = require.resolve('@/lib/auth/admin-access')
  const channelAccessPath = require.resolve('@/lib/realtime/channel-access')
  const rateLimitPath = require.resolve('@/lib/rateLimit')
  const csrfPath = require.resolve('@/lib/security/csrf')
  const ssePath = require.resolve('@/lib/realtime/sse-server')
  const routePath = require.resolve('../../app/api/realtime/presence/route.ts')

  const originalAuth = require.cache[authPath]
  const originalAdminAccess = require.cache[adminAccessPath]
  const originalChannelAccess = require.cache[channelAccessPath]
  const originalRateLimit = require.cache[rateLimitPath]
  const originalCsrf = require.cache[csrfPath]
  const originalSse = require.cache[ssePath]

  let capturedChannel: string | null = null
  let capturedSessionId: string | null = null
  let capturedData: Record<string, unknown> | null = null

  require.cache[authPath] = {
    exports: {
      auth: async () => ({
        user: {
          id: 'user-1',
          email: 'client@example.com',
          tenantId: 'chef-1',
        },
      }),
    },
  } as NodeJS.Module

  require.cache[adminAccessPath] = {
    exports: {
      hasAdminAccess: async () => false,
    },
  } as NodeJS.Module

  require.cache[channelAccessPath] = {
    exports: {
      validateRealtimeChannelAccess: async () => true,
    },
  } as NodeJS.Module

  require.cache[rateLimitPath] = {
    exports: {
      checkRateLimit: async () => {},
    },
  } as NodeJS.Module

  require.cache[csrfPath] = {
    exports: {
      verifyCsrfOrigin: () => null,
    },
  } as NodeJS.Module

  require.cache[ssePath] = {
    exports: {
      toPresenceChannel: (channel: string) =>
        channel.startsWith('presence:') ? channel : `presence:${channel}`,
      trackPresence: (channel: string, sessionId: string, data: Record<string, unknown>) => {
        capturedChannel = channel
        capturedSessionId = sessionId
        capturedData = data
      },
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    const { POST } = require(routePath)
    const response = await POST(
      new NextRequest('http://localhost/api/realtime/presence', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '127.0.0.1',
        },
        body: JSON.stringify({
          channel: 'activity_events:chef-1',
          sessionId: 'presence-session-1',
          data: {
            page: '/client/portal',
            joinedAt: '2026-04-29T12:00:00.000Z',
            userAgent: 'Unit Test',
            referrer: '/client/home',
            clientId: `client-${'x'.repeat(200)}`,
            clientName: 'Maya Client',
            ignoredObject: { nested: true },
          },
        }),
      })
    )

    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
    assert.equal(capturedChannel, 'presence:activity_events:chef-1')
    assert.equal(capturedSessionId, 'presence-session-1')
    assert.equal(capturedData?.page, '/client/portal')
    assert.equal(capturedData?.clientName, 'Maya Client')
    assert.equal(capturedData?.clientId, `client-${'x'.repeat(113)}`)
    assert.equal(capturedData?.email, 'client@example.com')
    assert.equal(capturedData?.role, 'authenticated')
    assert.equal(capturedData?.userId, 'user-1')
    assert.equal('ignoredObject' in (capturedData || {}), false)
  } finally {
    if (originalAuth) require.cache[authPath] = originalAuth
    else delete require.cache[authPath]

    if (originalAdminAccess) require.cache[adminAccessPath] = originalAdminAccess
    else delete require.cache[adminAccessPath]

    if (originalChannelAccess) require.cache[channelAccessPath] = originalChannelAccess
    else delete require.cache[channelAccessPath]

    if (originalRateLimit) require.cache[rateLimitPath] = originalRateLimit
    else delete require.cache[rateLimitPath]

    if (originalCsrf) require.cache[csrfPath] = originalCsrf
    else delete require.cache[csrfPath]

    if (originalSse) require.cache[ssePath] = originalSse
    else delete require.cache[ssePath]

    delete require.cache[routePath]
  }
})
