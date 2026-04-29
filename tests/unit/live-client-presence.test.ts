import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getClientPresenceSessions,
  getConnectedClientIds,
} from '../../lib/activity/live-client-presence'

test('normalizes client presence sessions from realtime state', () => {
  const sessions = getClientPresenceSessions({
    'session-old': {
      clientId: 'client-old',
      clientName: 'Old Client',
      page: '/my-events',
      joinedAt: '2026-04-29T12:00:00.000Z',
    },
    'session-new': {
      clientId: 'client-new',
      email: 'new@example.com',
      page: '/my-quotes',
      joinedAt: '2026-04-29T12:05:00.000Z',
    },
  })

  assert.deepEqual(
    sessions.map((session) => session.sessionId),
    ['session-new', 'session-old']
  )
  assert.equal(sessions[0].clientName, 'new@example.com')
  assert.equal(sessions[1].clientName, 'Old Client')
})

test('connected client ids ignore anonymous or malformed sessions', () => {
  const ids = getConnectedClientIds(
    getClientPresenceSessions({
      valid: { clientId: 'client-1', page: '/my-events' },
      fallback: { userId: 'auth-user-1', page: '/my-hub' },
      malformed: null,
    })
  )

  assert.deepEqual([...ids], ['client-1', 'auth-user-1'])
})
