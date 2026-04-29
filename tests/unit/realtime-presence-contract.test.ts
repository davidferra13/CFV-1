import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getPresenceState,
  subscribe,
  toPresenceChannel,
  trackPresence,
  untrackPresence,
} from '../../lib/realtime/sse-server'

test('presence writers and readers use the same prefixed channel', async () => {
  const channel = toPresenceChannel('unit-presence')
  const sessionId = `session-${Date.now()}`

  const joined = await new Promise<Record<string, unknown>>((resolve) => {
    const unsubscribe = subscribe(channel, (message) => {
      if (message.event === 'presence_join') {
        unsubscribe()
        resolve(message.data as Record<string, unknown>)
      }
    })

    trackPresence(channel, sessionId, {
      page: '/admin/presence',
      role: 'authenticated',
    })
  })

  const state = getPresenceState(channel)

  assert.equal(joined.sessionId, sessionId)
  assert.equal(state[sessionId].page, '/admin/presence')

  untrackPresence(channel, sessionId)
})

test('toPresenceChannel is idempotent', () => {
  assert.equal(toPresenceChannel('site'), 'presence:site')
  assert.equal(toPresenceChannel('presence:site'), 'presence:site')
})
