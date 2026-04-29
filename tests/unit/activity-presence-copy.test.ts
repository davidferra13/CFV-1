import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ACTIVE_CLIENT_SIGNAL_WINDOW_MS,
  formatActivitySignalAge,
  formatActivityWindowLabel,
  getActiveSignalExplanation,
  isActiveClientSignal,
} from '../../lib/activity/presence-copy'

test('active client signal uses the shared five minute window', () => {
  const now = Date.UTC(2026, 3, 29, 12, 0, 0)

  assert.equal(
    isActiveClientSignal(new Date(now - ACTIVE_CLIENT_SIGNAL_WINDOW_MS + 1).toISOString(), now),
    true
  )
  assert.equal(
    isActiveClientSignal(new Date(now - ACTIVE_CLIENT_SIGNAL_WINDOW_MS).toISOString(), now),
    false
  )
  assert.equal(isActiveClientSignal('not-a-date', now), false)
})

test('activity window labels are explicit and human readable', () => {
  assert.equal(formatActivityWindowLabel(1), 'last minute')
  assert.equal(formatActivityWindowLabel(5), 'last 5 minutes')
  assert.equal(formatActivityWindowLabel(60), 'last hour')
  assert.equal(formatActivityWindowLabel(120), 'last 2 hours')
})

test('activity signal age handles current, older, and invalid timestamps', () => {
  const now = Date.UTC(2026, 3, 29, 12, 0, 0)

  assert.equal(formatActivitySignalAge(new Date(now - 15_000).toISOString(), now), 'now')
  assert.equal(formatActivitySignalAge(new Date(now - 60_000).toISOString(), now), '1m ago')
  assert.equal(
    formatActivitySignalAge(new Date(now - 2 * 60 * 60_000).toISOString(), now),
    '2h ago'
  )
  assert.equal(formatActivitySignalAge('not-a-date', now), 'unknown')
})

test('active signal explanation does not overclaim socket presence', () => {
  assert.equal(
    getActiveSignalExplanation(),
    'Inferred from client portal events in the last 5 minutes, not a guaranteed live connection.'
  )
})
