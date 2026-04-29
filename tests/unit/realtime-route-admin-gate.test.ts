import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sseRouteSource = readFileSync(
  resolve(process.cwd(), 'app/api/realtime/[channel]/route.ts'),
  'utf-8'
)
const typingRouteSource = readFileSync(
  resolve(process.cwd(), 'app/api/realtime/typing/route.ts'),
  'utf-8'
)
const presenceRouteSource = readFileSync(
  resolve(process.cwd(), 'app/api/realtime/presence/route.ts'),
  'utf-8'
)

test('sitewide realtime observability uses admin-panel access, not vip access', () => {
  for (const source of [sseRouteSource, typingRouteSource, presenceRouteSource]) {
    assert.match(source, /hasAdminAccess/)
    assert.doesNotMatch(source, /hasPersistedAdminAccessForAuthUser/)
  }
})

test('presence writes are csrf checked, rate limited, and normalized to presence channels', () => {
  assert.match(presenceRouteSource, /verifyCsrfOrigin/)
  assert.match(presenceRouteSource, /checkRateLimit/)
  assert.match(presenceRouteSource, /toPresenceChannel/)
  assert.match(presenceRouteSource, /presencePostSchema/)
})
