import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildDiscoveryRuntimePlan } from '@/lib/discovery/discovery-runtime-module'

describe('discovery runtime module', () => {
  it('keeps public discovery public and prevents cross-user profile leakage', () => {
    const plan = buildDiscoveryRuntimePlan({ surface: 'homepage', actor: 'public' })
    assert.equal(plan.privacyMode, 'public')
    assert.equal(plan.mustNotLeak.includes('cross_user_profile_data'), true)
  })

  it('switches to circle-safe handoff when circle context exists', () => {
    const plan = buildDiscoveryRuntimePlan({
      surface: 'eat',
      actor: 'client',
      query: 'sushi near me',
      circleId: 'circle-1',
    })
    assert.equal(plan.privacyMode, 'circle_safe')
    assert.equal(plan.handoffs.includes('filters'), true)
    assert.equal(plan.handoffs.includes('circle'), true)
    assert.equal(plan.mustNotLeak.includes('other_circle_member_private_preferences'), true)
  })
})
