import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getEffectiveAdminState,
  getStrictFocusGroupRank,
  isStrictFocusGroupVisible,
  STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS,
} from '@/lib/navigation/focus-mode-nav'

describe('strict focus mode nav rules', () => {
  it('uses fixed 5 shortcut hrefs', () => {
    assert.deepEqual(STRICT_FOCUS_PRIMARY_SHORTCUT_HREFS, [
      '/dashboard',
      '/inbox',
      '/inquiries',
      '/events',
      '/clients',
    ])
  })

  it('allows only events and clients groups for non-admin users', () => {
    assert.equal(isStrictFocusGroupVisible('remy', false), false)
    assert.equal(isStrictFocusGroupVisible('pipeline', false), false)
    assert.equal(isStrictFocusGroupVisible('events', false), true)
    assert.equal(isStrictFocusGroupVisible('clients', false), true)
    assert.equal(isStrictFocusGroupVisible('admin', false), false)
    assert.equal(isStrictFocusGroupVisible('finance', false), false)
  })

  it('allows admin group only for admins in strict mode', () => {
    assert.equal(isStrictFocusGroupVisible('admin', true), true)
    assert.equal(isStrictFocusGroupVisible('admin', false), false)
  })

  it('uses deterministic strict group ordering', () => {
    assert.ok(getStrictFocusGroupRank('events') < getStrictFocusGroupRank('clients'))
    assert.ok(getStrictFocusGroupRank('clients') < getStrictFocusGroupRank('admin'))
    assert.equal(getStrictFocusGroupRank('remy'), Number.MAX_SAFE_INTEGER)
  })
})

describe('effective admin preview behavior', () => {
  it('drops effective admin access when preview is active', () => {
    assert.equal(getEffectiveAdminState(true, true), false)
  })

  it('keeps effective admin access when preview is inactive', () => {
    assert.equal(getEffectiveAdminState(true, false), true)
  })

  it('never grants effective admin access to non-admin users', () => {
    assert.equal(getEffectiveAdminState(false, false), false)
    assert.equal(getEffectiveAdminState(false, true), false)
  })
})
