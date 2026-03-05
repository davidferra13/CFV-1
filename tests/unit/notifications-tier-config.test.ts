import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const { NOTIFICATION_CONFIG } = require('../../lib/notifications/types.ts')
const {
  DEFAULT_TIER_MAP,
  EMAIL_SUPPRESSED_ACTIONS,
  getDefaultChannels,
} = require('../../lib/notifications/tier-config.ts')

const actions = Object.keys(NOTIFICATION_CONFIG)

test('DEFAULT_TIER_MAP covers all notification actions and has no extras', () => {
  const missing = actions.filter((action) => !(action in DEFAULT_TIER_MAP))
  const extra = Object.keys(DEFAULT_TIER_MAP).filter((action) => !(action in NOTIFICATION_CONFIG))

  assert.deepEqual(missing, [])
  assert.deepEqual(extra, [])
})

test('getDefaultChannels returns concrete booleans for every action', () => {
  for (const action of actions) {
    const channels = getDefaultChannels(action)
    assert.equal(typeof channels.email, 'boolean', `${action} email should be boolean`)
    assert.equal(typeof channels.push, 'boolean', `${action} push should be boolean`)
    assert.equal(typeof channels.sms, 'boolean', `${action} sms should be boolean`)
  }
})

test('EMAIL_SUPPRESSED_ACTIONS always disable default email channel', () => {
  for (const action of EMAIL_SUPPRESSED_ACTIONS) {
    const channels = getDefaultChannels(action)
    assert.equal(channels.email, false, `${action} should suppress email by default`)
  }
})
